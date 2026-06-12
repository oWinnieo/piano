import { PIANO_KEY_ROWS, midiToNoteName } from "@/modules/piano/key-layout";

const KEYBOARD_NOTE_MAPPINGS = [
  ["KeyZ", "Z"],
  ["KeyS", "S"],
  ["KeyX", "X"],
  ["KeyD", "D"],
  ["KeyC", "C"],
  ["KeyV", "V"],
  ["KeyG", "G"],
  ["KeyB", "B"],
  ["KeyH", "H"],
  ["KeyN", "N"],
  ["KeyJ", "J"],
  ["KeyM", "M"],
  ["KeyQ", "Q"],
  ["Digit2", "2"],
  ["KeyW", "W"],
  ["Digit3", "3"],
  ["KeyE", "E"],
  ["KeyR", "R"],
  ["Digit5", "5"],
  ["KeyT", "T"],
  ["Digit6", "6"],
  ["KeyY", "Y"],
  ["Digit7", "7"],
  ["KeyU", "U"],
] as const;

const KEYBOARD_CODE_OFFSETS = Object.fromEntries(
  KEYBOARD_NOTE_MAPPINGS.map(([code], index) => [code, index]),
) as Record<(typeof KEYBOARD_NOTE_MAPPINGS)[number][0], number>;

const KEYBOARD_CODE_LABELS = Object.fromEntries(
  KEYBOARD_NOTE_MAPPINGS,
) as Record<(typeof KEYBOARD_NOTE_MAPPINGS)[number][0], string>;

export type PianoKeyboardRowId = (typeof PIANO_KEY_ROWS)[number]["id"];

export const KEYBOARD_ROW_OPTIONS = PIANO_KEY_ROWS.map((row) => ({
  id: row.id,
  label: row.label,
  startMidi: row.startMidi,
  endMidi: row.endMidi,
}));

export const DEFAULT_KEYBOARD_ROW_ID: PianoKeyboardRowId = "middle";

export type KeyboardNoteCode = keyof typeof KEYBOARD_CODE_OFFSETS;

function getKeyboardRow(rowId: PianoKeyboardRowId) {
  return PIANO_KEY_ROWS.find((row) => row.id === rowId) ?? PIANO_KEY_ROWS[2];
}

export function getKeyboardMappedMidi(code: string, rowId: PianoKeyboardRowId) {
  const offset = KEYBOARD_CODE_OFFSETS[code as KeyboardNoteCode];

  if (offset === undefined) {
    return null;
  }

  const row = getKeyboardRow(rowId);
  const midi = row.startMidi + offset;

  return midi <= row.endMidi ? midi : null;
}

export function getKeyboardRangeLabel(rowId: PianoKeyboardRowId) {
  const row = getKeyboardRow(rowId);

  return `${midiToNoteName(row.startMidi)} - ${midiToNoteName(row.endMidi)}`;
}

export function getKeyboardMidiLabels(rowId: PianoKeyboardRowId) {
  const row = getKeyboardRow(rowId);
  const entries: Array<[number, string]> = [];

  for (const [code, label] of KEYBOARD_NOTE_MAPPINGS) {
    const midi = getKeyboardMappedMidi(code, row.id);

    if (midi !== null) {
      entries.push([midi, label]);
    }
  }

  return Object.fromEntries(entries);
}
