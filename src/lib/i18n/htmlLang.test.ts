import { describe, expect, it } from "vitest";
import { htmlLang } from "./htmlLang";

describe("htmlLang", () => {
	it("tags Portuguese as pt-PT", () => {
		expect(htmlLang("pt")).toBe("pt-PT");
	});

	it("leaves other validated locales untouched", () => {
		expect(htmlLang("en")).toBe("en");
		expect(htmlLang("de")).toBe("de");
	});
});
