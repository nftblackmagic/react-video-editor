/**
 * LLM Service Types
 * Type definitions and schemas for LLM operations
 */

import { openai } from "@ai-sdk/openai";
import { z } from "zod";
/**
 * Schema for paragraph splitting operation
 */
export const ParagraphSplitSchema = z.object({
	paragraphs: z.array(z.string()),
});

export type ParagraphSplitResult = z.infer<typeof ParagraphSplitSchema>;

export const EDU = z.object({
	index: z.number(),
	content: z.string(),
	tag: z.string(),
});

export type EDU = z.infer<typeof EDU>;

export const EDUSchema = z.object({
	edus: z.array(EDU),
});

export type EDUSResult = z.infer<typeof EDUSchema>;
/**
 * Common model configurations
 * These can be overridden per operation
 */
export const MODELS = {
	text: openai("o3"),
	fast: openai("o3-mini"),
} as const;

/**
 * Model message type from AI SDK
 */
export type { ModelMessage } from "ai";
