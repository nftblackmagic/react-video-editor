import { transcribeAction } from "@/app/(edit)/actions/transcribe";
import * as transcriptionActions from "@/app/(edit)/actions/transcriptions";
import * as uploadActions from "@/app/(edit)/actions/uploads";
import { isTranscribableMedia } from "@/lib/transcription/client-utils";
import { type ProjectUpload, projectStorage } from "@/utils/project";
import { type UploadCallbacks, processUpload } from "@/utils/upload-service";
import { dispatch } from "@designcombo/events";
import { ADD_AUDIO, ADD_IMAGE, ADD_VIDEO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { FullEDU } from "../transcript/types";
import useProjectStore from "./use-project-store";
import useTranscriptStore from "./use-transcript-store";

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
	processUploads: (onUploadComplete?: () => void) => void;
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
	transcriptions: Record<string, FullEDU[]>;
	startTranscription: (uploadId: string, url?: string) => Promise<void>;
	completeTranscription: (
		uploadId: string,
		edus: FullEDU[],
		autoSplit?: boolean,
	) => Promise<void>;
	setTranscriptionStatus: (
		uploadId: string,
		status: "idle" | "processing" | "completed" | "failed",
	) => void;
	setTranscription: (uploadId: string, edus: FullEDU[]) => void;
	getTranscription: (uploadId: string) => FullEDU[] | undefined;
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
			processUploads: (onUploadComplete?: () => void) => {
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

								// Save uploads to current project in localStorage and database
								const projectStore = useProjectStore.getState();
								const currentProjectId = projectStore.currentProjectId;
								const projectData = projectStore.projectData;
								const userId = projectStore.userId;

								// Track uploads saved to database (declare outside if block)
								const savedUploads: { data: any; dbId: string }[] = [];

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
									// Save to database if we have userId and get database IDs
									if (userId) {
										for (let i = 0; i < uploadsToProcess.length; i++) {
											const uploadData = uploadsToProcess[i];
											try {
												const result = await uploadActions.createUpload({
													projectId: currentProjectId,
													userId: userId,
													fileName: uploadData.fileName || "unnamed",
													fileType:
														uploadData.contentType ||
														uploadData.type ||
														"application/octet-stream",
													fileSize: uploadData.fileSize || 0,
													url:
														uploadData.url ||
														uploadData.metadata?.uploadedUrl ||
														uploadData.metadata?.bytescaleUrl ||
														"",
													uploadServiceId: uploadData.metadata?.fileId,
													metadata: uploadData.metadata,
													status: "ready",
												});

												if (result.success && result.uploadId) {
													// Update the upload object with the database ID
													uploadsToProcess[i].uploadId = result.uploadId;
													uploadsToProcess[i].id = result.uploadId;
													savedUploads.push({
														data: uploadsToProcess[i],
														dbId: result.uploadId,
													});

													// Also update in the uploads array
													setUploads((prev) =>
														prev.map((u) =>
															u.uploadId === uploadData.uploadId ||
															u.id === uploadData.uploadId
																? {
																		...u,
																		uploadId: result.uploadId,
																		id: result.uploadId,
																	}
																: u,
														),
													);
													console.log(
														`✅ Upload saved to database with ID ${result.uploadId}`,
													);
												}
											} catch (error) {
												console.error(
													"Failed to save upload to database:",
													error,
												);
											}
										}
									}

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
											const audioId = generateId();
											dispatch(ADD_AUDIO, {
												payload: {
													id: audioId,
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

									// Trigger upload completion callback after first media is added to timeline
									if (onUploadComplete && uploadsToProcess.indexOf(data) === 0) {
										// Force immediate timeline sync to DB (non-blocking)
										const projectStore = useProjectStore.getState();
										projectStore.forceTimelineSync();

										// Call the completion callback
										setTimeout(() => {
											onUploadComplete();
										}, 100); // Small delay to ensure dispatch is processed
									}

									// Start transcription for transcribable media ONLY if saved to DB
									const savedUpload = savedUploads.find((s) => s.data === data);
									if (savedUpload && isTranscribableMedia(contentType)) {
										console.log(`✅ Media is transcribable: ${contentType}`);
										if (mediaUrl) {
											console.log(
												`🚀 Starting transcription with DB ID ${savedUpload.dbId} for URL: ${mediaUrl}`,
											);
											// Use the confirmed database ID
											get().startTranscription(savedUpload.dbId, mediaUrl);
										} else {
											console.warn(
												"⚠️ No media URL available for transcription",
											);
										}
									} else if (isTranscribableMedia(contentType)) {
										console.log(
											"⚠️ Skipping transcription - upload not saved to database",
										);
									} else {
										console.log(
											`⏭️ Media type not transcribable: ${contentType}`,
										);
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
				console.log("🎤 Starting transcription for:", uploadId, "URL:", url);

				set((state) => ({
					transcriptionStatus: {
						...state.transcriptionStatus,
						[uploadId]: "processing",
					},
				}));

				// If no URL provided, just set status (for mock data case)
				if (!url) {
					console.warn("No URL provided for transcription");
					return;
				}

				// Show toast notification
				toast.info("Transcribing audio...", {
					description: "This may take a moment",
					duration: 5000,
				});

				try {
					// TODO: Make language configurable - defaulting to Chinese for now
					const language = "zh"; // TODO: add language selector in UI
					console.log(`📝 Calling transcribeAction with language: ${language}`);

					const edus = await transcribeAction(url, language);
					console.log(`✅ Transcription successful: ${edus.length} EDUs`);

					// Show success toast
					toast.success("Transcription complete", {
						description: `${edus.length} segments processed`,
					});

					// Use completeTranscription to handle everything including auto-split
					get().completeTranscription(uploadId, edus, true);
				} catch (error) {
					console.error("❌ Transcription failed:", error);

					// Show error toast
					let errorMessage = "Failed to transcribe audio";
					if (error instanceof Error) {
						console.error("Error details:", error.message);

						// Check for specific error types
						if (error.message.includes("authentication")) {
							errorMessage = "API key issue - check settings";
							console.error(
								"🔑 API Key Issue: Please check ELEVENLABS_API_KEY in .env file",
							);
						} else if (error.message.includes("language")) {
							errorMessage = "Language not supported";
							console.error(
								"🌐 Language Issue: The specified language may not be supported",
							);
						}
					}

					toast.error("Transcription failed", {
						description: errorMessage,
					});

					set((state) => ({
						transcriptionStatus: {
							...state.transcriptionStatus,
							[uploadId]: "failed",
						},
					}));
				}
			},

			completeTranscription: async (
				uploadId: string,
				edus: FullEDU[],
				autoSplit = true,
			) => {
				set((state) => ({
					transcriptions: {
						...state.transcriptions,
						[uploadId]: edus,
					},
					transcriptionStatus: {
						...state.transcriptionStatus,
						[uploadId]: "completed",
					},
				}));

				// Load into TranscriptStore for display
				if (edus.length > 0) {
					useTranscriptStore.getState().initEDUs(edus);

					// Save to database immediately
					const projectStore = useProjectStore.getState();
					if (projectStore.userId) {
						try {
							// uploadId should already be the database UUID
							console.log(`📝 Saving transcription for upload ID ${uploadId}`);

							await transcriptionActions.saveTranscription(uploadId, edus, {
								language: "zh", // TODO: Make this configurable
								wordCount: edus.reduce(
									(acc, edu) => acc + edu.edu_content.split(/\s+/).length,
									0,
								),
								duration: edus[edus.length - 1]?.edu_end || 0,
								provider: "elevenlabs", // TODO: Get from config
							});
							console.log("✅ Transcription saved to database");
						} catch (error) {
							console.error(
								"❌ Failed to save transcription to database:",
								error,
							);
						}
					}

					// Auto-split and add to timeline if enabled
					// Note: For now, we'll only auto-split if explicitly requested
					// The original audio is already on the timeline
					if (autoSplit && edus.length > 1) {
						const upload = get().uploads.find(
							(u) => u.uploadId === uploadId || u.id === uploadId,
						);

						if (upload) {
							// TODO: Consider removing the original audio and replacing with EDUs
							// For now, we'll just add the EDUs alongside the original
							console.log(
								`Transcription complete for ${uploadId} with ${edus.length} EDUs`,
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

			setTranscription: (uploadId: string, edus: FullEDU[]) => {
				set((state) => ({
					transcriptions: {
						...state.transcriptions,
						[uploadId]: edus,
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
				// Don't persist transcriptions - they're too large with word-level data
				// and can be regenerated from the audio/video files
			}),
		},
	),
);

export type { UploadFile };
export default useUploadStore;
