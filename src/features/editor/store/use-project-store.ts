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

interface ProjectStore {
	// Current project state
	currentProjectId: string | null;
	projectData: ProjectData | null;
	initialMediaUrl: string | null;

	// Project list
	projects: ProjectListItem[];

	// Actions
	createProject: (initialMedia: ProjectMedia, name?: string) => ProjectData;
	loadProject: (projectId: string) => boolean;
	saveCurrentProject: () => void;
	updateProjectName: (name: string) => void;
	updateProjectTimeline: (timeline: Partial<ProjectData["timeline"]>) => void;
	updateProjectSettings: (settings: Partial<ProjectData["settings"]>) => void;
	updateProjectFullEDUs: (fullEDUs: FullEDU[]) => void;
	updateInitialMediaUrl: (url: string) => void;
	deleteProject: (projectId: string) => void;
	refreshProjectList: () => void;
	clearCurrentProject: () => void;

	// Upload management
	addProjectUpload: (upload: ProjectUpload) => void;
	addProjectUploads: (uploads: ProjectUpload[]) => void;
	getProjectUploads: () => ProjectUpload[];
	removeProjectUpload: (uploadId: string) => void;
	loadProjectUploads: () => void;
}

const useProjectStore = create<ProjectStore>()(
	persist(
		(set, get) => ({
			// Initial state
			currentProjectId: null,
			projectData: null,
			initialMediaUrl: null,
			projects: [],

			// Create new project
			createProject: (initialMedia: ProjectMedia, name?: string) => {
				const project = projectStorage.createProject(initialMedia, name);
				set({
					currentProjectId: project.id,
					projectData: project,
					initialMediaUrl: initialMedia.url,
				});
				get().refreshProjectList();
				return project;
			},

			// Load existing project
			loadProject: (projectId: string) => {
				const project = projectStorage.getProject(projectId);
				if (!project) {
					console.error(`Project ${projectId} not found`);
					return false;
				}

				set({
					currentProjectId: projectId,
					projectData: project,
					initialMediaUrl: project.initialMedia?.url || null,
				});

				// Load project uploads into the upload store
				get().loadProjectUploads();

				return true;
			},

			// Save current project to localStorage
			saveCurrentProject: () => {
				const { projectData } = get();
				if (!projectData) return;

				projectStorage.saveProject(projectData);
				get().refreshProjectList();
			},

			// Update project name
			updateProjectName: (name: string) => {
				const { currentProjectId, projectData } = get();
				if (!currentProjectId || !projectData) return;

				const updated = { ...projectData, name };
				projectStorage.saveProject(updated);
				set({ projectData: updated });
				get().refreshProjectList();
			},

			// Update project timeline
			updateProjectTimeline: (timeline: Partial<ProjectData["timeline"]>) => {
				const { currentProjectId, projectData } = get();
				if (!currentProjectId || !projectData) return;

				const updated = {
					...projectData,
					timeline: { ...projectData.timeline, ...timeline },
				};
				projectStorage.saveProject(updated);
				set({ projectData: updated });
			},

			// Update project settings
			updateProjectSettings: (settings: Partial<ProjectData["settings"]>) => {
				const { currentProjectId, projectData } = get();
				if (!currentProjectId || !projectData) return;

				const updated = {
					...projectData,
					settings: { ...projectData.settings, ...settings },
				};
				projectStorage.saveProject(updated);
				set({ projectData: updated });
			},

			// Update project fullEDUs
			updateProjectFullEDUs: (fullEDUs: FullEDU[]) => {
				const { currentProjectId, projectData } = get();
				if (!currentProjectId || !projectData) return;

				const updated = {
					...projectData,
					fullEDUs,
				};
				projectStorage.saveProject(updated);
				set({ projectData: updated });
			},

			// Update initial media URL after upload completes
			updateInitialMediaUrl: (url: string) => {
				const { currentProjectId, projectData } = get();
				if (!currentProjectId || !projectData) return;

				const updated = {
					...projectData,
					initialMedia: {
						...projectData.initialMedia,
						url,
						isPending: false,
					},
				};
				projectStorage.saveProject(updated);
				set({
					projectData: updated,
					initialMediaUrl: url,
				});
			},

			// Delete project
			deleteProject: (projectId: string) => {
				projectStorage.deleteProject(projectId);

				// If deleting current project, clear it
				if (get().currentProjectId === projectId) {
					set({
						currentProjectId: null,
						projectData: null,
						initialMediaUrl: null,
					});
				}

				get().refreshProjectList();
			},

			// Refresh project list
			refreshProjectList: () => {
				const projects = projectStorage.listProjects();
				set({ projects });
			},

			// Clear current project
			clearCurrentProject: () => {
				set({
					currentProjectId: null,
					projectData: null,
					initialMediaUrl: null,
				});
			},

			// Add single upload to project
			addProjectUpload: (upload: ProjectUpload) => {
				const { currentProjectId } = get();
				if (!currentProjectId) return;

				projectStorage.addProjectUpload(currentProjectId, upload);
				// Update local state
				const project = projectStorage.getProject(currentProjectId);
				if (project) {
					set({ projectData: project });
				}
			},

			// Add multiple uploads to project
			addProjectUploads: (uploads: ProjectUpload[]) => {
				const { currentProjectId } = get();
				if (!currentProjectId) return;

				projectStorage.addProjectUploads(currentProjectId, uploads);
				// Update local state
				const project = projectStorage.getProject(currentProjectId);
				if (project) {
					set({ projectData: project });
				}
			},

			// Get project uploads
			getProjectUploads: () => {
				const { currentProjectId } = get();
				if (!currentProjectId) return [];

				return projectStorage.getProjectUploads(currentProjectId);
			},

			// Remove upload from project
			removeProjectUpload: (uploadId: string) => {
				const { currentProjectId } = get();
				if (!currentProjectId) return;

				projectStorage.removeProjectUpload(currentProjectId, uploadId);
				// Update local state
				const project = projectStorage.getProject(currentProjectId);
				if (project) {
					set({ projectData: project });
				}
			},

			// Load project uploads into upload store
			loadProjectUploads: () => {
				const { currentProjectId } = get();
				if (!currentProjectId) return;

				const projectUploads =
					projectStorage.getProjectUploads(currentProjectId);

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
		}),
		{
			name: "project-store",
			partialize: (state) => ({
				currentProjectId: state.currentProjectId,
			}),
		},
	),
);

export default useProjectStore;
