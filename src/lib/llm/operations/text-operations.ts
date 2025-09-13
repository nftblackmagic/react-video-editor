/**
 * Text Processing Operations
 * Business logic for text-related LLM operations
 */

import { generateObject } from "ai";
import { range } from "lodash";
import { TEXT_PROMPTS } from "../prompts/text";
import {
	EDU,
	EDUSResult,
	EDUSchema,
	MODELS,
	ParagraphSplitResult,
	ParagraphSplitSchema,
} from "../types";

/**
 * Split an article into paragraphs using LLM
 * @param article - The article text to split
 * @param model - Optional model override (defaults to gpt-4o or env variable)
 * @returns Array of paragraphs
 */
async function splitParagraphs(article: string): Promise<ParagraphSplitResult> {
	const messages = TEXT_PROMPTS.PARAGRAPH_SPLIT(article);

	const result = await generateObject({
		model: MODELS.text,
		messages,
		schema: ParagraphSplitSchema,
	});

	return result.object;
}

async function splitParagraphsIntoEDUs(
	paragraph: string,
	retryCount = 0,
): Promise<EDUSResult> {
	const messages = TEXT_PROMPTS.EDU_CREATION(paragraph);

	const result = await generateObject({
		model: MODELS.text,
		messages,
		schema: EDUSchema,
		providerOptions: {
			// TODO: make the option abstracted instead of hardcoded
			openai: {
				reasoningEffort: retryCount > 0 ? "high" : "medium",
			},
		},
	});

	return result.object;
}

async function splitParagraphsIntoEDUsWithRetry(
	paragraph: string,
): Promise<EDUSResult> {
	const maxRetries = 3; // TODO: make the max retries configurable
	let lastValidationError = "";

	for (const retryCount of range(0, maxRetries)) {
		const edus = await splitParagraphsIntoEDUs(paragraph, retryCount);
		const validationResult = validateEDUs(edus, paragraph);

		if (validationResult.isValid) {
			return edus;
		}

		lastValidationError = validationResult.error;
		console.warn(
			`EDU validation failed (attempt ${retryCount + 1}/${maxRetries}): ${validationResult.error}`,
		);
	}

	throw new Error(
		`Failed to split paragraphs into EDUs after ${maxRetries} attempts. Last error: ${lastValidationError}`,
	);
}

function validateEDUs(
	edus: EDUSResult,
	paragraph: string,
): { isValid: boolean; error: string } {
	// Check if EDUs array is empty
	if (!edus.edus || edus.edus.length === 0) {
		return {
			isValid: false,
			error: "No EDUs generated from paragraph",
		};
	}

	// Normalize texts for comparison (remove extra whitespace)
	const normalizedParagraph = paragraph.replace(/\s+/g, " ").trim();
	const reconstructedText = edus.edus
		.map((edu) => edu.content)
		.join(" ")
		.replace(/\s+/g, " ")
		.trim();

	// Check if all EDU content exists in the original paragraph
	for (let i = 0; i < edus.edus.length; i++) {
		const edu = edus.edus[i];
		const normalizedEduContent = edu.content.replace(/\s+/g, " ").trim();

		if (!normalizedParagraph.includes(normalizedEduContent)) {
			return {
				isValid: false,
				error: `EDU ${i + 1} content not found in original paragraph.
  EDU content: "${edu.content}"
  Tag: ${edu.tag}
  Original paragraph: "${paragraph.substring(0, 100)}${paragraph.length > 100 ? "..." : ""}"`,
			};
		}
	}

	// Check if the reconstructed text matches the original
	if (normalizedParagraph !== reconstructedText) {
		return {
			isValid: false,
			error: `Text reconstruction mismatch.
  Original length: ${normalizedParagraph.length}
  Reconstructed length: ${reconstructedText.length}
  Missing text: "${normalizedParagraph.replace(reconstructedText, "")}"`,
		};
	}

	return { isValid: true, error: "" };
}

export async function processArticle(article: string): Promise<EDUSResult> {
	const paragraphs = await splitParagraphs(article);
	const finalEDUs: EDU[] = [];
	let currentIndex = 0;

	for (const paragraph of paragraphs.paragraphs) {
		// TODO: add try catch here
		const edus = await splitParagraphsIntoEDUsWithRetry(paragraph);
		for (const edu of edus.edus) {
			edu.index = currentIndex;
			currentIndex++;
			finalEDUs.push(edu);
		}
	}
	return { edus: finalEDUs };
}
