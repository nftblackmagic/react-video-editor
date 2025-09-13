/**
 * Client-safe transcription utilities
 * These utilities can be safely imported in client-side code
 * Re-exports from types.ts to maintain a single source of truth
 */

// Re-export client-safe constants and functions from types.ts
export {
	SUPPORTED_TRANSCRIPTION_FORMATS,
	isTranscribableMedia,
	COMMON_LANGUAGE_CODES,
	type LanguageCode,
} from "./types";