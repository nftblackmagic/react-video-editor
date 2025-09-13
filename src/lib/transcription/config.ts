/**
 * Transcription Service Configuration
 * Manages configuration for different transcription providers
 */

import {
	TranscriptionProvider,
	TranscriptionProviderConfig,
	SUPPORTED_TRANSCRIPTION_FORMATS,
} from "./types";

/**
 * Get configuration for a specific provider
 */
export function getProviderConfig(
	provider: TranscriptionProvider,
): TranscriptionProviderConfig {
	switch (provider) {
		case TranscriptionProvider.ELEVENLABS:
			return {
				provider: TranscriptionProvider.ELEVENLABS,
				apiKey:
					process.env.ELEVENLABS_API_KEY ||
					process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
				maxFileSizeMB: 100,
				supportedFormats: [...SUPPORTED_TRANSCRIPTION_FORMATS],
				defaultOptions: {
					diarize: true,
					wordTimestamps: true,
				},
			};

		case TranscriptionProvider.OPENAI: {
			// Future implementation
			// OpenAI Whisper supports fewer formats than ElevenLabs
			const openAIFormats = SUPPORTED_TRANSCRIPTION_FORMATS.filter((format) =>
				[
					"audio/mpeg",
					"audio/mp4",
					"audio/x-m4a",
					"audio/wav",
					"audio/webm",
				].includes(format),
			);
			return {
				provider: TranscriptionProvider.OPENAI,
				apiKey: process.env.OPENAI_API_KEY,
				apiUrl: "https://api.openai.com/v1/audio/transcriptions",
				maxFileSizeMB: 25,
				supportedFormats: openAIFormats,
				defaultOptions: {
					modelId: "whisper-1",
				},
			};
		}

		case TranscriptionProvider.GOOGLE: {
			// Future implementation
			// Google Cloud Speech supports specific formats
			const googleFormats = SUPPORTED_TRANSCRIPTION_FORMATS.filter((format) =>
				["audio/mpeg", "audio/wav", "audio/flac", "audio/webm"].includes(
					format,
				),
			);
			return {
				provider: TranscriptionProvider.GOOGLE,
				apiKey: process.env.GOOGLE_CLOUD_API_KEY,
				maxFileSizeMB: 180,
				supportedFormats: googleFormats,
				defaultOptions: {
					modelId: "latest_long",
				},
			};
		}

		default:
			throw new Error(`Unknown provider: ${provider}`);
	}
}

/**
 * Get the default transcription provider from environment
 */
export function getDefaultProvider(): TranscriptionProvider {
	const provider = process.env.TRANSCRIPTION_PROVIDER;

	if (
		provider &&
		Object.values(TranscriptionProvider).includes(provider as any)
	) {
		return provider as TranscriptionProvider;
	}

	// Default to ElevenLabs if available
	if (
		process.env.ELEVENLABS_API_KEY ||
		process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
	) {
		return TranscriptionProvider.ELEVENLABS;
	}

	throw new Error("No transcription provider configured");
}

/**
 * Check if a provider is configured and available
 */
export function isProviderConfigured(provider: TranscriptionProvider): boolean {
	try {
		const config = getProviderConfig(provider);

		return !!config.apiKey;
	} catch {
		return false;
	}
}

/**
 * Get all configured providers
 */
export function getConfiguredProviders(): TranscriptionProvider[] {
	return Object.values(TranscriptionProvider).filter(isProviderConfigured);
}

/**
 * Environment-specific configuration
 */
export const transcriptionConfig = {
	// Maximum concurrent transcription jobs
	maxConcurrentJobs: Number.parseInt(
		process.env.MAX_TRANSCRIPTION_JOBS || "3",
		10,
	),

	// Retry configuration
	maxRetries: Number.parseInt(process.env.TRANSCRIPTION_MAX_RETRIES || "3", 10),
	retryDelayMs: Number.parseInt(
		process.env.TRANSCRIPTION_RETRY_DELAY_MS || "1000",
		10,
	),

	// Cache configuration
	enableCache: process.env.TRANSCRIPTION_CACHE_ENABLED === "true",
	cacheTTLSeconds: Number.parseInt(
		process.env.TRANSCRIPTION_CACHE_TTL || "3600",
		10,
	),

	// Feature flags
	enableAutoLanguageDetection: process.env.TRANSCRIPTION_AUTO_LANG === "true",
	enableDiarization: process.env.TRANSCRIPTION_DIARIZATION !== "false",
	enableWordTimestamps: process.env.TRANSCRIPTION_WORD_TIMESTAMPS !== "false",
};
