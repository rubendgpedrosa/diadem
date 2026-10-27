import { fetchLureCapability, type LureCapability } from "@/lib/lure/lureApi";

/**
 * Whether this browser may place a lure, asked once per page load.
 *
 * The answer arrives after the first popup opens, so the action row renders
 * without the lure button and adds it when the capability lands. A failure is
 * "no": a map frame with a broken shell shows no control instead of an error.
 */
let access = $state<LureCapability | null>(null);
let pending: Promise<void> | null = null;

export function getLureAccess(): LureCapability | null {
	return access;
}

export function ensureLureAccess(): void {
	if (access !== null || pending !== null) return;
	pending = fetchLureCapability()
		.then((result) => {
			access = result;
		})
		.catch(() => {
			access = { canPlace: false, lureTypes: [] };
		})
		.finally(() => {
			pending = null;
		});
}
