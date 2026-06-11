import type { ScoreDocument } from "@/modules/score/types";

type ScorePanelProps = {
  score: ScoreDocument;
};

export function ScorePanel({ score }: ScorePanelProps) {
  const noteCount = score.tracks.reduce(
    (total, track) => total + track.notes.length,
    0,
  );

  return (
    <aside className="panel">
      <div className="panel-inner score-card">
        <div className="panel-header">
          <div>
            <h2>曲谱与计划状态</h2>
            <p>
              这里先用一段内部示例曲谱驱动自动播放，后面这个区域会逐步接入文本输入、MIDI
              / MusicXML 导入，以及五线谱预览。
            </p>
          </div>
        </div>
        <section className="score-overview">
          <h3>{score.title}</h3>
          <p>
            示例数据已经走的是我们文档里定义的 `ScoreDocument + NoteEvent`
            结构，所以后面不管接文本、MIDI
            还是识谱导入，都可以汇总到同一条播放链路上。
          </p>
        </section>
        <ul className="score-list">
          <li>
            <strong>当前节奏与拍号</strong>
            {score.tempo} BPM / {score.timeSignature[0]}/
            {score.timeSignature[1]}
          </li>
          <li>
            <strong>轨道与音符数量</strong>
            {score.tracks.length} 条轨道，{noteCount} 个音符事件
          </li>
          <li>
            <strong>当前来源类型</strong>
            {score.source.type}，这一步用于验证内部模型和自动播放逻辑
          </li>
        </ul>
        <div className="hint-card">
          下一阶段建议直接做两件事：一是把这套内部结构连到文本输入框，二是把
          `MIDI` 文件导入转成同样的 `ScoreDocument`。
        </div>
      </div>
    </aside>
  );
}
