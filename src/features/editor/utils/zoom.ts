import { ITimelineScaleState } from "@designcombo/types";
import { TIMELINE_ZOOM_LEVELS } from "../constants/scale";
import { ZOOM_CONSTANTS, clampZoom } from "../constants/zoom";

// Convert between zoom multiplier and scale state
export function multiplierToScale(multiplier: number): ITimelineScaleState {
	// Find the closest matching scale state from predefined levels
	const targetZoom = 1 / (300 / multiplier); // Base unit is 300 (5 seconds)

	let closestScale = TIMELINE_ZOOM_LEVELS[7]; // Default to middle zoom
	let minDiff = Math.abs(closestScale.zoom - targetZoom);

	for (const scale of TIMELINE_ZOOM_LEVELS) {
		const diff = Math.abs(scale.zoom - targetZoom);
		if (diff < minDiff) {
			minDiff = diff;
			closestScale = scale;
		}
	}

	return closestScale;
}

// Convert scale state to zoom multiplier
export function scaleToMultiplier(scale: ITimelineScaleState): number {
	// Convert the scale zoom value to a multiplier
	// scale.zoom is typically 1/unit, so we need to invert and scale appropriately
	return scale.zoom * 300; // 300 is our base unit for normal zoom (1.0)
}

// Calculate zoom to fit timeline in viewport
export function calculateFitZoom(
	duration: number,
	containerWidth: number,
	padding = 30,
): number {
	const availableWidth = containerWidth - padding;
	const requiredWidth = duration * ZOOM_CONSTANTS.PIXELS_PER_SECOND;

	if (requiredWidth === 0) return 1; // Avoid division by zero

	const fitMultiplier = availableWidth / requiredWidth;
	return clampZoom(fitMultiplier);
}

// Calculate zoom focus point (keeps point under mouse stable during zoom)
export function calculateZoomWithFocus(
	currentZoom: number,
	newZoom: number,
	focusX: number,
	scrollLeft: number,
	setScrollLeft: (value: number) => void,
) {
	// Calculate the time position under the mouse before zoom
	const timeAtMouse =
		(scrollLeft + focusX) / (ZOOM_CONSTANTS.PIXELS_PER_SECOND * currentZoom);

	// Calculate new scroll position to keep the same time position under the mouse
	const newPixelPosition =
		timeAtMouse * ZOOM_CONSTANTS.PIXELS_PER_SECOND * newZoom;
	const newScrollLeft = newPixelPosition - focusX;

	// Update scroll position
	setScrollLeft(Math.max(0, newScrollLeft));
}

// Calculate zoom keeping playhead centered (legacy - not used)
export function calculateZoomWithPlayhead(
	currentZoom: number,
	newZoom: number,
	playheadTimeMs: number,
	containerWidth: number,
	setScrollLeft: (value: number) => void,
) {
	// Convert playhead time to seconds
	const playheadSeconds = playheadTimeMs / 1000;

	// Calculate playhead position in pixels at new zoom
	const newPlayheadPixelPos =
		playheadSeconds * ZOOM_CONSTANTS.PIXELS_PER_SECOND * newZoom;

	// Calculate scroll to center playhead in container
	const containerCenter = containerWidth / 2;
	const newScrollLeft = Math.max(0, newPlayheadPixelPos - containerCenter);

	// Update scroll position
	setScrollLeft(newScrollLeft);
}

// Calculate zoom keeping playhead at its exact position in the viewport
export function calculateZoomKeepingPlayheadVisible(
	currentZoom: number,
	newZoom: number,
	playheadTimeMs: number,
	containerWidth: number,
	currentScrollLeft: number,
	setScrollLeft: (value: number) => void,
	timelineOffsetX: number = 40, // Default to TIMELINE_OFFSET_CANVAS_LEFT
) {
	// Convert playhead time to seconds
	const playheadSeconds = playheadTimeMs / 1000;

	// Calculate playhead position in pixels at both zoom levels
	// Include timeline offset for accurate positioning
	const currentPlayheadPos =
		playheadSeconds * ZOOM_CONSTANTS.PIXELS_PER_SECOND * currentZoom + timelineOffsetX;
	const newPlayheadPos =
		playheadSeconds * ZOOM_CONSTANTS.PIXELS_PER_SECOND * newZoom + timelineOffsetX;

	// Calculate where playhead currently appears in the viewport (absolute pixel position)
	const playheadViewportOffset = currentPlayheadPos - currentScrollLeft;

	// Keep the playhead at the same viewport position after zoom
	let newScrollLeft = Math.round(newPlayheadPos - playheadViewportOffset);

	// Ensure playhead stays visible within the viewport
	const padding = 50; // Minimum pixels from viewport edge

	// Only adjust if playhead would be off-screen
	if (playheadViewportOffset < padding) {
		// Playhead is too close to left edge, bring it into view
		newScrollLeft = Math.round(newPlayheadPos - padding);
	} else if (playheadViewportOffset > containerWidth - padding) {
		// Playhead is too close to right edge, bring it into view
		newScrollLeft = Math.round(newPlayheadPos - containerWidth + padding);
	}

	// Ensure we don't scroll past the beginning
	newScrollLeft = Math.max(0, newScrollLeft);

	console.log("🔍 Zoom Calculation Debug:", {
		currentZoom,
		newZoom,
		playheadTimeMs,
		playheadSeconds,
		currentPlayheadPos,
		newPlayheadPos,
		currentScrollLeft,
		playheadViewportOffset,
		calculatedNewScroll: newScrollLeft,
		containerWidth,
		padding,
		timelineOffsetX,
		pixelsPerSecond: ZOOM_CONSTANTS.PIXELS_PER_SECOND,
	});

	// Update scroll position
	setScrollLeft(newScrollLeft);
}

// Smooth zoom animation
export function animateZoom(
	fromZoom: number,
	toZoom: number,
	duration: number,
	onUpdate: (zoom: number) => void,
	onComplete?: () => void,
) {
	const startTime = performance.now();
	const zoomDiff = toZoom - fromZoom;

	const animate = (currentTime: number) => {
		const elapsed = currentTime - startTime;
		const progress = Math.min(elapsed / duration, 1);

		// Easing function (ease-out cubic)
		const eased = 1 - Math.pow(1 - progress, 3);

		const currentZoom = fromZoom + zoomDiff * eased;
		onUpdate(currentZoom);

		if (progress < 1) {
			requestAnimationFrame(animate);
		} else {
			onComplete?.();
		}
	};

	requestAnimationFrame(animate);
}

// Get zoom level for specific time range visibility
export function getZoomForTimeRange(
	startTime: number,
	endTime: number,
	containerWidth: number,
	padding = 50,
): number {
	const duration = endTime - startTime;
	const availableWidth = containerWidth - padding;

	if (duration === 0) return 1;

	const requiredMultiplier =
		availableWidth / (duration * ZOOM_CONSTANTS.PIXELS_PER_SECOND);
	return clampZoom(requiredMultiplier);
}

// Check if zoom level shows frame-level precision
export function isFrameLevelZoom(zoomMultiplier: number, fps = 30): boolean {
	const pixelsPerFrame =
		(ZOOM_CONSTANTS.PIXELS_PER_SECOND * zoomMultiplier) / fps;
	return pixelsPerFrame >= 5; // At least 5 pixels per frame for comfortable editing
}

// Get recommended zoom for different editing contexts
export const ZOOM_PRESETS = {
	OVERVIEW: 0.25, // See entire timeline
	NORMAL: 1.0, // Standard editing
	DETAILED: 2.0, // Detailed editing
	PRECISION: 4.0, // Frame-accurate editing
} as const;

// Format zoom level for display
export function formatZoomPercentage(multiplier: number): string {
	return `${Math.round(multiplier * 100)}%`;
}

// Calculate visible time range at current zoom
export function getVisibleTimeRange(
	scrollLeft: number,
	containerWidth: number,
	zoomMultiplier: number,
): { start: number; end: number } {
	const pixelsPerSecond = ZOOM_CONSTANTS.PIXELS_PER_SECOND * zoomMultiplier;
	const startTime = scrollLeft / pixelsPerSecond;
	const endTime = (scrollLeft + containerWidth) / pixelsPerSecond;

	return { start: startTime, end: endTime };
}
