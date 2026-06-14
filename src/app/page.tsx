import { OrientationPrompt } from "@/components/orientation-prompt/OrientationPrompt";
import { PianoWorkspace } from "@/components/piano-workspace/PianoWorkspace";

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Piano Lab</p>
          <h1>Web Piano</h1>
          <p className="hero-description">选择曲谱，让 88 键电子琴自动演奏。</p>
        </div>
        <div className="hero-metrics">
          <div className="metric-card">
            <span>88 键</span>
          </div>
          <div className="metric-card">
            <span>PixiJS + Tone.js</span>
          </div>
        </div>
      </section>
      <PianoWorkspace />
      <OrientationPrompt />
    </main>
  );
}
