import type Database from "better-sqlite3";

/** Subset of better-sqlite3 used by migrator and sqlite.transaction(...). */
export type ClubSqlite = {
  exec: (sql: string) => unknown;
  prepare: (sql: string) => {
    all: (...params: unknown[]) => unknown[];
    get: (...params: unknown[]) => unknown;
    run: (...params: unknown[]) => { changes?: number };
  };
  transaction: <T>(fn: () => T) => () => T;
  pragma: (source: string) => unknown;
};

export function asClubSqlite(db: Database.Database): ClubSqlite {
  return {
    exec: (sql) => db.exec(sql),
    prepare: (sql) => {
      const stmt = db.prepare(sql);
      return {
        all: (...params) => stmt.all(...(params as never[])) as unknown[],
        get: (...params) => stmt.get(...(params as never[])),
        run: (...params) =>
          stmt.run(...(params as never[])) as { changes?: number },
      };
    },
    transaction: (fn) => db.transaction(fn),
    pragma: (source) => db.pragma(source),
  };
}
