"use client";

import { useEffect, useMemo, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import {
  KEYBOARD_HEIGHT,
  KEYBOARD_WIDTH,
  buildPianoKeys,
  canShowKeyLabel,
} from "@/modules/piano/key-layout";
import type { PianoKeyLayout } from "@/modules/piano/types";

type PianoStageProps = {
  keys?: PianoKeyLayout[];
  activeMidis: number[];
  focusedMidi: number | null;
  onKeyPress: (key: PianoKeyLayout) => void;
};

const WHITE_KEY_BASE = 0xfffbf5;
const WHITE_KEY_ACTIVE = 0xffd07f;
const WHITE_KEY_FOCUSED = 0xf0b55a;
const BLACK_KEY_BASE = 0x1f2c39;
const BLACK_KEY_ACTIVE = 0xf18d2d;
const BLACK_KEY_FOCUSED = 0xf4ba62;

function redrawKeyGraphic(
  graphic: Graphics,
  key: PianoKeyLayout,
  isActive: boolean,
  isFocused: boolean,
) {
  const fill = key.isBlack
    ? isActive
      ? BLACK_KEY_ACTIVE
      : BLACK_KEY_BASE
    : isActive
      ? WHITE_KEY_ACTIVE
      : WHITE_KEY_BASE;

  const stroke = isFocused
    ? key.isBlack
      ? BLACK_KEY_FOCUSED
      : WHITE_KEY_FOCUSED
    : key.isBlack
      ? 0x0f172a
      : 0xd1d9e2;

  graphic.clear();
  graphic
    .roundRect(key.x, key.y, key.width, key.height, key.radius)
    .fill(fill)
    .stroke({
      color: stroke,
      width: isFocused ? 2.5 : 1.5,
    });
}

export function PianoStage({
  keys,
  activeMidis,
  focusedMidi,
  onKeyPress,
}: PianoStageProps) {
  const pianoKeys = useMemo(() => keys ?? buildPianoKeys(), [keys]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const centeredRef = useRef(false);
  const appRef = useRef<Application | null>(null);
  const graphicsRef = useRef<Map<number, Graphics>>(new Map());
  const onKeyPressRef = useRef(onKeyPress);

  useEffect(() => {
    onKeyPressRef.current = onKeyPress;
  }, [onKeyPress]);

  useEffect(() => {
    let cancelled = false;
    let pixiApp: Application | null = null;
    const graphicsMap = new Map<number, Graphics>();

    async function setupStage() {
      const host = hostRef.current;
      if (!host) {
        return;
      }

      const app = new Application();
      await app.init({
        width: KEYBOARD_WIDTH,
        height: KEYBOARD_HEIGHT,
        antialias: true,
        backgroundAlpha: 0,
        resolution: window.devicePixelRatio || 1,
      });

      if (cancelled) {
        app.destroy(true);
        return;
      }

      host.innerHTML = "";
      host.appendChild(app.canvas);

      pixiApp = app;
      appRef.current = app;

      const stage = new Container();
      app.stage.addChild(stage);

      const whiteLayer = new Container();
      const blackLayer = new Container();
      const labelLayer = new Container();

      stage.addChild(whiteLayer, blackLayer, labelLayer);
      graphicsRef.current = graphicsMap;

      for (const key of pianoKeys.filter((entry) => !entry.isBlack)) {
        const graphic = new Graphics();
        graphic.eventMode = "static";
        graphic.cursor = "pointer";
        redrawKeyGraphic(graphic, key, false, false);
        graphic.on("pointerdown", () => {
          onKeyPressRef.current(key);
        });
        whiteLayer.addChild(graphic);
        graphicsMap.set(key.midi, graphic);

        if (canShowKeyLabel(key)) {
          const text = new Text({
            text: key.noteName,
            style: {
              fill: "#51616f",
              fontFamily: "Avenir Next, PingFang SC, sans-serif",
              fontSize: 12,
              fontWeight: "600",
            },
            anchor: { x: 0.5, y: 0.5 },
          });
          text.x = key.x + key.width / 2;
          text.y = key.y + key.height - 18;
          labelLayer.addChild(text);
        }
      }

      for (const key of pianoKeys.filter((entry) => entry.isBlack)) {
        const graphic = new Graphics();
        graphic.eventMode = "static";
        graphic.cursor = "pointer";
        redrawKeyGraphic(graphic, key, false, false);
        graphic.on("pointerdown", () => {
          onKeyPressRef.current(key);
        });
        blackLayer.addChild(graphic);
        graphicsMap.set(key.midi, graphic);
      }

      if (!centeredRef.current) {
        requestAnimationFrame(() => {
          const scroller = scrollRef.current;
          const middleC = pianoKeys.find((entry) => entry.noteName === "C4");

          if (!scroller || !middleC) {
            return;
          }

          scroller.scrollLeft = Math.max(
            0,
            middleC.x - scroller.clientWidth / 2,
          );
          centeredRef.current = true;
        });
      }
    }

    void setupStage();

    return () => {
      cancelled = true;
      graphicsMap.clear();
      graphicsRef.current = new Map();
      appRef.current = null;

      if (pixiApp) {
        pixiApp.destroy(true);
      }
    };
  }, [pianoKeys]);

  useEffect(() => {
    for (const key of pianoKeys) {
      const graphic = graphicsRef.current.get(key.midi);

      if (!graphic) {
        continue;
      }

      redrawKeyGraphic(
        graphic,
        key,
        activeMidis.includes(key.midi),
        focusedMidi === key.midi,
      );
    }
  }, [activeMidis, focusedMidi, pianoKeys]);

  return (
    <div ref={scrollRef} className="stage-scroll">
      <div ref={hostRef} className="pixi-host" />
    </div>
  );
}
