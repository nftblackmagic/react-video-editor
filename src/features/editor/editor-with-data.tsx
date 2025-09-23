"use client";

import {
	loadProjectFromClient,
	prepareProjectDataForEditor,
} from "@/utils/project";
import { useEffect, useState } from "react";
import Editor from "./editor";
import useProjectStore from "./store/use-project-store";
import useStore from "./store/use-store";

interface EditorWithDataProps {
	projectId: string;
	serverData: ReturnType<typeof prepareProjectDataForEditor> | null;
	dataSource?: "database" | "client-required";
}

/**
 * Client component that handles the Server-First with Client Fallback pattern
 * 1. Uses server data if available (future: from database)
 * 2. Falls back to localStorage if server data not available
 * 3. Shows loading state during client-side data fetch
 */
export default function EditorWithData({
	projectId,
	serverData,
	dataSource,
}: EditorWithDataProps) {
	const [projectData, setProjectData] = useState<ReturnType<
		typeof prepareProjectDataForEditor
	> | null>(serverData);
	const [isLoading, setIsLoading] = useState(false);
	const [loadSource, setLoadSource] = useState<
		"server" | "localStorage" | "none"
	>(serverData ? "server" : "none");

	if (!projectId) {
		return null;
	}

	useEffect(() => {
		// Check Zustand state first - if we have fresh state from upload/navigation
		const projectStore = useProjectStore.getState();
		const timelineStore = useStore.getState();

		if (projectStore.currentProjectId === projectId && projectStore.projectData) {
			console.log("✅ Using Zustand state - no DB reload needed");

			// Build the prepared data from Zustand state
			const zustandData = {
				project: {
					id: projectStore.projectData.id,
					name: projectStore.projectData.name,
					createdAt: projectStore.projectData.createdAt,
					updatedAt: projectStore.projectData.updatedAt,
				},
				initialMedia: projectStore.projectData.initialMedia,
				uploads: projectStore.projectData.uploads || [],
				tracks: timelineStore.tracks || projectStore.projectData.timeline?.tracks || [],
				trackItems: timelineStore.trackItemsMap || projectStore.projectData.timeline?.trackItemsMap || {},
				transitions: timelineStore.transitionsMap || projectStore.projectData.timeline?.transitionsMap || {},
				compositions: timelineStore.compositions || projectStore.projectData.timeline?.compositions || [],
				fullEDUs: projectStore.projectData.fullEDUs || [],
				settings: projectStore.projectData.settings || {},
			};

			setProjectData(zustandData);
			setLoadSource("localStorage"); // Actually Zustand, but keeping name for compatibility
			return;
		}

		// If we have server data, use it
		if (serverData) {
			console.log("Using server-provided data");
			return;
		}

		// If server indicates client loading is required, load from localStorage
		if (dataSource === "client-required" && projectId) {
			console.log("Server requires client-side loading, checking localStorage");
			setIsLoading(true);

			try {
				const data = loadProjectFromClient(projectId);
				if (data) {
					const prepared = prepareProjectDataForEditor(data);
					setProjectData(prepared);
					setLoadSource("localStorage");
					console.log("Loaded project from localStorage");
				} else {
					console.error("No project data found in localStorage or DB");
				}
			} catch (error) {
				console.error("Error loading from localStorage:", error);
			} finally {
				setIsLoading(false);
			}
		}
	}, [projectId, serverData, dataSource]);

	// Show loading state only when actively loading from client
	if (isLoading) {
		return (
			<div className="flex h-screen w-screen items-center justify-center">
				<div className="text-center">
					<div className="text-muted-foreground mb-2">Loading project...</div>
					<div className="text-xs text-muted-foreground">
						Checking local storage
					</div>
				</div>
			</div>
		);
	}

	// Log the data source for debugging
	useEffect(() => {
		if (loadSource !== "none") {
			console.log(`Project loaded from: ${loadSource}`);
		}
	}, [loadSource]);

	// Pass all data as props to Editor
	return (
		<Editor
			projectId={projectId}
			projectData={
				projectData?.project || {
					id: "",
					name: "",
					createdAt: "",
					updatedAt: "",
				}
			}
			initialMedia={
				projectData?.initialMedia || { url: "", type: "video", uploadId: "" }
			}
			initialTracks={projectData?.tracks || []}
			initialTrackItems={projectData?.trackItems || {}}
			initialTransitions={projectData?.transitions || {}}
			initialCompositions={projectData?.compositions || []}
			initialFullEDUs={projectData?.fullEDUs || []}
			initialSettings={projectData?.settings || {}}
			initialUploads={projectData?.uploads || []}
		/>
	);
}
