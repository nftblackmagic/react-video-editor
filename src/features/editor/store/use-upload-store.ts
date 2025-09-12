import { create } from "zustand";
import { persist } from "zustand/middleware";
import { processUpload, type UploadCallbacks } from "@/utils/upload-service";
import { isTranscribableMedia } from "@/utils/transcribe-service";
import { TranscriptSegment } from "../transcript/types";
import useTranscriptStore from "./use-transcript-store";
import useProjectStore from "./use-project-store";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO, ADD_IMAGE, ADD_AUDIO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { transcribeElevenLabs } from "@/app/(edit)/actions/transcribe";
import {
	addSegmentedMedia,
	SegmentSplitOptions,
} from "../utils/segment-splitter";
import { projectStorage, type ProjectUpload } from "@/utils/project-storage";

interface UploadFile {
	id: string;
	file?: File;
	url?: string;
	type?: string;
	status?: "pending" | "uploading" | "uploaded" | "failed";
	progress?: number;
	error?: string;
}

interface IUploadStore {
	showUploadModal: boolean;
	setShowUploadModal: (showUploadModal: boolean) => void;
	uploadProgress: Record<string, number>;
	setUploadProgress: (uploadProgress: Record<string, number>) => void;
	uploadsVideos: any[];
	setUploadsVideos: (uploadsVideos: any[]) => void;
	uploadsAudios: any[];
	setUploadsAudios: (uploadsAudios: any[]) => void;
	uploadsImages: any[];
	setUploadsImages: (uploadsImages: any[]) => void;
	files: UploadFile[];
	setFiles: (
		files: UploadFile[] | ((prev: UploadFile[]) => UploadFile[]),
	) => void;

	pendingUploads: UploadFile[];
	addPendingUploads: (uploads: UploadFile[]) => void;
	clearPendingUploads: () => void;
	activeUploads: UploadFile[];
	processUploads: () => void;
	updateUploadProgress: (id: string, progress: number) => void;
	setUploadStatus: (
		id: string,
		status: UploadFile["status"],
		error?: string,
	) => void;
	removeUpload: (id: string) => void;
	uploads: any[];
	setUploads: (uploads: any[] | ((prev: any[]) => any[])) => void;
	addUpload: (upload: any) => void;

	// Transcription related
	transcriptionStatus: Record<
		string,
		"idle" | "processing" | "completed" | "failed"
	>;
	transcriptions: Record<string, TranscriptSegment[]>;
	startTranscription: (uploadId: string, url?: string) => Promise<void>;
	completeTranscription: (
		uploadId: string,
		segments: TranscriptSegment[],
		autoSplit?: boolean,
	) => void;
	setTranscriptionStatus: (
		uploadId: string,
		status: "idle" | "processing" | "completed" | "failed",
	) => void;
	setTranscription: (uploadId: string, segments: TranscriptSegment[]) => void;
	getTranscription: (uploadId: string) => TranscriptSegment[] | undefined;
}

const useUploadStore = create<IUploadStore>()(
	persist(
		(set, get) => ({
			showUploadModal: false,
			setShowUploadModal: (showUploadModal: boolean) =>
				set({ showUploadModal }),

			uploadProgress: {},
			setUploadProgress: (uploadProgress: Record<string, number>) =>
				set({ uploadProgress }),

			uploadsVideos: [],
			setUploadsVideos: (uploadsVideos: any[]) => set({ uploadsVideos }),

			uploadsAudios: [],
			setUploadsAudios: (uploadsAudios: any[]) => set({ uploadsAudios }),

			uploadsImages: [],
			setUploadsImages: (uploadsImages: any[]) => set({ uploadsImages }),

			files: [],
			setFiles: (
				files: UploadFile[] | ((prev: UploadFile[]) => UploadFile[]),
			) =>
				set((state) => ({
					files:
						typeof files === "function"
							? (files as (prev: UploadFile[]) => UploadFile[])(state.files)
							: files,
				})),

			pendingUploads: [],
			addPendingUploads: (uploads: UploadFile[]) => {
				set((state) => ({
					pendingUploads: [...state.pendingUploads, ...uploads],
				}));
			},
			clearPendingUploads: () => set({ pendingUploads: [] }),

			activeUploads: [],
			processUploads: () => {
				const {
					pendingUploads,
					activeUploads,
					updateUploadProgress,
					setUploadStatus,
					removeUpload,
					setUploads,
				} = get();

				// Move pending uploads to active with 'uploading' status
				if (pendingUploads.length > 0) {
					set((state) => ({
						activeUploads: [
							...state.activeUploads,
							...pendingUploads.map((u) => ({
								...u,
								status: "uploading" as const,
								progress: 0,
							})),
						],
						pendingUploads: [],
					}));
				}

				// Get updated activeUploads after moving pending ones
				const currentActiveUploads = get().activeUploads;

				const callbacks: UploadCallbacks = {
					onProgress: (uploadId, progress) => {
						updateUploadProgress(uploadId, progress);
					},
					onStatus: (uploadId, status, error) => {
						setUploadStatus(uploadId, status, error);
						if (status === "uploaded") {
							// Remove from active uploads after a delay to show final status
							setTimeout(() => removeUpload(uploadId), 3000);
						} else if (status === "failed") {
							// Remove from active uploads after a delay to show final status
							setTimeout(() => removeUpload(uploadId), 3000);
						}
					},
				};

				// Process all uploading items
				for (const upload of currentActiveUploads.filter(
					(upload) => upload.status === "uploading",
				)) {
					processUpload(
						upload.id,
						{ file: upload.file, url: upload.url },
						callbacks,
					)
						.then(async (uploadData) => {
							// Skip if upload failed (null or empty array)
							if (
								!uploadData ||
								(Array.isArray(uploadData) && uploadData.length === 0)
							) {
								console.error(`Upload failed for ${upload.id}, skipping...`);
								return;
							}

							// Add the complete upload data to the uploads array
							if (uploadData) {
								let uploadsToProcess = [];
								if (Array.isArray(uploadData)) {
									// URL uploads return an array - add uploadId to each
									const uploadsWithId = uploadData.map((data) => ({
										...data,
										uploadId: upload.id,
									}));
									setUploads((prev) => [...prev, ...uploadsWithId]);
									uploadsToProcess = uploadsWithId;
								} else {
									// File uploads return a single object - add uploadId
									const uploadWithId = { ...uploadData, uploadId: upload.id };
									setUploads((prev) => [...prev, uploadWithId]);
									uploadsToProcess = [uploadWithId];
								}

								// Save uploads to current project in localStorage
								const projectStore = useProjectStore.getState();
								const currentProjectId = projectStore.currentProjectId;
								const projectData = projectStore.projectData;

								if (currentProjectId) {
									const projectUploads: ProjectUpload[] = uploadsToProcess.map(
										(data) => ({
											id: data.uploadId || upload.id,
											fileName: data.fileName,
											filePath: data.filePath,
											url:
												data.url ||
												data.metadata?.uploadedUrl ||
												data.metadata?.bytescaleUrl,
											contentType: data.contentType || data.type,
											fileSize: data.fileSize,
											uploadedAt: new Date().toISOString(),
											folder: data.folder,
											metadata: data.metadata,
										}),
									);
									projectStorage.addProjectUploads(
										currentProjectId,
										projectUploads,
									);

									// Update initial media URL if this is the initial upload
									if (
										projectData?.initialMedia?.uploadId === upload.id &&
										projectData?.initialMedia?.isPending
									) {
										const mediaUrl = projectUploads[0]?.url;
										if (mediaUrl) {
											projectStore.updateInitialMediaUrl(mediaUrl);
										}
									}
								}

								// Automatically add media to timeline and start transcription
								for (const data of uploadsToProcess) {
									const contentType = data.contentType || data.type || "";
									const mediaUrl =
										data.metadata?.uploadedUrl ||
										data.metadata?.originalUrl ||
										data.url ||
										data.filePath;

									// Auto-add to timeline based on media type
									if (mediaUrl) {
										if (contentType.startsWith("video/")) {
											dispatch(ADD_VIDEO, {
												payload: {
													id: generateId(),
													details: {
														src: mediaUrl,
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
										} else if (contentType.startsWith("image/")) {
											dispatch(ADD_IMAGE, {
												payload: {
													id: generateId(),
													type: "image",
													display: {
														from: 0,
														to: 5000,
													},
													details: {
														src: mediaUrl,
													},
													metadata: {},
												},
												options: {},
											});
										} else if (contentType.startsWith("audio/")) {
											// Add audio to timeline immediately
											dispatch(ADD_AUDIO, {
												payload: {
													id: generateId(),
													type: "audio",
													details: {
														src: mediaUrl,
													},
													metadata: {},
												},
												options: {},
											});
										}
									}

									// Start transcription for transcribable media
									if (isTranscribableMedia(contentType)) {
										if (mediaUrl) {
											// Use the upload ID as the transcription ID
											get().startTranscription(upload.id, mediaUrl);
										}
									}
								}
							}
						})
						.catch((error) => {
							console.error("Upload processing error:", error);
							// Error is already handled in processUpload, just log here
						});
				}
			},
			updateUploadProgress: (id: string, progress: number) =>
				set((state) => ({
					activeUploads: state.activeUploads.map((u) =>
						u.id === id ? { ...u, progress } : u,
					),
				})),
			setUploadStatus: (
				id: string,
				status: UploadFile["status"],
				error?: string,
			) =>
				set((state) => ({
					activeUploads: state.activeUploads.map((u) =>
						u.id === id ? { ...u, status, error } : u,
					),
				})),
			removeUpload: (id: string) =>
				set((state) => ({
					activeUploads: state.activeUploads.filter((u) => u.id !== id),
				})),
			uploads: [],
			setUploads: (uploads: any[] | ((prev: any[]) => any[])) =>
				set((state) => ({
					uploads:
						typeof uploads === "function"
							? (uploads as (prev: any[]) => any[])(state.uploads)
							: uploads,
				})),
			addUpload: (upload: any) =>
				set((state) => ({
					uploads: [...state.uploads, upload],
				})),

			// Transcription implementation
			transcriptionStatus: {},
			transcriptions: {},

			startTranscription: async (uploadId: string, url?: string) => {
				set((state) => ({
					transcriptionStatus: {
						...state.transcriptionStatus,
						[uploadId]: "processing",
					},
				}));

				// If no URL provided, just set status (for mock data case)
				if (!url) {
					return;
				}

				try {
					const segments = await transcribeElevenLabs(url, "zh");

					// Use completeTranscription to handle everything including auto-split
					get().completeTranscription(uploadId, segments, true);
				} catch (error) {
					console.error("Transcription failed:", error);
					set((state) => ({
						transcriptionStatus: {
							...state.transcriptionStatus,
							[uploadId]: "failed",
						},
					}));
				}
			},

			completeTranscription: (
				uploadId: string,
				segments: TranscriptSegment[],
				autoSplit = true,
			) => {
				set((state) => ({
					transcriptions: {
						...state.transcriptions,
						[uploadId]: segments,
					},
					transcriptionStatus: {
						...state.transcriptionStatus,
						[uploadId]: "completed",
					},
				}));

				// Load into TranscriptStore for display
				if (segments.length > 0) {
					useTranscriptStore.getState().initSegments(segments);

					// Auto-split and add to timeline if enabled
					// Note: For now, we'll only auto-split if explicitly requested
					// The original audio is already on the timeline
					if (autoSplit && segments.length > 1) {
						const upload = get().uploads.find(
							(u) => u.uploadId === uploadId || u.id === uploadId,
						);

						if (upload) {
							// TODO: Consider removing the original audio and replacing with segments
							// For now, we'll just add the segments alongside the original
							console.log(
								`Transcription complete for ${uploadId} with ${segments.length} segments`,
							);
							console.log(
								"To apply auto-split, use the manual split button in the UI",
							);
						} else {
							console.warn(`Upload ${uploadId} not found for auto-splitting`);
						}
					}
				}
			},

			setTranscriptionStatus: (
				uploadId: string,
				status: "idle" | "processing" | "completed" | "failed",
			) => {
				set((state) => ({
					transcriptionStatus: {
						...state.transcriptionStatus,
						[uploadId]: status,
					},
				}));
			},

			setTranscription: (uploadId: string, segments: TranscriptSegment[]) => {
				set((state) => ({
					transcriptions: {
						...state.transcriptions,
						[uploadId]: segments,
					},
				}));
			},

			getTranscription: (uploadId: string) => {
				return get().transcriptions[uploadId];
			},
		}),
		{
			name: "upload-store",
			partialize: (state) => ({
				uploads: state.uploads,
				transcriptions: state.transcriptions,
			}),
		},
	),
);

export type { UploadFile };
export default useUploadStore;
