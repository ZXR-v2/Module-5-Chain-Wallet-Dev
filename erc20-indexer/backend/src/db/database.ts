import Database from 'better-sqlite3';
import type { Database as BetterSqlite3Database } from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'transfers.db');
const db: BetterSqlite3Database = new Database(dbPath);

// 创建转账记录表
db.exec(`
  CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_hash TEXT NOT NULL UNIQUE,
    block_number INTEGER NOT NULL,
    block_timestamp INTEGER NOT NULL,
    token_address TEXT NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    value TEXT NOT NULL,
    value_decimal REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_from_address ON transfers(from_address);
  CREATE INDEX IF NOT EXISTS idx_to_address ON transfers(to_address);
  CREATE INDEX IF NOT EXISTS idx_token_address ON transfers(token_address);
  CREATE INDEX IF NOT EXISTS idx_block_number ON transfers(block_number);
  CREATE INDEX IF NOT EXISTS idx_transaction_hash ON transfers(transaction_hash);
`);

// 创建索引进度表
db.exec(`
  CREATE TABLE IF NOT EXISTS index_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_address TEXT NOT NULL UNIQUE,
    last_indexed_block INTEGER NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
