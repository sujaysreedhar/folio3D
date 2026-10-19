import type { Theme, ThemeTokens } from './types';

export const themeNames: readonly Theme[] = [
  'classic',
  'modern',
  'sepia',
  'midnight',
  'ocean',
  'forest',
  'slate',
  'high-contrast',
];
const tokens: readonly (keyof ThemeTokens)[] = [
  'ink',
  'paper',
  'stage',
  'muted',
  'border',
  'hover',
  'accent',
  'font',
];
interface OwnedToken {
  value: string;
  priority: string;
  applied: string;
}
const ownedTokens = new WeakMap<HTMLElement, Map<keyof ThemeTokens, OwnedToken>>();

export function validateTheme(theme: Theme): void {
  if (!themeNames.includes(theme)) throw new RangeError('Unknown reader theme.');
}

export function normalizeThemeOverrides(overrides: Partial<ThemeTokens>): Partial<ThemeTokens> {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides))
    throw new TypeError('Theme overrides must be an object.');
  const copy: Partial<ThemeTokens> = {};
  for (const [key, value] of Object.entries(overrides)) {
    if (!tokens.includes(key as keyof ThemeTokens))
      throw new RangeError(`Unknown theme token: ${key}.`);
    if (typeof value !== 'string' || !value.trim())
      throw new TypeError(`Theme token ${key} must be a non-empty CSS string.`);
    if (
      typeof CSS !== 'undefined' &&
      !CSS.supports(key === 'font' ? 'font-family' : 'color', value)
    )
      throw new RangeError(`Invalid CSS value for theme token ${key}.`);
    copy[key as keyof ThemeTokens] = value;
  }
  return copy;
}

export function applyTheme(
  element: HTMLElement,
  theme: Theme,
  overrides: Partial<ThemeTokens>,
): void {
  element.dataset.theme = theme;
  let owned = ownedTokens.get(element);
  if (!owned) {
    owned = new Map();
    ownedTokens.set(element, owned);
  }
  for (const token of tokens) {
    const value = overrides[token];
    const property = `--folio-${token}`;
    const current = element.style.getPropertyValue(property);
    const priority = element.style.getPropertyPriority(property);
    let previous = owned.get(token);
    if (value === undefined) {
      if (previous) {
        if (current === previous.applied && !priority) {
          if (previous.value)
            element.style.setProperty(property, previous.value, previous.priority);
          else element.style.removeProperty(property);
        }
        owned.delete(token);
      }
    } else {
      if (!previous) {
        previous = { value: current, priority, applied: '' };
        owned.set(token, previous);
      } else if (current !== previous.applied || priority) {
        previous.value = current;
        previous.priority = priority;
      }
      // WebKit can retain an existing !important custom property on assignment.
      if (priority) element.style.removeProperty(property);
      element.style.setProperty(property, value);
      previous.applied = element.style.getPropertyValue(property);
    }
  }
}
