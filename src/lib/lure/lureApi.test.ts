import { describe, expect, it } from "vitest";

import { fetchLureCapability, fetchLureStatus, LURE_TYPES, placeLure } from "@/lib/lure/lureApi";

const responding = (status: number, body: unknown): typeof fetch => {
	return (async () =>
		new Response(body === null ? null : JSON.stringify(body), {
			status,
			headers: { "Content-Type": "application/json" }
		})) as typeof fetch;
};

describe("fetchLureCapability", () => {
	it("asks the shell for the current session's permission", async () => {
		let url = "";
		const fetchImpl = (async (input: string) => {
			url = input;
			return new Response(JSON.stringify({ canPlace: true, lureTypes: [501, 502] }), {
				status: 200
			});
		}) as unknown as typeof fetch;

		await expect(fetchLureCapability(fetchImpl)).resolves.toEqual({
			canPlace: true,
			lureTypes: [501, 502]
		});
		expect(url).toBe("/pokedex/lure/capability");
	});

	it("is 'no' when the shell is unreachable, errors or says no", async () => {
		const unreachable = (async () => {
			throw new Error("offline");
		}) as unknown as typeof fetch;

		await expect(fetchLureCapability(unreachable)).resolves.toEqual({
			canPlace: false,
			lureTypes: []
		});
		await expect(fetchLureCapability(responding(401, { canPlace: false }))).resolves.toEqual({
			canPlace: false,
			lureTypes: []
		});
		await expect(fetchLureCapability(responding(200, { canPlace: false }))).resolves.toEqual({
			canPlace: false,
			lureTypes: []
		});
	});

	it("falls back to every lure item when the shell sends an empty list", async () => {
		await expect(
			fetchLureCapability(responding(200, { canPlace: true, lureTypes: [] }))
		).resolves.toEqual({
			canPlace: true,
			lureTypes: [...LURE_TYPES]
		});
	});

	it("drops lure ids the map does not render", async () => {
		await expect(
			fetchLureCapability(responding(200, { canPlace: true, lureTypes: [501, 999, "502"] }))
		).resolves.toEqual({ canPlace: true, lureTypes: [501] });
	});
});

describe("placeLure", () => {
	const stop = { pokestopId: "a1b2c3d4e5f6", lat: 39.7436, lon: -8.8071, lureType: 501 };

	it("posts the stop the map rendered", async () => {
		let seen: { url: string; init: RequestInit } | null = null;
		const fetchImpl = (async (url: string, init: RequestInit) => {
			seen = { url, init };
			return new Response(JSON.stringify({ jobId: "job_0123456789abcdef", state: "queued" }), {
				status: 202
			});
		}) as unknown as typeof fetch;

		await expect(placeLure(stop, fetchImpl)).resolves.toEqual({
			ok: true,
			jobId: "job_0123456789abcdef",
			duplicate: false
		});
		expect(seen!.url).toBe("/pokedex/lure");
		expect(seen!.init.method).toBe("POST");
		expect(JSON.parse(String(seen!.init.body))).toEqual(stop);
	});

	it("reports a repeat rather than pretending it queued a second lure", async () => {
		await expect(
			placeLure(
				stop,
				responding(202, { jobId: "job_0123456789abcdef", state: "queued", duplicate: true })
			)
		).resolves.toEqual({ ok: true, jobId: "job_0123456789abcdef", duplicate: true });
	});

	it("passes the shell's reason back, and never a page or a stack", async () => {
		await expect(placeLure(stop, responding(403, { error: "not_a_moderator" }))).resolves.toEqual({
			ok: false,
			error: "not_a_moderator"
		});
		await expect(
			placeLure(stop, responding(502, { error: "<html>bad gateway</html>" }))
		).resolves.toEqual({
			ok: false,
			error: "failed"
		});
		await expect(placeLure(stop, responding(202, { state: "queued" }))).resolves.toEqual({
			ok: false,
			error: "failed"
		});
	});

	it("is a failure, not a success, when the shell cannot be reached", async () => {
		const unreachable = (async () => {
			throw new Error("offline");
		}) as unknown as typeof fetch;
		await expect(placeLure(stop, unreachable)).resolves.toEqual({
			ok: false,
			error: "unreachable"
		});
	});
});

describe("fetchLureStatus", () => {
	const jobId = "job_0123456789abcdef";

	it("reads the job the shell knows", async () => {
		let url = "";
		const fetchImpl = (async (input: string) => {
			url = input;
			return new Response(JSON.stringify({ jobId, state: "done", verified: false }), {
				status: 200
			});
		}) as unknown as typeof fetch;

		await expect(fetchLureStatus(jobId, fetchImpl)).resolves.toEqual({
			ok: true,
			state: "done",
			failReason: undefined,
			verified: false
		});
		expect(url).toBe(`/pokedex/lure/${jobId}`);
	});

	it("passes on why the queue gave up", async () => {
		await expect(
			fetchLureStatus(jobId, responding(200, { jobId, state: "failed", failReason: "no_item" }))
		).resolves.toEqual({
			ok: true,
			state: "failed",
			failReason: "no_item",
			verified: undefined
		});
	});

	it("reports a refusal instead of inventing a state", async () => {
		await expect(
			fetchLureStatus(jobId, responding(403, { error: "not_a_moderator" }))
		).resolves.toEqual({ ok: false, error: "not_a_moderator" });
		await expect(fetchLureStatus(jobId, responding(200, { jobId }))).resolves.toEqual({
			ok: false,
			error: "failed"
		});
	});
});
