import type { PianoKeyLayout } from "@/modules/piano/types";

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

export const WHITE_KEY_WIDTH = 30;
export const WHITE_KEY_HEIGHT = 126;
export const BLACK_KEY_WIDTH = 20;
export const BLACK_KEY_HEIGHT = 76;
export const ROW_GAP = 22;
export const STAGE_PADDING_X = 18;
export const STAGE_PADDING_Y = 16;

export const PIANO_KEY_ROWS = [
  { id: "low", label: "A0-C1", startMidi: 21, endMidi: 35 },
  { id: "bass", label: "C2-C3", startMidi: 36, endMidi: 59 },
  { id: "middle", label: "C4-C5", startMidi: 60, endMidi: 83 },
  { id: "high", label: "C6-C8", startMidi: 84, endMidi: 108 },
] as const;

const MAX_WHITE_KEYS_IN_ROW = Math.max(
  ...PIANO_KEY_ROWS.map(({ startMidi, endMidi }) => {
    let whiteKeys = 0;

    for (let midi = startMidi; midi <= endMidi; midi += 1) {
      if (!BLACK_PITCH_CLASSES.has(midi % 12)) {
        whiteKeys += 1;
      }
    }

    return whiteKeys;
  }),
);

export const KEYBOARD_WIDTH =
  STAGE_PADDING_X * 2 + MAX_WHITE_KEYS_IN_ROW * WHITE_KEY_WIDTH;
export const KEYBOARD_HEIGHT =
  STAGE_PADDING_Y * 2 +
  PIANO_KEY_ROWS.length * WHITE_KEY_HEIGHT +
  (PIANO_KEY_ROWS.length - 1) * ROW_GAP;

export function midiToNoteName(midi: number) {
  const pitchClass = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[pitchClass]}${octave}`;
}

export function buildPianoKeys() {
  const keys: PianoKeyLayout[] = [];

  for (const [rowIndex, row] of PIANO_KEY_ROWS.entries()) {
    let whiteIndex = 0;
    const y = STAGE_PADDING_Y + rowIndex * (WHITE_KEY_HEIGHT + ROW_GAP);

    for (let midi = row.startMidi; midi <= row.endMidi; midi += 1) {
      const pitchClass = midi % 12;
      const noteName = midiToNoteName(midi);
      const isBlack = BLACK_PITCH_CLASSES.has(pitchClass);

      if (isBlack) {
        keys.push({
          midi,
          noteName,
          isBlack: true,
          x:
            STAGE_PADDING_X +
            whiteIndex * WHITE_KEY_WIDTH -
            BLACK_KEY_WIDTH / 2,
          y,
          width: BLACK_KEY_WIDTH,
          height: BLACK_KEY_HEIGHT,
          radius: 6,
        });
        continue;
      }

      keys.push({
        midi,
        noteName,
        isBlack: false,
        x: STAGE_PADDING_X + whiteIndex * WHITE_KEY_WIDTH,
        y,
        width: WHITE_KEY_WIDTH,
        height: WHITE_KEY_HEIGHT,
        radius: 8,
      });
      whiteIndex += 1;
    }
  }

  return keys;
}

export function canShowKeyLabel(key: PianoKeyLayout) {
  return (
    !key.isBlack && (key.noteName.startsWith("C") || key.noteName === "A0")
  );
}
