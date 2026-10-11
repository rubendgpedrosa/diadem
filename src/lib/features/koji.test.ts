import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ enabled: false }));
vi.mock("@/lib/services/supportedFeatures", () => ({ isSupportedFeature: () => mocks.enabled }));
vi.mock("@/lib/utils/requests", () => ({
	getHeaders: () => ({}),
	parseResponse: (r: Response) => r.json()
}));
import { getKojiGeofences, loadKojiGeofences } from "./koji";

beforeEach(() => {
	mocks.enabled = false;
	vi.unstubAllGlobals();
});
describe("Koji client loading", () => {
	it("skips the endpoint when disabled", async () => {
		const request = vi.fn();
		vi.stubGlobal("fetch", request);
		await loadKojiGeofences();
		expect(request).not.toHaveBeenCalled();
		expect(getKojiGeofences()).toEqual([]);
	});
	it("loads enabled areas and clears them if the integration is subsequently disabled", async () => {
		mocks.enabled = true;
		const request = vi
			.fn()
			.mockResolvedValue(Response.json([{ properties: { name: "Leiria", parent: null } }]));
		vi.stubGlobal("fetch", request);
		await loadKojiGeofences();
		expect(getKojiGeofences()).toHaveLength(1);
		mocks.enabled = false;
		await loadKojiGeofences();
		expect(getKojiGeofences()).toEqual([]);
		expect(request).toHaveBeenCalledOnce();
	});
});
