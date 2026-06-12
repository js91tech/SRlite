import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { MIGRATION_SQL } from "./schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "../../data/roadside-radar.db");

import fs from "fs";
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.exec(MIGRATION_SQL);
console.log("Migration complete:", dbPath);
