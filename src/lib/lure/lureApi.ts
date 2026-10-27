/**
 * The shell's lure endpoints, from the map frame.
 *
 * Same-origin, this is a plain relative fetch: the Pokédex session travels with
 * it. On its own origin — the deployment the shell intends — the frame gets no
 * cookie at all, so the map asks the shell over messages instead and the shell
 * does the same-origin work. The map never holds a credential either way.
 */
export type LureCapability = { canPlace: boolean; lureTypes: number[] };

export type LurePlacement =
	{ ok: true; jobId: string; duplicate: boolean } | { ok: false; error: string };

export const LURE_TYPES = [501, 502, 503, 504, 505, 506] as const;

const noCapability: LureCapability = { canPlace: false, lureTypes: [] };

const MAP_SOURCE = "polisnatch-map";
const SHELL_SOURCE = "polisnatch-shell";

/** How long a frame waits for the shell before deciding it has no permission. */
const CAPABILITY_TIMEOUT_MS = 3000;
/** A placement can wait for the server; it is one job, not a page load. */
const PLACE_TIMEOUT_MS = 15000;

/** The origin of the document that framed this map, or null when top-level. */
export function shellOrigin(): string | null {
	if (typeof document === "undefined" || !document.referrer) return null;
	try {
		return new URL(document.referrer).origin;
	} catch {
		return null;
	}
}

/** True when this document is framed by a different origin. */
export function isCrossOriginEmbed(): boolean {
	if (typeof window === "undefined") return false;
	const origin = shellOrigin();
	return window.parent !== window && origin !== null && origin !== window.location.origin;
}

/** The capability a shell message carries, or null when it is not one. */
export function readShellCapability(data: unknown): LureCapability | null {
	if (typeof data !== "object" || data === null) return null;
	const message = data as Record<string, unknown>;
	if (message.source !== SHELL_SOURCE || message.type !== "lure-capability") return null;
	const lureTypes = Array.isArray(message.lureTypes)
		? message.lureTypes.filter((id): id is number =>
				(LURE_TYPES as readonly number[]).includes(id as number)
			)
		: [];
	return { canPlace: message.canPlace === true, lureTypes };
}

export type ShellLureResult = { requestId: string; ok: boolean; jobId?: string; error?: string };

/** The result of a placement, or null when the message is not one. */
export function readShellLureResult(data: unknown): ShellLureResult | null {
	if (typeof data !== "object" || data === null) return null;
	const message = data as Record<string, unknown>;
	if (message.source !== SHELL_SOURCE || message.type !== "lure-result") return null;
	if (typeof message.requestId !== "string") return null;
	return {
		requestId: message.requestId,
		ok: message.ok === true,
		jobId: typeof message.jobId === "string" ? message.jobId : undefined,
		error: typeof message.error === "string" ? message.error : undefined
	};
}

type Waiter = (result: ShellLureResult) => void;

const waiters = new Map<string, Waiter>();
let capabilityWaiter: ((capability: LureCapability) => void) | null = null;
let cachedCapability: LureCapability | null = null;
let listening = false;

function listen(): void {
	if (listening || typeof window === "undefined") return;
	const origin = shellOrigin();
	if (!origin) return;
	listening = true;
	window.addEventListener("message", (event) => {
		if (event.origin !== origin) return;
		const capability = readShellCapability(event.data);
		if (capability) {
			cachedCapability = capability;
			capabilityWaiter?.(capability);
			capabilityWaiter = null;
			return;
		}
		const result = readShellLureResult(event.data);
		if (!result) return;
		const waiter = waiters.get(result.requestId);
		waiters.delete(result.requestId);
		waiter?.(result);
	});
}

/**
 * Tells the shell the map is up. The shell's loader waits for this: a
 * cross-origin frame has no readable document, so this message is the only
 * signal that the map booted rather than hung.
 */
export function announceFrameReady(): void {
	if (!isCrossOriginEmbed()) return;
	const origin = shellOrigin();
	if (!origin) return;
	listen();
	window.parent.postMessage({ source: MAP_SOURCE, type: "ready" }, origin);
}

async function capabilityViaShell(): Promise<LureCapability> {
	if (cachedCapability) return cachedCapability;
	const origin = shellOrigin();
	if (!origin) return noCapability;
	listen();
	window.parent.postMessage({ source: MAP_SOURCE, type: "ready" }, origin);
	return new Promise((resolve) => {
		const timer = setTimeout(() => {
			capabilityWaiter = null;
			resolve(noCapability);
		}, CAPABILITY_TIMEOUT_MS);
		capabilityWaiter = (capability) => {
			clearTimeout(timer);
			resolve(capability);
		};
	});
}

async function placeViaShell(input: {
	pokestopId: string;
	lat: number;
	lon: number;
	lureType: number;
}): Promise<LurePlacement> {
	const origin = shellOrigin();
	if (!origin) return { ok: false, error: "unreachable" };
	listen();
	const requestId =
		typeof crypto !== "undefined" && "randomUUID" in crypto
			? crypto.randomUUID()
			: `${Date.now()}-${Math.random().toString(16).slice(2)}`;

	const result = await new Promise<ShellLureResult>((resolve) => {
		const timer = setTimeout(() => {
			waiters.delete(requestId);
			resolve({ requestId, ok: false, error: "timeout" });
		}, PLACE_TIMEOUT_MS);
		waiters.set(requestId, (message) => {
			clearTimeout(timer);
			resolve(message);
		});
		window.parent.postMessage(
			{ source: MAP_SOURCE, type: "place-lure", requestId, ...input },
			origin
		);
	});

	return result.ok
		? { ok: true, jobId: result.jobId ?? "", duplicate: false }
		: { ok: false, error: result.error ?? "failed" };
}

export async function fetchLureCapability(
	fetchImpl: typeof fetch = fetch
): Promise<LureCapability> {
	if (isCrossOriginEmbed()) return capabilityViaShell();
	try {
		const response = await fetchImpl("/pokedex/lure/capability", {
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
	if (isCrossOriginEmbed()) return placeViaShell(input);

	let response: Response;
	try {
		response = await fetchImpl("/pokedex/lure", {
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
