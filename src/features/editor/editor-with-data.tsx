"use client";

import { useEffect } from "react";
import Editor from "./editor";
import useProjectStore from "./store/use-project-store";
import useStore from "./store/use-store";
import useTranscriptStore from "./store/use-transcript-store";

interface EditorWithDataProps {
	projectId: string;
	serverData: any;
}

/**
 * Client component that manages the DB → Zustand → UI flow
 *
 * IMPORTANT DATA LOADING STRATEGY:
 *
 * 1. Timeline data (tracks, items, transitions):
 *    - Can be persisted in localStorage via Zustand
 *    - Preserves user edits between sessions
 *    - Falls back to DB data if localStorage is empty
 *
 * 2. Transcriptions (fullEDUs):
 *    - MUST ALWAYS be loaded from database
 *    - Too large for localStorage (can be hundreds of segments with word-level timestamps)
 *    - Never persisted in Zustand's localStorage
 *    - Always fetched fresh on page load to ensure accuracy
 *
 * 3. Uploads metadata:
 *    - Always loaded from database to ensure consistency
 *    - Contains file references that must match DB state
 *
 * Data flow: DB → Server Component → Client Component → Zustand Store → UI
 */
export default function EditorWithData({
	projectId,
	serverData,
}: EditorWithDataProps) {

	if (!projectId) {
		return null;
	}

	useEffect(() => {
		const initializeStores = async () => {
			// Get store instances
			const projectStore = useProjectStore.getState();
			const timelineStore = useStore.getState();
			const transcriptStore = useTranscriptStore.getState();

			// Check if we already have this project loaded in Zustand
			if (projectStore.currentProjectId === projectId) {
				// Check if timeline data exists
				if (timelineStore.tracks.length > 0 || Object.keys(timelineStore.trackItemsMap).length > 0) {

					// CRITICAL: Always load fullEDUs from server, never from localStorage
					// Transcriptions are too large and should always be fresh from DB
					if (serverData?.fullEDUs && serverData.fullEDUs.length > 0) {
						transcriptStore.initEDUs(serverData.fullEDUs);

						// Also update the project data with fullEDUs
						const currentProjectData = projectStore.projectData;
						if (currentProjectData) {
							projectStore.setProjectData(projectId, {
								...currentProjectData,
								fullEDUs: serverData.fullEDUs
							});
						}
					}

					// Also load uploads from server if available
					if (serverData?.uploads && serverData.uploads.length > 0) {
						const currentProjectData = projectStore.projectData;
						if (currentProjectData) {
							projectStore.setProjectData(projectId, {
								...currentProjectData,
								uploads: serverData.uploads
							});
						}
					}

					return;
				}
			}

			// If we have server data, load it into Zustand
			if (serverData) {
	
				// Update project store
				if (serverData.project) {
					projectStore.setUserId(serverData.project.userId || "");
					projectStore.setProjects([]);

					// Set the project data
					const projectData = {
						id: serverData.project.id,
						name: serverData.project.name,
						initialMedia: serverData.initialMedia || { url: "", type: "video", uploadId: "" },
						uploads: serverData.uploads || [],
						timeline: {
							tracks: serverData.tracks || [],
							trackItemsMap: serverData.trackItems || {},
							trackItemIds: Object.keys(serverData.trackItems || {}),
							transitionsMap: serverData.transitions || {},
							transitionIds: Object.keys(serverData.transitions || {}),
							compositions: serverData.compositions || [],
							duration: serverData.settings?.duration || 30000,
						},
						settings: serverData.settings || {
							fps: 30,
							width: 1920,
							height: 1080,
							background: { type: "color", value: "#000000" },
						},
						fullEDUs: serverData.fullEDUs || [],
						createdAt: serverData.project.createdAt,
						updatedAt: serverData.project.updatedAt,
					};

					// Set current project using the new method
					projectStore.setProjectData(projectId, projectData);
				}

				// Update timeline store with timeline data
				await timelineStore.setState({
					tracks: serverData.tracks || [],
					trackItemsMap: serverData.trackItems || {},
					trackItemIds: Object.keys(serverData.trackItems || {}),
					transitionsMap: serverData.transitions || {},
					transitionIds: Object.keys(serverData.transitions || {}),
					compositions: serverData.compositions || [],
					duration: serverData.settings?.duration || 30000,
					fps: serverData.settings?.fps || 30,
					size: {
						width: serverData.settings?.width || 1920,
						height: serverData.settings?.height || 1080,
					},
					background: serverData.settings?.background || {
						type: "color",
						value: "#000000",
					},
				});

				// Update transcript store if we have EDUs
				if (serverData.fullEDUs && serverData.fullEDUs.length > 0) {
					transcriptStore.initEDUs(serverData.fullEDUs);
				}

			}
		};

		initializeStores();
	}, [projectId, serverData]);

	// Render Editor without props - it will read from Zustand
	return <Editor projectId={projectId} />;
}
