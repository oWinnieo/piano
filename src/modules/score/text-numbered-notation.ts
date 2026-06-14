import { midiToNoteName } from "@/modules/piano/key-layout";
import type {
  NoteEvent,
  ScoreDocument,
  ScoreTrack,
} from "@/modules/score/types";

const DEFAULT_PPQ = 480;
const DEFAULT_TEMPO = 96;
const DEFAULT_TIME_SIGNATURE: [number, number] = [4, 4];

const BASE_MIDI_BY_DEGREE = {
  "1": 60,
  "2": 62,
  "3": 64,
  "4": 65,
  "5": 67,
  "6": 69,
  "7": 71,
} as const;

type ParsedToken =
  | {
      type: "notes";
      midis: number[];
      durationTick: number;
    }
  | {
      type: "rest";
      durationTick: number;
    };

type ParseTrackOptions = {
  id: string;
  name: string;
  clef: "treble" | "bass";
  hand: "L" | "R";
  staff: 1 | 2;
  text: string;
  ppq: number;
};

function parseTimeSignature(value: string): [number, number] {
  const [beatsPerMeasure, beatUnit] = value.split("/").map(Number);

  if (!beatsPerMeasure || !beatUnit) {
    return DEFAULT_TIME_SIGNATURE;
  }

  return [beatsPerMeasure, beatUnit];
}

function getDottedBeatMultiplier(dotCount: number) {
  if (dotCount === 0) {
    return 1;
  }

  if (dotCount === 1) {
    return 1.5;
  }

  if (dotCount === 2) {
    return 1.75;
  }

  throw new Error("暂不支持超过两个附点的文本简谱 token");
}

function getTokenDurationTick(token: string, ppq: number) {
  const slashCount = (token.match(/\//g) ?? []).length;
  const dotCount = (token.match(/\./g) ?? []).length;

  return Math.round(
    (ppq / 2 ** slashCount) * getDottedBeatMultiplier(dotCount),
  );
}

function parsePitchToken(token: string) {
  const accidental = token.startsWith("#") ? 1 : token.startsWith("b") ? -1 : 0;
  const body = accidental === 0 ? token : token.slice(1);
  const degree = body[0];

  if (!/[1-7]/.test(degree)) {
    throw new Error(`无法解析文本简谱 token: ${token}`);
  }

  const highOctaveCount = (body.match(/\^/g) ?? []).length;
  const lowOctaveCount = (body.match(/,/g) ?? []).length;

  return (
    BASE_MIDI_BY_DEGREE[degree as keyof typeof BASE_MIDI_BY_DEGREE] +
    accidental +
    highOctaveCount * 12 -
    lowOctaveCount * 12
  );
}

function parseNoteToken(token: string, ppq: number): ParsedToken {
  const chordMatch = /^\[([^\]]+)\](.*)$/.exec(token);

  if (chordMatch) {
    return {
      type: "notes",
      midis: chordMatch[1].split("+").map(parsePitchToken),
      durationTick: getTokenDurationTick(chordMatch[2], ppq),
    };
  }

  const accidental = token.startsWith("#") ? 1 : token.startsWith("b") ? -1 : 0;
  const body = accidental === 0 ? token : token.slice(1);
  const degree = body[0];

  if (!/[0-7]/.test(degree)) {
    throw new Error(`无法解析文本简谱 token: ${token}`);
  }

  if (degree === "0" && accidental !== 0) {
    throw new Error(`休止符不能使用临时升降号: ${token}`);
  }

  const durationTick = getTokenDurationTick(body, ppq);

  if (degree === "0") {
    return {
      type: "rest",
      durationTick,
    };
  }

  return {
    type: "notes",
    midis: [parsePitchToken(token)],
    durationTick,
  };
}

function parseTrack({
  id,
  name,
  clef,
  hand,
  staff,
  text,
  ppq,
}: ParseTrackOptions): ScoreTrack {
  const notes: NoteEvent[] = [];
  let currentTick = 0;
  let lastNotes: NoteEvent[] = [];

  for (const token of text.split(/\s+/).filter(Boolean)) {
    if (token === "|") {
      continue;
    }

    if (token === "-") {
      lastNotes.forEach((note) => {
        note.durationTick += ppq;
      });

      currentTick += ppq;
      continue;
    }

    const parsedToken = parseNoteToken(token, ppq);

    if (parsedToken.type === "rest") {
      lastNotes = [];
      currentTick += parsedToken.durationTick;
      continue;
    }

    const parsedNotes = parsedToken.midis.map((midi, noteIndex) => ({
      id: `${id}-${notes.length + noteIndex + 1}`,
      midi,
      pitchName: midiToNoteName(midi),
      startTick: currentTick,
      durationTick: parsedToken.durationTick,
      velocity: hand === "R" ? 0.86 : 0.74,
      staff,
      hand,
    }));

    notes.push(...parsedNotes);
    lastNotes = parsedNotes;
    currentTick += parsedToken.durationTick;
  }

  return {
    id,
    name,
    clef,
    notes,
  };
}

function buildMeasures(
  totalTicks: number,
  ppq: number,
  timeSignature: [number, number],
) {
  const [beatsPerMeasure, beatUnit] = timeSignature;
  const measureTick = ppq * beatsPerMeasure * (4 / beatUnit);
  const measureCount = Math.max(1, Math.ceil(totalTicks / measureTick));

  return Array.from({ length: measureCount }, (_, index) => ({
    index,
    startTick: index * measureTick,
    endTick: (index + 1) * measureTick,
  }));
}

export function parseTextNumberedNotation(
  id: string,
  sourceText: string,
): ScoreDocument {
  const metadata = new Map<string, string>();
  const trackLines = new Map<"RH" | "LH", string[]>();
  let activeTrack: "RH" | "LH" | null = null;

  for (const rawLine of sourceText.split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const trackMatch = /^(RH|LH):\s*(.*)$/.exec(line);

    if (trackMatch) {
      activeTrack = trackMatch[1] as "RH" | "LH";
      trackLines.set(activeTrack, [
        ...(trackLines.get(activeTrack) ?? []),
        trackMatch[2],
      ]);
      continue;
    }

    if (activeTrack) {
      trackLines.set(activeTrack, [
        ...(trackLines.get(activeTrack) ?? []),
        line,
      ]);
      continue;
    }

    const metadataMatch = /^([a-zA-Z]+)=(.*)$/.exec(line);

    if (metadataMatch) {
      metadata.set(metadataMatch[1].toLowerCase(), metadataMatch[2].trim());
    }
  }

  const ppq = DEFAULT_PPQ;
  const title = metadata.get("title") ?? "Untitled Score";
  const tempo = Number(metadata.get("tempo")) || DEFAULT_TEMPO;
  const timeSignature = parseTimeSignature(
    metadata.get("time") ??
      `${DEFAULT_TIME_SIGNATURE[0]}/${DEFAULT_TIME_SIGNATURE[1]}`,
  );
  const tracks: ScoreTrack[] = [];

  const rightHandText = trackLines.get("RH")?.join(" ") ?? "";
  const leftHandText = trackLines.get("LH")?.join(" ") ?? "";

  if (rightHandText) {
    tracks.push(
      parseTrack({
        id: `${id}-right-hand`,
        name: "Right Hand",
        clef: "treble",
        hand: "R",
        staff: 1,
        text: rightHandText,
        ppq,
      }),
    );
  }

  if (leftHandText) {
    tracks.push(
      parseTrack({
        id: `${id}-left-hand`,
        name: "Left Hand",
        clef: "bass",
        hand: "L",
        staff: 2,
        text: leftHandText,
        ppq,
      }),
    );
  }

  const totalTicks = tracks.reduce((maxTick, track) => {
    return track.notes.reduce(
      (trackMaxTick, note) =>
        Math.max(trackMaxTick, note.startTick + note.durationTick),
      maxTick,
    );
  }, 0);

  return {
    id,
    title,
    tempo,
    timeSignature,
    ppq,
    measures: buildMeasures(totalTicks, ppq, timeSignature),
    tracks,
    source: {
      type: "text",
      originalName: `${id}.text-numbered-notation`,
    },
  };
}
