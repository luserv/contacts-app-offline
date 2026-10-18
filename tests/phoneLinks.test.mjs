import { test } from 'node:test';
import assert from 'node:assert/strict';
import { telHref, whatsappNumber, whatsappHref } from '../utils/phoneLinks.ts';

test('whatsappNumber keeps explicit international numbers', () => {
  assert.equal(whatsappNumber('+593 99 825 7343'), '593998257343');
  assert.equal(whatsappNumber('+1 (415) 555-0100'), '14155550100');
});

test('whatsappNumber adds the default country code to local numbers', () => {
  assert.equal(whatsappNumber('0998257343'), '593998257343');
  assert.equal(whatsappNumber('998257343'), '593998257343');
});

test('whatsappNumber leaves numbers that already include the country code', () => {
  assert.equal(whatsappNumber('593998257343'), '593998257343');
  assert.equal(whatsappNumber('00593998257343'), '593998257343');
});

test('whatsappNumber honors a custom country code', () => {
  assert.equal(whatsappNumber('0991234567', '57'), '57991234567');
});

test('whatsappNumber rejects empty or too short input', () => {
  assert.equal(whatsappNumber(''), '');
  assert.equal(whatsappNumber('abc'), '');
  assert.equal(whatsappNumber('12345'), '');
  assert.equal(whatsappNumber('+12345'), '');
});

test('whatsappHref builds a wa.me link or an empty string', () => {
  assert.equal(whatsappHref('0998257343'), 'https://wa.me/593998257343');
  assert.equal(whatsappHref('12'), '');
});

test('telHref strips formatting and keeps the plus sign', () => {
  assert.equal(telHref('+593 (99) 825-7343'), 'tel:+593998257343');
  assert.equal(telHref(''), '');
  assert.equal(telHref('no digits'), '');
});
