import { describe, expect, it } from "vitest";
import { resolveThemeMode } from "./themeMode";

describe("resolveThemeMode", () => {
	it("resolves stored light and system settings to dark", () => {
		expect(resolveThemeMode("light")).toBe("dark");
		expect(resolveThemeMode("system")).toBe("dark");
	});

	it("keeps dark and missing settings dark", () => {
		expect(resolveThemeMode("dark")).toBe("dark");
		expect(resolveThemeMode(undefined)).toBe("dark");
	});
});
