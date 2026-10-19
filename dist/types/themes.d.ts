import type { Theme, ThemeTokens } from './types';
export declare const themeNames: readonly Theme[];
export declare function validateTheme(theme: Theme): void;
export declare function normalizeThemeOverrides(overrides: Partial<ThemeTokens>): Partial<ThemeTokens>;
export declare function applyTheme(element: HTMLElement, theme: Theme, overrides: Partial<ThemeTokens>): void;
