import type {
  SongLibraryItem,
  SongLibraryLoadError,
} from "@/modules/score/song-library";

type SongLibraryModalProps = {
  songs: SongLibraryItem[];
  errors: SongLibraryLoadError[];
  isOpen: boolean;
  isLoading: boolean;
  playbackStatus: "stopped" | "playing";
  onClose: () => void;
  onPlaySong: (song: SongLibraryItem) => void;
  onReload: () => void;
};

function getSongNoteCount(song: SongLibraryItem) {
  return song.score.tracks.reduce(
    (total, track) => total + track.notes.length,
    0,
  );
}

export function SongLibraryModal({
  songs,
  errors,
  isOpen,
  isLoading,
  playbackStatus,
  onClose,
  onPlaySong,
  onReload,
}: SongLibraryModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="song-library-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="song-library-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="song-library-title"
      >
        <div className="song-library-header">
          <div>
            <p className="eyebrow">Song Library</p>
            <h2 id="song-library-title">选择曲目</h2>
            <p>
              曲库里的曲目会转换成内部
              `ScoreDocument`，然后交给同一套自动演奏链路。
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="关闭曲库"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="song-library-actions">
          <button
            type="button"
            className="toolbar-button secondary"
            onClick={onReload}
            disabled={isLoading}
          >
            {isLoading ? "正在读取曲库" : "刷新曲库"}
          </button>
        </div>
        {errors.length > 0 && (
          <div className="song-library-errors">
            {errors.map((error) => (
              <p key={error.fileName}>
                <strong>{error.fileName}</strong>：{error.message}
              </p>
            ))}
          </div>
        )}
        <div className="song-library-list">
          {!isLoading && songs.length === 0 && (
            <div className="empty-card">
              当前 `docs/song-library` 里没有可播放曲谱。把包含 ```text
              代码块的文本简谱 `.md` 文件放进去后，再点“刷新曲库”。
            </div>
          )}
          {songs.map((song) => (
            <article className="song-card" key={song.id}>
              <div>
                <h3>{song.title}</h3>
                <p>
                  {song.composer ? `${song.composer} / ` : ""}
                  {song.score.tempo} BPM / {song.score.timeSignature[0]}/
                  {song.score.timeSignature[1]}
                </p>
                <p className="song-card-meta">
                  {song.score.tracks.length} 条轨道，{getSongNoteCount(song)}{" "}
                  个音符事件
                </p>
                <code>{song.docsPath}</code>
              </div>
              <button
                type="button"
                className="toolbar-button"
                disabled={playbackStatus === "playing"}
                onClick={() => onPlaySong(song)}
              >
                播放这首
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
