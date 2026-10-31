import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

process.title = "Diadem";

export default defineConfig({
	plugins: [
		paraglideVitePlugin({
			project: "./project.inlang",
			outdir: "./src/lib/paraglide",
			// Diadem is Portuguese-only: the custom strategy defined in
			// src/lib/i18n/localeStrategy.ts always resolves "pt". baseLocale stays
			// last so keys missing from pt keep falling back to English.
			strategy: ["custom-pogoleiria", "baseLocale"]
		}),
		tailwindcss(),
		sveltekit()
	],
	server: {
		allowedHosts: true
	}
});
