import { useState, useCallback, useEffect, useRef, RefObject } from "react";
import { dispatch } from "@designcombo/events";
import { TIMELINE_SCALE_CHANGED } from "@designcombo/state";
import { ITimelineScaleState } from "@designcombo/types";
import {
	ZOOM_CONSTANTS,
	clampZoom,
	getScaleFromMultiplier,
} from "../constants/zoom";
import {
	multiplierToScale,
	scaleToMultiplier,
	calculateZoomWithFocus,
	calculateZoomKeepingPlayheadVisible,
} from "../utils/zoom";
import { getSafeCurrentFrame } from "../utils/time";

interface UseTimelineZoomProps {
	containerRef: RefObject<HTMLDivElement>;
	initialScale?: ITimelineScaleState;
	isInTimeline?: boolean;
	onZoomChange?: (scale: ITimelineScaleState) => void;
	playerRef?: RefObject<any>;
	fps?: number;
}

interface UseTimelineZoomReturn {
	zoomMultiplier: number;
	scale: ITimelineScaleState;
	setZoomMultiplier: (multiplier: number | ((prev: number) => number)) => void;
	handleKeyDown: (e: KeyboardEvent) => void;
	zoomIn: () => void;
	zoomOut: () => void;
	resetZoom: () => void;
	fitToTimeline: (duration: number) => void;
}

export function useTimelineZoom({
	containerRef,
	initialScale,
	isInTimeline = false,
	onZoomChange,
	playerRef,
	fps = 30,
}: UseTimelineZoomProps): UseTimelineZoomReturn {
	// Convert initial scale to multiplier
	const initialMultiplier = initialScale ? scaleToMultiplier(initialScale) : 1;
	const [zoomMultiplier, setZoomMultiplierState] = useState(initialMultiplier);
	const currentZoomRef = useRef(initialMultiplier);

	// Update ref when state changes
	useEffect(() => {
		currentZoomRef.current = zoomMultiplier;
	}, [zoomMultiplier]);

	// Convert multiplier to scale state
	const scale = multiplierToScale(zoomMultiplier);

	// Wrapper to set zoom and dispatch event
	const setZoomMultiplier = useCallback(
		(value: number | ((prev: number) => number)) => {
			setZoomMultiplierState((prev) => {
				const newValue = typeof value === "function" ? value(prev) : value;
				const clamped = clampZoom(newValue);

				// Defer the dispatch to avoid updating during render
				requestAnimationFrame(() => {
					// Convert to scale and dispatch
					const newScale = multiplierToScale(clamped);
					dispatch(TIMELINE_SCALE_CHANGED, {
						payload: { scale: newScale },
					});

					// Call custom handler if provided
					onZoomChange?.(newScale);
				});

				return clamped;
			});
		},
		[onZoomChange],
	);

	// Keyboard shortcuts handler with playhead centering
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			// Check if we're in a text input
			const target = e.target as HTMLElement;
			const isTextInput =
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable;

			if (isTextInput) return;

			const isMod = e.ctrlKey || e.metaKey;

			// Handle zoom keyboard shortcuts
			if (
				isMod &&
				(e.key === "+" || e.key === "=" || e.key === "-" || e.key === "0")
			) {
				e.preventDefault();

				let newZoom = currentZoomRef.current;

				// Determine new zoom level
				if (e.key === "+" || e.key === "=") {
					newZoom = clampZoom(
						currentZoomRef.current + ZOOM_CONSTANTS.KEYBOARD_ZOOM_STEP,
					);
				} else if (e.key === "-") {
					newZoom = clampZoom(
						currentZoomRef.current - ZOOM_CONSTANTS.KEYBOARD_ZOOM_STEP,
					);
				} else if (e.key === "0") {
					newZoom = 1;
				}

				// Apply zoom and keep playhead visible
				if (playerRef?.current && containerRef.current) {
					const currentFrame = getSafeCurrentFrame(playerRef);
					const playheadTimeMs = (currentFrame / fps) * 1000;
					const containerWidth = containerRef.current.clientWidth;
					// Fix: Use correct selector for ScrollArea viewport
					const scrollContainer = document.getElementById("viewportH");

					console.log("🎯 Keyboard Zoom triggered:", {
						key: e.key,
						currentFrame,
						playheadTimeMs,
						currentZoom: currentZoomRef.current,
						newZoom,
						scrollContainerFound: !!scrollContainer,
						containerWidth,
					});

					if (scrollContainer) {
						const currentScrollLeft = Math.max(
							0,
							(scrollContainer as HTMLElement).scrollLeft || 0,
						);

						console.log("📏 Before zoom scroll:", currentScrollLeft);

						calculateZoomKeepingPlayheadVisible(
							currentZoomRef.current,
							newZoom,
							playheadTimeMs,
							containerWidth,
							currentScrollLeft,
							(newScrollLeft) => {
								console.log("📏 Setting new scroll:", newScrollLeft);
								(scrollContainer as HTMLElement).scrollLeft = newScrollLeft;
							},
						);
					} else {
						console.warn("⚠️ ScrollContainer not found!");
					}
				}

				setZoomMultiplier(newZoom);
			}
		},
		[setZoomMultiplier, playerRef, fps, containerRef],
	);

	// Zoom control functions with playhead centering
	const zoomIn = useCallback(() => {
		const newZoom = clampZoom(
			currentZoomRef.current + ZOOM_CONSTANTS.BUTTON_ZOOM_STEP,
		);

		// Apply zoom and keep playhead visible
		if (playerRef?.current && containerRef.current) {
			const currentFrame = getSafeCurrentFrame(playerRef);
			const playheadTimeMs = (currentFrame / fps) * 1000;
			const containerWidth = containerRef.current.clientWidth;
			// Fix: Use correct selector for ScrollArea viewport
			const scrollContainer = document.getElementById("viewportH");

			console.log("🔘 Button Zoom triggered:", {
				action: "zoomIn/zoomOut",
				currentFrame,
				playheadTimeMs,
				currentZoom: currentZoomRef.current,
				newZoom,
				scrollContainerFound: !!scrollContainer,
				containerWidth,
			});

			if (scrollContainer) {
				const currentScrollLeft =
					(scrollContainer as HTMLElement).scrollLeft || 0;

				console.log("📏 Before zoom scroll:", currentScrollLeft);

				calculateZoomKeepingPlayheadVisible(
					currentZoomRef.current,
					newZoom,
					playheadTimeMs,
					containerWidth,
					currentScrollLeft,
					(newScrollLeft) => {
						console.log("📏 Setting new scroll:", newScrollLeft);
						(scrollContainer as HTMLElement).scrollLeft = newScrollLeft;
					},
				);
			} else {
				console.warn("⚠️ ScrollContainer not found!");
			}
		}

		setZoomMultiplier(newZoom);
	}, [setZoomMultiplier, playerRef, fps, containerRef]);

	const zoomOut = useCallback(() => {
		const newZoom = clampZoom(
			currentZoomRef.current - ZOOM_CONSTANTS.BUTTON_ZOOM_STEP,
		);

		// Apply zoom and keep playhead visible
		if (playerRef?.current && containerRef.current) {
			const currentFrame = getSafeCurrentFrame(playerRef);
			const playheadTimeMs = (currentFrame / fps) * 1000;
			const containerWidth = containerRef.current.clientWidth;
			// Fix: Use correct selector for ScrollArea viewport
			const scrollContainer = document.getElementById("viewportH");

			console.log("🔘 Button Zoom triggered:", {
				action: "zoomIn/zoomOut",
				currentFrame,
				playheadTimeMs,
				currentZoom: currentZoomRef.current,
				newZoom,
				scrollContainerFound: !!scrollContainer,
				containerWidth,
			});

			if (scrollContainer) {
				const currentScrollLeft =
					(scrollContainer as HTMLElement).scrollLeft || 0;

				console.log("📏 Before zoom scroll:", currentScrollLeft);

				calculateZoomKeepingPlayheadVisible(
					currentZoomRef.current,
					newZoom,
					playheadTimeMs,
					containerWidth,
					currentScrollLeft,
					(newScrollLeft) => {
						console.log("📏 Setting new scroll:", newScrollLeft);
						(scrollContainer as HTMLElement).scrollLeft = newScrollLeft;
					},
				);
			} else {
				console.warn("⚠️ ScrollContainer not found!");
			}
		}

		setZoomMultiplier(newZoom);
	}, [setZoomMultiplier, playerRef, fps, containerRef]);

	const resetZoom = useCallback(() => {
		const newZoom = 1;

		// Apply zoom and keep playhead visible
		if (playerRef?.current && containerRef.current) {
			const currentFrame = getSafeCurrentFrame(playerRef);
			const playheadTimeMs = (currentFrame / fps) * 1000;
			const containerWidth = containerRef.current.clientWidth;
			// Fix: Use correct selector for ScrollArea viewport
			const scrollContainer = document.getElementById("viewportH");

			console.log("🔘 Button Zoom triggered:", {
				action: "zoomIn/zoomOut",
				currentFrame,
				playheadTimeMs,
				currentZoom: currentZoomRef.current,
				newZoom,
				scrollContainerFound: !!scrollContainer,
				containerWidth,
			});

			if (scrollContainer) {
				const currentScrollLeft =
					(scrollContainer as HTMLElement).scrollLeft || 0;

				console.log("📏 Before zoom scroll:", currentScrollLeft);

				calculateZoomKeepingPlayheadVisible(
					currentZoomRef.current,
					newZoom,
					playheadTimeMs,
					containerWidth,
					currentScrollLeft,
					(newScrollLeft) => {
						console.log("📏 Setting new scroll:", newScrollLeft);
						(scrollContainer as HTMLElement).scrollLeft = newScrollLeft;
					},
				);
			} else {
				console.warn("⚠️ ScrollContainer not found!");
			}
		}

		setZoomMultiplier(newZoom);
	}, [setZoomMultiplier, playerRef, fps, containerRef]);

	const fitToTimeline = useCallback(
		(duration: number) => {
			const container = containerRef.current;
			if (!container || duration === 0) return;

			const containerWidth = container.clientWidth;
			const padding = 30;
			const availableWidth = containerWidth - padding;

			// Calculate zoom to fit
			const requiredWidth = duration * ZOOM_CONSTANTS.PIXELS_PER_SECOND;
			const fitMultiplier = availableWidth / requiredWidth;

			setZoomMultiplier(clampZoom(fitMultiplier));
		},
		[containerRef, setZoomMultiplier],
	);

	// Set up keyboard event listener
	useEffect(() => {
		if (isInTimeline) {
			document.addEventListener("keydown", handleKeyDown);
			return () => {
				document.removeEventListener("keydown", handleKeyDown);
			};
		}
	}, [isInTimeline, handleKeyDown]);

	// Handle native wheel events to prevent browser zoom and handle timeline zoom
	useEffect(() => {
		const container = containerRef.current;
		if (!container || !isInTimeline) return;

		const handleNativeWheel = (e: WheelEvent) => {
			// Only handle if Ctrl/Cmd is pressed (zoom gesture)
			if (e.ctrlKey || e.metaKey) {
				e.preventDefault();
				e.stopPropagation();

				// Get scroll container
				const scrollContainer = document.getElementById("viewportH");
				if (!scrollContainer) {
					console.warn("⚠️ ScrollContainer not found for wheel zoom!");
					return;
				}

				const currentScrollLeft = scrollContainer.scrollLeft || 0;

				// Smaller delta for smoother zoom
				const delta =
					e.deltaY > 0
						? -ZOOM_CONSTANTS.WHEEL_ZOOM_STEP
						: ZOOM_CONSTANTS.WHEEL_ZOOM_STEP;
				const newZoom = clampZoom(currentZoomRef.current + delta);

				// If we have playerRef, keep playhead visible (not centered)
				if (playerRef?.current) {
					const currentFrame = getSafeCurrentFrame(playerRef);
					const playheadTimeMs = (currentFrame / fps) * 1000;
					const containerWidth = container.clientWidth;

					console.log("🎡 Wheel Zoom with playhead:", {
						currentZoom: currentZoomRef.current,
						newZoom,
						playheadTimeMs,
						currentScrollLeft,
					});

					calculateZoomKeepingPlayheadVisible(
						currentZoomRef.current,
						newZoom,
						playheadTimeMs,
						containerWidth,
						currentScrollLeft,
						(newScrollLeft) => {
							scrollContainer.scrollLeft = newScrollLeft;
						},
					);
				} else {
					// Fallback to mouse focus if no playerRef
					const rect = container.getBoundingClientRect();
					const mouseX = e.clientX - rect.left;

					calculateZoomWithFocus(
						currentZoomRef.current,
						newZoom,
						mouseX,
						currentScrollLeft,
						(newScrollLeft) => {
							scrollContainer.scrollLeft = newScrollLeft;
						},
					);
				}

				// Update zoom (dispatch is already deferred inside setZoomMultiplier)
				setZoomMultiplier(newZoom);
			}
		};

		// Add the event listener with passive: false to allow preventDefault
		container.addEventListener("wheel", handleNativeWheel, { passive: false });

		return () => {
			container.removeEventListener("wheel", handleNativeWheel);
		};
	}, [isInTimeline, containerRef, setZoomMultiplier, playerRef, fps]);

	return {
		zoomMultiplier,
		scale,
		setZoomMultiplier,
		handleKeyDown,
		zoomIn,
		zoomOut,
		resetZoom,
		fitToTimeline,
	};
}
