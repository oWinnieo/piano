import type { PianoKeyLayout } from "@/modules/piano/types";

export type PianoKeyRow = {
  id: string;
  label: string;
  startMidi: number;
  endMidi: number;
};

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

export const WHITE_KEY_WIDTH = 27;
export const WHITE_KEY_HEIGHT = 114;
export const BLACK_KEY_WIDTH = 18;
export const BLACK_KEY_HEIGHT = 68;
export const ROW_GAP = 22;
export const STAGE_PADDING_X = 16;
export const STAGE_PADDING_Y = 26;

export const PIANO_KEY_ROWS = [
  { id: "low", label: "A0-C3", startMidi: 21, endMidi: 59 },
  { id: "high", label: "C4-C8", startMidi: 60, endMidi: 108 },
] as const;

function countWhiteKeysInRow({ startMidi, endMidi }: PianoKeyRow) {
  let whiteKeys = 0;

  for (let midi = startMidi; midi <= endMidi; midi += 1) {
    if (!BLACK_PITCH_CLASSES.has(midi % 12)) {
      whiteKeys += 1;
    }
  }

  return whiteKeys;
}

export function getPianoKeyboardSize(
  rows: readonly PianoKeyRow[] = PIANO_KEY_ROWS,
) {
  const maxWhiteKeysInRow = Math.max(
    ...rows.map((row) => countWhiteKeysInRow(row)),
  );

  return {
    width: STAGE_PADDING_X * 2 + maxWhiteKeysInRow * WHITE_KEY_WIDTH,
    height:
      STAGE_PADDING_Y * 2 +
      rows.length * WHITE_KEY_HEIGHT +
      Math.max(rows.length - 1, 0) * ROW_GAP,
  };
}

const DEFAULT_KEYBOARD_SIZE = getPianoKeyboardSize();

export const KEYBOARD_WIDTH = DEFAULT_KEYBOARD_SIZE.width;
export const KEYBOARD_HEIGHT = DEFAULT_KEYBOARD_SIZE.height;

export function buildPianoKeys(rows: readonly PianoKeyRow[] = PIANO_KEY_ROWS) {
  const keys: PianoKeyLayout[] = [];

  for (const [rowIndex, row] of rows.entries()) {
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

export function midiToNoteName(midi: number) {
  const pitchClass = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[pitchClass]}${octave}`;
}

export function canShowKeyLabel(key: PianoKeyLayout) {
  return (
    !key.isBlack && (key.noteName.startsWith("C") || key.noteName === "A0")
  );
}
