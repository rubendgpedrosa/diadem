import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	config: {} as { koji?: { url: string; secret: string; projectName: string } },
	logger: { warning: vi.fn(), error: vi.fn() }
}));
vi.mock("@/lib/services/config/config.server", () => ({ getServerConfig: () => mocks.config }));
vi.mock("@/lib/utils/logger", () => ({ getLogger: () => mocks.logger }));
import { fetchKojiGeofences } from "./kojiApi";

beforeEach(() => {
	mocks.config = {};
	vi.clearAllMocks();
});
describe("optional Koji integration", () => {
	it("returns no areas without a request or warning when disabled", async () => {
		const request = vi.fn();
		expect(await fetchKojiGeofences(request)).toEqual([]);
		expect(request).not.toHaveBeenCalled();
		expect(mocks.logger.warning).not.toHaveBeenCalled();
	});
	it("preserves real upstream failures when configured", async () => {
		mocks.config.koji = { url: "https://koji.example", secret: "test", projectName: "test" };
		const request = vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 }));
		expect(await fetchKojiGeofences(request)).toBeUndefined();
		expect(mocks.logger.error).toHaveBeenCalled();
	});
	it("returns configured geofences", async () => {
		mocks.config.koji = { url: "https://koji.example", secret: "test", projectName: "test" };
		const feature = { properties: { id: 1, name: "Leiria" } };
		const request = vi.fn().mockResolvedValue(Response.json({ data: { features: [feature] } }));
		expect(await fetchKojiGeofences(request)).toEqual([feature]);
		expect(request).toHaveBeenCalledOnce();
	});
});
