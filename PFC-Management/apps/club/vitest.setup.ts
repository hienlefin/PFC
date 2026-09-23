import path from "node:path";
import fs from "node:fs";

const dir = path.join(process.cwd(), ".data");
fs.mkdirSync(dir, { recursive: true });
process.env.CLUB_DB_PATH = path.join(dir, "vitest.sqlite");
