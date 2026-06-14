"use client";

import {
  type CSSProperties,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import {
  KEYBOARD_HEIGHT,
  KEYBOARD_WIDTH,
  buildPianoKeys,
  canShowKeyLabel,
} from "@/modules/piano/key-layout";
import type {
  PianoKeyActiveSource,
  PianoKeyLayout,
} from "@/modules/piano/types";

type PianoStageProps = {
  keys?: PianoKeyLayout[];
  keyboardWidth?: number;
  keyboardHeight?: number;
  activeKeys: Partial<Record<number, PianoKeyActiveSource>>;
  focusedMidi: number | null;
  keyboardLabels?: Record<number, string>;
  showKeyboardLabels?: boolean;
  stageScale?: number;
  onKeyPress: (key: PianoKeyLayout) => void;
};

export type PianoStageHandle = {
  focus: () => void;
};

const WHITE_KEY_BASE = 0xfffbf5;
const WHITE_KEY_MANUAL_ACTIVE = 0xffd07f;
const WHITE_KEY_RIGHT_ACTIVE = 0xffa8c8;
const WHITE_KEY_LEFT_ACTIVE = 0xa9ddff;
const WHITE_KEY_FOCUSED = 0xf0b55a;
const BLACK_KEY_BASE = 0x1f2c39;
const BLACK_KEY_MANUAL_ACTIVE = 0xf18d2d;
const BLACK_KEY_RIGHT_ACTIVE = 0xff6ea6;
const BLACK_KEY_LEFT_ACTIVE = 0x5bb8ef;
const BLACK_KEY_FOCUSED = 0xf4ba62;
const MAPPED_KEY_STROKE = 0x167a4a;
const DEFAULT_STAGE_SCALE = 1;

function normalizeStageScale(scale: number) {
  return Number.isFinite(scale) && scale > 0 ? scale : DEFAULT_STAGE_SCALE;
}

function getActiveKeyFill(
  key: PianoKeyLayout,
  activeSource: PianoKeyActiveSource | undefined,
) {
  if (!activeSource) {
    return key.isBlack ? BLACK_KEY_BASE : WHITE_KEY_BASE;
  }

  if (activeSource === "right") {
    return key.isBlack ? BLACK_KEY_RIGHT_ACTIVE : WHITE_KEY_RIGHT_ACTIVE;
  }

  if (activeSource === "left") {
    return key.isBlack ? BLACK_KEY_LEFT_ACTIVE : WHITE_KEY_LEFT_ACTIVE;
  }

  return key.isBlack ? BLACK_KEY_MANUAL_ACTIVE : WHITE_KEY_MANUAL_ACTIVE;
}

function redrawKeyGraphic(
  graphic: Graphics,
  key: PianoKeyLayout,
  activeSource: PianoKeyActiveSource | undefined,
  isFocused: boolean,
  isMapped: boolean,
) {
  const fill = getActiveKeyFill(key, activeSource);

  const stroke = isFocused
    ? key.isBlack
      ? BLACK_KEY_FOCUSED
      : WHITE_KEY_FOCUSED
    : isMapped
      ? MAPPED_KEY_STROKE
      : key.isBlack
        ? 0x0f172a
        : 0xd1d9e2;

  graphic.clear();
  graphic
    .roundRect(key.x, key.y, key.width, key.height, key.radius)
    .fill(fill)
    .stroke({
      color: stroke,
      width: isFocused || isMapped ? 2.5 : 1.5,
    });
}

export const PianoStage = forwardRef<PianoStageHandle, PianoStageProps>(
  function PianoStage(
    {
      keys,
      keyboardWidth = KEYBOARD_WIDTH,
      keyboardHeight = KEYBOARD_HEIGHT,
      activeKeys,
      focusedMidi,
      keyboardLabels = {},
      showKeyboardLabels = false,
      stageScale = DEFAULT_STAGE_SCALE,
      onKeyPress,
    },
    ref,
  ) {
    const pianoKeys = useMemo(() => keys ?? buildPianoKeys(), [keys]);
    const normalizedStageScale = normalizeStageScale(stageScale);
    const canvasWidth = keyboardWidth * normalizedStageScale;
    const canvasHeight = keyboardHeight * normalizedStageScale;
    const hostStyle = {
      "--piano-canvas-width": `${canvasWidth}px`,
      "--piano-canvas-height": `${canvasHeight}px`,
      "--piano-canvas-aspect": `${canvasWidth} / ${canvasHeight}`,
    } as CSSProperties & Record<`--${string}`, string>;
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const hostRef = useRef<HTMLDivElement | null>(null);
    const appRef = useRef<Application | null>(null);
    const graphicsRef = useRef<Map<number, Graphics>>(new Map());
    const keyboardLabelRefs = useRef<Map<number, Text>>(new Map());
    const onKeyPressRef = useRef(onKeyPress);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          if (appRef.current?.canvas) {
            appRef.current.canvas.focus();
            return;
          }

          hostRef.current?.focus();
        },
      }),
      [],
    );

    useEffect(() => {
      onKeyPressRef.current = onKeyPress;
    }, [onKeyPress]);

    useEffect(() => {
      let cancelled = false;
      let pixiApp: Application | null = null;
      const graphicsMap = new Map<number, Graphics>();
      const keyboardLabelMap = new Map<number, Text>();

      async function setupStage() {
        const host = hostRef.current;
        if (!host) {
          return;
        }

        const app = new Application();
        await app.init({
          width: canvasWidth,
          height: canvasHeight,
          antialias: true,
          autoDensity: true,
          backgroundAlpha: 0,
          resolution: window.devicePixelRatio || 1,
        });

        if (cancelled) {
          app.destroy(true);
          return;
        }

        host.innerHTML = "";
        app.canvas.tabIndex = -1;
        app.canvas.setAttribute("aria-label", "钢琴演奏舞台");
        host.appendChild(app.canvas);

        pixiApp = app;
        appRef.current = app;

        const stage = new Container();
        stage.scale.set(normalizedStageScale);
        app.stage.addChild(stage);

        const whiteLayer = new Container();
        const blackLayer = new Container();
        const labelLayer = new Container();

        stage.addChild(whiteLayer, blackLayer, labelLayer);
        graphicsRef.current = graphicsMap;

        for (const key of pianoKeys) {
          const graphic = new Graphics();
          graphic.eventMode = "static";
          graphic.cursor = "pointer";
          redrawKeyGraphic(graphic, key, undefined, false, false);
          graphic.on("pointerdown", () => {
            onKeyPressRef.current(key);
          });
          if (key.isBlack) {
            blackLayer.addChild(graphic);
          } else {
            whiteLayer.addChild(graphic);
          }
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
            text.y = key.y + key.height - 32;
            labelLayer.addChild(text);
          }

          const keyboardText = new Text({
            text: "",
            style: {
              fill: key.isBlack ? "#fff7d6" : "#12633d",
              fontFamily: "Avenir Next, PingFang SC, sans-serif",
              fontSize: key.isBlack ? 11 : 13,
              fontWeight: "500",
            },
            anchor: { x: 0.5, y: 0.5 },
          });
          keyboardText.x = key.x + key.width / 2;
          keyboardText.y = key.isBlack ? key.y + 28 : key.y + 100;
          keyboardText.visible = false;
          labelLayer.addChild(keyboardText);
          keyboardLabelMap.set(key.midi, keyboardText);
        }

        keyboardLabelRefs.current = keyboardLabelMap;
      }

      void setupStage();

      return () => {
        cancelled = true;
        graphicsMap.clear();
        keyboardLabelMap.clear();
        graphicsRef.current = new Map();
        keyboardLabelRefs.current = new Map();
        appRef.current = null;

        if (pixiApp) {
          pixiApp.destroy(true);
        }
      };
    }, [canvasHeight, canvasWidth, normalizedStageScale, pianoKeys]);

    useEffect(() => {
      for (const key of pianoKeys) {
        const graphic = graphicsRef.current.get(key.midi);
        const keyboardLabel = keyboardLabelRefs.current.get(key.midi);

        if (!graphic) {
          continue;
        }

        redrawKeyGraphic(
          graphic,
          key,
          activeKeys[key.midi],
          focusedMidi === key.midi,
          showKeyboardLabels && keyboardLabels[key.midi] !== undefined,
        );

        if (keyboardLabel) {
          keyboardLabel.text = keyboardLabels[key.midi] ?? "";
          keyboardLabel.visible =
            showKeyboardLabels && keyboardLabels[key.midi] !== undefined;
        }
      }
    }, [
      activeKeys,
      focusedMidi,
      keyboardLabels,
      pianoKeys,
      showKeyboardLabels,
    ]);

    return (
      <div ref={scrollRef} className="stage-scroll">
        <div
          ref={hostRef}
          className="pixi-host"
          style={hostStyle}
          tabIndex={-1}
        />
      </div>
    );
  },
);
