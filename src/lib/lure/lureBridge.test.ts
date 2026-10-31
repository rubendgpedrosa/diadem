import { describe, expect, it } from "vitest";

import {
	isCrossOriginEmbed,
	readShellCapability,
	readShellLureResult,
	readShellLureStatus,
	shellOrigin
} from "@/lib/lure/lureApi";

describe("readShellCapability", () => {
	it("reads the shell's answer", () => {
		expect(
			readShellCapability({
				source: "polisnatch-shell",
				type: "lure-capability",
				canPlace: true,
				lureTypes: [501, 502]
			})
		).toEqual({ canPlace: true, lureTypes: [501, 502] });
	});

	it("drops lure ids the map does not render", () => {
		expect(
			readShellCapability({
				source: "polisnatch-shell",
				type: "lure-capability",
				canPlace: true,
				lureTypes: [501, 999, "502"]
			})
		).toEqual({ canPlace: true, lureTypes: [501] });
	});

	it("treats anything but an explicit yes as no", () => {
		expect(
			readShellCapability({ source: "polisnatch-shell", type: "lure-capability", canPlace: "true" })
		).toEqual({ canPlace: false, lureTypes: [] });
	});

	it("ignores other messages, including the shell's own results", () => {
		expect(
			readShellCapability({ source: "polisnatch-shell", type: "lure-result", requestId: "r" })
		).toBeNull();
		expect(
			readShellCapability({ source: "someone-else", type: "lure-capability", canPlace: true })
		).toBeNull();
		expect(readShellCapability(null)).toBeNull();
		expect(readShellCapability("lure")).toBeNull();
	});
});

describe("readShellLureResult", () => {
	it("reads a placed lure", () => {
		expect(
			readShellLureResult({
				source: "polisnatch-shell",
				type: "lure-result",
				requestId: "r-1",
				ok: true,
				jobId: "job_0123456789abcdef"
			})
		).toEqual({ requestId: "r-1", ok: true, jobId: "job_0123456789abcdef", error: undefined });
	});

	it("reads a refusal", () => {
		expect(
			readShellLureResult({
				source: "polisnatch-shell",
				type: "lure-result",
				requestId: "r-1",
				ok: false,
				error: "not_a_moderator"
			})
		).toEqual({ requestId: "r-1", ok: false, jobId: undefined, error: "not_a_moderator" });
	});

	it("forwards a repeat as a repeat, so the map does not queue it again", () => {
		expect(
			readShellLureResult({
				source: "polisnatch-shell",
				type: "lure-result",
				requestId: "r-1",
				ok: true,
				jobId: "job_0123456789abcdef",
				duplicate: true
			})
		).toEqual({
			requestId: "r-1",
			ok: true,
			jobId: "job_0123456789abcdef",
			error: undefined,
			duplicate: true
		});
	});

	it("needs a request id, so a result cannot resolve the wrong request", () => {
		expect(
			readShellLureResult({ source: "polisnatch-shell", type: "lure-result", ok: true })
		).toBeNull();
		expect(
			readShellLureResult({ source: "polisnatch-shell", type: "lure-capability", canPlace: true })
		).toBeNull();
	});
});

describe("readShellLureStatus", () => {
	it("reads the shell's answer about a job", () => {
		expect(
			readShellLureStatus({
				source: "polisnatch-shell",
				type: "lure-status-result",
				requestId: "s-1",
				ok: true,
				state: "running"
			})
		).toEqual({
			requestId: "s-1",
			ok: true,
			state: "running",
			failReason: undefined,
			verified: undefined
		});
	});

	it("reads why a job failed", () => {
		expect(
			readShellLureStatus({
				source: "polisnatch-shell",
				type: "lure-status-result",
				requestId: "s-1",
				ok: true,
				state: "failed",
				failReason: "no_item"
			})
		).toEqual({
			requestId: "s-1",
			ok: true,
			state: "failed",
			failReason: "no_item",
			verified: undefined
		});
	});

	it("does not call a missing state a success", () => {
		expect(
			readShellLureStatus({
				source: "polisnatch-shell",
				type: "lure-status-result",
				requestId: "s-1",
				ok: true
			})
		).toEqual({ requestId: "s-1", ok: false, error: "failed" });
		expect(
			readShellLureStatus({
				source: "polisnatch-shell",
				type: "lure-status-result",
				requestId: "s-1",
				ok: false,
				error: "unknown_job"
			})
		).toEqual({ requestId: "s-1", ok: false, error: "unknown_job" });
	});

	it("needs a request id and its own message type", () => {
		expect(
			readShellLureStatus({
				source: "polisnatch-shell",
				type: "lure-status-result",
				ok: true,
				state: "done"
			})
		).toBeNull();
		expect(
			readShellLureStatus({
				source: "polisnatch-shell",
				type: "lure-result",
				requestId: "s-1",
				ok: true,
				state: "done"
			})
		).toBeNull();
		expect(
			readShellLureStatus({
				source: "polisnatch-map",
				type: "lure-status-result",
				requestId: "s-1",
				ok: true,
				state: "done"
			})
		).toBeNull();
	});
});

describe("cross-origin detection", () => {
	it("is off outside a browser, so the same-origin fetch path is used", () => {
		expect(typeof window).toBe("undefined");
		expect(isCrossOriginEmbed()).toBe(false);
		expect(shellOrigin()).toBeNull();
	});
});
