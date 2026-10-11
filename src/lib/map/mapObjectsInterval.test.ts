import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	active: true,
	zoom: 20,
	callback: (_: boolean) => {},
	update: vi.fn(async () => {}),
	clearMoving: vi.fn(),
	resize: vi.fn()
}));
vi.mock("@/lib/map/mapActivity", () => ({
	isMapActive: () => state.active,
	onMapActivityChange: (callback: typeof state.callback) => {
		state.callback = callback;
	}
}));
vi.mock("@/lib/map/map.svelte", () => ({
	getMap: () => ({ getZoom: () => state.zoom, resize: state.resize })
}));
vi.mock("@/lib/mapObjects/updateMapObject", () => ({ updateAllMapObjects: state.update }));
vi.mock("@/lib/map/loadMapObjects", () => ({ clearLoadMapObjectsInterval: state.clearMoving }));
vi.mock("@/lib/constants", () => ({
	UPDATE_MAP_OBJECT_INTERVAL_MAX_ZOOM: 12,
	UPDATE_MAP_OBJECT_INTERVAL_TIME: 1000
}));
beforeEach(() => {
	vi.resetModules();
	vi.useFakeTimers();
	vi.clearAllMocks();
	state.active = true;
	state.zoom = 20;
});
afterEach(() => {
	vi.clearAllTimers();
	vi.useRealTimers();
});
describe("map polling lifecycle", () => {
	it("clears regular and movement polling on hide, refreshes once on return", async () => {
		const { resetUpdateMapObjectsInterval } = await import("./mapObjectsInterval");
		resetUpdateMapObjectsInterval();
		await vi.advanceTimersByTimeAsync(1000);
		expect(state.update).toHaveBeenCalledTimes(1);
		state.active = false;
		state.callback(false);
		await vi.advanceTimersByTimeAsync(5000);
		expect(state.update).toHaveBeenCalledTimes(1);
		expect(state.clearMoving).toHaveBeenCalledTimes(1);
		state.active = true;
		state.callback(true);
		expect(state.update).toHaveBeenCalledTimes(2);
		expect(state.resize).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1000);
		expect(state.update).toHaveBeenCalledTimes(3);
	});
	it("cannot restart polling while hidden", async () => {
		const { resetUpdateMapObjectsInterval } = await import("./mapObjectsInterval");
		state.active = false;
		resetUpdateMapObjectsInterval();
		await vi.advanceTimersByTimeAsync(5000);
		expect(state.update).not.toHaveBeenCalled();
	});
	it("removes the previous timer when zoom drops below the polling threshold", async () => {
		const { resetUpdateMapObjectsInterval } = await import("./mapObjectsInterval");
		resetUpdateMapObjectsInterval();
		state.zoom = 5;
		resetUpdateMapObjectsInterval();
		await vi.advanceTimersByTimeAsync(5000);
		expect(state.update).not.toHaveBeenCalled();
	});
});
