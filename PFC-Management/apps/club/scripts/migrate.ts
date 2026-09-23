import { migrateUp, migrateDown } from "../src/db/migrate";

const cmd = process.argv[2] ?? "up";
if (cmd === "down") {
  migrateDown();
  console.log("migrate down complete");
} else {
  migrateUp();
  console.log("migrate up complete");
}
