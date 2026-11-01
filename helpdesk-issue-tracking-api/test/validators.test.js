const test = require('node:test');
const assert = require('node:assert/strict');
const { requireString, requireId, enumValue } = require('../src/utils/validators');

test('requireString trims valid strings', () => {
  assert.equal(requireString('  hello  ', 'name'), 'hello');
});

test('requireString rejects too-short values', () => {
  assert.throws(() => requireString('', 'name'), { status: 400 });
});

test('requireId accepts positive integers', () => {
  assert.equal(requireId('12'), 12);
});

test('requireId rejects invalid identifiers', () => {
  assert.throws(() => requireId('0'), { status: 400 });
});

test('enumValue rejects unsupported values', () => {
  assert.throws(() => enumValue('critical', 'priority', ['low', 'high']), { status: 400 });
});
