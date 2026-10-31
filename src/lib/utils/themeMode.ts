export type ThemeMode = "dark" | "light" | "system";

/**
 * Diadem is dark-only. The stored `themeMode` field is kept so existing user
 * settings still parse, but its value never switches the UI to light.
 */
export function resolveThemeMode(_stored?: ThemeMode): "dark" {
	return "dark";
}
