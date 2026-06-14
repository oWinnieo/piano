import type { PianoKeyboardRowId } from "@/modules/piano/keyboard-mapping";
import { KEYBOARD_ROW_OPTIONS } from "@/modules/piano/keyboard-mapping";

type AudioStatus = "idle" | "loading" | "ready" | "error";
type PlaybackStatus = "stopped" | "playing";

export const PLAYBACK_RATE_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export type PlaybackRate = (typeof PLAYBACK_RATE_OPTIONS)[number];

type TransportBarProps = {
  audioStatus: AudioStatus;
  playbackStatus: PlaybackStatus;
  keyboardMappingEnabled: boolean;
  keyboardRowId: PianoKeyboardRowId;
  keyboardRangeLabel: string;
  playbackRate: PlaybackRate;
  selectedKeyLabel: string;
  onEnableAudio: () => void;
  onToggleKeyboardMapping: () => void;
  onKeyboardRowChange: (rowId: PianoKeyboardRowId) => void;
  onPlaybackRateChange: (playbackRate: PlaybackRate) => void;
  onOpenSongLibrary: () => void;
  onPlayDemo: () => void;
  onStopDemo: () => void;
};

function getAudioStatusLabel(status: AudioStatus) {
  switch (status) {
    case "loading":
      return "正在加载钢琴音色";
    case "ready":
      return "音频引擎已就绪";
    case "error":
      return "音频初始化失败";
    default:
      return "等待用户启用音频";
  }
}

export function TransportBar({
  audioStatus,
  playbackStatus,
  keyboardMappingEnabled,
  keyboardRowId,
  keyboardRangeLabel,
  playbackRate,
  selectedKeyLabel,
  onEnableAudio,
  onToggleKeyboardMapping,
  onKeyboardRowChange,
  onPlaybackRateChange,
  onOpenSongLibrary,
  onPlayDemo,
  onStopDemo,
}: TransportBarProps) {
  return (
    <>
      <div className="toolbar">
        <button
          type="button"
          className="toolbar-button"
          onClick={onEnableAudio}
          disabled={audioStatus === "loading"}
        >
          {audioStatus === "ready" ? "重新唤醒音频" : "启用钢琴音色"}
        </button>
        <button
          type="button"
          className={`toolbar-button secondary ${keyboardMappingEnabled ? "active" : ""}`}
          aria-pressed={keyboardMappingEnabled}
          onClick={onToggleKeyboardMapping}
        >
          键盘演奏：{keyboardMappingEnabled ? "开" : "关"}
        </button>
        <button
          type="button"
          className="toolbar-button secondary"
          onClick={onOpenSongLibrary}
        >
          打开曲库
        </button>
        <button
          type="button"
          className="toolbar-button secondary"
          onClick={onPlayDemo}
          disabled={playbackStatus === "playing"}
        >
          播放示例旋律
        </button>
        <button
          type="button"
          className="toolbar-button secondary"
          onClick={onStopDemo}
          disabled={playbackStatus !== "playing"}
        >
          停止播放
        </button>
        <span className="status-pill">
          <span className={`status-dot ${audioStatus}`} />
          {getAudioStatusLabel(audioStatus)}
        </span>
      </div>
      <div className="toolbar">
        <label className="select-control">
          <span>播放速度</span>
          <select
            value={playbackRate}
            onChange={(event) =>
              onPlaybackRateChange(Number(event.target.value) as PlaybackRate)
            }
          >
            {PLAYBACK_RATE_OPTIONS.map((rate) => (
              <option key={rate} value={rate}>
                {rate}x
              </option>
            ))}
          </select>
        </label>
        <label className="select-control">
          <span>键盘对应排</span>
          <select
            value={keyboardRowId}
            onChange={(event) =>
              onKeyboardRowChange(event.target.value as PianoKeyboardRowId)
            }
          >
            {KEYBOARD_ROW_OPTIONS.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
        {/* <span className="status-pill">当前选中：{selectedKeyLabel}</span> */}
        {/* <span className="status-pill">键盘窗口：{keyboardRangeLabel}</span> */}
        <span className="status-pill">
          播放状态：{playbackStatus === "playing" ? "演奏中" : "空闲"}
        </span>
      </div>
    </>
  );
}
