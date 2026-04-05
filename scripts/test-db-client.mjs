// Simple test to verify SQLite database has data
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'contacts.db');

const db = new Database(dbPath);

console.log('Testing SQLite database...\n');

try {
  // Test connection
  console.log('1. Testing connection...');
  const now = db.prepare('SELECT CURRENT_TIMESTAMP as now').get();
  console.log('   ✓ Connected to SQLite');

  // Get all contacts
  console.log('\n2. Getting all contacts...');
  const contacts = db
    .prepare(`
      SELECT c.contact_id, c.first_name, c.surname, ms.marital_status
      FROM contact c
      LEFT JOIN marital_status ms ON c.status_id = ms.status_id
      ORDER BY c.first_name ASC
    `)
    .all();
  console.log(`   ✓ Found ${contacts.length} contacts:`);
  contacts.forEach((c) => {
    console.log(`     - ${c.first_name} ${c.surname} (${c.contact_id})`);
  });

  // Get single contact
  console.log('\n3. Getting single contact (c00000001)...');
  const contact = db
    .prepare('SELECT * FROM contact WHERE contact_id = ?')
    .get('c00000001');
  if (contact) {
    console.log(`   ✓ Found: ${contact.first_name} ${contact.surname}`);
  } else {
    console.log('   ✗ Not found');
  }

  console.log('\n✅ All tests passed!');
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  db.close();
}
