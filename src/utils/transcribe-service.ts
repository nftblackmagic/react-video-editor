import axios from "axios";
import { TranscriptSegment } from "@/features/editor/transcript/types";

export interface TranscribeOptions {
	url: string; // Audio/video file URL
	language?: string; // Optional language code (e.g., 'en', 'zh')
	userId?: string; // User ID for tracking
}

export interface TranscribeResponse {
	success: boolean;
	segments?: TranscriptSegment[];
	error?: string;
	jobId?: string; // For async transcription tracking
}

/**
 * Determine if a file type supports transcription
 */
export function isTranscribableMedia(contentType: string): boolean {
	const transcribableTypes = [
		"audio/", // All audio types
		"video/", // All video types
	];

	return transcribableTypes.some((type) => contentType.startsWith(type));
}
