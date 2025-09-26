import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
	projectStorage,
	type ProjectData,
	type ProjectMedia,
	type ProjectListItem,
	type ProjectUpload,
} from "@/utils/project";
import { FullEDU } from "../transcript/types";
import useUploadStore from "./use-upload-store";
import * as projectActions from "@/app/(edit)/actions/projects";
import * as timelineActions from "@/app/(edit)/actions/timeline";
import * as transcriptionActions from "@/app/(edit)/actions/transcriptions";

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number,
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout;
	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

interface ProjectStore {
	// Current project state
	currentProjectId: string | null;
	projectData: ProjectData | null;
	initialMediaUrl: string | null;
	userId: string | null; // Need userId for DB operations

	// Sync status
	isSyncing: boolean;
	lastSyncedAt: Date | null;
	syncError: string | null;

	// Project list
	projects: ProjectListItem[];

	// Actions
	setUserId: (userId: string) => void;
	setProjects: (projects: ProjectListItem[]) => void;
	setProjectData: (projectId: string, projectData: ProjectData) => void;
	createProject: (
		initialMedia: ProjectMedia,
		name?: string,
	) => Promise<ProjectData>;
	loadProject: (projectId: string) => Promise<boolean>;
	saveCurrentProject: () => Promise<void>;
	updateProjectName: (name: string) => Promise<void>;
	updateProjectTimeline: (
		timeline: Partial<ProjectData["timeline"]>,
	) => Promise<void>;
	updateProjectSettings: (
		settings: Partial<ProjectData["settings"]>,
	) => Promise<void>;
	updateProjectFullEDUs: (fullEDUs: FullEDU[]) => Promise<void>;
	updateInitialMediaUrl: (url: string) => void;
	clearInitialMedia: () => Promise<void>;
	deleteProject: (projectId: string) => Promise<void>;
	refreshProjectList: () => Promise<void>;
	clearCurrentProject: () => void;

	// Upload management
	addProjectUpload: (upload: ProjectUpload) => void;
	addProjectUploads: (uploads: ProjectUpload[]) => void;
	getProjectUploads: () => ProjectUpload[];
	removeProjectUpload: (uploadId: string) => void;
	loadProjectUploads: () => void;

	// Internal sync methods
	syncTimelineToDatabase: (
		timeline: Partial<ProjectData["timeline"]>,
	) => Promise<void>;
	syncTranscriptToDatabase: (
		fullEDUs: FullEDU[],
		uploadId?: string,
	) => Promise<void>;
	forceTimelineSync: () => Promise<void>;
}

// Create debounced sync functions
const debouncedTimelineSync = debounce(
	async (projectId: string, userId: string, timeline: any) => {
		try {
			await timelineActions.saveTimeline(projectId, userId, timeline);
		} catch (error) {
			console.error("Failed to sync timeline to database:", error);
		}
	},
	2000, // 2 seconds debounce for timeline
);

const debouncedSettingsSync = debounce(
	async (projectId: string, userId: string, settings: any) => {
		try {
			await projectActions.updateProjectSettings(projectId, userId, settings);
		} catch (error) {
			console.error("Failed to sync settings to database:", error);
		}
	},
	500, // 500ms debounce for settings
);

const useProjectStore = create<ProjectStore>()(
	persist(
		(set, get) => ({
			// Initial state
			currentProjectId: null,
			projectData: null,
			initialMediaUrl: null,
			userId: null,
			isSyncing: false,
			lastSyncedAt: null,
			syncError: null,
			projects: [],

			// Set user ID (needed for DB operations)
			setUserId: (userId: string) => {
				set({ userId });
			},

			setProjects: (projects: ProjectListItem[]) => {
				set({ projects });
			},

			// Set project data directly
			setProjectData: (projectId: string, projectData: ProjectData) => {
				set({
					currentProjectId: projectId,
					projectData,
					initialMediaUrl: projectData.initialMedia?.url || null,
				});
			},

			// Create new project - now async and DB-first
			createProject: async (initialMedia: ProjectMedia, name?: string) => {
				const { userId } = get();

				// Require userId for DB operations
				if (!userId) {
					console.error("Cannot create project: User ID not set");
					throw new Error("User authentication required");
				}

				set({ isSyncing: true });
				try {
					// Create directly in database
					const result = await projectActions.createProject(
						userId,
						initialMedia,
						name || `Project ${new Date().toLocaleDateString()}`,
					);

					if (!result.success || !result.projectId) {
						throw new Error(result.error || "Failed to create project");
					}

					// Load the created project
					const getResult = await projectActions.getProject(
						result.projectId,
						userId,
					);
					if (!getResult.success || !getResult.project) {
						throw new Error("Failed to load created project");
					}

					const dbProject = getResult.project;

					// Convert to ProjectData format
					const projectData: ProjectData = {
						id: dbProject.id,
						name: dbProject.name,
						initialMedia:
							(dbProject.settings as any)?.initialMedia || initialMedia,
						uploads: (dbProject.settings as any)?.uploads || [],
						timeline: {
							tracks: (dbProject.tracks as any[]) || [],
							trackItemsMap:
								(dbProject.trackItems as Record<string, any>) || {},
							trackItemIds: Object.keys(
								(dbProject.trackItems as Record<string, any>) || {},
							),
							transitionsMap:
								(dbProject.transitions as Record<string, any>) || {},
							transitionIds: Object.keys(
								(dbProject.transitions as Record<string, any>) || {},
							),
							compositions: (dbProject.compositions as any[]) || [],
							duration: dbProject.duration,
						},
						settings: {
							fps: dbProject.fps,
							width: dbProject.width,
							height: dbProject.height,
							background: dbProject.background as any,
							...((dbProject.settings as any) || {}),
						},
						fullEDUs: [],
						createdAt: dbProject.createdAt.toISOString(),
						updatedAt: dbProject.updatedAt.toISOString(),
					};

					set({
						currentProjectId: dbProject.id,
						projectData,
						initialMediaUrl: initialMedia.url,
						lastSyncedAt: new Date(),
						syncError: null,
					});

					await get().refreshProjectList();
					return projectData;
				} catch (error) {
					console.error("Failed to create project:", error);
					set({
						syncError:
							error instanceof Error
								? error.message
								: "Failed to create project",
					});
					throw error;
				} finally {
					set({ isSyncing: false });
				}
			},

			// Load existing project - from DB
			loadProject: async (projectId: string) => {
				const { userId } = get();

				if (!userId) {
					console.error("Cannot load project: User ID not set");
					return false;
				}

				set({ isSyncing: true });
				try {
					// Load from database
					const result = await projectActions.getProject(projectId, userId);
					if (!result.success || !result.project) {
						throw new Error(result.error || "Project not found");
					}

					const dbProject = result.project;

					// Convert DB project to ProjectData format
					const projectData: ProjectData = {
						id: dbProject.id,
						name: dbProject.name,
						initialMedia: (dbProject.settings as any)?.initialMedia || {},
						uploads: (dbProject.settings as any)?.uploads || [],
						timeline: {
							tracks: (dbProject.tracks as any[]) || [],
							trackItemsMap:
								(dbProject.trackItems as Record<string, any>) || {},
							trackItemIds: Object.keys(
								(dbProject.trackItems as Record<string, any>) || {},
							),
							transitionsMap:
								(dbProject.transitions as Record<string, any>) || {},
							transitionIds: Object.keys(
								(dbProject.transitions as Record<string, any>) || {},
							),
							compositions: (dbProject.compositions as any[]) || [],
							duration: dbProject.duration,
						},
						settings: {
							fps: dbProject.fps,
							width: dbProject.width,
							height: dbProject.height,
							background: dbProject.background as any,
							...((dbProject.settings as any) || {}),
						},
						fullEDUs: [],
						createdAt: dbProject.createdAt.toISOString(),
						updatedAt: dbProject.updatedAt.toISOString(),
					};

					// Check for transcriptions
					const transcriptResult =
						await transcriptionActions.getProjectTranscriptions(projectId);
					if (
						transcriptResult.success &&
						transcriptResult.transcriptions?.length
					) {
						// Get the first transcription's fullEDUs
						const firstTranscript = transcriptResult.transcriptions[0];
						if (firstTranscript.segments) {
							projectData.fullEDUs = (firstTranscript.segments as any[]).map(
								(segment, index) => ({
									edu_index: index,
									edu_content: segment.text,
									edu_start: segment.start,
									edu_end: segment.end,
									words: segment.words || [],
								}),
							);
						}
					}

					set({
						currentProjectId: projectId,
						projectData,
						initialMediaUrl: projectData.initialMedia?.url || null,
						lastSyncedAt: new Date(),
						syncError: null,
					});

					// Load project uploads into the upload store
					get().loadProjectUploads();

					return true;
				} catch (error) {
					console.error("Failed to load project from DB:", error);
					set({
						syncError:
							error instanceof Error ? error.message : "Failed to load project",
					});
					return false;
				} finally {
					set({ isSyncing: false });
				}
			},

			// Save current project
			saveCurrentProject: async () => {
				const { projectData, currentProjectId, userId } = get();
				if (!projectData || !currentProjectId || !userId) return;

				set({ isSyncing: true });
				try {
					// Update all project data in DB
					await projectActions.migrateProjectToDb(userId, projectData);
					set({ lastSyncedAt: new Date(), syncError: null });
				} catch (error) {
					console.error("Failed to save project:", error);
					set({
						syncError:
							error instanceof Error ? error.message : "Failed to save project",
					});
					throw error;
				} finally {
					set({ isSyncing: false });
				}

				await get().refreshProjectList();
			},

			// Update project name
			updateProjectName: async (name: string) => {
				const { currentProjectId, projectData, userId } = get();
				if (!currentProjectId || !projectData || !userId) return;

				const updated = { ...projectData, name };
				set({ projectData: updated });

				// Sync to database
				debouncedSettingsSync(currentProjectId, userId, { name });
				await get().refreshProjectList();
			},

			// Update project timeline
			updateProjectTimeline: async (
				timeline: Partial<ProjectData["timeline"]>,
			) => {
				const { currentProjectId, projectData, userId } = get();
				if (!currentProjectId || !projectData || !userId) return;

				const updated = {
					...projectData,
					timeline: { ...projectData.timeline, ...timeline },
				};
				set({ projectData: updated });

				// Sync to database with debouncing
				await get().syncTimelineToDatabase(timeline);
			},

			// Update project settings
			updateProjectSettings: async (
				settings: Partial<ProjectData["settings"]>,
			) => {
				const { currentProjectId, projectData, userId } = get();
				if (!currentProjectId || !projectData || !userId) return;

				const updated = {
					...projectData,
					settings: { ...projectData.settings, ...settings },
				};
				set({ projectData: updated });

				// Sync to database
				debouncedSettingsSync(currentProjectId, userId, settings);
			},

			// Update project fullEDUs
			updateProjectFullEDUs: async (fullEDUs: FullEDU[]) => {
				const { currentProjectId, projectData } = get();
				if (!currentProjectId || !projectData) return;

				const updated = {
					...projectData,
					fullEDUs,
				};
				set({ projectData: updated });

				// Sync to database
				await get().syncTranscriptToDatabase(fullEDUs);
			},

			// Update initial media URL after upload completes
			updateInitialMediaUrl: (url: string) => {
				const { currentProjectId, projectData, userId } = get();
				if (!currentProjectId || !projectData || !userId) return;

				const updated = {
					...projectData,
					initialMedia: {
						...projectData.initialMedia,
						url,
						isPending: false,
					},
				};
				set({
					projectData: updated,
					initialMediaUrl: url,
				});

				// Sync to database
				debouncedSettingsSync(currentProjectId, userId, {
					initialMedia: updated.initialMedia,
				});
			},

			// Clear initial media after it has been added to timeline
			clearInitialMedia: async () => {
				const { currentProjectId, projectData, userId } = get();
				if (!currentProjectId || !projectData || !userId) return;

				console.log("🧹 Clearing initialMedia from project");

				// Clear in Zustand state
				const updated = {
					...projectData,
					initialMedia: {
						url: "",
						type: "video" as const,
						uploadId: "",
						isPending: false,
					},
				};
				set({
					projectData: updated,
					initialMediaUrl: "",
				});

				// Sync to database immediately (not debounced since this is important)
				try {
					await projectActions.updateProjectSettings(currentProjectId, userId, {
						initialMedia: {
							url: "",
							type: "video",
							uploadId: "",
							isPending: false,
						},
					});
				} catch (error) {
					console.error("Failed to clear initialMedia from database:", error);
				}
			},

			// Delete project
			deleteProject: async (projectId: string) => {
				const { userId } = get();
				if (!userId) return;

				try {
					await projectActions.deleteProject(projectId, userId);
				} catch (error) {
					console.error("Failed to delete project:", error);
					set({
						syncError:
							error instanceof Error
								? error.message
								: "Failed to delete project",
					});
				}

				// If deleting current project, clear it
				if (get().currentProjectId === projectId) {
					set({
						currentProjectId: null,
						projectData: null,
						initialMediaUrl: null,
					});
				}

				await get().refreshProjectList();
			},

			// Refresh project list
			refreshProjectList: async () => {
				const { userId } = get();
				if (!userId) {
					set({ projects: [] });
					return;
				}

				try {
					const result = await projectActions.listUserProjects(userId);
					if (result.success && result.projects) {
						const projectList: ProjectListItem[] = result.projects.map((p) => ({
							id: p.id,
							name: p.name,
							thumbnail: p.thumbnail || undefined,
							createdAt: p.createdAt.toISOString(),
							updatedAt: p.updatedAt.toISOString(),
						}));
						set({ projects: projectList });
					}
				} catch (error) {
					console.error("Failed to list projects:", error);
				}
			},

			// Clear current project
			clearCurrentProject: () => {
				set({
					currentProjectId: null,
					projectData: null,
					initialMediaUrl: null,
				});
			},

			// Sync timeline to database
			syncTimelineToDatabase: async (
				timeline: Partial<ProjectData["timeline"]>,
			) => {
				const { currentProjectId, userId } = get();
				if (!currentProjectId || !userId) return;

				// Use debounced function for timeline sync
				debouncedTimelineSync(currentProjectId, userId, timeline);
			},

			// Sync transcript to database
			syncTranscriptToDatabase: async (
				fullEDUs: FullEDU[],
				uploadId?: string,
			) => {
				const { projectData, userId } = get();
				if (!projectData || !userId) return;

				// Use provided uploadId or find the most recent transcribable upload
				const targetUploadId =
					uploadId ||
					projectData.uploads?.find(
						(u) =>
							u.contentType?.includes("audio") ||
							u.contentType?.includes("video"),
					)?.id;

				if (!targetUploadId) {
					console.warn("No valid upload found for transcription sync");
					return;
				}

				try {
					await transcriptionActions.saveTranscription(
						targetUploadId,
						fullEDUs,
						{
							language: "zh", // TODO: Make configurable
							wordCount: fullEDUs.reduce(
								(acc, edu) => acc + edu.edu_content.split(/\s+/).length,
								0,
							),
							duration: Math.round(fullEDUs[fullEDUs.length - 1]?.edu_end || 0),
						},
					);
					set({ lastSyncedAt: new Date() });
				} catch (error) {
					console.error("Failed to sync transcript to database:", error);
				}
			},

			// Upload management - these remain mostly the same
			addProjectUpload: (upload: ProjectUpload) => {
				const { currentProjectId, projectData } = get();
				if (!currentProjectId || !projectData) return;

				const updated = {
					...projectData,
					uploads: [...(projectData.uploads || []), upload],
				};
				set({ projectData: updated });
			},

			addProjectUploads: (uploads: ProjectUpload[]) => {
				const { currentProjectId, projectData } = get();
				if (!currentProjectId || !projectData) return;

				const updated = {
					...projectData,
					uploads: [...(projectData.uploads || []), ...uploads],
				};
				set({ projectData: updated });
			},

			getProjectUploads: () => {
				const { projectData } = get();
				return projectData?.uploads || [];
			},

			removeProjectUpload: (uploadId: string) => {
				const { currentProjectId, projectData } = get();
				if (!currentProjectId || !projectData) return;

				const updated = {
					...projectData,
					uploads: projectData.uploads?.filter((u) => u.id !== uploadId) || [],
				};
				set({ projectData: updated });
			},

			loadProjectUploads: () => {
				const { projectData } = get();
				if (!projectData) return;

				const projectUploads = projectData.uploads || [];

				// Convert project uploads to upload store format
				const uploadsForStore = projectUploads.map((upload) => ({
					id: upload.id,
					fileName: upload.fileName,
					filePath: upload.filePath,
					url: upload.url,
					type: upload.contentType?.split("/")[0] || "unknown",
					contentType: upload.contentType,
					fileSize: upload.fileSize,
					folder: upload.folder,
					metadata: {
						...upload.metadata,
						uploadedUrl: upload.url,
						bytescaleUrl: upload.url,
					},
					uploadId: upload.id,
				}));

				// Set uploads in upload store
				useUploadStore.getState().setUploads(uploadsForStore);
			},

			// Force immediate timeline sync (no debounce)
			forceTimelineSync: async () => {
				const { currentProjectId, projectData, userId } = get();
				if (!currentProjectId || !projectData || !userId) return;

				// Get current timeline state from the timeline store
				const useStore = await import("./use-store").then((m) => m.default);
				const {
					tracks,
					trackItemsMap,
					transitionsMap,
					compositions,
					timeline,
				} = useStore.getState();

				if (!timeline) return;

				const timelineData = {
					tracks: tracks || [],
					trackItemsMap: trackItemsMap || {},
					trackItemIds: Object.keys(trackItemsMap || {}),
					transitionsMap: transitionsMap || {},
					transitionIds: Object.keys(transitionsMap || {}),
					compositions: compositions || [],
					duration: timeline.duration,
				};

				try {
					// Directly call the server action without debounce
					await timelineActions.saveTimeline(
						currentProjectId,
						userId,
						timelineData,
					);
					set({ lastSyncedAt: new Date() });
				} catch (error) {
					console.error("Failed to force sync timeline:", error);
				}
			},
		}),
		{
			name: "project-store",
			partialize: (state) => ({
				currentProjectId: state.currentProjectId,
				userId: state.userId,
			}),
		},
	),
);

export default useProjectStore;
