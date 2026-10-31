/**
 * Links from the map into the hub at pogoleiria.pt.
 *
 * The map is served on map.pogoleiria.pt and framed by the hub's `/mapa` page.
 * A link shared from the map has to point at the hub, or whoever opens it gets
 * the bare map without the hub around it. The hub's canonical shapes mirror
 * `apps/landing/lib/map-links.ts`:
 *
 * | Hub URL                        | Means      |
 * |--------------------------------|------------|
 * | `/mapa/<type>/<id>`            | an object  |
 * | `/mapa/@/<lat>/<lon>[/<zoom>]` | a position |
 */

export const HUB_ORIGIN = "https://pogoleiria.pt";
export const MAP_HOST = "map.pogoleiria.pt";

/** The objects the hub has a direct-link route for. */
const HUB_OBJECT_TYPES = new Set(["pokemon", "pokestop", "gym", "station", "nest"]);

/** A decimal as the map itself writes numbers; `Number()` alone would take "" for 0. */
const DECIMAL = /^-?\d+(\.\d+)?$/;

export function hubObjectUrl(type: string, id: string): string | null {
	if (!HUB_OBJECT_TYPES.has(type)) return null;
	return `${HUB_ORIGIN}/mapa/${type}/${encodeURIComponent(id)}`;
}

export function hubPositionUrl(lat: number, lon: number, zoom?: number): string {
	const position = `${HUB_ORIGIN}/mapa/@/${round(lat, 6)}/${round(lon, 6)}`;
	return zoom === undefined ? position : `${position}/${round(zoom, 2)}`;
}

/** The hub URL for a map-host URL, or null when the hub has no route for it. */
export function hubUrlForMapLocation(pathname: string, search: string): string | null {
	const segments = readSegments(pathname);
	if (!segments) return null;

	if (segments.length === 2) return hubObjectUrl(segments[0], segments[1]);

	const isMapPath = segments.length === 0 || (segments.length === 1 && segments[0] === "map");
	if (!isMapPath) return null;

	const params = new URLSearchParams(search);
	const lat = readNumber(params, "lat");
	const lon = readNumber(params, "lon");
	if (lat === undefined || lon === undefined) return `${HUB_ORIGIN}/mapa`;

	return hubPositionUrl(lat, lon, readNumber(params, "zoom"));
}

function round(value: number, digits: number): number {
	return Number(value.toFixed(digits));
}

function readSegments(pathname: string): string[] | null {
	try {
		return pathname.split("/").filter(Boolean).map(decodeURIComponent);
	} catch {
		return null;
	}
}

function readNumber(params: URLSearchParams, key: string): number | undefined {
	const raw = params.get(key);
	if (raw === null || !DECIMAL.test(raw)) return undefined;
	return Number(raw);
}
