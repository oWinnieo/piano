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
