/**
 * The shell's lure endpoints, from the map frame.
 *
 * Diadem is served by the PoGoLeiria shell at the same origin as the Pokédex
 * session, so these are plain relative fetches: the cookie travels with them
 * and no token is ever exposed to JavaScript. A non-moderator gets
 * `canPlace: false` and never sees the control; the server decides again on
 * the submission.
 */
export type LureCapability = { canPlace: boolean; lureTypes: number[] };

export type LurePlacement =
	{ ok: true; jobId: string; duplicate: boolean } | { ok: false; error: string };

export const LURE_TYPES = [501, 502, 503, 504, 505, 506] as const;

const noCapability: LureCapability = { canPlace: false, lureTypes: [] };

export async function fetchLureCapability(
	fetchImpl: typeof fetch = fetch
): Promise<LureCapability> {
	try {
		const response = await fetchImpl("/lure/capability", {
			credentials: "same-origin",
			headers: { Accept: "application/json" },
			cache: "no-store"
		});
		if (!response.ok) return noCapability;
		const body: unknown = await response.json();
		if (typeof body !== "object" || body === null) return noCapability;
		const { canPlace, lureTypes } = body as Record<string, unknown>;
		if (canPlace !== true) return noCapability;
		const allowed = Array.isArray(lureTypes)
			? lureTypes.filter((id): id is number =>
					(LURE_TYPES as readonly number[]).includes(id as number)
				)
			: [];
		return { canPlace: true, lureTypes: allowed.length > 0 ? allowed : [...LURE_TYPES] };
	} catch {
		return noCapability;
	}
}

/** A code the shell already knows how to describe; anything else is generic. */
function errorCode(value: unknown): string {
	return typeof value === "string" && /^[a-z_]{1,32}$/.test(value) ? value : "failed";
}

export async function placeLure(
	input: { pokestopId: string; lat: number; lon: number; lureType: number },
	fetchImpl: typeof fetch = fetch
): Promise<LurePlacement> {
	let response: Response;
	try {
		response = await fetchImpl("/lure", {
			method: "POST",
			credentials: "same-origin",
			headers: { "Content-Type": "application/json", Accept: "application/json" },
			body: JSON.stringify(input),
			cache: "no-store"
		});
	} catch {
		return { ok: false, error: "unreachable" };
	}
	const body: unknown = await response.json().catch(() => null);
	const view = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
	if (!response.ok) return { ok: false, error: errorCode(view.error) };
	if (typeof view.jobId !== "string") return { ok: false, error: "failed" };
	return { ok: true, jobId: view.jobId, duplicate: view.duplicate === true };
}
