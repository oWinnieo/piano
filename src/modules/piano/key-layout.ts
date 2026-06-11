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

export const WHITE_KEY_WIDTH = 29;
export const WHITE_KEY_HEIGHT = 210;
export const BLACK_KEY_WIDTH = 18;
export const BLACK_KEY_HEIGHT = 128;
export const STAGE_PADDING_X = 20;
export const STAGE_PADDING_Y = 16;
export const TOTAL_WHITE_KEYS = 52;
export const KEYBOARD_WIDTH =
  STAGE_PADDING_X * 2 + TOTAL_WHITE_KEYS * WHITE_KEY_WIDTH;
export const KEYBOARD_HEIGHT = STAGE_PADDING_Y * 2 + WHITE_KEY_HEIGHT;

function midiToNoteName(midi: number) {
  const pitchClass = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[pitchClass]}${octave}`;
}

export function buildPianoKeys() {
  const keys: PianoKeyLayout[] = [];
  let whiteIndex = 0;

  for (let midi = 21; midi <= 108; midi += 1) {
    const pitchClass = midi % 12;
    const noteName = midiToNoteName(midi);
    const isBlack = BLACK_PITCH_CLASSES.has(pitchClass);

    if (isBlack) {
      keys.push({
        midi,
        noteName,
        isBlack: true,
        x: STAGE_PADDING_X + whiteIndex * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2,
        y: STAGE_PADDING_Y,
        width: BLACK_KEY_WIDTH,
        height: BLACK_KEY_HEIGHT,
        radius: 8,
      });
      continue;
    }

    keys.push({
      midi,
      noteName,
      isBlack: false,
      x: STAGE_PADDING_X + whiteIndex * WHITE_KEY_WIDTH,
      y: STAGE_PADDING_Y,
      width: WHITE_KEY_WIDTH,
      height: WHITE_KEY_HEIGHT,
      radius: 10,
    });
    whiteIndex += 1;
  }

  return keys;
}

export function canShowKeyLabel(key: PianoKeyLayout) {
  return (
    !key.isBlack && (key.noteName.startsWith("C") || key.noteName === "A0")
  );
}
