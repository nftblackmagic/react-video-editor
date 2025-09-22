import { ADD_AUDIO, ADD_IMAGE, ADD_VIDEO } from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
	Music,
	Image as ImageIcon,
	Video as VideoIcon,
	Loader2,
	UploadIcon,
	FileText,
	CheckCircle,
	AlertCircle,
} from "lucide-react";
import { generateId } from "@designcombo/timeline";
import { Button } from "@/components/ui/button";
import useUploadStore from "../store/use-upload-store";
import ModalUpload from "@/components/modal-upload";

export const Uploads = () => {
	const {
		setShowUploadModal,
		uploads,
		pendingUploads,
		activeUploads,
		transcriptionStatus,
		transcriptions,
	} = useUploadStore();

	// Group completed uploads by type
	const videos = uploads.filter(
		(upload) => upload.type?.startsWith("video/") || upload.type === "video",
	);
	const images = uploads.filter(
		(upload) => upload.type?.startsWith("image/") || upload.type === "image",
	);
	const audios = uploads.filter(
		(upload) => upload.type?.startsWith("audio/") || upload.type === "audio",
	);

	const handleAddVideo = (video: any) => {
		const srcVideo = video.metadata?.uploadedUrl || video.url;

		dispatch(ADD_VIDEO, {
			payload: {
				id: generateId(),
				details: {
					src: srcVideo,
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
	};

	const handleAddImage = (image: any) => {
		const srcImage = image.metadata?.uploadedUrl || image.url;

		dispatch(ADD_IMAGE, {
			payload: {
				id: generateId(),
				type: "image",
				display: {
					from: 0,
					to: 5000,
				},
				details: {
					src: srcImage,
				},
				metadata: {},
			},
			options: {},
		});
	};

	const handleAddAudio = (audio: any) => {
		// Audio is already on timeline from upload, this is for manual re-add
		const srcAudio = audio.metadata?.uploadedUrl || audio.url;

		console.log("🎵 handleAddAudio called:", {
			audioId: audio.id,
			uploadId: audio.uploadId,
			url: audio.url,
			urlType: audio.url?.startsWith("blob:") ? "BLOB URL" : "Regular URL",
			uploadedUrl: audio.metadata?.uploadedUrl,
			uploadedUrlType: audio.metadata?.uploadedUrl?.startsWith("blob:")
				? "BLOB URL"
				: "Regular URL",
			bytescaleUrl: audio.metadata?.bytescaleUrl,
			selectedSrc: srcAudio,
			selectedSrcType: srcAudio?.startsWith("blob:")
				? "BLOB URL (WILL EXPIRE!)"
				: "Regular URL",
		});

		// Check if this audio has a transcription (use uploadId or id)
		const transcriptionKey = audio.uploadId || audio.id;
		const hasTranscription = transcriptions[transcriptionKey]?.length > 0;

		if (hasTranscription) {
			// If we have transcription, ask user if they want to add as segments
			const edus = transcriptions[transcriptionKey];
			// Extract flat words from EDUs for segment splitter
			const segments = edus.flatMap((edu) => edu.words || []);

			// For now, add segments when user clicks on audio with transcription
			import("../utils/segment-splitter").then(({ addSegmentedMedia }) => {
				addSegmentedMedia(audio, segments, {
					autoSplit: true,
					mergeShortSegments: true,
					minSegmentLength: 1000,
				});
			});
		} else {
			// No transcription, add as single item again
			dispatch(ADD_AUDIO, {
				payload: {
					id: generateId(),
					type: "audio",
					details: {
						src: srcAudio,
					},
					metadata: {},
				},
				options: {},
			});
		}
	};

	const UploadPrompt = () => (
		<div className="flex flex-col gap-2 px-4">
			<Button
				className="w-full cursor-pointer"
				onClick={() => setShowUploadModal(true)}
			>
				<UploadIcon className="w-4 h-4" />
				<span className="ml-2">Upload</span>
			</Button>
		</div>
	);

	// Helper to get transcription status icon
	const TranscriptionStatus = ({ uploadId }: { uploadId: string }) => {
		const status = transcriptionStatus[uploadId];
		const hasTranscript = transcriptions[uploadId]?.length > 0;

		if (!status || status === "idle") return null;

		if (status === "processing") {
			return (
				<div className="absolute top-1 right-1 bg-background/90 rounded p-0.5">
					<Loader2
						className="w-3 h-3 animate-spin text-blue-500"
						aria-label="Transcribing..."
					/>
				</div>
			);
		}

		if (status === "completed" && hasTranscript) {
			return (
				<div className="absolute top-1 right-1 bg-background/90 rounded p-0.5">
					<FileText
						className="w-3 h-3 text-green-500"
						aria-label="Transcript available"
					/>
				</div>
			);
		}

		if (status === "failed") {
			return (
				<div className="absolute top-1 right-1 bg-background/90 rounded p-0.5">
					<AlertCircle
						className="w-3 h-3 text-red-500"
						aria-label="Transcription failed"
					/>
				</div>
			);
		}

		return null;
	};

	return (
		<div className="flex flex-1 flex-col">
			<div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
				Your uploads
			</div>
			<ModalUpload />
			<UploadPrompt />

			{/* Uploads in Progress Section */}
			{(pendingUploads.length > 0 || activeUploads.length > 0) && (
				<div className="p-4">
					<div className="font-medium text-sm mb-2 flex items-center gap-2">
						<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
						Uploads in Progress
					</div>
					<div className="flex flex-col gap-2">
						{pendingUploads.map((upload) => (
							<div key={upload.id} className="flex items-center gap-2">
								<span className="truncate text-xs flex-1">
									{upload.file?.name || upload.url || "Unknown"}
								</span>
								<span className="text-xs text-muted-foreground">Pending</span>
							</div>
						))}
						{activeUploads.map((upload) => (
							<div key={upload.id} className="flex items-center gap-2">
								<span className="truncate text-xs flex-1">
									{upload.file?.name || upload.url || "Unknown"}
								</span>
								<div className="flex items-center gap-1">
									<Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
									<span className="text-xs">{upload.progress ?? 0}%</span>
									<span className="text-xs text-muted-foreground ml-2">
										{upload.status}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			<div className="flex flex-col gap-10 p-4">
				{/* Videos Section */}
				{videos.length > 0 && (
					<div>
						<div className="flex items-center gap-2 mb-2">
							<VideoIcon className="w-4 h-4 text-muted-foreground" />
							<span className="font-medium text-sm">Videos</span>
						</div>
						<ScrollArea className="max-h-32">
							<div className="grid grid-cols-3 gap-2 max-w-full">
								{videos.map((video, idx) => {
									// Generate a consistent ID for this upload
									const uploadId = video.uploadId || `video-${idx}`;
									return (
										<div
											className="flex items-center gap-2 flex-col w-full"
											key={video.id || idx}
										>
											<Card
												className="w-16 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer"
												onClick={() => handleAddVideo(video)}
											>
												<VideoIcon className="w-8 h-8 text-muted-foreground" />
												<TranscriptionStatus uploadId={uploadId} />
											</Card>
											<div className="text-xs text-muted-foreground truncate w-full text-center">
												{video.file?.name || video.url || "Video"}
											</div>
										</div>
									);
								})}
							</div>
						</ScrollArea>
					</div>
				)}

				{/* Images Section */}
				{images.length > 0 && (
					<div>
						<div className="flex items-center gap-2 mb-2">
							<ImageIcon className="w-4 h-4 text-muted-foreground" />
							<span className="font-medium text-sm">Images</span>
						</div>
						<ScrollArea className="max-h-32">
							<div className="grid grid-cols-3 gap-2 max-w-full">
								{images.map((image, idx) => (
									<div
										className="flex items-center gap-2 flex-col w-full"
										key={image.id || idx}
									>
										<Card
											className="w-16 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer"
											onClick={() => handleAddImage(image)}
										>
											<ImageIcon className="w-8 h-8 text-muted-foreground" />
										</Card>
										<div className="text-xs text-muted-foreground truncate w-full text-center">
											{image.file?.name || image.url || "Image"}
										</div>
									</div>
								))}
							</div>
						</ScrollArea>
					</div>
				)}

				{/* Audios Section */}
				{audios.length > 0 && (
					<div>
						<div className="flex items-center gap-2 mb-2">
							<Music className="w-4 h-4 text-muted-foreground" />
							<span className="font-medium text-sm">Audios</span>
						</div>
						<ScrollArea className="max-h-32">
							<div className="grid grid-cols-3 gap-2 max-w-full">
								{audios.map((audio, idx) => {
									// Generate a consistent ID for this upload
									const uploadId = audio.uploadId || `audio-${idx}`;
									return (
										<div
											className="flex items-center gap-2 flex-col w-full"
											key={audio.id || idx}
										>
											<Card
												className="w-16 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer"
												onClick={() => handleAddAudio(audio)}
											>
												<Music className="w-8 h-8 text-muted-foreground" />
												<TranscriptionStatus uploadId={uploadId} />
											</Card>
											<div className="text-xs text-muted-foreground truncate w-full text-center">
												{audio.file?.name || audio.url || "Audio"}
											</div>
										</div>
									);
								})}
							</div>
						</ScrollArea>
					</div>
				)}
			</div>
		</div>
	);
};
