# 文本简谱输入规范

本文档定义项目内“文本简谱”输入格式，用于把用户输入的乐谱文本稳定转换为内部 `ScoreDocument` / `NoteEvent` 数据结构。

设计目标：

- 保留简谱里“数字、小节线、延音线、减时线”的直观写法。
- 每个符号只表达一种含义，避免低音点和附点混用。
- 让解析器可以按 token 精准转换为 MIDI 音高、起始 tick 和持续 tick。

## 1. 基础约定

- 默认调号：`1=C`。
- 默认中音区：`1` 对应 `C4`，MIDI 编号 `60`。
- 默认时值：一个音符 token 表示四分音符，即 `1` 拍。
- 默认 PPQ：使用项目当前约定 `480` ticks per quarter note。
- 音符、休止符、延音符之间必须用空格分隔。
- 换行只用于排版，解析时等同于空格。

## 2. 音高表示

使用数字 `1` 到 `7` 表示简谱音级，`0` 表示休止符。

| 文本 | 音级   | C 大调音名 | MIDI |
| :--- | :----- | :--------- | ---: |
| `1`  | do     | C4         |   60 |
| `2`  | re     | D4         |   62 |
| `3`  | mi     | E4         |   64 |
| `4`  | fa     | F4         |   65 |
| `5`  | sol    | G4         |   67 |
| `6`  | la     | A4         |   69 |
| `7`  | si     | B4         |   71 |
| `0`  | 休止符 | 无         |   无 |

## 3. 临时升降号

使用前缀 `#` 和 `b` 表示临时升半音、降半音。

- `#`：升高半音，MIDI `+1`。
- `b`：降低半音，MIDI `-1`。
- 临时升降号写在音级数字前面，八度、减时线和附点仍然写在数字后面。
- `0` 是休止符，不能添加临时升降号。

示例：

| 文本  | 含义       | MIDI |
| :---- | :--------- | ---: |
| `#2`  | 升 re / D# |   63 |
| `b3`  | 降 mi / Eb |   63 |
| `#2^` | 高音 D#    |   75 |
| `b7,` | 低音 Bb    |   58 |

例如《致爱丽丝》开头的 `E D# E D# E B D C A`，应写作：

```text
3^ #2^ 3^ #2^ 3^ 7 2^ 1^ 6
```

## 4. 八度表示

为了避免传统简谱中的点号 `.` 同时表示低音和附点，本项目使用后缀表示八度：

- `^`：升高一个八度，每多一个 `^`，MIDI `+12`。
- `,`：降低一个八度，每多一个 `,`，MIDI `-12`。
- 无八度后缀：中音区。

示例：

| 文本  | 含义      | MIDI |
| :---- | :-------- | ---: |
| `1,,` | 倍低音 do |   36 |
| `1,`  | 低音 do   |   48 |
| `1`   | 中音 do   |   60 |
| `1^`  | 高音 do   |   72 |
| `1^^` | 倍高音 do |   84 |

## 5. 时值表示

四分音符是基础时值。比四分音符更长时使用独立 token `-` 表示延音；比四分音符更短时使用 `/` 作为减时后缀。

| 类型         | 文本      |  拍数 | durationTick |
| :----------- | :-------- | ----: | -----------: |
| 全音符       | `5 - - -` |     4 |    `480 * 4` |
| 二分音符     | `5 -`     |     2 |    `480 * 2` |
| 四分音符     | `5`       |     1 |        `480` |
| 八分音符     | `5/`      |   0.5 |    `480 / 2` |
| 十六分音符   | `5//`     |  0.25 |    `480 / 4` |
| 三十二分音符 | `5///`    | 0.125 |    `480 / 8` |

解析延音时，`-` 不生成新的 `NoteEvent`。它会把前一个音符或休止符的持续时间增加 `1` 拍。

## 6. 附点

点号 `.` 只表示附点，必须写在音符或休止符 token 末尾。

| 类型           | 文本   |  拍数 |
| :------------- | :----- | ----: |
| 附点四分音符   | `1.`   |   1.5 |
| 双附点四分音符 | `1..`  |  1.75 |
| 附点八分音符   | `1/.`  |  0.75 |
| 附点十六分音符 | `1//.` | 0.375 |

附点计算规则：

- 一个点：基础时值乘以 `1.5`。
- 两个点：基础时值乘以 `1.75`。

## 7. 休止符

`0` 表示休止符。休止符的时值规则和普通音符完全一致，但不会生成带 MIDI 音高的 `NoteEvent`。

| 类型           | 文本      | 拍数 |
| :------------- | :-------- | ---: |
| 全休止符       | `0 - - -` |    4 |
| 二分休止符     | `0 -`     |    2 |
| 四分休止符     | `0`       |    1 |
| 八分休止符     | `0/`      |  0.5 |
| 十六分休止符   | `0//`     | 0.25 |
| 附点八分休止符 | `0/.`     | 0.75 |

解析休止符时，应推进当前播放位置 `currentTick`，但不写入 `tracks[].notes`。

## 8. 和弦

使用方括号和 `+` 表示同一时间开始、同一时值结束的多个音。和弦的时值后缀写在右方括号之后。

```text
[1+3+5]
[#2^+5^]//
```

含义：

- `[1+3+5]`：`1`、`3`、`5` 同时按下，持续 `1` 拍。
- `[#2^+5^]//`：高音 `D#` 和高音 `G` 同时按下，持续十六分音符。
- 和弦内部只能写音高与八度，例如 `#2^`、`6,,`；减时线 `/` 和附点 `.` 必须写在整个和弦之后。
- `-` 会延长前一个音符或和弦中的所有音。

## 9. 小节和排版标记

以下符号用于增强可读性：

- `|`：小节线。
- 换行：乐谱换行。

解析器可以忽略这些标记，但推荐在遇到小节线时校验当前小节累计拍数是否等于拍号要求。例如 `timeSignature=[4, 4]` 时，每小节应累计 `4` 拍。

## 10. 连音

连音使用 `数字 + 大括号` 表示。

```text
3{1 2 3}
```

含义：大括号内的所有音符总共占 `1` 拍，内部 `3` 个音符均分，每个音符占 `1 / 3` 拍。

首版解析器可以先不实现连音，但应把这类 token 作为保留语法，并给出明确错误提示。

## 11. 推荐输入文件格式

推荐让完整文本输入包含元信息和左右手声部：

```text
title=小星星
tempo=100
time=4/4
key=C

RH: 1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 - |
LH: 1, - 5, - | 6, - 5, - | 4, - 3, - | 2, - 1, - |
```

字段说明：

| 字段    | 必填 | 说明                                    |
| :------ | :--- | :-------------------------------------- |
| `title` | 否   | 曲名，默认可以使用 `Untitled Score`     |
| `tempo` | 否   | BPM，默认可以使用 `96`                  |
| `time`  | 否   | 拍号，默认可以使用 `4/4`                |
| `key`   | 否   | 调号，首版建议只支持 `C`                |
| `RH:`   | 否   | 右手声部，写入 `staff: 1` / `hand: "R"` |
| `LH:`   | 否   | 左手声部，写入 `staff: 2` / `hand: "L"` |

## 12. 转换到内部结构

文本简谱应转换为项目当前的 `ScoreDocument`：

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
```

每个非休止音符转换为一个 `NoteEvent`：

```ts
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
```

推荐转换规则：

- `startTick`：当前声部的累计 tick。
- `durationTick`：`拍数 * ppq`。
- `midi`：基础音级 MIDI + 临时升降号偏移 + 八度偏移。
- 和弦会在相同 `startTick` 写入多个 `NoteEvent`。
- `pitchName`：由 MIDI 编号反推，例如 `60 -> C4`。
- `velocity`：未指定时右手可用 `0.86`，左手可用 `0.74`。
- `source.type`：设置为 `"text"`。

## 13. Token 解析参考

单个音符 token 可以按以下顺序解析：

1. 读取可选前缀 `#` 或 `b`，计算临时升降号偏移。
2. 读取音级字符，必须是 `0` 到 `7`。
3. 如果是 `0`，标记为休止符，并禁止使用临时升降号。
4. 统计 `^` 和 `,`，计算八度偏移。
5. 统计 `/`，计算基础时值：`1 / 2 ** slashCount`。
6. 统计 `.`，计算附点时值。
7. 把最终拍数换算为 `durationTick`。

和弦 token 可以先匹配 `[...]`，将内部用 `+` 分割后按音高 token 解析，再把右方括号后的后缀按普通时值规则解析。

参考 TypeScript 伪代码：

```ts
const BASE_MIDI_BY_DEGREE = {
  "1": 60,
  "2": 62,
  "3": 64,
  "4": 65,
  "5": 67,
  "6": 69,
  "7": 71,
} as const;

function parseNoteToken(token: string, ppq: number) {
  const accidental = token.startsWith("#") ? 1 : token.startsWith("b") ? -1 : 0;
  const body = accidental === 0 ? token : token.slice(1);
  const degree = body[0];

  if (!/[0-7]/.test(degree)) {
    throw new Error(`Invalid note token: ${token}`);
  }

  if (degree === "0" && accidental !== 0) {
    throw new Error(`Rest token cannot have accidental: ${token}`);
  }

  const slashCount = (body.match(/\//g) ?? []).length;
  const dotCount = (body.match(/\./g) ?? []).length;
  const highOctaveCount = (body.match(/\^/g) ?? []).length;
  const lowOctaveCount = (body.match(/,/g) ?? []).length;

  let beats = 1 / 2 ** slashCount;

  if (dotCount === 1) {
    beats *= 1.5;
  } else if (dotCount === 2) {
    beats *= 1.75;
  } else if (dotCount > 2) {
    throw new Error(`Too many dots in token: ${token}`);
  }

  const durationTick = Math.round(beats * ppq);

  if (degree === "0") {
    return {
      type: "rest" as const,
      beats,
      durationTick,
    };
  }

  const midi =
    BASE_MIDI_BY_DEGREE[degree as keyof typeof BASE_MIDI_BY_DEGREE] +
    accidental +
    highOctaveCount * 12 -
    lowOctaveCount * 12;

  return {
    type: "note" as const,
    degree,
    accidental,
    midi,
    beats,
    durationTick,
  };
}
```

## 13. 小星星完整示例

```text
title=小星星
tempo=100
time=4/4
key=C

RH: 1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 - |
    5 5 4 4 | 3 3 2 - | 5 5 4 4 | 3 3 2 - |
    1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 - |
```

该示例转换后：

- `tempo` 为 `100`。
- `timeSignature` 为 `[4, 4]`。
- 右手轨道生成 `staff: 1` / `hand: "R"` 的 `NoteEvent[]`。
- 每个 `-` 会延长前一个音符 `480` tick，不单独生成音符。
