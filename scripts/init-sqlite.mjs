#!/usr/bin/env node
/**
 * Initialize SQLite database with schema and seed data
 * Usage: node scripts/init-sqlite.js [--seed]
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'contacts.db');

// Create data directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Created directory: ${dataDir}`);
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Initializing SQLite database...');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS marital_status (
    status_id TEXT PRIMARY KEY,
    marital_status TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contact (
    contact_id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    surname TEXT NOT NULL,
    status_id TEXT,
    FOREIGN KEY (status_id) REFERENCES marital_status (status_id)
  );

  CREATE TABLE IF NOT EXISTS national_identity_card (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id TEXT NOT NULL UNIQUE,
    doc_type TEXT NOT NULL,
    card_number TEXT NOT NULL,
    FOREIGN KEY (contact_id) REFERENCES contact (contact_id)
  );

  CREATE INDEX IF NOT EXISTS idx_contact_first_name ON contact(first_name);
  CREATE INDEX IF NOT EXISTS idx_contact_status_id ON contact(status_id);
`);

console.log('✓ Tables created');

// Check if --seed flag is provided
const shouldSeed = process.argv.includes('--seed');

if (shouldSeed) {
  console.log('Seeding database...');

  // Clear existing data
  db.exec('DELETE FROM national_identity_card; DELETE FROM contact; DELETE FROM marital_status;');

  // Insert marital statuses
  const insertStatus = db.prepare(`
    INSERT INTO marital_status (status_id, marital_status)
    VALUES (?, ?)
  `);

  insertStatus.run('soltero', 'Soltero/a');
  insertStatus.run('casado', 'Casado/a');
  insertStatus.run('divorciado', 'Divorciado/a');
  insertStatus.run('viudo', 'Viudo/a');
  insertStatus.run('union_libre', 'Unión libre');
  insertStatus.run('separado', 'Separado/a');
  console.log('✓ Marital statuses inserted');

  // Insert sample contacts
  const insertContact = db.prepare(`
    INSERT INTO contact (contact_id, first_name, surname, status_id)
    VALUES (?, ?, ?, ?)
  `);

  insertContact.run('c00000001', 'Alice', 'Smith', 'single');
  insertContact.run('c00000002', 'Bob', 'Jones', 'married');
  console.log('✓ Sample contacts inserted');

  // Insert sample identity card
  const insertCard = db.prepare(`
    INSERT INTO national_identity_card (contact_id, doc_type, card_number)
    VALUES (?, ?, ?)
  `);

  insertCard.run('c00000001', 'ID', 'ABC123456');
  console.log('✓ Sample identity card inserted');
}

db.close();
console.log(`✓ Database initialized at: ${dbPath}`);
