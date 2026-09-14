import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const ROOT = path.join(process.cwd(), "data", "private-cv");

function filePath(storageKey: string): string {
  if (!/^[a-f0-9]{64}$/.test(storageKey)) {
    throw new Error("Invalid storage key");
  }
  return path.join(ROOT, storageKey);
}

export async function writePrivateFile(storageKey: string, bytes: Buffer): Promise<void> {
  await mkdir(ROOT, { recursive: true });
  await writeFile(filePath(storageKey), bytes);
}

export async function readPrivateFile(storageKey: string): Promise<Buffer> {
  return readFile(filePath(storageKey));
}

export function safeDownloadName(name: string): string {
  const base = name.replace(/[^\w.\- ()]/g, "_").slice(0, 80);
  return base || "cv";
}
