// An iframe can be CSS-hidden while its document still reports "visible".
// IntersectionObserver also accounts for clipping by its embedding page.
let intersecting = true;
let active = true;
let started = false;
const listeners = new Set<(active: boolean) => void>();

function notify() {
	const next = intersecting && document.visibilityState !== "hidden";
	if (next === active) return;
	active = next;
	for (const listener of listeners) listener(active);
}

function start() {
	if (started || typeof document === "undefined") return;
	started = true;
	active = document.visibilityState !== "hidden";
	document.addEventListener("visibilitychange", notify);
	if (typeof IntersectionObserver !== "undefined") {
		const observer = new IntersectionObserver(([entry]) => {
			intersecting = entry.isIntersecting && entry.intersectionRatio > 0;
			notify();
		});
		observer.observe(document.documentElement);
	}
}

export function isMapActive() {
	start();
	return active;
}

export function onMapActivityChange(listener: (active: boolean) => void) {
	listeners.add(listener);
	start();
	return () => listeners.delete(listener);
}
