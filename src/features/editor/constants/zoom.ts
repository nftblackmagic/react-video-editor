import { ITimelineScaleState } from "@designcombo/types";

// Zoom constants for timeline scaling
export const ZOOM_CONSTANTS = {
	// Base pixels per second at zoom level 1.0
	PIXELS_PER_SECOND: 50,

	// Minimum element width regardless of zoom
	ELEMENT_MIN_WIDTH: 80,

	// Predefined zoom multipliers for quick selection
	ZOOM_MULTIPLIERS: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4],

	// Zoom limits (technical)
	MIN_ZOOM: 0.1,
	MAX_ZOOM: 10,

	// UI zoom limits (more restrictive for better UX)
	UI_MIN_ZOOM: 0.25,
	UI_MAX_ZOOM: 4,

	// Zoom step sizes
	BUTTON_ZOOM_STEP: 0.25,
	WHEEL_ZOOM_STEP: 0.05, // Reduced from 0.1 for smoother wheel zoom
	KEYBOARD_ZOOM_STEP: 0.25,
} as const;

// Map zoom multipliers to timeline scale states
export function getScaleFromMultiplier(
	multiplier: number,
): ITimelineScaleState {
	// Calculate the appropriate unit based on multiplier
	// Higher multiplier = more zoomed in = smaller unit
	const baseUnit = 300; // 5 seconds at normal zoom
	const unit = Math.round(baseUnit / multiplier);

	// Find the closest predefined scale level
	const zoom = 1 / unit;
	const segments = multiplier > 2 ? 10 : multiplier > 1 ? 5 : 3;

	return {
		index: Math.round(multiplier * 4), // Approximate index
		unit,
		zoom,
		segments,
	};
}

// Get time marker intervals based on zoom multiplier
export function getTimeInterval(zoomMultiplier: number): number {
	const pixelsPerSecond = ZOOM_CONSTANTS.PIXELS_PER_SECOND * zoomMultiplier;

	if (pixelsPerSecond >= 200) return 0.1; // Every 0.1s when very zoomed in
	if (pixelsPerSecond >= 100) return 0.5; // Every 0.5s when zoomed in
	if (pixelsPerSecond >= 50) return 1; // Every 1s at normal zoom
	if (pixelsPerSecond >= 25) return 2; // Every 2s when zoomed out
	if (pixelsPerSecond >= 12) return 5; // Every 5s when more zoomed out
	if (pixelsPerSecond >= 6) return 10; // Every 10s when very zoomed out
	return 30; // Every 30s when extremely zoomed out
}

// Convert time to pixel position at given zoom multiplier
export function timeToPixels(time: number, zoomMultiplier: number): number {
	return time * ZOOM_CONSTANTS.PIXELS_PER_SECOND * zoomMultiplier;
}

// Convert pixel position to time at given zoom multiplier
export function pixelsToTime(pixels: number, zoomMultiplier: number): number {
	return pixels / (ZOOM_CONSTANTS.PIXELS_PER_SECOND * zoomMultiplier);
}

// Calculate element width with zoom
export function getElementWidth(
	duration: number,
	zoomMultiplier: number,
): number {
	return Math.max(
		ZOOM_CONSTANTS.ELEMENT_MIN_WIDTH,
		duration * ZOOM_CONSTANTS.PIXELS_PER_SECOND * zoomMultiplier,
	);
}

// Calculate dynamic timeline width
export function getTimelineWidth(
	duration: number,
	currentTime: number,
	zoomMultiplier: number,
	containerWidth: number,
): number {
	return Math.max(
		duration * ZOOM_CONSTANTS.PIXELS_PER_SECOND * zoomMultiplier, // Actual content width
		(currentTime + 30) * ZOOM_CONSTANTS.PIXELS_PER_SECOND * zoomMultiplier, // Playhead + buffer
		containerWidth, // Minimum viewport width
	);
}

// Clamp zoom value to valid range
export function clampZoom(zoom: number, useUILimits = true): number {
	const min = useUILimits
		? ZOOM_CONSTANTS.UI_MIN_ZOOM
		: ZOOM_CONSTANTS.MIN_ZOOM;
	const max = useUILimits
		? ZOOM_CONSTANTS.UI_MAX_ZOOM
		: ZOOM_CONSTANTS.MAX_ZOOM;
	return Math.max(min, Math.min(max, zoom));
}

// Get next zoom level for zoom in
export function getNextZoomLevel(currentZoom: number, step?: number): number {
	const zoomStep = step || ZOOM_CONSTANTS.BUTTON_ZOOM_STEP;
	return clampZoom(currentZoom + zoomStep);
}

// Get previous zoom level for zoom out
export function getPreviousZoomLevel(
	currentZoom: number,
	step?: number,
): number {
	const zoomStep = step || ZOOM_CONSTANTS.BUTTON_ZOOM_STEP;
	return clampZoom(currentZoom - zoomStep);
}

// Find closest predefined zoom level
export function getClosestZoomPreset(targetZoom: number): number {
	const presets = ZOOM_CONSTANTS.ZOOM_MULTIPLIERS;
	return presets.reduce((prev, curr) =>
		Math.abs(curr - targetZoom) < Math.abs(prev - targetZoom) ? curr : prev,
	);
}
