import { describe, expect, it } from "vitest";

import { m } from "@/lib/paraglide/messages";
import { lureErrorMessage } from "@/lib/lure/lureMessages";

describe("lureErrorMessage", () => {
	it("names the cause the moderator can act on", () => {
		expect(lureErrorMessage("no_item")).toBe(m.lure_fail_no_item());
		expect(lureErrorMessage("too_far")).toBe(m.lure_fail_too_far());
		expect(lureErrorMessage("no_position")).toBe(m.lure_fail_no_position());
	});

	it("separates session and queue failures from the bag", () => {
		expect(lureErrorMessage("not_a_moderator")).toBe(m.lure_fail_not_a_moderator());
		expect(lureErrorMessage("signed_out")).toBe(m.lure_fail_signed_out());
		expect(lureErrorMessage("rate_limited")).toBe(m.lure_fail_rate_limited());
		expect(lureErrorMessage("jobs_unavailable")).toBe(m.lure_fail_unavailable());
	});

	it("calls every way of not reaching the queue the same", () => {
		expect(lureErrorMessage("upstream_unreachable")).toBe(m.lure_fail_unreachable());
		expect(lureErrorMessage("unreachable")).toBe(m.lure_fail_unreachable());
		expect(lureErrorMessage("timeout")).toBe(m.lure_fail_unreachable());
	});

	it("keeps an unknown code visible instead of inventing a cause", () => {
		expect(lureErrorMessage("weird_code")).toBe(m.lure_place_failed({ code: "weird_code" }));
	});
});
