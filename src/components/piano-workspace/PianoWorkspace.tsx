"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PianoStage } from "@/components/piano-stage/PianoStage";
import { ScorePanel } from "@/components/score-panel/ScorePanel";
import { TransportBar } from "@/components/transport-bar/TransportBar";
import {
  playScoreDocument,
  preparePianoAudio,
  stopScorePlayback,
  triggerPianoNote,
} from "@/lib/audio/piano-engine";
import { buildPianoKeys } from "@/modules/piano/key-layout";
import type { PianoKeyLayout } from "@/modules/piano/types";
import { DEMO_SCORE } from "@/modules/score/demo-score";

type AudioStatus = "idle" | "loading" | "ready" | "error";
type PlaybackStatus = "stopped" | "playing";

const MANUAL_NOTE_DURATION = "8n";
const MANUAL_HIGHLIGHT_MS = 180;

export function PianoWorkspace() {
  const pianoKeys = useMemo(() => buildPianoKeys(), []);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("idle");
  const [playbackStatus, setPlaybackStatus] =
    useState<PlaybackStatus>("stopped");
  const [activeMidis, setActiveMidis] = useState<number[]>([]);
  const [selectedKey, setSelectedKey] = useState<PianoKeyLayout | null>(null);
  const cleanupTimersRef = useRef<number[]>([]);

  function activateMidi(midi: number) {
    setActiveMidis((current) => {
      if (current.includes(midi)) {
        return current;
      }

      return [...current, midi];
    });
  }

  function deactivateMidi(midi: number) {
    setActiveMidis((current) => current.filter((value) => value !== midi));
  }

  function queueDeactivate(midi: number, delayMs: number) {
    if (typeof window === "undefined") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      deactivateMidi(midi);
      cleanupTimersRef.current = cleanupTimersRef.current.filter(
        (entry) => entry !== timeoutId,
      );
    }, delayMs);

    cleanupTimersRef.current.push(timeoutId);
  }

  function resetTimers() {
    if (typeof window === "undefined") {
      return;
    }

    for (const timeoutId of cleanupTimersRef.current) {
      window.clearTimeout(timeoutId);
    }

    cleanupTimersRef.current = [];
  }

  async function enableAudio() {
    if (audioStatus === "loading") {
      return;
    }

    try {
      setAudioStatus("loading");
      await preparePianoAudio();
      setAudioStatus("ready");
    } catch (error) {
      console.error("音频初始化失败", error);
      setAudioStatus("error");
    }
  }

  async function handleManualPlay(key: PianoKeyLayout) {
    setSelectedKey(key);
    activateMidi(key.midi);
    queueDeactivate(key.midi, MANUAL_HIGHLIGHT_MS);

    try {
      if (audioStatus !== "ready") {
        setAudioStatus("loading");
      }

      await triggerPianoNote(key.noteName, MANUAL_NOTE_DURATION, 0.9);
      setAudioStatus("ready");
    } catch (error) {
      console.error("手动弹奏失败", error);
      setAudioStatus("error");
    }
  }

  async function handlePlayDemo() {
    if (playbackStatus === "playing") {
      return;
    }

    resetTimers();
    setActiveMidis([]);

    try {
      setAudioStatus((current) => (current === "ready" ? current : "loading"));
      await preparePianoAudio();
      setAudioStatus("ready");
      setPlaybackStatus("playing");

      await playScoreDocument(DEMO_SCORE, {
        onNoteStart: (note) => {
          activateMidi(note.midi);
          const currentKey =
            pianoKeys.find((key) => key.midi === note.midi) ?? selectedKey;

          if (currentKey) {
            setSelectedKey(currentKey);
          }
        },
        onNoteEnd: (note) => {
          deactivateMidi(note.midi);
        },
        onComplete: () => {
          setPlaybackStatus("stopped");
          setActiveMidis([]);
        },
      });
    } catch (error) {
      console.error("示例播放失败", error);
      setPlaybackStatus("stopped");
      setAudioStatus("error");
      setActiveMidis([]);
    }
  }

  function handleStopDemo() {
    stopScorePlayback();
    resetTimers();
    setPlaybackStatus("stopped");
    setActiveMidis([]);
  }

  useEffect(() => {
    return () => {
      stopScorePlayback();

      if (typeof window === "undefined") {
        return;
      }

      for (const timeoutId of cleanupTimersRef.current) {
        window.clearTimeout(timeoutId);
      }

      cleanupTimersRef.current = [];
    };
  }, []);

  return (
    <section className="workspace-grid">
      <article className="panel">
        <div className="panel-inner">
          <div className="panel-header">
            <div>
              <h2>演奏舞台</h2>
              <p>
                88 键由 PixiJS 负责绘制和交互，音频则交给
                Tone.js。当前先打通点击演奏和示例自动播放，后续再接文本输入、MIDI
                导入和五线谱预览。
              </p>
            </div>
          </div>
          <TransportBar
            audioStatus={audioStatus}
            playbackStatus={playbackStatus}
            selectedKeyLabel={selectedKey?.noteName ?? "尚未选中"}
            onEnableAudio={enableAudio}
            onPlayDemo={handlePlayDemo}
            onStopDemo={handleStopDemo}
          />
          <div className="stage-shell">
            <PianoStage
              keys={pianoKeys}
              activeMidis={activeMidis}
              focusedMidi={selectedKey?.midi ?? null}
              onKeyPress={handleManualPlay}
            />
          </div>
          <div className="meta-grid">
            <div className="meta-card">
              <span className="meta-label">当前范围</span>
              <span className="meta-value">A0 - C8 / 88 键</span>
            </div>
            <div className="meta-card">
              <span className="meta-label">音频状态</span>
              <span className="meta-value">
                {audioStatus === "idle" && "等待启用"}
                {audioStatus === "loading" && "音色加载中"}
                {audioStatus === "ready" && "可以演奏"}
                {audioStatus === "error" && "初始化失败"}
              </span>
            </div>
            <div className="meta-card">
              <span className="meta-label">下一步</span>
              <span className="meta-value">文本输入与 MIDI 导入</span>
            </div>
          </div>
        </div>
      </article>
      <ScorePanel score={DEMO_SCORE} />
    </section>
  );
}
