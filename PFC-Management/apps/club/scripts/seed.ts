import { seedDemo } from "../src/db/migrate";
import {
  DEMO_PASSWORD,
  ROLE_DEMO_ACCOUNTS,
} from "../src/db/role-demo-catalog";

seedDemo()
  .then(() => {
    console.log("Club DB migrated + demo seeded (.data/club.sqlite)\n");
    console.log("Demo accounts (ADR-003) — password:", DEMO_PASSWORD);
    console.log("-".repeat(64));
    for (const a of ROLE_DEMO_ACCOUNTS) {
      console.log(
        `${a.email.padEnd(24)} ${a.labelVi.padEnd(28)} [${a.status}]`,
      );
    }
    console.log("-".repeat(64));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
