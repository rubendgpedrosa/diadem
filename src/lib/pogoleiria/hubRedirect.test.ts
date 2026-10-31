import { describe, expect, it } from "vitest";

import { HUB_ORIGIN, MAP_HOST } from "@/lib/pogoleiria/hubLinks";
import { shouldRedirectToHub } from "@/lib/pogoleiria/hubRedirect";

const MAPA = `${HUB_ORIGIN}/mapa`;

function windowAt(
	hostname: string,
	pathname: string,
	search = "",
	{ framed = false }: { framed?: boolean } = {}
) {
	const self = {};
	return {
		location: { hostname, pathname, search },
		top: framed ? {} : self,
		self
	};
}

describe("shouldRedirectToHub", () => {
	it("sends a top-level object page on the map host to the hub", () => {
		expect(shouldRedirectToHub(windowAt(MAP_HOST, "/pokemon/123", "?lang=en"))).toBe(
			`${MAPA}/pokemon/123`
		);
	});

	it("sends the bare map to the hub", () => {
		expect(shouldRedirectToHub(windowAt(MAP_HOST, "/map"))).toBe(MAPA);
	});

	it("leaves a framed page alone", () => {
		expect(
			shouldRedirectToHub(windowAt(MAP_HOST, "/pokemon/123", "", { framed: true }))
		).toBeNull();
	});

	it("leaves pages the hub has no route for alone", () => {
		expect(shouldRedirectToHub(windowAt(MAP_HOST, "/filter/x"))).toBeNull();
	});

	it.each(["pogoleiria.pt", "localhost", "192.168.1.50"])(
		"leaves the map on %s alone",
		(hostname) => {
			expect(shouldRedirectToHub(windowAt(hostname, "/pokemon/123"))).toBeNull();
		}
	);
});
