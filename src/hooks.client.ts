import type { ClientInit } from "@sveltejs/kit";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { installNativeFetch } from "@/lib/native/nativeFetch";
import { installNativeUi } from "@/lib/native/nativeUi";
import { loadStoredToken } from "@/lib/native/auth";
import { isNative, loadInstanceUrl } from "@/lib/native/runtime";
import { installDeepLinks } from "@/lib/native/deepLinks";
import { registerClientLocaleStrategy } from "@/lib/i18n/localeStrategy";

// Diadem is Portuguese-only; register before anything resolves the locale.
registerClientLocaleStrategy();

maplibregl.setWorkerUrl(workerUrl);

export const init: ClientInit = async () => {
	// native setup hooks, runs on initial load
	if (isNative()) {
		await loadInstanceUrl();
		await loadStoredToken();
		installNativeFetch();
		installNativeUi();
		await installDeepLinks();
	}
};
