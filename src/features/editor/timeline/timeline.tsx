import { useEffect, useRef, useState, RefObject } from "react";
import Header from "./header";
import Ruler from "./ruler";
import { timeMsToUnits, unitsToTimeMs } from "@designcombo/timeline";
import CanvasTimeline from "./items/timeline";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { dispatch, filter, subject } from "@designcombo/events";
import {
	TIMELINE_BOUNDING_CHANGED,
	TIMELINE_PREFIX,
	TIMELINE_SEEK,
} from "@designcombo/timeline";
import useStore from "../store/use-store";
import Playhead from "./playhead";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import { Audio, Image, Text, Video, Subtitle } from "./items";
import StateManager, { REPLACE_MEDIA } from "@designcombo/state";
import {
	TIMELINE_OFFSET_CANVAS_LEFT,
	TIMELINE_OFFSET_CANVAS_RIGHT,
} from "../constants/constants";
import { ITrackItem } from "@designcombo/types";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";
import { useStateManagerEvents } from "../hooks/use-state-manager-events";
import { useTimelineZoom } from "../hooks/use-timeline-zoom";

CanvasTimeline.registerItems({
	Text,
	Image,
	Audio,
	Video,
	Subtitle,
});

const EMPTY_SIZE = { width: 0, height: 0 };
const Timeline = ({ stateManager }: { stateManager: StateManager }) => {
	// prevent duplicate scroll events
	const canScrollRef = useRef(false);
	const isZoomingRef = useRef(false); // Track if we're in the middle of a zoom operation
	const targetScrollAfterZoom = useRef<number | null>(null); // Store intended scroll position after zoom
	const timelineContainerRef = useRef<HTMLDivElement>(null);
	const [scrollLeft, setScrollLeft] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasElRef = useRef<HTMLCanvasElement>(null);
	const canvasRef = useRef<CanvasTimeline | null>(null);
	const verticalScrollbarVpRef = useRef<HTMLDivElement>(null);
	const horizontalScrollbarVpRef = useRef<HTMLDivElement>(null);
	const { scale, playerRef, fps, duration, setState, timeline } = useStore();
	const currentFrame = useCurrentPlayerFrame(playerRef);
	const [canvasSize, setCanvasSize] = useState(EMPTY_SIZE);
	const [size, setSize] = useState<{ width: number; height: number }>(
		EMPTY_SIZE,
	);
	const timelineOffsetX = useTimelineOffsetX();

	const { setTimeline } = useStore();

	// Add zoom functionality (handles keyboard shortcuts and wheel zoom)
	useTimelineZoom({
		containerRef: timelineContainerRef as RefObject<HTMLDivElement>,
		initialScale: scale,
		isInTimeline: true,
		playerRef: playerRef || undefined,
		fps,
	});

	// Use the extracted state manager events hook
	useStateManagerEvents(stateManager);

	const onScroll = (v: { scrollTop: number; scrollLeft: number }) => {
		const negatedScrollLeft = -v.scrollLeft;

		console.log("🔄 Canvas onScroll callback:", {
			scrollLeft: v.scrollLeft,
			scrollTop: v.scrollTop,
			negatedScrollLeft,
			isZooming: isZoomingRef.current,
			targetScroll: targetScrollAfterZoom.current,
		});

		// During zoom operations, prevent scroll resets
		if (isZoomingRef.current) {
			// If we have a target scroll position and the canvas is trying to reset to near 0
			if (targetScrollAfterZoom.current && targetScrollAfterZoom.current > 100 && Math.abs(v.scrollLeft) < 50) {
				console.log("⚠️ Preventing canvas scroll reset during zoom. Target:", targetScrollAfterZoom.current);
				// Force the canvas back to the target position
				if (timeline) {
					timeline.scrollTo({ scrollLeft: targetScrollAfterZoom.current });
				}
				return;
			}

			// Also ignore if trying to reset from a high value to near 0
			if (Math.abs(scrollLeft) > 100 && Math.abs(v.scrollLeft) < 50) {
				console.log("⚠️ Ignoring canvas scroll reset during zoom");
				return;
			}
		}

		if (horizontalScrollbarVpRef.current && verticalScrollbarVpRef.current) {
			verticalScrollbarVpRef.current.scrollTop = -v.scrollTop;
			horizontalScrollbarVpRef.current.scrollLeft = negatedScrollLeft;
			setScrollLeft(negatedScrollLeft);
		}
	};

	useEffect(() => {
		if (playerRef?.current) {
			const isPlaying = playerRef?.current.isPlaying();
			console.log("🎬 Player state changed - isPlaying:", isPlaying);
			canScrollRef.current = isPlaying;
		}
	}, [playerRef?.current?.isPlaying()]);

	useEffect(() => {
		const position = timeMsToUnits((currentFrame / fps) * 1000, scale.zoom);
		const canvasEl = canvasElRef.current;
		const horizontalScrollbar = horizontalScrollbarVpRef.current;

		if (!canvasEl || !horizontalScrollbar) return;

		const canvasBoudingX =
			canvasEl.getBoundingClientRect().x + canvasEl.clientWidth;
		const playHeadPos = position - scrollLeft + 40;

		console.log("🎯 Auto-scroll check:", {
			currentFrame,
			position,
			scrollLeft,
			playHeadPos,
			canvasBoudingX,
			shouldAutoScroll: playHeadPos >= canvasBoudingX,
		});

		if (playHeadPos >= canvasBoudingX) {
			const scrollDivWidth = horizontalScrollbar.clientWidth;
			const totalScrollWidth = horizontalScrollbar.scrollWidth;
			const currentPosScroll = horizontalScrollbar.scrollLeft;
			const availableScroll =
				totalScrollWidth - (scrollDivWidth + currentPosScroll);
			const scaleScroll = availableScroll / scrollDivWidth;

			console.log("📜 Auto-scrolling timeline:", {
				scrollDivWidth,
				totalScrollWidth,
				currentPosScroll,
				availableScroll,
				scaleScroll,
			});

			if (scaleScroll >= 0) {
				if (scaleScroll > 1)
					horizontalScrollbar.scrollTo({
						left: currentPosScroll + scrollDivWidth,
					});
				else
					horizontalScrollbar.scrollTo({
						left: totalScrollWidth - scrollDivWidth,
					});
			}
		}
	}, [currentFrame]);

	const onResizeCanvas = (payload: { width: number; height: number }) => {
		setCanvasSize({
			width: payload.width,
			height: payload.height,
		});
	};

	useEffect(() => {
		const canvasEl = canvasElRef.current;
		const timelineContainerEl = timelineContainerRef.current;

		if (!canvasEl || !timelineContainerEl) return;

		const containerWidth = timelineContainerEl.clientWidth - 40;
		const containerHeight = timelineContainerEl.clientHeight - 90;
		const canvas = new CanvasTimeline(canvasEl, {
			width: containerWidth,
			height: containerHeight,
			bounding: {
				width: containerWidth,
				height: 0,
			},
			selectionColor: "rgba(0, 216, 214,0.1)",
			selectionBorderColor: "rgba(0, 216, 214,1.0)",
			onScroll,
			onResizeCanvas,
			scale: scale,
			state: stateManager,
			duration,
			spacing: {
				left: TIMELINE_OFFSET_CANVAS_LEFT,
				right: TIMELINE_OFFSET_CANVAS_RIGHT,
			},
			sizesMap: {
				text: 32,
				subtitle: 32,
				audio: 36,
				customTrack: 40,
				customTrack2: 40,
				linealAudioBars: 40,
				radialAudioBars: 40,
				waveAudioBars: 40,
				hillAudioBars: 40,
			},
			itemTypes: [
				"text",
				"subtitle",
				"image",
				"audio",
				"video",
				"helper",
				"track",
				"composition",
				"template",
				"linealAudioBars",
				"radialAudioBars",
				"progressFrame",
				"progressBar",
				"waveAudioBars",
				"hillAudioBars",
			],
			acceptsMap: {
				text: ["text"],
				subtitle: ["subtitle"],
				image: ["image", "video"],
				video: ["video", "image"],
				audio: ["audio"],
				template: ["template"],
				customTrack: ["video", "image"],
				customTrack2: ["video", "image"],
				main: ["video", "image"],
				linealAudioBars: ["audio", "linealAudioBars"],
				radialAudioBars: ["audio", "radialAudioBars"],
				waveAudioBars: ["audio", "waveAudioBars"],
				hillAudioBars: ["audio", "hillAudioBars"],
			},
			guideLineColor: "#ffffff",
		});

		canvasRef.current = canvas;

		setCanvasSize({ width: containerWidth, height: containerHeight });
		setSize({
			width: containerWidth,
			height: 0,
		});
		setTimeline(canvas);

		return () => {
			canvas.purge();
		};
	}, []);

	const handleOnScrollH = (e: React.UIEvent<HTMLDivElement, UIEvent>) => {
		const newScrollLeft = e.currentTarget.scrollLeft;
		const absCurrentScrollLeft = Math.abs(scrollLeft);

		// Check if this is a suspicious reset during zoom
		// The canvas might be resetting the scroll after a scale change
		const isSuspiciousReset =
			isZoomingRef.current &&
			absCurrentScrollLeft > 100 &&
			newScrollLeft < 50;

		console.log("📜 handleOnScrollH called:", {
			newScrollLeft,
			currentScrollLeft: scrollLeft,
			absCurrentScrollLeft,
			canScroll: canScrollRef.current,
			eventTarget: e.currentTarget.id,
			isZooming: isZoomingRef.current,
			isSuspiciousReset,
		});

		// Ignore suspicious scroll resets during zoom operations
		if (isSuspiciousReset) {
			console.log("⚠️ Ignoring suspicious scroll reset during zoom");
			e.currentTarget.scrollLeft = absCurrentScrollLeft; // Restore the previous scroll
			return;
		}

		// During zoom, also prevent small incremental scrolls that look like animations
		if (isZoomingRef.current && absCurrentScrollLeft > 500 && newScrollLeft < 100) {
			console.log("⚠️ Blocking incremental scroll reset during zoom");
			return;
		}

		if (canScrollRef.current || isZoomingRef.current) {
			const canvas = canvasRef.current;
			if (canvas) {
				console.log("📜 Updating canvas from scrollbar:", newScrollLeft);
				canvas.scrollTo({ scrollLeft: newScrollLeft });
			}
		}
		setScrollLeft(newScrollLeft);
	};

	const handleOnScrollV = (e: React.UIEvent<HTMLDivElement, UIEvent>) => {
		const scrollTop = e.currentTarget.scrollTop;
		if (canScrollRef.current) {
			const canvas = canvasRef.current;
			if (canvas) {
				canvas.scrollTo({ scrollTop });
			}
		}
	};

	useEffect(() => {
		const addEvents = subject.pipe(
			filter(({ key }) => key.startsWith(TIMELINE_PREFIX)),
		);

		const subscription = addEvents.subscribe((obj) => {
			if (obj.key === TIMELINE_BOUNDING_CHANGED) {
				const bounding = obj.value?.payload?.bounding;
				if (bounding) {
					setSize({
						width: bounding.width,
						height: bounding.height,
					});
				}
			}
		});
		return () => {
			subscription.unsubscribe();
		};
	}, []);

	const handleReplaceItem = (trackItem: Partial<ITrackItem>) => {
		if (!trackItem.id) return;

		dispatch(REPLACE_MEDIA, {
			payload: {
				[trackItem.id]: {
					details: {
						src: "https://cdn.designcombo.dev/videos/demo-video-4.mp4",
					},
				},
			},
		});
	};

	const onClickRuler = (units: number) => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const time = unitsToTimeMs(units, scale.zoom);
		playerRef?.current?.seekTo((time * fps) / 1000);

		// Dispatch TIMELINE_SEEK event for transcript sync
		dispatch(TIMELINE_SEEK, { payload: { time } });
	};

	const onRulerScroll = (newScrollLeft: number) => {
		console.log("🎯 onRulerScroll called with:", {
			newScrollLeft,
			currentScrollLeft: scrollLeft,
			hasCanvas: !!canvasRef.current,
			hasScrollbar: !!horizontalScrollbarVpRef.current,
		});

		// When ruler is being dragged, we always want to update
		// Set canScrollRef to true temporarily for drag operations
		const previousCanScroll = canScrollRef.current;
		canScrollRef.current = true;

		// Update the timeline canvas scroll position
		const canvas = canvasRef.current;
		if (canvas) {
			console.log("📐 Updating canvas scroll to:", newScrollLeft);
			canvas.scrollTo({ scrollLeft: newScrollLeft });
		}

		// Update the horizontal scrollbar position
		if (horizontalScrollbarVpRef.current) {
			console.log("📏 Updating scrollbar to:", newScrollLeft);
			horizontalScrollbarVpRef.current.scrollLeft = newScrollLeft;
		}

		// Update the local scroll state
		console.log("📍 Setting scrollLeft state to:", newScrollLeft);
		setScrollLeft(newScrollLeft);

		// Restore the previous canScroll state after a small delay
		// This prevents conflicts with the scrollbar drag
		setTimeout(() => {
			canScrollRef.current = previousCanScroll;
		}, 0);
	};

	useEffect(() => {
		// Mark that we're in a zoom operation
		isZoomingRef.current = true;

		// Store the current scroll position to prevent reset
		const currentAbsScrollLeft = Math.abs(scrollLeft);
		targetScrollAfterZoom.current = currentAbsScrollLeft;

		const availableScroll = horizontalScrollbarVpRef.current?.scrollWidth;
		if (!availableScroll || !timeline) return;

		console.log("⚡ Scale changed effect:", {
			scale: scale.zoom,
			availableScroll,
			currentScrollLeft: scrollLeft,
			currentAbsScrollLeft,
			timelineWidth: timeline.width,
		});

		const canvasWidth = timeline.width;
		if (availableScroll < canvasWidth + currentAbsScrollLeft) {
			const newScrollLeft = availableScroll - canvasWidth;
			console.log("⚡ Adjusting scroll due to scale change:", {
				from: currentAbsScrollLeft,
				to: newScrollLeft,
			});
			timeline.scrollTo({ scrollLeft: newScrollLeft });
		} else {
			// Preserve the scroll position during scale change
			timeline.scrollTo({ scrollLeft: currentAbsScrollLeft });
		}

		// Clear the zooming flag after a delay to allow scroll updates to complete
		const timer = setTimeout(() => {
			isZoomingRef.current = false;
			targetScrollAfterZoom.current = null;
			console.log("🏁 Zoom operation completed");
		}, 500);

		return () => clearTimeout(timer);
	}, [scale]);

	return (
		<div
			ref={timelineContainerRef}
			id={"timeline-container"}
			className="bg-muted relative h-full w-full overflow-hidden"
		>
			<Header />
			<Ruler
				onClick={onClickRuler}
				scrollLeft={scrollLeft}
				onScroll={onRulerScroll}
			/>
			<Playhead scrollLeft={scrollLeft} />
			<div className="flex">
				<div
					style={{
						width: timelineOffsetX,
					}}
					className="relative flex-none"
				/>
				<div style={{ height: canvasSize.height }} className="relative flex-1">
					<div
						style={{ height: canvasSize.height }}
						ref={containerRef}
						className="absolute top-0 w-full"
					>
						<canvas id="designcombo-timeline-canvas" ref={canvasElRef} />
					</div>
					<ScrollArea.Root
						type="always"
						style={{
							position: "absolute",
							width: "calc(100vw - 40px)",
							height: "10px",
						}}
						className="ScrollAreaRootH"
						onPointerDown={() => {
							canScrollRef.current = true;
						}}
						onPointerUp={() => {
							canScrollRef.current = false;
						}}
					>
						<ScrollArea.Viewport
							onScroll={handleOnScrollH}
							className="ScrollAreaViewport"
							id="viewportH"
							ref={horizontalScrollbarVpRef}
						>
							<div
								style={{
									width:
										size.width > canvasSize.width
											? size.width + TIMELINE_OFFSET_CANVAS_RIGHT
											: size.width,
								}}
								className="pointer-events-none h-[10px]"
							/>
						</ScrollArea.Viewport>

						<ScrollArea.Scrollbar
							className="ScrollAreaScrollbar"
							orientation="horizontal"
						>
							<ScrollArea.Thumb
								onMouseDown={() => {
									canScrollRef.current = true;
								}}
								onMouseUp={() => {
									canScrollRef.current = false;
								}}
								className="ScrollAreaThumb"
							/>
						</ScrollArea.Scrollbar>
					</ScrollArea.Root>

					<ScrollArea.Root
						type="always"
						style={{
							position: "absolute",
							height: canvasSize.height,
							width: "10px",
						}}
						className="ScrollAreaRootV"
					>
						<ScrollArea.Viewport
							onScroll={handleOnScrollV}
							className="ScrollAreaViewport"
							ref={verticalScrollbarVpRef}
						>
							<div
								style={{
									height:
										size.height > canvasSize.height
											? size.height + 40
											: canvasSize.height,
								}}
								className="pointer-events-none w-[10px]"
							/>
						</ScrollArea.Viewport>
						<ScrollArea.Scrollbar
							className="ScrollAreaScrollbar"
							orientation="vertical"
						>
							<ScrollArea.Thumb
								onMouseDown={() => {
									canScrollRef.current = true;
								}}
								onMouseUp={() => {
									canScrollRef.current = false;
								}}
								className="ScrollAreaThumb"
							/>
						</ScrollArea.Scrollbar>
					</ScrollArea.Root>
				</div>
			</div>
		</div>
	);
};

export default Timeline;
