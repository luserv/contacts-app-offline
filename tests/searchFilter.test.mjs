import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSearchFilter, getSearchChips } from '../utils/contactList.ts';

test('parseSearchFilter reads the age keyword in English and Spanish', () => {
  assert.deepEqual(parseSearchFilter('age:23'), { type: 'age', op: 'eq', value: 23 });
  assert.deepEqual(parseSearchFilter('edad:23'), { type: 'age', op: 'eq', value: 23 });
  assert.deepEqual(parseSearchFilter('EDAD:>=18'), { type: 'age', op: 'gte', value: 18 });
  assert.deepEqual(parseSearchFilter('age:<65'), { type: 'age', op: 'lt', value: 65 });
});

test('parseSearchFilter keeps everything else as text', () => {
  assert.deepEqual(parseSearchFilter('ana'), { type: 'text', value: 'ana' });
  assert.deepEqual(parseSearchFilter('edad:'), { type: 'text', value: 'edad:' });
  assert.deepEqual(parseSearchFilter('  maria  '), { type: 'text', value: 'maria' });
});

test('getSearchChips labels age filters with the provided word', () => {
  assert.deepEqual(getSearchChips('edad:>30 & ana', 'Edad'), ['Edad > 30', 'ana']);
  assert.deepEqual(getSearchChips('age:<=40', 'Age'), ['Age ≤ 40']);
  assert.deepEqual(getSearchChips('age:23', 'Age'), ['Age 23']);
});

test('getSearchChips defaults to the English label', () => {
  assert.deepEqual(getSearchChips('age:>=18'), ['Age ≥ 18']);
});

test('getSearchChips ignores empty queries and empty parts', () => {
  assert.deepEqual(getSearchChips('   '), []);
  assert.deepEqual(getSearchChips('ana & & luis'), ['ana', 'luis']);
});
