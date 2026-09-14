import { migrateDown } from "../src/db/migrator";

try {
  const version = migrateDown();
  console.log(`Rolled back one step: ${version}`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
