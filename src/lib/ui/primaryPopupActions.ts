import {
	Binoculars,
	CircleDot,
	CircleOff,
	Eye,
	EyeClosed,
	Flower,
	Focus,
	Navigation,
	Scan,
	Timer,
	TimerOff
} from "@lucide/svelte";
import { m } from "@/lib/paraglide/messages";
import type { MapData } from "@/lib/mapObjects/mapObjectTypes";
import { ClientMapObjectType, MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import { getMapsUrl } from "@/lib/utils/mapUrl";
import { Coords } from "@/lib/utils/coordinates";
import { getShareTitle } from "@/lib/features/shareTexts";
import { getFocusedRouteMapId, setFocusedRouteMapId } from "@/lib/features/focusedRoute.svelte";
import { refreshRouteFeatures } from "@/lib/map/featuresGen.svelte";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import { setCurrentScoutCenter, setCurrentScoutCoords } from "@/lib/features/scout.svelte";
import { getConfig } from "@/lib/services/config/config";
import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
import { Menu, openMenu } from "@/lib/ui/menus.svelte";
import { Features } from "@/lib/utils/features";
import {
	isPopupActionActive,
	PopupAction,
	supportsPopupAction,
	togglePopupAction
} from "@/lib/ui/popupActions";
import type { QuickAction } from "@/lib/ui/quickActions.svelte";
import { openQuickActions } from "@/lib/ui/quickActions.svelte";
import { openToast } from "@/lib/ui/toasts.svelte.js";
import { mItem } from "@/lib/services/ingameLocale";
import { getLureAccess } from "@/lib/lure/lureAccess.svelte";
import { placeLure } from "@/lib/lure/lureApi";
import { lureErrorMessage } from "@/lib/lure/lureMessages";
import { waitForLure } from "@/lib/lure/waitForLure";
import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";

export type PrimaryPopupAction = QuickAction & { popupAction?: PopupAction };

/** The primary popup buttons, shared with marker quick actions. */
export function getPrimaryPopupActions(
	data: MapData,
	lat = data.lat,
	lon = data.lon
): PrimaryPopupAction[] {
	const type = data.type === ClientMapObjectType.LOCATION ? undefined : data.type;
	const actions: PrimaryPopupAction[] = [
		{
			label: m.popup_navigate(),
			Icon: Navigation,
			href: getMapsUrl(new Coords(lat, lon), getShareTitle(data))
		}
	];
	if (
		data.type === ClientMapObjectType.LOCATION &&
		getConfig().tools.scout &&
		hasFeatureAnywhere(getUserDetails().permissions, Features.SCOUT)
	) {
		actions.push({
			label: m.scout_location(),
			Icon: Binoculars,
			onclick: () => {
				const coords = new Coords(lat, lon);
				setCurrentScoutCoords([coords]);
				setCurrentScoutCenter(coords);
				openMenu(Menu.SCOUT);
			}
		});
	}
	if (type === MapObjectType.ROUTE && getUserSettings().filters.route.enabled) {
		const focused = getFocusedRouteMapId() === data.mapId;
		actions.push({
			label: focused ? m.unfocus_route() : m.focus_route(),
			Icon: focused ? Scan : Focus,
			onclick: () => {
				setFocusedRouteMapId(getFocusedRouteMapId() === data.mapId ? null : data.mapId);
				refreshRouteFeatures();
			}
		});
	}
	/**
	 * Placing a lure is a moderator action on a stop, so the button exists only
	 * when the shell says this session may use it. The menu lists the lure items
	 * the way the popup already draws them; the shell decides again on submit.
	 */
	if (data.type === MapObjectType.POKESTOP) {
		const access = getLureAccess();
		if (access?.canPlace) {
			actions.push({
				label: m.lure_place(),
				Icon: Flower,
				onclick: (event?: Event) => {
					const trigger = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
					const rect = trigger?.getBoundingClientRect();
					openQuickActions({
						x: rect ? rect.left : window.innerWidth / 2,
						y: rect ? rect.bottom + 4 : window.innerHeight / 2,
						title: m.lure_place(),
						trigger: trigger ?? undefined,
						getActions: () =>
							access.lureTypes.map((lureType) => ({
								label: mItem(lureType),
								Icon: Flower,
								onclick: () => void placeLureAt(data, lureType)
							}))
					});
				}
			});
		}
	}
	for (const action of [PopupAction.DIMMED, PopupAction.RADIUS, PopupAction.TIMER] as const) {
		if (!supportsPopupAction(type, action)) continue;
		const active = isPopupActionActive(type, data.mapId, action);
		const appearance = {
			[PopupAction.DIMMED]: {
				label: active ? m.popup_action_undim() : m.popup_action_dim(),
				Icon: active ? Eye : EyeClosed
			},
			[PopupAction.RADIUS]: {
				label: active ? m.popup_action_hide_radius() : m.popup_action_show_radius(),
				Icon: active ? CircleOff : CircleDot
			},
			[PopupAction.TIMER]: {
				label: active ? m.popup_action_hide_timer() : m.popup_action_show_timer(),
				Icon: active ? TimerOff : Timer
			}
		};
		actions.push({
			...appearance[action],
			popupAction: action,
			onclick: () => togglePopupAction(type, data.mapId, action)
		});
	}
	return actions;
}

/**
 * One job per lure; a repeat is reported as a repeat, never queued again here.
 * A moderator who asked for a lure is told what became of it, so a job the
 * account could not run ("no_item") is not left looking queued.
 */
async function placeLureAt(stop: PokestopData, lureType: number): Promise<void> {
	const result = await placeLure({
		pokestopId: stop.id,
		lat: stop.lat,
		lon: stop.lon,
		lureType
	});
	if (!result.ok) {
		openToast(lureErrorMessage(result.error), 4000);
		return;
	}
	if (result.duplicate) {
		openToast(m.lure_place_duplicate(), 4000);
		return;
	}
	openToast(m.lure_place_done(), 4000);
	const outcome = await waitForLure(result.jobId);
	if (outcome.state === "done") {
		openToast(m.lure_place_placed({ item: mItem(lureType) }), 4000);
	} else if (outcome.state === "failed") {
		openToast(lureErrorMessage(outcome.failReason), 4000);
	} else if (outcome.state === "cancelled") {
		openToast(m.lure_place_cancelled(), 4000);
	} else {
		openToast(m.lure_place_pending(), 4000);
	}
}
