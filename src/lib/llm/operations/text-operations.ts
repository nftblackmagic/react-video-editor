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
	FullEDU,
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

async function groupEDUsSlice(
	segments: TranscriptSegment[],
): Promise<{ unprocessedWords: TranscriptSegment[]; fullEDUs: FullEDU[] }> {
	const processedSegments = prepareSegmentsForGrouping(segments);
	const edus = await groupEDUsSliceWithRetry(processedSegments);
	const { fullEDUs, unprocessedWords } = createFullEDUs(edus, segments);
	return { unprocessedWords: unprocessedWords, fullEDUs: fullEDUs };
}

async function groupEDUsSliceWithRetry(
	segments: LLMSegment[],
): Promise<GroupEDUSResult> {
	const maxRetries = 3;
	for (const retryCount of range(0, maxRetries)) {
		const edus = await groupEDUsByLLM(segments);
		const isValid = validateGroupEDUs(edus, segments);
		if (isValid) {
			return edus;
		}
	}
	throw new Error("Failed to group EDUs after 3 attempts");
}

function createFullEDUs(
	edus: GroupEDUSResult,
	segments: TranscriptSegment[],
): { fullEDUs: FullEDU[]; unprocessedWords: TranscriptSegment[] } {
	// get edu spliting index from edus.edus
	const eduSplitingIndex = getEduSplitingIndex(edus);
	console.log("Edu spliting index:", eduSplitingIndex);
	// get word spliting index from segments
	const wordSplitingIndex = getWordSplitingIndex(segments);
	console.log("Word spliting index:", wordSplitingIndex);
	// fix edu spliting index by using word spliting index
	const revisedEduSplitingIndex = reviseEduSplitingIndex(
		eduSplitingIndex,
		wordSplitingIndex,
	);
	console.log("Revised edu spliting index:", revisedEduSplitingIndex);
	// construct full EDU.
	return constructFullEDUs(revisedEduSplitingIndex, segments);
}

function constructFullEDUs(
	revisedEduSplitingIndex: number[],
	segments: TranscriptSegment[],
): { fullEDUs: FullEDU[]; unprocessedWords: TranscriptSegment[] } {
	const fullEDUs: FullEDU[] = [];
	let wordIndex = 0;
	let index = 0;
	let eduIndex = 0;
	for (const eduSplitingIndex of revisedEduSplitingIndex) {
		const words: TranscriptSegment[] = [];
		while (index < eduSplitingIndex) {
			words.push(segments[wordIndex]);
			// console.log("Pushing word:", segments[wordIndex]);
			index += segments[wordIndex].text.length;
			wordIndex++;
		}
		fullEDUs.push({
			edu_index: eduIndex,
			edu_content: words.map((word) => word.text).join(""),
			edu_start: words[0].start,
			edu_end: words[words.length - 1].end,
			words: words,
		});
		eduIndex++;
	}

	const unprocessedWords = segments.slice(wordIndex);

	return { fullEDUs, unprocessedWords };
}

function getEduSplitingIndex(edus: GroupEDUSResult): number[] {
	const eduSplitingIndex: number[] = [];
	let currentIndex = 0;
	for (const edu of edus.edus) {
		currentIndex += edu.content.length;
		eduSplitingIndex.push(currentIndex);
	}
	return eduSplitingIndex;
}

function getWordSplitingIndex(segments: TranscriptSegment[]): number[] {
	const wordSplitingIndex: number[] = [];
	let currentIndex = 0;
	for (const segment of segments) {
		currentIndex += segment.text.length;
		wordSplitingIndex.push(currentIndex);
	}
	return wordSplitingIndex;
}

function reviseEduSplitingIndex(
	eduSplitingIndex: number[],
	wordSplitingIndex: number[],
): number[] {
	const revisedEduSplitingIndex: number[] = [];
	// check if eduSplitingIndex is the subset of wordSplitingIndex. If not, revise the non-existing eduSplitingIndex to the nearest wordSplitingIndex.

	for (const eduIndex of eduSplitingIndex) {
		if (wordSplitingIndex.includes(eduIndex)) {
			// EDU index aligns with word boundary, keep it
			revisedEduSplitingIndex.push(eduIndex);
		} else {
			// Find the nearest word splitting index
			const nearestIndex = findNearestWordBoundary(eduIndex, wordSplitingIndex);
			revisedEduSplitingIndex.push(nearestIndex);
		}
	}

	return revisedEduSplitingIndex;
}

function findNearestWordBoundary(
	targetIndex: number,
	wordBoundaries: number[],
): number {
	// Handle edge cases
	if (wordBoundaries.length === 0) {
		return targetIndex;
	}

	if (targetIndex <= wordBoundaries[0]) {
		return wordBoundaries[0];
	}

	if (targetIndex >= wordBoundaries[wordBoundaries.length - 1]) {
		return wordBoundaries[wordBoundaries.length - 1];
	}

	// Binary search to find the nearest boundary
	let left = 0;
	let right = wordBoundaries.length - 1;

	while (left < right - 1) {
		const mid = Math.floor((left + right) / 2);
		if (wordBoundaries[mid] === targetIndex) {
			return targetIndex;
		}
		if (wordBoundaries[mid] < targetIndex) {
			left = mid;
		} else {
			right = mid;
		}
	}

	// Choose the closest boundary
	const leftDiff = Math.abs(targetIndex - wordBoundaries[left]);
	const rightDiff = Math.abs(targetIndex - wordBoundaries[right]);

	// Prefer the later boundary if distances are equal (to avoid cutting words)
	return leftDiff <= rightDiff ? wordBoundaries[left] : wordBoundaries[right];
}

export async function groupEDUs(
	segments: TranscriptSegment[],
): Promise<FullEDU[]> {
	let wordOnlySegments = segments.filter((segment) => segment.type === "word");
	const sliceWindow = 500;
	const finalEDUs: FullEDU[] = [];
	while (wordOnlySegments.length > 0) {
		const { fullEDUs, unprocessedWords } = await groupEDUsSlice(
			wordOnlySegments.slice(0, sliceWindow),
		);

		console.log("Full EDUs:", fullEDUs);
		console.log(
			"Unprocessed Words:",
			unprocessedWords.map((word) => word.text),
		);

		wordOnlySegments = wordOnlySegments.slice(sliceWindow);
		wordOnlySegments = [...unprocessedWords, ...wordOnlySegments];
		finalEDUs.push(...fullEDUs);
	}

	const recoveredEDUs = recoverEDUs(finalEDUs, segments);

	return recoveredEDUs;
}

export function recoverEDUs(
	edus: FullEDU[],
	segments: TranscriptSegment[],
): FullEDU[] {
	const recoveredEDUs: FullEDU[] = [];

	// Create a map of word segments to their corresponding EDU
	const wordToEduMap = new Map<TranscriptSegment, FullEDU>();
	for (const edu of edus) {
		for (const word of edu.words) {
			wordToEduMap.set(word, edu);
		}
	}

	// Track which word segments have been processed
	const processedWords = new Set<TranscriptSegment>();
	let i = 0;

	while (i < segments.length) {
		const segment = segments[i];

		if (segment.type === "word") {
			// Skip if this word has already been processed
			if (processedWords.has(segment)) {
				i++;
				continue;
			}

			const edu = wordToEduMap.get(segment);
			if (!edu) {
				// This word doesn't belong to any EDU (shouldn't happen normally)
				i++;
				continue;
			}

			// Find all consecutive words that belong to the same EDU
			const eduWords: TranscriptSegment[] = [];
			let j = i;

			while (j < segments.length) {
				const currentSegment = segments[j];

				// Stop if we hit a non-word segment
				if (currentSegment.type !== "word") {
					break;
				}

				// Stop if this word belongs to a different EDU
				const currentEdu = wordToEduMap.get(currentSegment);
				if (currentEdu !== edu) {
					break;
				}

				// Stop if we've already processed this word
				if (processedWords.has(currentSegment)) {
					break;
				}

				// Add this word to the current EDU group
				eduWords.push(currentSegment);
				processedWords.add(currentSegment);
				j++;
			}

			// Create an EDU from the collected words
			if (eduWords.length > 0) {
				recoveredEDUs.push({
					edu_index: 0, // Will be renumbered later
					edu_content: eduWords.map(w => w.text).join(""),
					edu_start: eduWords[0].start,
					edu_end: eduWords[eduWords.length - 1].end,
					words: eduWords,
				});
			}

			i = j;
		} else {
			// Non-word segment (spacing or audio_event)
			// Add it as its own EDU
			recoveredEDUs.push({
				edu_index: 0, // Will be renumbered later
				edu_content: segment.text,
				edu_start: segment.start,
				edu_end: segment.end,
				words: [segment],
			});
			i++;
		}
	}

	// Renumber all EDUs sequentially
	for (let i = 0; i < recoveredEDUs.length; i++) {
		recoveredEDUs[i].edu_index = i;
	}

	return recoveredEDUs;
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

async function groupEDUsByLLM(
	segments: LLMSegment[],
): Promise<GroupEDUSResult> {
	const paragraph = segments.map((segment) => segment.text).join("");
	console.log("Paragraph:", paragraph);
	const messages = TEXT_PROMPTS.GROUP_EDUS(paragraph);
	const result = await generateObject({
		model: MODELS.text,
		messages,
		schema: GroupEDUSchema,
	});

	return result.object;
}

function validateGroupEDUs(
	edus: GroupEDUSResult,
	segments: LLMSegment[],
): boolean {
	const paragraph = segments.map((segment) => segment.text).join("");
	const unprocessedWords = edus.unprocessed_words;
	const flatEdus = edus.edus.map((edu) => edu.content).join("");
	if (paragraph !== flatEdus + unprocessedWords) {
		console.error("Grouped EDUs validation failed");
		console.error("Paragraph:", paragraph);
		console.error("Flat EDUs:", flatEdus);
		console.error("Unprocessed Words:", unprocessedWords);
		console.error("Paragraph length :", paragraph.length);
		console.error("Flat EDUs length:", flatEdus.length);
		console.error("Unprocessed Words length:", unprocessedWords.length);
		return false;
	}
	return true;
}
