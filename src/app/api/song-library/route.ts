import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type {
  SongLibraryItem,
  SongLibraryLoadError,
  SongLibraryResponse,
} from "@/modules/score/song-library";
import { parseTextNumberedNotation } from "@/modules/score/text-numbered-notation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SONG_LIBRARY_DIR = path.join(process.cwd(), "docs", "song-library");

function slugifyFileName(fileName: string) {
  return fileName.replace(/\.md$/i, "");
}

function extractTextNotation(markdown: string) {
  const match = /```text\s*([\s\S]*?)```/i.exec(markdown);
  return match?.[1]?.trim() ?? null;
}

function extractComposer(markdown: string) {
  const match = /作曲[：:]\s*([^\n]+)/.exec(markdown);
  return match?.[1]?.trim();
}

async function readSongFile(fileName: string): Promise<SongLibraryItem> {
  const docsPath = path.join("docs", "song-library", fileName);
  const markdown = await readFile(
    path.join(SONG_LIBRARY_DIR, fileName),
    "utf8",
  );
  const notationText = extractTextNotation(markdown);

  if (!notationText) {
    throw new Error("没有找到 ```text 代码块，无法作为文本简谱载入");
  }

  const id = slugifyFileName(fileName);
  const score = parseTextNumberedNotation(id, notationText);

  return {
    id,
    title: score.title,
    composer: extractComposer(markdown),
    notationType: "text-numbered-notation",
    docsPath,
    score,
  };
}

export async function GET() {
  const songs: SongLibraryItem[] = [];
  const errors: SongLibraryLoadError[] = [];

  try {
    const fileNames = (await readdir(SONG_LIBRARY_DIR))
      .filter((fileName) => fileName.endsWith(".md"))
      .sort((left, right) => left.localeCompare(right));

    for (const fileName of fileNames) {
      try {
        songs.push(await readSongFile(fileName));
      } catch (error) {
        errors.push({
          fileName,
          message: error instanceof Error ? error.message : "未知解析错误",
        });
      }
    }
  } catch (error) {
    errors.push({
      fileName: "docs/song-library",
      message: error instanceof Error ? error.message : "无法读取曲库目录",
    });
  }

  const response: SongLibraryResponse = {
    songs,
    errors,
  };

  return NextResponse.json(response);
}
