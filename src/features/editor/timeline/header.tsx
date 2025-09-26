import { Button } from "@/components/ui/button";
import { dispatch } from "@designcombo/events";
import {
	ACTIVE_SPLIT,
	LAYER_CLONE,
	LAYER_DELETE,
	TIMELINE_SCALE_CHANGED,
} from "@designcombo/state";
import { PLAYER_PAUSE, PLAYER_PLAY } from "../constants/events";
import { frameToTimeString, getCurrentTime, timeToString } from "../utils/time";
import useStore from "../store/use-store";
import { SquareSplitHorizontal, Trash, ZoomIn, ZoomOut } from "lucide-react";
import {
	getFitZoomLevel,
	getNextZoomLevel,
	getPreviousZoomLevel,
	getZoomByIndex,
	timeMsToUnits,
} from "../utils/timeline";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import { Slider } from "@/components/ui/slider";
import { useEffect, useState } from "react";
import useUpdateAnsestors from "../hooks/use-update-ansestors";
import { ITimelineScaleState } from "@designcombo/types";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";

const IconPlayerPlayFilled = ({ size }: { size: number }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		viewBox="0 0 24 24"
		fill="currentColor"
	>
		<path stroke="none" d="M0 0h24v24H0z" fill="none" />
		<path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" />
	</svg>
);

const IconPlayerPauseFilled = ({ size }: { size: number }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		viewBox="0 0 24 24"
		fill="currentColor"
	>
		<path stroke="none" d="M0 0h24v24H0z" fill="none" />
		<path d="M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
		<path d="M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
	</svg>
);
const IconPlayerSkipBack = ({ size }: { size: number }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path stroke="none" d="M0 0h24v24H0z" fill="none" />
		<path d="M20 5v14l-12 -7z" />
		<path d="M4 5l0 14" />
	</svg>
);

const IconPlayerSkipForward = ({ size }: { size: number }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path stroke="none" d="M0 0h24v24H0z" fill="none" />
		<path d="M4 5v14l12 -7z" />
		<path d="M20 5l0 14" />
	</svg>
);

// Helper function to maintain playhead position during zoom
const applyZoomWithPlayhead = (
	newScale: ITimelineScaleState,
	playerRef: any,
	fps: number,
) => {
	console.log("🎯 Header Zoom Button clicked", { newScale });

	// Get current playhead position
	const currentFrame = playerRef?.current?.getCurrentFrame() || 0;
	const playheadTimeMs = (currentFrame / fps) * 1000;

	// Get scroll container
	const scrollContainer = document.getElementById("viewportH");
	if (!scrollContainer) {
		console.warn("⚠️ ScrollContainer not found in Header zoom!");
		return;
	}

	// Get current scroll before zoom - ensure we get the actual value
	const currentScrollLeft = Math.max(0, scrollContainer.scrollLeft || 0);

	// Get current scale
	const currentScale = useStore.getState().scale;

	// Calculate playhead position in pixels using the timeline utils function
	// Add timeline offset to account for the left padding
	const timelineOffsetX = 40; // This should match TIMELINE_OFFSET_CANVAS_LEFT
	const currentPlayheadPos = timeMsToUnits(playheadTimeMs, currentScale.zoom) + timelineOffsetX;
	const newPlayheadPos = timeMsToUnits(playheadTimeMs, newScale.zoom) + timelineOffsetX;

	// Calculate where playhead currently appears in viewport (its visual position on screen)
	const playheadViewportOffset = currentPlayheadPos - currentScrollLeft;

	// Keep playhead at same viewport position after zoom
	let newScrollLeft = newPlayheadPos - playheadViewportOffset;

	// Ensure we don't scroll past the beginning
	newScrollLeft = Math.max(0, newScrollLeft);

	console.log("📏 Zoom calculation in Header:", {
		currentFrame,
		playheadTimeMs,
		currentScrollLeft,
		playheadViewportOffset,
		currentPlayheadPos,
		newPlayheadPos,
		newScrollLeft,
		currentScaleZoom: currentScale.zoom,
		newScaleZoom: newScale.zoom,
	});

	// Apply the new scale with the target scroll position
	dispatch(TIMELINE_SCALE_CHANGED, {
		payload: {
			scale: newScale,
			targetScrollLeft: newScrollLeft, // Include target scroll position
		},
	});

	// Set the scroll position after a small delay to ensure scale has been applied
	setTimeout(() => {
		scrollContainer.scrollLeft = newScrollLeft;
		console.log(
			"📏 Applied new scroll:",
			newScrollLeft,
			"Actual scroll:",
			scrollContainer.scrollLeft,
		);
	}, 10);
};

const Header = () => {
	const [playing, setPlaying] = useState(false);
	const { duration, fps, scale, playerRef, activeIds } = useStore();
	const isLargeScreen = useIsLargeScreen();
	useUpdateAnsestors({ playing, playerRef });

	const currentFrame = useCurrentPlayerFrame(playerRef);

	const doActiveDelete = () => {
		dispatch(LAYER_DELETE);
	};

	const doActiveSplit = () => {
		dispatch(ACTIVE_SPLIT, {
			payload: {},
			options: {
				time: getCurrentTime(),
			},
		});
	};

	const changeScale = (scale: ITimelineScaleState) => {
		dispatch(TIMELINE_SCALE_CHANGED, {
			payload: {
				scale,
			},
		});
	};

	const handlePlay = (event: React.MouseEvent<HTMLButtonElement>) => {
		console.log("🎬 handlePlay - calling player.play() directly", {
			hasPlayerRef: !!playerRef?.current,
			eventType: event?.type,
			isTrusted: event?.isTrusted,
		});

		// CRITICAL: Call player directly while still in user gesture context
		if (playerRef?.current) {
			playerRef.current.play(event);
		}

		// Then dispatch for state management (without event)
		dispatch(PLAYER_PLAY, {
			payload: {},
		});
	};

	const handlePause = () => {
		console.log("⏸️ handlePause - calling player.pause() directly");

		// Call player directly
		if (playerRef?.current) {
			playerRef.current.pause();
		}

		// Then dispatch for state management
		dispatch(PLAYER_PAUSE);
	};

	useEffect(() => {
		const handlePlayEvent = () => setPlaying(true);
		const handlePauseEvent = () => setPlaying(false);

		playerRef?.current?.addEventListener("play", handlePlayEvent);
		playerRef?.current?.addEventListener("pause", handlePauseEvent);

		return () => {
			playerRef?.current?.removeEventListener("play", handlePlayEvent);
			playerRef?.current?.removeEventListener("pause", handlePauseEvent);
		};
	}, [playerRef]);

	return (
		<div
			style={{
				position: "relative",
				height: "50px",
				flex: "none",
			}}
		>
			<div
				style={{
					position: "absolute",
					height: 50,
					width: "100%",
					display: "flex",
					alignItems: "center",
				}}
			>
				<div
					style={{
						height: 36,
						width: "100%",
						display: "grid",
						gridTemplateColumns: isLargeScreen
							? "1fr 260px 1fr"
							: "1fr 1fr 1fr",
						alignItems: "center",
					}}
				>
					<div className="flex px-2">
						<Button
							disabled={!activeIds.length}
							onClick={doActiveDelete}
							variant={"ghost"}
							size={isLargeScreen ? "sm" : "icon"}
							className="flex items-center gap-1 px-2"
						>
							<Trash size={14} />{" "}
							<span className="hidden lg:block">Delete</span>
						</Button>

						<Button
							disabled={!activeIds.length}
							onClick={doActiveSplit}
							variant={"ghost"}
							size={isLargeScreen ? "sm" : "icon"}
							className="flex items-center gap-1 px-2"
						>
							<SquareSplitHorizontal size={15} />{" "}
							<span className="hidden lg:block">Split</span>
						</Button>
						<Button
							disabled={!activeIds.length}
							onClick={() => {
								dispatch(LAYER_CLONE);
							}}
							variant={"ghost"}
							size={isLargeScreen ? "sm" : "icon"}
							className="flex items-center gap-1 px-2"
						>
							<SquareSplitHorizontal size={15} />{" "}
							<span className="hidden lg:block">Clone</span>
						</Button>
					</div>
					<div className="flex items-center justify-center">
						<div>
							<Button
								className="hidden lg:inline-flex"
								onClick={doActiveDelete}
								variant={"ghost"}
								size={"icon"}
							>
								<IconPlayerSkipBack size={14} />
							</Button>
							<Button
								onClickCapture={(e) => {
									if (playing) {
										return handlePause();
									}
									handlePlay(e);
								}}
								variant={"ghost"}
								size={"icon"}
							>
								{playing ? (
									<IconPlayerPauseFilled size={14} />
								) : (
									<IconPlayerPlayFilled size={14} />
								)}
							</Button>
							<Button
								className="hidden lg:inline-flex"
								onClick={doActiveSplit}
								variant={"ghost"}
								size={"icon"}
							>
								<IconPlayerSkipForward size={14} />
							</Button>
						</div>
						<div
							className="text-xs font-light flex"
							style={{
								alignItems: "center",
								gridTemplateColumns: "54px 4px 54px",
								paddingTop: "2px",
								justifyContent: "center",
							}}
						>
							<div
								className="font-medium text-zinc-200"
								style={{
									display: "flex",
									justifyContent: "center",
								}}
								data-current-time={currentFrame / fps}
								id="video-current-time"
							>
								{frameToTimeString({ frame: currentFrame }, { fps })}
							</div>
							<span className="px-1">|</span>
							<div
								className="text-muted-foreground hidden lg:block"
								style={{
									display: "flex",
									justifyContent: "center",
								}}
							>
								{timeToString({ time: duration })}
							</div>
						</div>
					</div>

					<ZoomControl
						scale={scale}
						onChangeTimelineScale={changeScale}
						duration={duration}
						playerRef={playerRef}
						fps={fps}
					/>
				</div>
			</div>
		</div>
	);
};

const ZoomControl = ({
	scale,
	onChangeTimelineScale,
	duration,
	playerRef,
	fps,
}: {
	scale: ITimelineScaleState;
	onChangeTimelineScale: (scale: ITimelineScaleState) => void;
	duration: number;
	playerRef: any;
	fps: number;
}) => {
	const [localValue, setLocalValue] = useState(scale.index);
	const timelineOffsetX = useTimelineOffsetX();

	useEffect(() => {
		setLocalValue(scale.index);
	}, [scale.index]);

	const onZoomOutClick = () => {
		const previousZoom = getPreviousZoomLevel(scale);
		applyZoomWithPlayhead(previousZoom, playerRef, fps);
	};

	const onZoomInClick = () => {
		const nextZoom = getNextZoomLevel(scale);
		applyZoomWithPlayhead(nextZoom, playerRef, fps);
	};

	const onZoomFitClick = () => {
		const fitZoom = getFitZoomLevel(duration, scale.zoom, timelineOffsetX);
		onChangeTimelineScale(fitZoom);
	};

	return (
		<div className="flex items-center justify-end">
			<div className="flex lg:border-l pl-4 pr-2">
				<Button size={"icon"} variant={"ghost"} onClick={onZoomOutClick}>
					<ZoomOut size={16} />
				</Button>
				<Slider
					className="w-28 hidden lg:flex"
					value={[localValue]}
					min={0}
					max={12}
					step={1}
					onValueChange={(e) => {
						setLocalValue(e[0]); // Update local state
					}}
					onValueCommit={() => {
						const zoom = getZoomByIndex(localValue);
						onChangeTimelineScale(zoom); // Propagate value to parent when user commits change
					}}
				/>
				<Button size={"icon"} variant={"ghost"} onClick={onZoomInClick}>
					<ZoomIn size={16} />
				</Button>
				<Button onClick={onZoomFitClick} variant={"ghost"} size={"icon"}>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						viewBox="0 0 24 24"
					>
						<path
							fill="currentColor"
							d="M20 8V6h-2q-.425 0-.712-.288T17 5t.288-.712T18 4h2q.825 0 1.413.588T22 6v2q0 .425-.288.713T21 9t-.712-.288T20 8M2 8V6q0-.825.588-1.412T4 4h2q.425 0 .713.288T7 5t-.288.713T6 6H4v2q0 .425-.288.713T3 9t-.712-.288T2 8m18 12h-2q-.425 0-.712-.288T17 19t.288-.712T18 18h2v-2q0-.425.288-.712T21 15t.713.288T22 16v2q0 .825-.587 1.413T20 20M4 20q-.825 0-1.412-.587T2 18v-2q0-.425.288-.712T3 15t.713.288T4 16v2h2q.425 0 .713.288T7 19t-.288.713T6 20zm2-6v-4q0-.825.588-1.412T8 8h8q.825 0 1.413.588T18 10v4q0 .825-.587 1.413T16 16H8q-.825 0-1.412-.587T6 14"
						/>
					</svg>
				</Button>
			</div>
		</div>
	);
};

export default Header;
