import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@clerk/nextjs",
              message: "CM-100/ADR-004: local auth, no Clerk.",
            },
            {
              name: "@libsql/client",
              message: "CM-100/ADR-004: Drizzle/SQLite, no Turso.",
            },
          ],
          patterns: [
            {
              group: ["@clerk/*", "@libsql/*"],
              message: "CM-100: forbidden platform import.",
            },
            {
              group: [
                "**/BeeCount-Cloud/**",
                "**/PFC-Opportunity*/**",
                "**/*event-engine*/**",
                "**/Marketplace/**",
                "**/marketplace/**",
              ],
              message: "CM-100: do not import other PFC modules or Event engine.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/domain/**/*.ts"],
    ignores: ["src/domain/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next",
              message: "CM-100: domain/ is pure FSM/policy — no Next.",
            },
            {
              name: "drizzle-orm",
              message: "CM-100: domain/ is pure FSM/policy — no Drizzle.",
            },
          ],
          patterns: [
            {
              group: ["next/*", "@/db", "@/db/*", "better-sqlite3"],
              message: "CM-100: domain/ must not import Next or DB.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
