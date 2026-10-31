import { m } from "@/lib/paraglide/messages";

/**
 * Turns a failure code into a sentence a moderator can act on. The codes come
 * from the queue ("no_item", "too_far") and from the shell's own endpoints
 * ("signed_out"); a code the map does not know still names itself, so a report
 * can carry it back instead of losing the reason.
 */
export function lureErrorMessage(code: string): string {
	switch (code) {
		case "no_item":
			return m.lure_fail_no_item();
		case "too_far":
			return m.lure_fail_too_far();
		case "no_position":
			return m.lure_fail_no_position();
		case "not_a_moderator":
			return m.lure_fail_not_a_moderator();
		case "signed_out":
			return m.lure_fail_signed_out();
		case "rate_limited":
			return m.lure_fail_rate_limited();
		case "jobs_unavailable":
			return m.lure_fail_unavailable();
		case "upstream_unreachable":
		case "unreachable":
		case "timeout":
			return m.lure_fail_unreachable();
		default:
			return m.lure_place_failed({ code });
	}
}
