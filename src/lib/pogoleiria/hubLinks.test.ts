import { describe, expect, it } from "vitest";

import {
	HUB_ORIGIN,
	hubObjectUrl,
	hubPositionUrl,
	hubUrlForMapLocation
} from "@/lib/pogoleiria/hubLinks";

const MAPA = `${HUB_ORIGIN}/mapa`;

describe("hubObjectUrl", () => {
	it.each(["pokemon", "pokestop", "gym", "station", "nest"])("links a %s object", (type) => {
		expect(hubObjectUrl(type, "target")).toBe(`${MAPA}/${type}/target`);
	});

	it("returns null for types the hub has no route for", () => {
		for (const type of ["spawnpoint", "route", "tappable", "s2cell", "biome", "location"]) {
			expect(hubObjectUrl(type, "target")).toBeNull();
		}
	});

	it("encodes an id that would leave its path segment", () => {
		expect(hubObjectUrl("pokemon", "a b?c/d")).toBe(`${MAPA}/pokemon/a%20b%3Fc%2Fd`);
	});
});

describe("hubPositionUrl", () => {
	it("rounds the position to six decimals and drops trailing zeros", () => {
		expect(hubPositionUrl(39.7436212345678, -8.8000001)).toBe(`${MAPA}/@/39.743621/-8.8`);
	});

	it("rounds the zoom to two decimals", () => {
		expect(hubPositionUrl(39.743621, -8.807012, 12.3456)).toBe(
			`${MAPA}/@/39.743621/-8.807012/12.35`
		);
	});

	it("keeps a zoom of zero and omits an undefined one", () => {
		expect(hubPositionUrl(1, 2, 0)).toBe(`${MAPA}/@/1/2/0`);
		expect(hubPositionUrl(1, 2)).toBe(`${MAPA}/@/1/2`);
	});
});

describe("hubUrlForMapLocation", () => {
	it.each(["pokemon", "pokestop", "gym", "station", "nest"])(
		"translates a top-level %s object link",
		(type) => {
			expect(hubUrlForMapLocation(`/${type}/target`, "")).toBe(`${MAPA}/${type}/target`);
		}
	);

	it("decodes and re-encodes the id", () => {
		expect(hubUrlForMapLocation("/pokestop/a%20b", "?lang=en")).toBe(`${MAPA}/pokestop/a%20b`);
		expect(hubUrlForMapLocation("/gym/a%3Fb", "")).toBe(`${MAPA}/gym/a%3Fb`);
	});

	it("translates a map position", () => {
		expect(hubUrlForMapLocation("/map", "?lat=39.7436219&lon=-8.8070123&zoom=12.3456")).toBe(
			`${MAPA}/@/39.743622/-8.807012/12.35`
		);
		expect(hubUrlForMapLocation("/", "?lon=-8.8&lat=39.7")).toBe(`${MAPA}/@/39.7/-8.8`);
	});

	it("ignores a malformed zoom but keeps the position", () => {
		expect(hubUrlForMapLocation("/map", "?lat=39.7&lon=-8.8&zoom=abc")).toBe(`${MAPA}/@/39.7/-8.8`);
	});

	it.each([
		["/map", ""],
		["/", ""],
		["/", "?foo=bar"],
		["/map", "?lat=abc&lon=-8.8"],
		["/", "?lat=39.7"],
		["/map", "?lat=&lon="]
	])("sends %s%s to the map without a position", (pathname, search) => {
		expect(hubUrlForMapLocation(pathname, search)).toBe(MAPA);
	});

	it.each([
		"/filter/pokemon",
		"/area/1",
		"/wayfarer",
		"/coverage",
		"/login",
		"/api/config",
		"/assets/a.png",
		"/auth/callback",
		"/spawnpoint/target",
		"/route/target",
		"/unknown",
		"/pokemon/target/extra",
		"/map/extra"
	])("leaves %s to the map", (pathname) => {
		expect(hubUrlForMapLocation(pathname, "")).toBeNull();
	});

	it("gives up on a path it cannot decode", () => {
		expect(hubUrlForMapLocation("/pokemon/%E0%A4%A", "")).toBeNull();
	});
});
