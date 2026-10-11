import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let visibility: string;
let change: () => void;
let intersect: (entries: { isIntersecting: boolean; intersectionRatio: number }[]) => void;

beforeEach(() => {
	vi.resetModules();
	visibility = "visible";
	vi.stubGlobal("document", {
		get visibilityState() {
			return visibility;
		},
		documentElement: {},
		addEventListener: vi.fn((_: string, listener: () => void) => {
			change = listener;
		})
	});
	vi.stubGlobal(
		"IntersectionObserver",
		class {
			constructor(callback: typeof intersect) {
				intersect = callback;
			}
			observe = vi.fn();
		}
	);
});
afterEach(() => vi.unstubAllGlobals());

describe("map activity", () => {
	it("pauses a CSS-hidden iframe and resumes once without requiring window blur", async () => {
		const { isMapActive, onMapActivityChange } = await import("./mapActivity");
		const listener = vi.fn();
		onMapActivityChange(listener);
		expect(isMapActive()).toBe(true);
		intersect([{ isIntersecting: false, intersectionRatio: 0 }]);
		expect(isMapActive()).toBe(false);
		intersect([{ isIntersecting: false, intersectionRatio: 0 }]);
		expect(listener).toHaveBeenCalledTimes(1);
		intersect([{ isIntersecting: true, intersectionRatio: 1 }]);
		expect(isMapActive()).toBe(true);
		expect(listener.mock.calls).toEqual([[false], [true]]);
	});
	it("requires both iframe and tab to be visible", async () => {
		const { isMapActive, onMapActivityChange } = await import("./mapActivity");
		const listener = vi.fn();
		onMapActivityChange(listener);
		visibility = "hidden";
		change();
		intersect([{ isIntersecting: false, intersectionRatio: 0 }]);
		visibility = "visible";
		change();
		expect(isMapActive()).toBe(false);
		intersect([{ isIntersecting: true, intersectionRatio: 0.5 }]);
		expect(listener.mock.calls).toEqual([[false], [true]]);
	});
	it("starts paused for a hidden tab and allows listener cleanup", async () => {
		visibility = "hidden";
		const { isMapActive, onMapActivityChange } = await import("./mapActivity");
		const listener = vi.fn();
		const unsubscribe = onMapActivityChange(listener);
		expect(isMapActive()).toBe(false);
		unsubscribe();
		visibility = "visible";
		change();
		expect(isMapActive()).toBe(true);
		expect(listener).not.toHaveBeenCalled();
	});
});
