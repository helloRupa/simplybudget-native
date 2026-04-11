/**
 * Jest mock for expo-sqlite.
 * Implements the synchronous API surface used by utils/database.ts and
 * utils/storage.ts using better-sqlite3, so tests run real SQL queries
 * against an in-memory database.
 */
import BetterSQLite, { Database } from "better-sqlite3";

export class SQLiteDatabase {
  private _db: Database;

  constructor(db: Database) {
    this._db = db;
  }

  execSync(sql: string): void {
    this._db.exec(sql);
  }

  runSync(sql: string, ...params: unknown[]): void {
    this._db.prepare(sql).run(...params);
  }

  getAllSync<T>(sql: string, ...params: unknown[]): T[] {
    return this._db.prepare(sql).all(...params) as T[];
  }

  getFirstSync<T>(sql: string, ...params: unknown[]): T | null {
    const row = this._db.prepare(sql).get(...params);
    return (row as T) ?? null;
  }

  withTransactionSync(task: () => void): void {
    this._db.transaction(task)();
  }
}

export function openDatabaseSync(_name: string): SQLiteDatabase {
  const db = new BetterSQLite(":memory:");
  return new SQLiteDatabase(db);
}
