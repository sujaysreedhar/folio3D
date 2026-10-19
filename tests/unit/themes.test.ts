import { expect, it } from 'vitest';
import { themeNames, normalizeThemeOverrides } from '../../src/themes';

it('offers eight stable preset identifiers', () => {
  expect(themeNames).toEqual([
    'classic',
    'modern',
    'sepia',
    'midnight',
    'ocean',
    'forest',
    'slate',
    'high-contrast',
  ]);
});

it('copies partial overrides and rejects unsupported tokens and non-string values', () => {
  const input = { accent: '#005a7a', font: 'Georgia, serif' };
  const copy = normalizeThemeOverrides(input);
  input.accent = '#000';
  expect(copy).toEqual({ accent: '#005a7a', font: 'Georgia, serif' });
  expect(normalizeThemeOverrides({})).toEqual({});
  expect(() => normalizeThemeOverrides({ unknown: '#fff' } as any)).toThrow(/token/i);
  expect(() => normalizeThemeOverrides({ paper: 42 } as any)).toThrow(/string/i);
});
