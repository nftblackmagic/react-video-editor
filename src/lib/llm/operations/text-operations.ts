/**
 * Text Processing Operations
 * Business logic for text-related LLM operations
 */

import { TranscriptSegment } from "@/features/editor/transcript/types";
import { ModelMessage, generateObject } from "ai";
import { range } from "lodash";
import { TEXT_PROMPTS } from "../prompts/text";
import {
	EDU,
	EDUSResult,
	EDUSchema,
	GroupEDUSResult,
	GroupEDUSchema,
	MODELS,
	ParagraphSplitResult,
	ParagraphSplitSchema,
} from "../types";

interface LLMSegment {
	text: string;
	index: number;
}

/**
 * Split an article into paragraphs using LLM
 * @param article - The article text to split
 * @param model - Optional model override (defaults to gpt-4o or env variable)
 * @returns Array of paragraphs
 */
async function splitParagraphs(
	article: string,
	retryCount = 0,
): Promise<ParagraphSplitResult> {
	const messages = TEXT_PROMPTS.PARAGRAPH_SPLIT(article);

	const result = await generateObject({
		model: MODELS.split,
		messages,
		schema: ParagraphSplitSchema,
	});

	return result.object;
}

async function splitParagraphsWithRetry(
	article: string,
): Promise<ParagraphSplitResult> {
	const maxRetries = 2;
	for (const retryCount of range(0, maxRetries)) {
		console.log("Attempting to split paragraphs with retry:", retryCount);
		const paragraphs = await splitParagraphs(article, retryCount);
		console.log("Paragraphs generated:", paragraphs);
		const postProcessedArticle = paragraphs.paragraphs.join("");
		if (postProcessedArticle === article) {
			return paragraphs;
		}
	}

	throw new Error(`Failed to split paragraphs after ${maxRetries} attempts.`);
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
	segments: TranscriptSegment[],
): Promise<EDUSResult> {
	const maxRetries = 3; // TODO: make the max retries configurable
	let lastValidationError = "";

	for (const retryCount of range(0, maxRetries)) {
		const edus = await splitParagraphsIntoEDUs(paragraph, retryCount);
		console.log("EDUs generated:", edus);
		const validationResult = validateEDUs(edus, paragraph, segments);

		if (validationResult.isValid) {
			// Return corrected EDUs if available, otherwise original
			return validationResult.correctedEdus || edus;
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
	segments: TranscriptSegment[],
): { isValid: boolean; error: string; correctedEdus?: EDUSResult } {
	// Check if EDUs array is empty
	if (!edus.edus || edus.edus.length === 0) {
		return {
			isValid: false,
			error: "No EDUs generated from paragraph",
		};
	}

	// Helper function to extract only words (English, Chinese, numbers)
	const extractWords = (text: string): string => {
		// Keep English words, Chinese characters, and numbers
		return text
			.replace(/[^\w\u4e00-\u9fa5\s\d]/g, " ") // Remove punctuation/symbols
			.replace(/\s+/g, " ")
			.trim();
	};

	// Step 1: Find the starting position of each EDU in the paragraph
	// EDUs serve as boundary markers - we find where each EDU's content starts
	const eduBoundaries: number[] = [];
	let searchFromIndex = 0;

	for (let i = 0; i < edus.edus.length; i++) {
		const edu = edus.edus[i];
		const eduWords = extractWords(edu.content);

		if (!eduWords) {
			// Empty or punctuation-only EDU
			console.warn(`EDU ${i + 1} is empty or punctuation-only, skipping`);
			continue;
		}

		// Get first word of the EDU to find its position
		const firstWord = eduWords.split(/\s+/)[0];

		// Search for this word in the paragraph
		const searchText = paragraph.substring(searchFromIndex);
		// For Chinese/English mixed text, we need flexible word boundary matching
		const wordPattern = firstWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		// Use a more flexible regex that works for both English and Chinese
		const wordRegex = new RegExp(
			`(?:^|[^\w\u4e00-\u9fa5])${wordPattern}(?=[^\w\u4e00-\u9fa5]|$)`,
			"i",
		);
		const match = searchText.match(wordRegex);

		if (match && match.index !== undefined) {
			// Adjust position to start of the actual word (skip non-word prefix)
			let actualStart = searchFromIndex + match.index;
			if (match[0].length > firstWord.length) {
				// Match includes non-word prefix, adjust
				actualStart += match[0].length - firstWord.length;
			}
			eduBoundaries.push(actualStart);
			searchFromIndex = actualStart + 1;
		} else {
			// If we can't find the EDU, it's a critical error
			return {
				isValid: false,
				error: `EDU ${i + 1} not found in paragraph.
  EDU content: "${edu.content}"
  First word: "${firstWord}"
  Searching from position: ${searchFromIndex}
  Remaining text: "${searchText}"
  Input Edus: "${JSON.stringify(edus, null, 2)}"`,
			};
		}
	}

	// Step 2: Create corrected EDUs by slicing at boundaries
	// The key insight: EDUs mark split points, we slice from one boundary to the next
	const correctedEdus: EDUSResult = { edus: [] };

	for (let i = 0; i < edus.edus.length; i++) {
		let startPos: number;
		let endPos: number;

		if (i === 0) {
			// First EDU starts at beginning of paragraph
			startPos = 0;
		} else if (i < eduBoundaries.length) {
			// Use the boundary position we found
			startPos = eduBoundaries[i];
		} else {
			// Fallback: continue from where previous EDU ended
			const prevContent = correctedEdus.edus[i - 1]?.content || "";
			const prevStart = i > 0 ? eduBoundaries[i - 1] || 0 : 0;
			startPos = prevStart + prevContent.length;
		}

		if (i === edus.edus.length - 1) {
			// Last EDU goes to end of paragraph
			endPos = paragraph.length;
		} else if (i + 1 < eduBoundaries.length) {
			// Next boundary is the end of current EDU
			endPos = eduBoundaries[i + 1];
		} else {
			// No next boundary, go to end
			endPos = paragraph.length;
		}

		// Extract the corrected content
		const correctedContent = paragraph.substring(startPos, endPos);

		correctedEdus.edus.push({
			...edus.edus[i],
			content: correctedContent,
		});
	}

	// Step 3: Verify reconstruction
	const reconstructed = correctedEdus.edus.map((edu) => edu.content).join("");

	if (reconstructed === paragraph) {
		console.log(
			`EDU validation successful. ${correctedEdus.edus.length} EDUs with boundaries corrected.`,
		);
		return {
			isValid: true,
			error: "",
			correctedEdus,
		};
	}

	// If not exact match, log details and return with warning
	console.error(
		`EDU reconstruction mismatch - Length diff: ${reconstructed.length - paragraph.length}`,
	);
	return {
		isValid: false,
		error: "EDU reconstruction mismatch",
	};
}

export async function processArticle(
	article: string,
	segments: TranscriptSegment[],
): Promise<EDUSResult> {
	const paragraphs = await splitParagraphsWithRetry(article);
	const finalEDUs: EDU[] = [];
	let currentIndex = 0;

	for (const paragraph of paragraphs.paragraphs) {
		// TODO: add try catch here
		const edus = await splitParagraphsIntoEDUsWithRetry(paragraph, segments);
		for (const edu of edus.edus) {
			edu.index = currentIndex;
			currentIndex++;
			finalEDUs.push(edu);
		}
	}
	return { edus: finalEDUs };
}

export async function groupEDUs(
	segments: TranscriptSegment[],
): Promise<EDUSResult> {
	const processedSegments = prepareSegmentsForGrouping(segments);

	const groupedEDUsIndex = await groupEDUsByLLM(processedSegments);

	const isValid = validateGroupEDUs(groupedEDUsIndex, processedSegments);

	if (!isValid) {
		throw new Error("Grouped EDUs index is not valid");
	}

	const finalEDUs: EDU[] = [];

	//Create a index to word map from processedSegments
	const indexToWordMap = new Map<number, string>();
	for (let i = 0; i < processedSegments.length; i++) {
		indexToWordMap.set(i, processedSegments[i].text);
	}

	for (let i = 0; i < groupedEDUsIndex.groups.length; i++) {
		let accumulatedText = "";
		console.log("Grouped EDUs index:", groupedEDUsIndex.groups[i]);
		for (const index of groupedEDUsIndex.groups[i]) {
			accumulatedText += indexToWordMap.get(index) || "";
		}
		console.log("Accumulated text:", accumulatedText);
		finalEDUs.push({
			content: accumulatedText,
			index: i,
			tag: "",
		});
	}

	return { edus: finalEDUs };
}

function prepareSegmentsForGrouping(
	segments: TranscriptSegment[],
): LLMSegment[] {
	const processedSegments: LLMSegment[] = [];
	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i];
		if (segment.type === "word") {
			processedSegments.push({
				text: segment.text,
				index: i,
			});
		}
	}
	return processedSegments;
}

function buildMessages(
	previousMessages: ModelMessage[],
	fullText: string,
	wordIndex: LLMSegment[],
): ModelMessage[] {
	const newMessages: ModelMessage = {
		role: "user",
		content: [
			{
				type: "text",
				text: JSON.stringify({ full_text: fullText, word_index: wordIndex }),
			},
		],
	};
	return [...previousMessages, newMessages];
}

async function groupEDUsByLLM(
	segments: LLMSegment[],
): Promise<GroupEDUSResult> {
	const systemMessages = TEXT_PROMPTS.GROUP_EDUS();
	const fullText = segments.map((segment) => segment.text).join("");
	const addEndSegments = [...segments, { text: "<END>", index: -1 }];
	const messages = buildMessages(systemMessages, fullText, addEndSegments);
	const result = await generateObject({
		model: MODELS.text,
		messages,
		schema: GroupEDUSchema,
	});

	return result.object;
}

function validateGroupEDUs(
	groupedEDUsIndex: GroupEDUSResult,
	segments: LLMSegment[],
): boolean {
	const flatGroups = groupedEDUsIndex.groups.flat();
	// flat groups index should be the same as segments index
	if (flatGroups.length !== segments.length) {
		return false;
	}
	for (let i = 0; i < flatGroups.length; i++) {
		if (flatGroups[i] !== segments[i].index) {
			return false;
		}
	}
	return true;
}
