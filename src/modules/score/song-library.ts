import type { ScoreDocument } from "@/modules/score/types";

export const SONG_LIBRARY_API_PATH = "/api/song-library";

export type SongLibraryItem = {
  id: string;
  title: string;
  composer?: string;
  notationType: "text-numbered-notation";
  docsPath: string;
  score: ScoreDocument;
};

export type SongLibraryLoadError = {
  fileName: string;
  message: string;
};

export type SongLibraryResponse = {
  songs: SongLibraryItem[];
  errors: SongLibraryLoadError[];
};
