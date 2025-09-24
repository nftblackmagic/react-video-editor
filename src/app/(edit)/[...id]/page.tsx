import { getCurrentUserId } from "@/constants/auth";
import EditorWithData from "@/features/editor/editor-with-data";
import type { FullEDU } from "@/features/editor/transcript/types";
import { prepareProjectDataForEditor } from "@/utils/project";
import type { ProjectData } from "@/utils/project";
import * as projectActions from "../actions/projects";
import * as timelineActions from "../actions/timeline";
import * as transcriptionActions from "../actions/transcriptions";
import * as uploadActions from "../actions/uploads";

export default async function Page({
	params,
}: { params: Promise<{ id: string[] }> }) {
	const { id } = await params;
	const projectId = id[0];

	// Get current user ID (TODO: Replace with real auth)
	const userId = await getCurrentUserId();

	let projectData: ProjectData | null = null;

	if (userId) {
		// Try to load from database
		const projectResult = await projectActions.getProject(projectId, userId);

		if (projectResult.success && projectResult.project) {
			const project = projectResult.project;

			// Load timeline data
			const timelineResult = await timelineActions.getTimeline(
				projectId,
				userId,
			);
			const timeline = timelineResult.success ? timelineResult.timeline : null;

			// Load uploads for the project
			const uploadsResult = await uploadActions.getProjectUploads(
				projectId,
				userId,
			);
			const uploads =
				uploadsResult.success && uploadsResult.uploads
					? uploadsResult.uploads
					: [];

			// Load transcriptions for uploads
			let fullEDUs: FullEDU[] = [];
			if (uploads && uploads.length > 0) {
				// For now, we'll use the first transcription found
				// In the future, we might want to combine multiple transcriptions
				for (const upload of uploads) {
					const transcriptionResult =
						await transcriptionActions.getTranscription(upload.id);
					if (transcriptionResult.success && transcriptionResult.fullEDUs) {
						fullEDUs = transcriptionResult.fullEDUs;
						break; // Use first transcription found
					}
				}
			}

			// Parse settings safely
			const projectSettings = (project.settings as any) || {};

			// Convert to ProjectData format
			projectData = {
				id: project.id,
				name: project.name,
				initialMedia: projectSettings.initialMedia || {
					url: "",
					type: "video" as const,
					uploadId: "",
				},
				uploads: uploads.map((u) => ({
					id: u.id,
					fileName: u.fileName,
					filePath: u.fileUrl, // Add filePath as required by ProjectUpload type
					url: u.fileUrl,
					contentType: u.fileType,
					fileSize: u.fileSize,
					uploadedAt: u.createdAt?.toISOString() || new Date().toISOString(),
					folder: u.folder || undefined,
					metadata: u.metadata || undefined,
				})),
				timeline: {
					tracks: timeline?.tracks || (project.tracks as any[]) || [],
					trackItemsMap:
						timeline?.trackItems ||
						(project.trackItems as Record<string, any>) ||
						{},
					trackItemIds:
						timeline?.trackItemIds || Object.keys(project.trackItems || {}),
					transitionsMap:
						timeline?.transitions ||
						(project.transitions as Record<string, any>) ||
						{},
					transitionIds:
						timeline?.transitionIds || Object.keys(project.transitions || {}),
					compositions:
						timeline?.compositions || (project.compositions as any[]) || [],
					duration: timeline?.duration || project.duration || 30000,
				},
				settings: {
					fps: project.fps || 30,
					width: project.width || 1920,
					height: project.height || 1080,
					background: project.background || { type: "solid", value: "#000000" },
					...(projectSettings || {}),
				},
				fullEDUs: fullEDUs,
				createdAt: project.createdAt.toISOString(),
				updatedAt: project.updatedAt.toISOString(),
			};
		}
	}

	// Prepare the data if loaded from server
	const preparedData = projectData
		? prepareProjectDataForEditor(projectData)
		: null;

	// Pass server data to client component
	// Client component will handle fallback to localStorage if needed
	return (
		<EditorWithData
			projectId={projectId}
			serverData={preparedData}
		/>
	);
}
