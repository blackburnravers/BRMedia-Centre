/**
 * brmedia-ui
 * Shared UI components will be added here later.
 *
 * For now we keep a tiny base type + theme contract.
 */

export type ThemeMode = "light" | "dark";

export interface BRMediaTheme {
  mode: ThemeMode;
  // keep this loose for now; you’ll lock it down once the design is set
  tokens?: Record<string, string | number>;
}