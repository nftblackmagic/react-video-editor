"use client";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { useSceneStore } from "@/store/use-scene-store";
import { ProjectMedia } from "@/utils/project";
import { dispatch } from "@designcombo/events";
import StateManager, { DESIGN_LOAD } from "@designcombo/state";
import { ADD_AUDIO, ADD_VIDEO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { ITrackItem } from "@designcombo/types";
import { useEffect, useRef, useState } from "react";
import { ImperativePanelHandle } from "react-resizable-panels";
import PlayerTimeEmitter from "./components/PlayerTimeEmitter";
import { SECONDARY_FONT, SECONDARY_FONT_URL } from "./constants/constants";
import { ControlItem } from "./control-item";
import ControlItemHorizontal from "./control-item-horizontal";
import FloatingControl from "./control-item/floating-controls/floating-control";
import CropModal from "./crop-modal/crop-modal";
import { FONTS } from "./data/fonts";
import useTimelineEvents from "./hooks/use-timeline-events";
import MenuListHorizontal from "./menu-list-horizontal";
import Navbar from "./navbar";
import Scene from "./scene";
import { SceneRef } from "./scene/scene.types";
import useDataState from "./store/use-data-state";
import useLayoutStore from "./store/use-layout-store";
import useProjectStore from "./store/use-project-store";
import useStore from "./store/use-store";
import useTranscriptStore from "./store/use-transcript-store";
import Timeline from "./timeline";
import { TranscriptEditor } from "./transcript";
import { FullEDU } from "./transcript/types";
import { getCompactFontData, loadFonts } from "./utils/fonts";
import { loadTimelineGranularly } from "./utils/granular-dispatch";

const stateManager = new StateManager({
	size: {
		width: 1080,
		height: 1920,
	},
});

interface EditorProps {
	// Project identification
	projectId: string;

	// Initial data passed from server/parent
	projectData: {
		id: string;
		name: string;
		createdAt: string;
		updatedAt: string;
	};
	initialMedia: ProjectMedia;
	initialTracks?: any[];
	initialTrackItems?: Record<string, any>;
	initialTransitions?: Record<string, any>;
	initialCompositions?: any[];
	initialFullEDUs?: FullEDU[];
	initialSettings?: Record<string, any>;
	initialUploads?: any[];
}

const Editor = ({
	projectId,
	projectData,
	initialMedia,
	initialTracks = [],
	initialTrackItems = {},
	initialTransitions = {},
	initialCompositions = [],
	initialFullEDUs = [],
	initialSettings = {},
	initialUploads = [],
}: EditorProps) => {
	const [projectName, setProjectName] = useState<string>(
		projectData?.name || "Untitled video",
	);
	const { updateProjectTimeline, updateProjectFullEDUs, setUserId } =
		useProjectStore();
	const { fullEDUs, initEDUs } = useTranscriptStore();
	const { scene } = useSceneStore();
	const timelinePanelRef = useRef<ImperativePanelHandle>(null);
	const sceneRef = useRef<SceneRef>(null);
	const {
		timeline,
		playerRef,
		tracks,
		trackItemsMap,
		transitionsMap,
		compositions,
	} = useStore();
	const { activeIds } = useStore();
	const [loaded, setLoaded] = useState(false);
	const [trackItem, setTrackItem] = useState<ITrackItem | null>(null);
	const [timelineInitialized, setTimelineInitialized] = useState(false);
	const {
		setTrackItem: setLayoutTrackItem,
		setFloatingControl,
		setLabelControlItem,
		setTypeControlItem,
	} = useLayoutStore();
	const isLargeScreen = useIsLargeScreen();

	useTimelineEvents();

	// TODO: Replace with real authentication system
	// Demo user UUID - replace with real auth when ready
	const DEMO_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

	// TODO: Get real user ID from authentication context/provider
	// Set demo userId (in production, this would come from auth)
	useEffect(() => {
		// TODO: Replace with actual user ID from auth
		// Example: const userId = useAuth().user?.id;
		// Use a demo user UUID for now
		setUserId(DEMO_USER_ID);
	}, [setUserId]);

	// Initialize timeline with granular loading and verification
	useEffect(() => {
		if (!timeline || timelineInitialized) return;

		// Load timeline data granularly
		const hasData =
			initialTracks.length > 0 || Object.keys(initialTrackItems).length > 0;

		if (hasData) {
			// Load with proper validation
			const results = loadTimelineGranularly({
				tracks: initialTracks,
				trackItems: initialTrackItems,
				transitions: initialTransitions,
				compositions: initialCompositions,
				fps: initialSettings?.fps,
				size:
					initialSettings?.width && initialSettings?.height
						? { width: initialSettings.width, height: initialSettings.height }
						: undefined,
			});

			// Verify the load was successful
			if (results.valid) {
				setTimelineInitialized(true);
			} else {
				console.error(
					"Failed to load timeline data:",
					results.errors || results.error,
				);
			}
		} else {
			// Mark as initialized even if no data to prevent re-runs
			setTimelineInitialized(true);
		}
	}, [
		timeline,
		initialTracks,
		initialTrackItems,
		initialTransitions,
		initialCompositions,
		initialSettings,
		timelineInitialized,
	]);

	// Handle initial media separately
	useEffect(() => {
		if (!initialMedia || !timeline) return;

		const { type, url, isPending } = initialMedia;

		// Skip if media is pending upload
		if (isPending || !url) return;

		// Check if media already exists in trackItems to prevent duplicates
		const mediaExists = Object.values(trackItemsMap).some(
			(item: any) => item?.details?.src === url,
		);

		if (mediaExists) {
			return; // Skip if media already exists
		}

		// Only add if we have an empty timeline (no tracks with items)
		const hasExistingContent = tracks.some(
			(track: any) => track.items && track.items.length > 0,
		);

		if (hasExistingContent) {
			return; // Skip if timeline already has content
		}

		try {
			// Dispatch appropriate action based on media type
			if (type === "video") {
				dispatch(ADD_VIDEO, {
					payload: {
						id: generateId(),
						details: {
							src: url,
						},
						metadata: {
							previewUrl:
								"https://cdn.designcombo.dev/caption_previews/static_preset1.webp",
						},
					},
					options: {
						resourceId: "main",
						scaleMode: "fit",
					},
				});
			} else if (type === "audio") {
				dispatch(ADD_AUDIO, {
					payload: {
						id: generateId(),
						type: "audio",
						details: {
							src: url,
						},
						metadata: {},
					},
					options: {},
				});
			}
		} catch (error) {
			console.error("Error adding initial media:", error);
		}
	}, [initialMedia, timeline, trackItemsMap, tracks]);

	// Initialize transcripts from fullEDUs
	useEffect(() => {
		if (initialFullEDUs && initialFullEDUs.length > 0) {
			initEDUs(initialFullEDUs);
		}
	}, [initialFullEDUs, initEDUs]);

	// Save timeline state to project store (debounced)
	useEffect(() => {
		if (
			projectId &&
			timeline &&
			tracks &&
			tracks.length > 0 &&
			trackItemsMap &&
			Object.keys(trackItemsMap).length > 0
		) {
			const timeoutId = setTimeout(() => {
				updateProjectTimeline({
					tracks: tracks || [],
					trackItemsMap: trackItemsMap || {},
					trackItemIds: Object.keys(trackItemsMap || {}),
					transitionsMap: transitionsMap || {},
					transitionIds: Object.keys(transitionsMap || {}),
					compositions: compositions || [],
					duration: timeline.duration,
				});
			}, 1000);

			return () => clearTimeout(timeoutId);
		}
	}, [
		projectId,
		timeline,
		tracks,
		trackItemsMap,
		transitionsMap,
		compositions,
		updateProjectTimeline,
	]);

	// Save transcripts (debounced) - Now saves full EDU structure
	useEffect(() => {
		if (projectId && fullEDUs.length > 0) {
			const timeoutId = setTimeout(() => {
				// Save the full EDU structure to preserve grouping
				updateProjectFullEDUs(fullEDUs);
			}, 1000);

			return () => clearTimeout(timeoutId);
		}
	}, [projectId, fullEDUs, updateProjectFullEDUs]);

	// Note: Legacy combo.sh and scene API support has been removed.
	// All projects now use the unified projectId-based approach.

	// Load scene from store if available
	useEffect(() => {
		if (scene && timeline) {
			dispatch(DESIGN_LOAD, { payload: scene });
		}
	}, [scene, timeline]);

	// Initialize fonts
	useEffect(() => {
		const { setCompactFonts, setFonts } = useDataState.getState();
		setCompactFonts(getCompactFontData(FONTS));
		setFonts(FONTS);

		loadFonts([
			{
				name: SECONDARY_FONT,
				url: SECONDARY_FONT_URL,
			},
		]);
	}, []);

	// Set initial timeline panel size
	useEffect(() => {
		const screenHeight = window.innerHeight;
		const desiredHeight = 300;
		const percentage = (desiredHeight / screenHeight) * 100;
		timelinePanelRef.current?.resize(percentage);
	}, []);

	// Handle timeline resize
	const handleTimelineResize = () => {
		const timelineContainer = document.getElementById("timeline-container");
		if (!timelineContainer) return;

		timeline?.resize(
			{
				height: timelineContainer.clientHeight - 90,
				width: timelineContainer.clientWidth - 40,
			},
			{
				force: true,
			},
		);

		setTimeout(() => {
			sceneRef.current?.recalculateZoom();
		}, 100);
	};

	useEffect(() => {
		const onResize = () => handleTimelineResize();
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [timeline]);

	// Handle track item selection
	useEffect(() => {
		if (activeIds.length === 1) {
			const [id] = activeIds;
			const trackItem = trackItemsMap[id];
			if (trackItem) {
				setTrackItem(trackItem);
				setLayoutTrackItem(trackItem);
			} else console.log(transitionsMap[id]);
		} else {
			setTrackItem(null);
			setLayoutTrackItem(null);
		}
	}, [activeIds, trackItemsMap, transitionsMap]);

	// Reset controls on screen size change
	useEffect(() => {
		setFloatingControl("");
		setLabelControlItem("");
		setTypeControlItem("");
	}, [isLargeScreen]);

	useEffect(() => {
		setLoaded(true);
	}, []);

	const [showTranscript] = useState(true);

	return (
		<div className="flex h-screen w-screen flex-col">
			<PlayerTimeEmitter />
			<Navbar
				projectName={projectName}
				user={null}
				stateManager={stateManager}
				setProjectName={setProjectName}
			/>
			<div className="flex flex-1">
				<ResizablePanelGroup style={{ flex: 1 }} direction="vertical">
					<ResizablePanel className="relative" defaultSize={70}>
						<FloatingControl />
						<div className="flex h-full flex-1">
							<div className="flex w-full h-full">
								<div
									style={{
										width:
											showTranscript && isLargeScreen
												? "calc(100% - 400px)"
												: "100%",
										height: "100%",
										position: "relative",
										overflow: "hidden",
									}}
								>
									<CropModal />
									<Scene ref={sceneRef} stateManager={stateManager} />
								</div>

								{showTranscript && isLargeScreen && (
									<div style={{ width: "400px", height: "100%" }}>
										<TranscriptEditor />
									</div>
								)}
							</div>
						</div>
					</ResizablePanel>
					<ResizableHandle />
					<ResizablePanel
						className="min-h-[50px]"
						ref={timelinePanelRef}
						defaultSize={30}
						onResize={handleTimelineResize}
					>
						{playerRef && <Timeline stateManager={stateManager} />}
					</ResizablePanel>
					{!isLargeScreen && !trackItem && loaded && <MenuListHorizontal />}
					{!isLargeScreen && trackItem && <ControlItemHorizontal />}
				</ResizablePanelGroup>
				<ControlItem />
			</div>
		</div>
	);
};

export default Editor;
