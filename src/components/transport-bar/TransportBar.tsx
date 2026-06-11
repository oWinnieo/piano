type AudioStatus = "idle" | "loading" | "ready" | "error";
type PlaybackStatus = "stopped" | "playing";

type TransportBarProps = {
  audioStatus: AudioStatus;
  playbackStatus: PlaybackStatus;
  selectedKeyLabel: string;
  onEnableAudio: () => void;
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
  selectedKeyLabel,
  onEnableAudio,
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
        <span className="status-pill">当前选中：{selectedKeyLabel}</span>
        <span className="status-pill">
          播放状态：{playbackStatus === "playing" ? "示例演奏中" : "空闲"}
        </span>
      </div>
    </>
  );
}
