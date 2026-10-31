import { describe, expect, it } from "vitest";

import type { LureStatus } from "@/lib/lure/lureApi";
import { LURE_POLL_DEADLINE_MS, LURE_POLL_INTERVAL_MS, waitForLure } from "@/lib/lure/waitForLure";

const jobId = "job_0123456789abcdef";

/** A clock that only moves when the loop sleeps, so the deadline is exact. */
function fakeClock() {
	let time = 0;
	return {
		now: () => time,
		sleep: async (ms: number) => {
			time += ms;
		}
	};
}

/** Answers the given statuses in order and stays on the last one. */
function answering(...answers: LureStatus[]) {
	const polls: string[] = [];
	return {
		polls,
		fetchStatus: async (seen: string): Promise<LureStatus> => {
			polls.push(seen);
			return answers[Math.min(polls.length - 1, answers.length - 1)];
		}
	};
}

describe("waitForLure", () => {
	it("stops at the first done, after the polls before it", async () => {
		const clock = fakeClock();
		const { fetchStatus, polls } = answering(
			{ ok: true, state: "queued" },
			{ ok: true, state: "running" },
			{ ok: true, state: "done", verified: false }
		);

		await expect(
			waitForLure(jobId, { fetchStatus, sleep: clock.sleep, now: clock.now })
		).resolves.toEqual({ state: "done" });
		expect(polls).toHaveLength(3);
		expect(polls[0]).toBe(jobId);
	});

	it("carries the reason a failed job gives", async () => {
		const clock = fakeClock();
		const { fetchStatus } = answering({ ok: true, state: "failed", failReason: "no_item" });

		await expect(
			waitForLure(jobId, { fetchStatus, sleep: clock.sleep, now: clock.now })
		).resolves.toEqual({ state: "failed", failReason: "no_item" });
	});

	it("names a failure that came without a reason", async () => {
		const clock = fakeClock();
		const { fetchStatus } = answering({ ok: true, state: "failed" });

		await expect(
			waitForLure(jobId, { fetchStatus, sleep: clock.sleep, now: clock.now })
		).resolves.toEqual({ state: "failed", failReason: "failed" });
	});

	it("keeps polling through statuses it cannot read", async () => {
		const clock = fakeClock();
		const { fetchStatus, polls } = answering(
			{ ok: false, error: "upstream_unreachable" },
			{ ok: false, error: "timeout" },
			{ ok: true, state: "done" }
		);

		await expect(
			waitForLure(jobId, { fetchStatus, sleep: clock.sleep, now: clock.now })
		).resolves.toEqual({ state: "done" });
		expect(polls).toHaveLength(3);
	});

	it("treats cancellation as an ending", async () => {
		const clock = fakeClock();
		const { fetchStatus } = answering({ ok: true, state: "expired" });

		await expect(
			waitForLure(jobId, { fetchStatus, sleep: clock.sleep, now: clock.now })
		).resolves.toEqual({ state: "cancelled" });
	});

	it("gives up as pending when the deadline passes", async () => {
		const clock = fakeClock();
		const { fetchStatus, polls } = answering({ ok: true, state: "queued" });

		await expect(
			waitForLure(jobId, { fetchStatus, sleep: clock.sleep, now: clock.now })
		).resolves.toEqual({ state: "pending" });
		expect(polls).toHaveLength(LURE_POLL_DEADLINE_MS / LURE_POLL_INTERVAL_MS);
		expect(clock.now()).toBeGreaterThanOrEqual(LURE_POLL_DEADLINE_MS);
	});
});
