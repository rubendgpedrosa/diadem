import { beforeAll, describe, expect, it } from "vitest";
import { biome_forest } from "@/lib/paraglide/messages/biome_forest";
import { lure_module } from "@/lib/paraglide/messages/lure_module";
import { extractLocaleFromRequestAsync, getLocale } from "@/lib/paraglide/runtime";
import { registerClientLocaleStrategy, registerServerLocaleStrategy } from "./localeStrategy";

beforeAll(() => {
	registerClientLocaleStrategy();
	registerServerLocaleStrategy();
});

describe("Portuguese-only locale", () => {
	it("always resolves to pt", () => {
		expect(getLocale()).toBe("pt");
	});

	it("resolves pt for server requests too", async () => {
		const locale = await extractLocaleFromRequestAsync(new Request("https://map.pogoleiria.pt/"));
		expect(locale).toBe("pt");
	});

	it("keeps the English text for keys pt does not translate yet", () => {
		expect(lure_module()).toBe("Lure Module");
		expect(biome_forest()).toBe("Forest");
	});
});
