import { fetchLureStatus, LURE_TERMINAL_STATES, type LureStatus } from "@/lib/lure/lureApi";

/** How often a job in flight is asked about. */
export const LURE_POLL_INTERVAL_MS = 3000;
/** How long a moderator waits before being told to check the stop later. */
export const LURE_POLL_DEADLINE_MS = 90000;

/** How one wait ended. `pending` means the job was still in flight at the deadline. */
export type LureWait =
	| { state: "done" }
	| { state: "failed"; failReason: string }
	| { state: "cancelled" }
	| { state: "pending" };

export type LureWaitDeps = {
	fetchStatus?: (jobId: string) => Promise<LureStatus>;
	sleep?: (ms: number) => Promise<void>;
	now?: () => number;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Follows one job until it ends or the moderator has waited long enough. A
 * status that cannot be read is not an ending: the next poll may work, and the
 * deadline still closes the loop.
 */
export async function waitForLure(jobId: string, deps: LureWaitDeps = {}): Promise<LureWait> {
	const fetchStatus = deps.fetchStatus ?? ((id: string) => fetchLureStatus(id));
	const wait = deps.sleep ?? sleep;
	const now = deps.now ?? Date.now;
	const deadline = now() + LURE_POLL_DEADLINE_MS;

	while (now() < deadline) {
		await wait(LURE_POLL_INTERVAL_MS);
		let status: LureStatus;
		try {
			status = await fetchStatus(jobId);
		} catch {
			continue;
		}
		if (!status.ok) continue;
		if (!(LURE_TERMINAL_STATES as readonly string[]).includes(status.state)) continue;
		if (status.state === "done") return { state: "done" };
		if (status.state === "failed") {
			return { state: "failed", failReason: status.failReason ?? "failed" };
		}
		return { state: "cancelled" };
	}
	return { state: "pending" };
}
