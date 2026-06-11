import { PianoWorkspace } from "@/components/piano-workspace/PianoWorkspace";

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Piano Lab / Phase 0 + 1</p>
          <h1>网页电子钢琴已经开始真正落地。</h1>
          <p className="hero-description">
            当前版本已经完成项目初始化、88 键舞台建模、PixiJS 渲染骨架，以及基于
            Tone.js
            的钢琴音色接入。你可以先点键弹奏，再用示例旋律验证自动播放主链路。
          </p>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <span>键盘范围</span>
            <strong>A0 - C8</strong>
          </div>
          <div className="metric-card">
            <span>演奏视图</span>
            <strong>PixiJS Canvas</strong>
          </div>
          <div className="metric-card">
            <span>当前输入</span>
            <strong>示例 NoteEvent</strong>
          </div>
        </div>
      </section>
      <PianoWorkspace />
    </main>
  );
}
