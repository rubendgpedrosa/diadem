import { getConfig } from "@/lib/services/config/config";

/**
 * Diadem is dark-only, so the default map style is always the one configured
 * with `default = "dark"`; a config without one falls back to its first style.
 */
export function getDefaultMapStyle() {
	const mapStyles = getConfig().mapStyles;
	return mapStyles.find((style) => style.default === "dark") ?? mapStyles[0];
}
