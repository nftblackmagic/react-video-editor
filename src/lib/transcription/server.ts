/**
 * Server-only transcription service
 * This file should only be imported in server-side code (Server Actions, API routes, etc.)
 */

import "server-only"; // This will throw an error if imported on the client

import { TranscriptionService } from "./interface";
import { ElevenLabsTranscriptionService } from "./providers/elevenlabs";
import {
  TranscriptionProvider,
  TranscriptionError,
  TranscriptionErrorType,
  TranscriptionOptions,
  TranscriptionResponse,
} from "./types";
import {
  getDefaultProvider,
  getProviderConfig,
  isProviderConfigured,
  getConfiguredProviders,
  transcriptionConfig,
} from "./config";

// Cache for service instances
const serviceCache = new Map<TranscriptionProvider, TranscriptionService>();

/**
 * Create a transcription service instance (server-only)
 * @param provider - Optional provider to use, defaults to configured provider
 * @returns TranscriptionService instance
 */
export function createTranscriptionService(
  provider?: TranscriptionProvider
): TranscriptionService {
  const selectedProvider = provider || getDefaultProvider();

  // Check cache first
  if (serviceCache.has(selectedProvider)) {
    return serviceCache.get(selectedProvider) as TranscriptionService;
  }

  // Get provider configuration
  const config = getProviderConfig(selectedProvider);

  let service: TranscriptionService;

  switch (selectedProvider) {
    case TranscriptionProvider.ELEVENLABS:
      if (!config.apiKey) {
        throw new TranscriptionError(
          TranscriptionErrorType.AUTHENTICATION_ERROR,
          "ElevenLabs API key not configured"
        );
      }
      service = new ElevenLabsTranscriptionService({
        apiKey: config.apiKey,
        modelId: config.defaultOptions?.modelId,
      });
      break;

    case TranscriptionProvider.OPENAI:
      // Future implementation
      throw new TranscriptionError(
        TranscriptionErrorType.PROVIDER_ERROR,
        "OpenAI provider not yet implemented"
      );

    case TranscriptionProvider.GOOGLE:
      // Future implementation
      throw new TranscriptionError(
        TranscriptionErrorType.PROVIDER_ERROR,
        "Google Cloud provider not yet implemented"
      );

    default:
      throw new TranscriptionError(
        TranscriptionErrorType.PROVIDER_ERROR,
        `Unknown provider: ${selectedProvider}`
      );
  }

  // Cache the service instance
  serviceCache.set(selectedProvider, service);

  return service;
}

/**
 * Get the default transcription service (server-only)
 * @returns TranscriptionService instance using the default provider
 */
export function getTranscriptionService(): TranscriptionService {
  return createTranscriptionService();
}

/**
 * Transcribe audio/video using the default service (server-only)
 * Convenience function for simple transcription
 */
export async function transcribe(
  input: Blob | string,
  options: TranscriptionOptions
): Promise<TranscriptionResponse> {
  const service = getTranscriptionService();
  return service.transcribe(input, options);
}

/**
 * Clear the service cache
 * Useful for testing or when configuration changes
 */
export function clearServiceCache(): void {
  serviceCache.clear();
}

// Re-export types and utilities
export {
  TranscriptionProvider,
  TranscriptionError,
  TranscriptionErrorType,
  getConfiguredProviders,
  isProviderConfigured,
  transcriptionConfig,
};

export type { TranscriptionService } from "./interface";
export type { TranscriptionOptions, TranscriptionResponse } from "./types";
