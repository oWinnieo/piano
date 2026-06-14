import { PIANO_KEY_ROWS, midiToNoteName } from "@/modules/piano/key-layout";

const KEYBOARD_NOTE_MAPPINGS = [
  ["KeyZ", "Z", 0],
  ["KeyS", "S", 1],
  ["KeyX", "X", 2],
  ["KeyD", "D", 3],
  ["KeyC", "C", 4],
  ["KeyV", "V", 5],
  ["KeyG", "G", 6],
  ["KeyB", "B", 7],
  ["KeyH", "H", 8],
  ["KeyN", "N", 9],
  ["KeyJ", "J", 10],
  ["KeyM", "M", 11],
  ["KeyQ", "Q", 12],
  ["Digit2", "2", 13],
  ["KeyW", "W", 14],
  ["Digit3", "3", 15],
  ["KeyE", "E", 16],
  ["KeyR", "R", 17],
  ["Digit5", "5", 18],
  ["KeyT", "T", 19],
  ["Digit6", "6", 20],
  ["KeyY", "Y", 21],
  ["Digit7", "7", 22],
  ["KeyU", "U", 23],
] as const;

const LOWEST_PIANO_MIDI = Math.min(...PIANO_KEY_ROWS.map((row) => row.startMidi));
const HIGHEST_PIANO_MIDI = Math.max(...PIANO_KEY_ROWS.map((row) => row.endMidi));
const MIDI_C0 = 12;

const SUPPLEMENTAL_LOW_END_MAPPINGS = [
  ["Comma", ",", 21],
  ["KeyL", "L", 22],
  ["Period", ".", 23],
] as const;

const KEYBOARD_CODE_OFFSETS = Object.fromEntries(
  KEYBOARD_NOTE_MAPPINGS.map(([code, , offset]) => [code, offset]),
) as Record<string, number>;

const KEYBOARD_CODE_LABELS = Object.fromEntries(
  [
    ...KEYBOARD_NOTE_MAPPINGS.map(([code, label]) => [code, label]),
    ...SUPPLEMENTAL_LOW_END_MAPPINGS.map(([code, label]) => [code, label]),
  ],
) as Record<
  | (typeof KEYBOARD_NOTE_MAPPINGS)[number][0]
  | (typeof SUPPLEMENTAL_LOW_END_MAPPINGS)[number][0],
  string
>;

const KEYBOARD_OCTAVE_WINDOWS = Array.from({ length: 7 }, (_, index) => {
  const octave = index + 1;
  const startMidi = MIDI_C0 + octave * 12;
  const endMidi = startMidi + 12;

  return {
    id: `c${octave}-c${octave + 1}`,
    label: `C${octave}-C${octave + 1}`,
    startMidi,
    endMidi,
  };
});

export type PianoKeyboardRowId = (typeof KEYBOARD_OCTAVE_WINDOWS)[number]["id"];

export const KEYBOARD_ROW_OPTIONS = KEYBOARD_OCTAVE_WINDOWS;

export const DEFAULT_KEYBOARD_ROW_ID: PianoKeyboardRowId = "c4-c5";

export type KeyboardNoteCode =
  | keyof typeof KEYBOARD_CODE_OFFSETS
  | (typeof SUPPLEMENTAL_LOW_END_MAPPINGS)[number][0];

function getKeyboardRow(rowId: PianoKeyboardRowId) {
  return (
    KEYBOARD_OCTAVE_WINDOWS.find((row) => row.id === rowId) ??
    KEYBOARD_OCTAVE_WINDOWS[4]
  );
}

function isPlayablePianoMidi(midi: number) {
  return midi >= LOWEST_PIANO_MIDI && midi <= HIGHEST_PIANO_MIDI;
}

export function getKeyboardMappedMidi(code: string, rowId: PianoKeyboardRowId) {
  const row = getKeyboardRow(rowId);

  if (row.startMidi === 24) {
    const supplementalMapping = SUPPLEMENTAL_LOW_END_MAPPINGS.find(
      ([mappingCode]) => mappingCode === code,
    );

    if (supplementalMapping) {
      return supplementalMapping[2];
    }
  }

  const offset = KEYBOARD_CODE_OFFSETS[code as KeyboardNoteCode];

  if (offset === undefined) {
    return null;
  }

  const midi = row.startMidi + offset;

  return isPlayablePianoMidi(midi) ? midi : null;
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

  if (row.startMidi === 24) {
    for (const [code, label, midi] of SUPPLEMENTAL_LOW_END_MAPPINGS) {
      if (isPlayablePianoMidi(midi)) {
        entries.push([midi, KEYBOARD_CODE_LABELS[code] ?? label]);
      }
    }
  }

  return Object.fromEntries(entries);
}
