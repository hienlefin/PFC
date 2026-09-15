import { seedDemo } from "../src/db/migrate";

seedDemo()
  .then(() => {
    console.log("Club DB migrated + demo seeded (.data/club.sqlite)");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
