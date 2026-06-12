import * as Tone from "tone";
import type { NoteEvent, ScoreDocument } from "@/modules/score/types";

const SAMPLE_URLS = {
  A0: "A0.mp3",
  C1: "C1.mp3",
  "D#1": "Ds1.mp3",
  "F#1": "Fs1.mp3",
  A1: "A1.mp3",
  C2: "C2.mp3",
  "D#2": "Ds2.mp3",
  "F#2": "Fs2.mp3",
  A2: "A2.mp3",
  C3: "C3.mp3",
  "D#3": "Ds3.mp3",
  "F#3": "Fs3.mp3",
  A3: "A3.mp3",
  C4: "C4.mp3",
  "D#4": "Ds4.mp3",
  "F#4": "Fs4.mp3",
  A4: "A4.mp3",
  C5: "C5.mp3",
  "D#5": "Ds5.mp3",
  "F#5": "Fs5.mp3",
  A5: "A5.mp3",
  C6: "C6.mp3",
  "D#6": "Ds6.mp3",
  "F#6": "Fs6.mp3",
  A6: "A6.mp3",
  C7: "C7.mp3",
  "D#7": "Ds7.mp3",
  "F#7": "Fs7.mp3",
  A7: "A7.mp3",
  C8: "C8.mp3",
} as const;

type PlaybackCallbacks = {
  onNoteStart?: (note: NoteEvent) => void;
  onNoteEnd?: (note: NoteEvent) => void;
  onComplete?: () => void;
};

let sampler: Tone.Sampler | null = null;
let samplerReadyPromise: Promise<Tone.Sampler> | null = null;
let noteOffTimeouts: number[] = [];

async function getSampler() {
  if (sampler) {
    return sampler;
  }

  if (!samplerReadyPromise) {
    samplerReadyPromise = (async () => {
      const instance = new Tone.Sampler({
        urls: SAMPLE_URLS,
        release: 1.2,
        baseUrl: "https://tonejs.github.io/audio/salamander/",
      }).toDestination();

      await Tone.loaded();
      sampler = instance;
      return instance;
    })();
  }

  return samplerReadyPromise;
}

function getSortedNotes(score: ScoreDocument) {
  return score.tracks
    .flatMap((track) => track.notes)
    .sort((left, right) => left.startTick - right.startTick);
}

function clearPlaybackTimeouts() {
  if (typeof window === "undefined") {
    noteOffTimeouts = [];
    return;
  }

  for (const timeoutId of noteOffTimeouts) {
    window.clearTimeout(timeoutId);
  }

  noteOffTimeouts = [];
}

export async function preparePianoAudio() {
  await Tone.start();
  return getSampler();
}

export async function triggerPianoNote(
  noteName: string,
  duration: string | number,
  velocity = 0.9,
) {
  const activeSampler = await preparePianoAudio();
  activeSampler.triggerAttackRelease(noteName, duration, undefined, velocity);
}

export async function triggerPianoNoteAttack(noteName: string, velocity = 0.9) {
  const activeSampler = await preparePianoAudio();
  activeSampler.triggerAttack(noteName, undefined, velocity);
}

export function triggerPianoNoteRelease(noteName: string) {
  sampler?.triggerRelease(noteName);
}

export function releaseAllPianoNotes() {
  sampler?.releaseAll();
}

export async function playScoreDocument(
  score: ScoreDocument,
  callbacks: PlaybackCallbacks = {},
) {
  const activeSampler = await preparePianoAudio();
  const transport = Tone.getTransport();
  const notes = getSortedNotes(score);
  const totalTicks =
    notes.reduce(
      (maxTick, note) => Math.max(maxTick, note.startTick + note.durationTick),
      0,
    ) +
    score.ppq / 2;

  stopScorePlayback();

  transport.PPQ = score.ppq;
  transport.bpm.value = score.tempo;

  for (const note of notes) {
    transport.schedule((time) => {
      const durationSeconds = Tone.Ticks(note.durationTick).toSeconds();

      activeSampler.triggerAttackRelease(
        note.pitchName,
        durationSeconds,
        time,
        note.velocity,
      );
      callbacks.onNoteStart?.(note);

      if (typeof window !== "undefined") {
        const timeoutId = window.setTimeout(() => {
          callbacks.onNoteEnd?.(note);
          noteOffTimeouts = noteOffTimeouts.filter(
            (entry) => entry !== timeoutId,
          );
        }, durationSeconds * 1000);

        noteOffTimeouts.push(timeoutId);
      }
    }, `${note.startTick}i`);
  }

  transport.schedule(() => {
    callbacks.onComplete?.();
    stopScorePlayback();
  }, `${totalTicks}i`);

  transport.start();
}

export function stopScorePlayback() {
  const transport = Tone.getTransport();

  clearPlaybackTimeouts();
  transport.stop();
  transport.cancel();

  if (sampler) {
    sampler.releaseAll();
  }
}
