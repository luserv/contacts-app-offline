import { test } from 'node:test';
import assert from 'node:assert/strict';
import schema from '../utils/dbSchema.js';
import { listLabel } from '../utils/listLabels.ts';

// Ids come from the seed SQL so a new row in the schema fails this test until it is translated.
function seedIds(table) {
  const block = schema.seedSql.split(`INSERT OR IGNORE INTO ${table}`)[1].split(';')[0];
  return [...block.matchAll(/\('([a-z_]+)'/g)].map(m => m[1]);
}

test('every seeded marital status has a label in both languages', () => {
  const ids = seedIds('marital_status');
  assert.ok(ids.length >= 6);
  for (const id of ids) {
    for (const lang of ['es', 'en']) {
      assert.notEqual(listLabel('marital', lang, id, '__missing__'), '__missing__', `${lang}:${id}`);
    }
  }
});

test('every seeded relationship type has a label in both languages', () => {
  const ids = seedIds('relationship_type');
  assert.ok(ids.length >= 17);
  for (const id of ids) {
    for (const lang of ['es', 'en']) {
      assert.notEqual(listLabel('relationship', lang, id, '__missing__'), '__missing__', `${lang}:${id}`);
    }
  }
});

test('labels are translated, not copied', () => {
  assert.equal(listLabel('marital', 'en', 'soltero', 'Soltero/a'), 'Single');
  assert.equal(listLabel('marital', 'es', 'soltero', 'x'), 'Soltero/a');
  assert.equal(listLabel('relationship', 'en', 'hermano', 'Hermano'), 'Brother');
  assert.equal(listLabel('relationship', 'es', 'prima', 'x'), 'Prima');
});

test('unknown ids fall back to the stored label', () => {
  assert.equal(listLabel('marital', 'en', 'custom_id', 'Custom'), 'Custom');
  assert.equal(listLabel('relationship', 'es', 'nope', 'Stored'), 'Stored');
});
