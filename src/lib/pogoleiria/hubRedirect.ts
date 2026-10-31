import { MAP_HOST, hubUrlForMapLocation } from "@/lib/pogoleiria/hubLinks";

/** The slice of `window` this reads, so a test can fake it. */
export type RedirectWindow = {
	location: { hostname: string; pathname: string; search: string };
	top: unknown;
	self: unknown;
};

/**
 * The hub URL this map-host page should be replaced with, or null.
 *
 * Only top-level pages on the production map host go: a framed page is already
 * inside the hub, and LAN, localhost and native builds are not the hub's map.
 */
export function shouldRedirectToHub(win: RedirectWindow): string | null {
	if (win.location.hostname !== MAP_HOST) return null;
	if (win.top !== win.self) return null;
	return hubUrlForMapLocation(win.location.pathname, win.location.search);
}
