/**
 * Transcription Service - Client-safe exports
 * This file only exports client-safe utilities and types
 * For server-side transcription service, use @/lib/transcription/server
 */

// Re-export client-safe utilities
export {
	isTranscribableMedia,
	SUPPORTED_TRANSCRIPTION_FORMATS,
	COMMON_LANGUAGE_CODES,
} from "./client-utils";

// Re-export types (types are always safe on client)
export {
	TranscriptionProvider,
	TranscriptionErrorType,
	type TranscriptionOptions,
	type TranscriptionResponse,
	type TranscriptionError,
	type TranscriptionProviderConfig,
	type LanguageCode,
} from "./types";

// Note: The actual transcription service is only available on the server
// Import from @/lib/transcription/server in Server Actions or API routes
