# 技术设计

## 1. 推荐技术栈

### 前端应用层

- `Next.js + React + TypeScript`

作用：

- 页面路由
- 文件上传
- 表单与面板
- 设置与状态管理

### 演奏舞台层

- `PixiJS`

作用：

- 88 键绘制
- 演奏动画
- 键盘状态同步
- 后续 piano roll 或掉落音符视图

### 音频引擎层

- `Tone.js`

作用：

- 采样音色加载
- 播放调度
- 节拍与时间控制

### 曲谱显示层

- MVP 推荐：`OpenSheetMusicDisplay`
- 后续若要高度自定义排版或编辑交互，再评估 `VexFlow`

建议原因：

- `OpenSheetMusicDisplay` 更适合先把 `MusicXML` 稳定渲染出来
- `VexFlow` 自由度更高，但意味着你自己要接更多排版和编辑工作

### 图片识谱层

- 后端识谱服务：`Audiveris` 或其他 OMR 服务

### 后端

- 初期可先用 `Next.js Route Handlers`
- 后续如有异步识谱任务，可拆到独立服务

## 2. 模块职责边界

建议明确三类边界：

### `PixiJS` 负责什么

- 键盘场景渲染
- 输入命中检测
- 键位状态动画
- 播放进度联动

### `DOM / React` 负责什么

- 文本输入框
- 上传按钮
- 曲谱列表
- 播放控制面板
- 参数设置

### 曲谱引擎负责什么

- 解析外部格式
- 生成统一内部结构
- 提供播放所需的时间轴事件
- 提供五线谱显示所需的数据

## 3. 推荐的数据结构

## 3.1 内部标准文档

```ts
export type ScoreDocument = {
  id: string;
  title: string;
  tempo: number;
  timeSignature: [number, number];
  ppq: number;
  tracks: ScoreTrack[];
  measures: MeasureMeta[];
  source: ScoreSource;
};

export type ScoreTrack = {
  id: string;
  name: string;
  clef: "treble" | "bass";
  channel?: number;
  notes: NoteEvent[];
};

export type NoteEvent = {
  id: string;
  midi: number;
  pitchName: string;
  startTick: number;
  durationTick: number;
  velocity: number;
  staff: 1 | 2;
  hand?: "L" | "R";
};

export type MeasureMeta = {
  index: number;
  startTick: number;
  endTick: number;
};

export type ScoreSource = {
  type: "manual" | "text" | "midi" | "musicxml" | "image-omr";
  originalName?: string;
  importedAt?: string;
};
```

说明：

- `MusicXML` 和 `MIDI` 不直接作为运行时核心对象使用
- 它们进入系统后先转成 `ScoreDocument`
- 自动播放、键盘高亮、时间轴跳转都基于 `NoteEvent[]`

## 3.2 键盘状态

```ts
export type PianoKeyState = {
  midi: number;
  isBlack: boolean;
  pressed: boolean;
  highlighted: boolean;
  velocity?: number;
};
```

## 3.3 播放状态

```ts
export type PlaybackState = {
  playing: boolean;
  currentTick: number;
  currentTimeSec: number;
  tempo: number;
  loopEnabled: boolean;
  loopRange?: [number, number];
};
```

## 4. 输入方案设计

## 4.1 简易文本输入

第一版不建议让用户直接写 `MusicXML`。更可行的是提供一层轻语法，再把它转成内部对象。

示例：

```txt
tempo=100
time=4/4
RH: C4 q, D4 q, E4 q, G4 q
LH: C3 h, G2 h
```

优势：

- 好做
- 好调试
- 适合演示和快速试曲

限制：

- 不能完整表达复杂五线谱细节
- 更适合作为 `MVP` 输入法，而不是最终标准

## 4.2 文件导入

建议顺序：

1. 先做 `MIDI`
2. 再做 `MusicXML`
3. 最后接图片/PDF 识谱

原因：

- `MIDI` 最快打通自动演奏链路
- `MusicXML` 更适合和五线谱显示结合
- 图片识谱最不稳定，应该放在后面

## 4.3 图片识谱流程

建议流程：

1. 上传图片或 PDF
2. 后端进入识谱流程
3. 输出 `MusicXML`
4. 转成 `ScoreDocument`
5. 标记疑似错误位置
6. 用户修正后再播放

## 5. 运行时数据流

```txt
用户输入/导入
  -> Parser / Importer
  -> ScoreDocument
  -> NoteEvent 时间轴
  -> Tone.js 调度播放
  -> PixiJS 高亮按键
  -> 曲谱视图同步移动
```

## 6. 建议的代码目录结构

当准备开始写代码时，可以按下面方式组织：

```txt
src/
  app/
  components/
    piano-stage/
    transport-bar/
    score-panel/
  modules/
    piano/
    playback/
    score/
    importers/
    omr/
  lib/
    audio/
    pixi/
    music/
  server/
    routes/
    jobs/
```

## 7. 对 Pixi 的使用建议

- 用 `PixiJS` 管钢琴和演奏动效，不要让它兼任表单系统
- 键盘建议按 `midi` 编号建模，从 `A0` 到 `C8`
- 舞台层要从一开始就支持缩放和横向滚动，方便后续移动端适配
- 自动演奏和手动点击都走同一套 `triggerNote` 接口，避免逻辑分叉

## 8. 未来可扩展点

- 外接 MIDI 键盘输入
- 录音与回放
- 用户作品保存
- 掉落音符学习模式
- 左右手分离练习
- 节拍器和分段循环练习
