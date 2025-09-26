import { useActionHandler } from "@/constants/actions";
import { dispatch } from "@designcombo/events";
import {
	LAYER_DELETE,
	ACTIVE_SPLIT,
	EDIT_OBJECT,
	LAYER_SELECT,
	LAYER_CLONE,
	HISTORY_UNDO,
	HISTORY_REDO,
} from "@designcombo/state";
import useStore from "@/features/editor/store/use-store";
import {
	PLAYER_PLAY,
	PLAYER_PAUSE,
	PLAYER_SEEK_BY,
	PLAYER_TOGGLE_PLAY,
} from "@/features/editor/constants/events";
import { useRef, useCallback } from "react";

export function useEditorActions() {
	const { playerRef, activeIds, timeline, fps, duration } = useStore();
	const isActive = useRef(true);

	const handleTogglePlay = useCallback(() => {
		if (!playerRef?.current) return;

		const isPlaying = playerRef.current.isPlaying();

		if (!isPlaying) {
			playerRef.current.play();
			dispatch(PLAYER_PLAY, {
				payload: {},
			});
		} else {
			playerRef.current.pause();
			dispatch(PLAYER_PAUSE);
		}
	}, [playerRef]);

	const handleSeek = useCallback(
		(args?: { seconds: number }) => {
			if (!playerRef?.current) return;
			const seconds = args?.seconds || 1;
			const currentFrame = playerRef.current.getCurrentFrame() || 0;
			const framesToSeek = seconds * fps;
			const newFrame = Math.max(0, currentFrame + framesToSeek);
			playerRef.current.seekTo(newFrame);

			dispatch(PLAYER_SEEK_BY, {
				payload: { seconds },
			});
		},
		[playerRef, fps],
	);

	const handleSeekBackward = useCallback(
		(args?: { seconds: number }) => {
			const seconds = -(args?.seconds || 1);
			handleSeek({ seconds });
		},
		[handleSeek],
	);

	const handleFrameStep = useCallback(
		(direction: "forward" | "backward") => {
			if (!playerRef?.current) return;
			const currentFrame = playerRef.current.getCurrentFrame() || 0;
			const newFrame =
				direction === "forward"
					? currentFrame + 1
					: Math.max(0, currentFrame - 1);
			playerRef.current.seekTo(newFrame);
		},
		[playerRef],
	);

	const handleGotoStart = useCallback(() => {
		if (!playerRef?.current) return;
		playerRef.current.seekTo(0);
	}, [playerRef]);

	const handleGotoEnd = useCallback(() => {
		if (!playerRef?.current) return;
		const endFrame = (duration / 1000) * fps;
		playerRef.current.seekTo(endFrame);
	}, [playerRef, duration, fps]);

	const handleSplitElement = useCallback(() => {
		if (!playerRef?.current || !activeIds.length) return;

		const currentFrame = playerRef.current.getCurrentFrame() || 0;
		const currentTimeMs = (currentFrame / fps) * 1000;
		dispatch(ACTIVE_SPLIT, {
			payload: {},
			options: {
				time: currentTimeMs,
			},
		});
	}, [playerRef, activeIds, fps]);

	const handleDeleteSelected = useCallback(() => {
		if (!activeIds.length) return;
		dispatch(LAYER_DELETE);
	}, [activeIds]);

	const handleSelectAll = useCallback(() => {
		// Get all track items from the store
		const trackItemsMap = useStore.getState().trackItemsMap;
		const allIds = Object.keys(trackItemsMap);

		if (allIds.length === 0) return;

		dispatch(LAYER_SELECT, {
			payload: {
				ids: allIds,
				selected: true,
			},
		});
	}, []);

	const handleDuplicateSelected = useCallback(() => {
		if (!activeIds.length) return;
		dispatch(LAYER_CLONE);
	}, [activeIds]);

	const handleCopySelected = useCallback(() => {
		if (!activeIds.length) return;
		dispatch(EDIT_OBJECT, {
			payload: {
				type: "copy",
			},
		});
	}, [activeIds]);

	const handlePasteSelected = useCallback(() => {
		if (!playerRef?.current) return;
		const currentFrame = playerRef.current.getCurrentFrame() || 0;
		const currentTimeMs = (currentFrame / fps) * 1000;

		dispatch(EDIT_OBJECT, {
			payload: {
				type: "paste",
			},
			options: {
				time: currentTimeMs,
			},
		});
	}, [playerRef, fps]);

	const handleUndo = useCallback(() => {
		dispatch(HISTORY_UNDO);
	}, []);

	const handleRedo = useCallback(() => {
		dispatch(HISTORY_REDO);
	}, []);

	const handleToggleSnapping = useCallback(() => {
		// Toggle snapping would be implemented via timeline settings
		// For now, this is a placeholder as the actual snapping state
		// needs to be managed in the timeline store or settings
		console.log("Toggle snapping not yet implemented");
	}, []);

	useActionHandler("toggle-play", handleTogglePlay, isActive);
	useActionHandler("seek-forward", handleSeek, isActive);
	useActionHandler("seek-backward", handleSeekBackward, isActive);
	useActionHandler(
		"frame-step-forward",
		() => handleFrameStep("forward"),
		isActive,
	);
	useActionHandler(
		"frame-step-backward",
		() => handleFrameStep("backward"),
		isActive,
	);
	useActionHandler("jump-forward", (args) => handleSeek(args), isActive);
	useActionHandler(
		"jump-backward",
		(args) => handleSeekBackward(args),
		isActive,
	);
	useActionHandler("goto-start", handleGotoStart, isActive);
	useActionHandler("goto-end", handleGotoEnd, isActive);
	useActionHandler("split-element", handleSplitElement, isActive);
	useActionHandler("delete-selected", handleDeleteSelected, isActive);
	useActionHandler("select-all", handleSelectAll, isActive);
	useActionHandler("duplicate-selected", handleDuplicateSelected, isActive);
	useActionHandler("copy-selected", handleCopySelected, isActive);
	useActionHandler("paste-selected", handlePasteSelected, isActive);
	useActionHandler("undo", handleUndo, isActive);
	useActionHandler("redo", handleRedo, isActive);
	useActionHandler("toggle-snapping", handleToggleSnapping, isActive);
}
