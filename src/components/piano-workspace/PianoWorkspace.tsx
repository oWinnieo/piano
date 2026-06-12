"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PianoStage } from "@/components/piano-stage/PianoStage";
import { ScorePanel } from "@/components/score-panel/ScorePanel";
import { TransportBar } from "@/components/transport-bar/TransportBar";
import {
  releaseAllPianoNotes,
  playScoreDocument,
  preparePianoAudio,
  stopScorePlayback,
  triggerPianoNote,
  triggerPianoNoteAttack,
  triggerPianoNoteRelease,
} from "@/lib/audio/piano-engine";
import { buildPianoKeys } from "@/modules/piano/key-layout";
import {
  DEFAULT_KEYBOARD_ROW_ID,
  getKeyboardMappedMidi,
  getKeyboardMidiLabels,
  getKeyboardRangeLabel,
  type PianoKeyboardRowId,
} from "@/modules/piano/keyboard-mapping";
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
  const [keyboardMappingEnabled, setKeyboardMappingEnabled] = useState(false);
  const [keyboardRowId, setKeyboardRowId] = useState<PianoKeyboardRowId>(
    DEFAULT_KEYBOARD_ROW_ID,
  );
  const [activeMidis, setActiveMidis] = useState<number[]>([]);
  const [selectedKey, setSelectedKey] = useState<PianoKeyLayout | null>(null);
  const cleanupTimersRef = useRef<number[]>([]);
  const pressedKeyboardKeysRef = useRef<Map<string, PianoKeyLayout>>(new Map());
  const keyByMidi = useMemo(
    () => new Map(pianoKeys.map((key) => [key.midi, key])),
    [pianoKeys],
  );
  const keyboardRangeLabel = useMemo(
    () => getKeyboardRangeLabel(keyboardRowId),
    [keyboardRowId],
  );
  const keyboardLabels = useMemo(
    () => getKeyboardMidiLabels(keyboardRowId),
    [keyboardRowId],
  );

  const activateMidi = useCallback((midi: number) => {
    setActiveMidis((current) => {
      if (current.includes(midi)) {
        return current;
      }

      return [...current, midi];
    });
  }, []);

  const deactivateMidi = useCallback((midi: number) => {
    setActiveMidis((current) => current.filter((value) => value !== midi));
  }, []);

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

  const releasePressedKeyboardNotes = useCallback(() => {
    for (const key of pressedKeyboardKeysRef.current.values()) {
      triggerPianoNoteRelease(key.noteName);
      deactivateMidi(key.midi);
    }

    pressedKeyboardKeysRef.current.clear();
  }, [deactivateMidi]);

  function handleToggleKeyboardMapping() {
    setKeyboardMappingEnabled((enabled) => {
      if (enabled) {
        releasePressedKeyboardNotes();
        releaseAllPianoNotes();
      }

      return !enabled;
    });
  }

  function handleKeyboardRowChange(rowId: PianoKeyboardRowId) {
    releasePressedKeyboardNotes();
    releaseAllPianoNotes();
    setKeyboardRowId(rowId);
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

  const handleKeyboardNoteEnd = useCallback(
    (code: string) => {
      const key = pressedKeyboardKeysRef.current.get(code);

      if (!key) {
        return;
      }

      pressedKeyboardKeysRef.current.delete(code);
      triggerPianoNoteRelease(key.noteName);
      deactivateMidi(key.midi);
    },
    [deactivateMidi],
  );

  const handleKeyboardNoteStart = useCallback(
    async (code: string, key: PianoKeyLayout) => {
      pressedKeyboardKeysRef.current.set(code, key);
      setSelectedKey(key);
      activateMidi(key.midi);

      try {
        setAudioStatus((current) =>
          current === "ready" ? current : "loading",
        );

        await triggerPianoNoteAttack(key.noteName, 0.9);
        setAudioStatus("ready");

        if (!pressedKeyboardKeysRef.current.has(code)) {
          triggerPianoNoteRelease(key.noteName);
        }
      } catch (error) {
        console.error("键盘弹奏失败", error);
        pressedKeyboardKeysRef.current.delete(code);
        deactivateMidi(key.midi);
        setAudioStatus("error");
      }
    },
    [activateMidi, deactivateMidi],
  );

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
    if (!keyboardMappingEnabled) {
      releasePressedKeyboardNotes();
      return;
    }

    function shouldIgnoreKeyboardEvent(event: KeyboardEvent) {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return false;
      }

      return (
        target.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreKeyboardEvent(event)) {
        return;
      }

      const midi = getKeyboardMappedMidi(event.code, keyboardRowId);

      if (midi === null) {
        return;
      }

      event.preventDefault();

      if (event.repeat || pressedKeyboardKeysRef.current.has(event.code)) {
        return;
      }

      const key = keyByMidi.get(midi);

      if (!key) {
        return;
      }

      void handleKeyboardNoteStart(event.code, key);
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (!pressedKeyboardKeysRef.current.has(event.code)) {
        return;
      }

      event.preventDefault();
      handleKeyboardNoteEnd(event.code);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", releasePressedKeyboardNotes);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", releasePressedKeyboardNotes);
      releasePressedKeyboardNotes();
    };
  }, [
    handleKeyboardNoteEnd,
    handleKeyboardNoteStart,
    keyboardMappingEnabled,
    keyboardRowId,
    keyByMidi,
    releasePressedKeyboardNotes,
  ]);

  useEffect(() => {
    return () => {
      stopScorePlayback();
      releasePressedKeyboardNotes();

      if (typeof window === "undefined") {
        return;
      }

      for (const timeoutId of cleanupTimersRef.current) {
        window.clearTimeout(timeoutId);
      }

      cleanupTimersRef.current = [];
    };
  }, [releasePressedKeyboardNotes]);

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
            keyboardMappingEnabled={keyboardMappingEnabled}
            keyboardRowId={keyboardRowId}
            keyboardRangeLabel={keyboardRangeLabel}
            selectedKeyLabel={selectedKey?.noteName ?? "尚未选中"}
            onEnableAudio={enableAudio}
            onToggleKeyboardMapping={handleToggleKeyboardMapping}
            onKeyboardRowChange={handleKeyboardRowChange}
            onPlayDemo={handlePlayDemo}
            onStopDemo={handleStopDemo}
          />
          <div className="stage-shell">
            <PianoStage
              keys={pianoKeys}
              activeMidis={activeMidis}
              focusedMidi={selectedKey?.midi ?? null}
              keyboardLabels={keyboardLabels}
              showKeyboardLabels={keyboardMappingEnabled}
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
