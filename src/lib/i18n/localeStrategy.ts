import { defineCustomClientStrategy, defineCustomServerStrategy } from "@/lib/paraglide/runtime";

/**
 * Diadem is Portuguese-only. This strategy always resolves `pt` and ignores the
 * browser language, localStorage and any `setLocale` call. It must stay in sync
 * with the `strategy` list in `vite.config.ts`.
 */
export const LOCALE_STRATEGY_ID = "custom-pogoleiria";

export function registerClientLocaleStrategy() {
	defineCustomClientStrategy(LOCALE_STRATEGY_ID, {
		getLocale: () => "pt",
		setLocale: () => {}
	});
}

export function registerServerLocaleStrategy() {
	defineCustomServerStrategy(LOCALE_STRATEGY_ID, {
		getLocale: () => "pt"
	});
}
