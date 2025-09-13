/**
 * Transcription Service Types
 * Shared types for all transcription service providers
 */

import { TranscriptSegment } from "@/features/editor/transcript/types";

/**
 * Supported transcription service providers
 */
export enum TranscriptionProvider {
	ELEVENLABS = "elevenlabs",
	OPENAI = "openai", // Future support
	GOOGLE = "google", // Future support
}

/**
 * Options for transcription requests
 */
export interface TranscriptionOptions {
	/** Language code (e.g., 'en', 'zh', 'es') */
	language: string;
	/** Enable speaker diarization */
	diarize?: boolean;
	/** Include word-level timestamps */
	wordTimestamps?: boolean;
	/** Custom model ID (provider-specific) */
	modelId?: string;
	/** Additional provider-specific options */
	providerOptions?: Record<string, any>;
}

/**
 * Response from transcription service
 */
export interface TranscriptionResponse {
	/** Successfully transcribed segments */
	segments: TranscriptSegment[];
	/** Total duration in milliseconds */
	duration?: number;
	/** Detected language if auto-detection was used */
	detectedLanguage?: string;
	/** Provider-specific metadata */
	metadata?: Record<string, any>;
}

/**
 * Error types for transcription failures
 */
export enum TranscriptionErrorType {
	INVALID_AUDIO = "INVALID_AUDIO",
	UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
	LANGUAGE_NOT_SUPPORTED = "LANGUAGE_NOT_SUPPORTED",
	QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
	PROVIDER_ERROR = "PROVIDER_ERROR",
	NETWORK_ERROR = "NETWORK_ERROR",
	AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
}

/**
 * Custom error class for transcription failures
 */
export class TranscriptionError extends Error {
	constructor(
		public type: TranscriptionErrorType,
		message: string,
		public details?: any,
	) {
		super(message);
		this.name = "TranscriptionError";
	}
}

/**
 * Configuration for a transcription service provider
 */
export interface TranscriptionProviderConfig {
	provider: TranscriptionProvider;
	apiKey?: string;
	apiUrl?: string;
	maxFileSizeMB?: number;
	supportedFormats?: string[];
	defaultOptions?: Partial<TranscriptionOptions>;
}

/**
 * Supported audio/video formats for transcription
 * This is the single source of truth for all transcribable formats
 */
export const SUPPORTED_TRANSCRIPTION_FORMATS = [
	// Audio formats
	"audio/mpeg", // MP3
	"audio/mp4", // M4A
	"audio/x-m4a", // M4A (alternative MIME type)
	"audio/wav",
	"audio/x-wav",
	"audio/webm",
	"audio/ogg",
	"audio/flac",
	"audio/aac",
	// Video formats (audio will be extracted)
	"video/mp4",
	"video/webm",
	"video/ogg",
	"video/quicktime", // MOV
	"video/x-msvideo", // AVI
] as const;

/**
 * Check if a media type supports transcription
 */
export function isTranscribableMedia(contentType: string): boolean {
	return SUPPORTED_TRANSCRIPTION_FORMATS.some((format) =>
		contentType.startsWith(format),
	);
}

/**
 * Language codes supported by most transcription services
 */
export const COMMON_LANGUAGE_CODES = {
	en: "English",
	es: "Spanish",
	fr: "French",
	de: "German",
	it: "Italian",
	pt: "Portuguese",
	nl: "Dutch",
	pl: "Polish",
	ru: "Russian",
	zh: "Chinese",
	ja: "Japanese",
	ko: "Korean",
	ar: "Arabic",
	hi: "Hindi",
} as const;

export type LanguageCode = keyof typeof COMMON_LANGUAGE_CODES;
