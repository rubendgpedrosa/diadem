import {
	UPDATE_MAP_OBJECT_INTERVAL_MAX_ZOOM,
	UPDATE_MAP_OBJECT_INTERVAL_TIME
} from "@/lib/constants";
import { getMap } from "@/lib/map/map.svelte";
import { updateAllMapObjects } from "@/lib/mapObjects/updateMapObject";

import { isMapActive, onMapActivityChange } from "@/lib/map/mapActivity";
import { clearLoadMapObjectsInterval } from "@/lib/map/loadMapObjects";

let updateMapObjectsInterval: undefined | NodeJS.Timeout = undefined;

export function clearUpdateMapObjectsInterval() {
	if (updateMapObjectsInterval) clearInterval(updateMapObjectsInterval);
	updateMapObjectsInterval = undefined;
}

export function resetUpdateMapObjectsInterval() {
	clearUpdateMapObjectsInterval();
	if (!isMapActive()) return;
	const map = getMap();
	if (!map) return;
	if (map.getZoom() < UPDATE_MAP_OBJECT_INTERVAL_MAX_ZOOM) return;
	updateMapObjectsInterval = setInterval(
		() => updateAllMapObjects(true, true),
		UPDATE_MAP_OBJECT_INTERVAL_TIME
	);
}

// Keep the map mounted, but stop both kinds of network polling while hidden.
onMapActivityChange((active) => {
	clearUpdateMapObjectsInterval();
	clearLoadMapObjectsInterval();
	if (!active || !getMap()) return;
	getMap()?.resize();
	void updateAllMapObjects(true, true);
	resetUpdateMapObjectsInterval();
});
