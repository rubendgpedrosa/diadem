import { describe, expect, it } from "vitest";

import {
	isCrossOriginEmbed,
	readShellCapability,
	readShellLureResult,
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

	it("needs a request id, so a result cannot resolve the wrong request", () => {
		expect(
			readShellLureResult({ source: "polisnatch-shell", type: "lure-result", ok: true })
		).toBeNull();
		expect(
			readShellLureResult({ source: "polisnatch-shell", type: "lure-capability", canPlace: true })
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
