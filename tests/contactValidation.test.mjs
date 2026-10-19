import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidPhone, isValidEmail } from '../utils/contactValidation.ts';

test('isValidPhone accepts common formats', () => {
  for (const ok of ['0998257343', '+593 99 825 7343', '(02) 245-6789', '+1 (415) 555-0100', '099.825.7343', '12345678']) {
    assert.equal(isValidPhone(ok), true, ok);
  }
});

test('isValidPhone rejects letters and junk', () => {
  for (const bad of ['0998257343vMoil', 'abc', 'phone: 0998257343', '099#8257343', '']) {
    assert.equal(isValidPhone(bad), false, bad);
  }
});

test('isValidPhone requires a plausible number of digits', () => {
  assert.equal(isValidPhone('12345'), false);
  assert.equal(isValidPhone('1'.repeat(16)), false);
  assert.equal(isValidPhone('1'.repeat(15)), true);
});

test('isValidPhone only allows a leading plus', () => {
  assert.equal(isValidPhone('+593998257343'), true);
  assert.equal(isValidPhone('593+998257343'), false);
  assert.equal(isValidPhone('++593998257343'), false);
});

test('isValidEmail accepts normal addresses', () => {
  for (const ok of ['ana@example.com', 'ana.torres14@example.co.uk', 'a+tag@sub.example.org']) {
    assert.equal(isValidEmail(ok), true, ok);
  }
});

test('isValidEmail rejects malformed addresses', () => {
  for (const bad of ['', 'ana', 'ana@', '@example.com', 'ana@example', 'ana @example.com', 'ana@exa mple.com', 'ana@@example.com']) {
    assert.equal(isValidEmail(bad), false, bad);
  }
});
