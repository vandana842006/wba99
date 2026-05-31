// Copies games/dist → dist/games after both apps are built
import { cpSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root   = dirname(dirname(fileURLToPath(import.meta.url)));
const src    = join(root, "games", "dist");
const dest   = join(root, "dist", "games");

if (!existsSync(src)) {
  console.error("games/dist not found — run 'npm run build:games' first");
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("Copied games/dist → dist/games");
