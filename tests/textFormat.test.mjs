import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toTitleDisplay } from '../utils/textFormat.ts';

test('capitalizes each word of an uppercase stored name', () => {
  assert.equal(toTitleDisplay('BANCO CENTRAL'), 'Banco Central');
  assert.equal(toTitleDisplay('CLÍNICA SANTA MARÍA'), 'Clínica Santa María');
  assert.equal(toTitleDisplay('ESTUDIO JURÍDICO PEÑA'), 'Estudio Jurídico Peña');
});

test('keeps short connectors lowercase except at the start', () => {
  assert.equal(toTitleDisplay('BANCO DE LA NACIÓN'), 'Banco de la Nación');
  assert.equal(toTitleDisplay('DE LA CRUZ Y ASOCIADOS'), 'De la Cruz y Asociados');
  assert.equal(toTitleDisplay('BANK OF THE WEST'), 'Bank of the West');
});

test('handles apostrophes, hyphens and extra spaces', () => {
  assert.equal(toTitleDisplay("o'brien  &  sons"), "O'Brien & Sons");
  assert.equal(toTitleDisplay('PÉREZ-GÓMEZ'), 'Pérez-Gómez');
});

test('returns an empty string for empty input', () => {
  assert.equal(toTitleDisplay(''), '');
  assert.equal(toTitleDisplay(null), '');
  assert.equal(toTitleDisplay(undefined), '');
});
