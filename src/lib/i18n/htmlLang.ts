/**
 * pt is the only locale Diadem serves, and its HTML tag carries the region so
 * screen readers and search engines get the right language variant.
 */
const HTML_LANG_BY_LOCALE: Record<string, string> = {
	pt: "pt-PT"
};

/**
 * Maps a validated locale to the value of `<html lang="...">`.
 * Callers must validate the locale first: the result is interpolated into HTML.
 */
export function htmlLang(locale: string) {
	return HTML_LANG_BY_LOCALE[locale] ?? locale;
}
