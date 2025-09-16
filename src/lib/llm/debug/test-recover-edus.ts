import { TranscriptSegment } from "@/features/editor/transcript/types";
import { FullEDU } from "@/lib/llm/types";

// Export the recoverEDUs function from text-operations for testing
// Note: You may need to export this function from text-operations.ts
import { recoverEDUs } from "@/lib/llm/operations/text-operations";

// Test data: Create sample segments and EDUs
function createTestData(): {
	segments: TranscriptSegment[];
	edus: FullEDU[];
} {
	// Create test word segments
	const wordSegments: TranscriptSegment[] = [
		{ text: "The", start: 0, end: 0.5, type: "word", speaker_id: null, logprob: 0, characters: null },
		{ text: "cat", start: 0.5, end: 1.0, type: "word", speaker_id: null, logprob: 0, characters: null },
		{ text: "is", start: 1.0, end: 1.3, type: "word", speaker_id: null, logprob: 0, characters: null },
		{ text: "sleeping", start: 1.3, end: 2.0, type: "word", speaker_id: null, logprob: 0, characters: null },
		{ text: "on", start: 2.0, end: 2.3, type: "word", speaker_id: null, logprob: 0, characters: null },
		{ text: "the", start: 2.3, end: 2.5, type: "word", speaker_id: null, logprob: 0, characters: null },
		{ text: "mat", start: 2.5, end: 3.0, type: "word", speaker_id: null, logprob: 0, characters: null },
	];

	// Create test segments with non-word segments mixed in
	const segments: TranscriptSegment[] = [
		wordSegments[0], // "The"
		wordSegments[1], // "cat"
		{ text: " ", start: 1.0, end: 1.0, type: "spacing", speaker_id: null, logprob: 0, characters: null },
		wordSegments[2], // "is"
		wordSegments[3], // "sleeping"
		{ text: "[pause]", start: 2.0, end: 2.0, type: "audio_event", speaker_id: null, logprob: 0, characters: null },
		wordSegments[4], // "on"
		wordSegments[5], // "the"
		wordSegments[6], // "mat"
	];

	// Create test EDUs (from word-only processing)
	const edus: FullEDU[] = [
		{
			edu_index: 0,
			edu_content: "The cat is sleeping",
			edu_start: 0,
			edu_end: 2.0,
			words: [wordSegments[0], wordSegments[1], wordSegments[2], wordSegments[3]],
		},
		{
			edu_index: 1,
			edu_content: "on the mat",
			edu_start: 2.0,
			edu_end: 3.0,
			words: [wordSegments[4], wordSegments[5], wordSegments[6]],
		},
	];

	return { segments, edus };
}

// Test case for Chinese transcript with duplicates
function createChineseTestData(): {
	segments: TranscriptSegment[];
	edus: FullEDU[];
} {
	const wordSegments: TranscriptSegment[] = [
		{ text: "视", start: 22.55, end: 22.64, type: "word", speaker_id: null, logprob: 0, characters: null },
		{ text: "频", start: 22.64, end: 22.8, type: "word", speaker_id: null, logprob: 0, characters: null },
		{ text: "呢", start: 22.8, end: 24.18, type: "word", speaker_id: null, logprob: 0, characters: null },
		{ text: "？", start: 24.18, end: 24.24, type: "word", speaker_id: null, logprob: 0, characters: null },
		{ text: "这", start: 24.5, end: 24.7, type: "word", speaker_id: null, logprob: 0, characters: null },
		{ text: "是", start: 24.7, end: 24.9, type: "word", speaker_id: null, logprob: 0, characters: null },
		{ text: "什", start: 24.9, end: 25.1, type: "word", speaker_id: null, logprob: 0, characters: null },
		{ text: "么", start: 25.1, end: 25.3, type: "word", speaker_id: null, logprob: 0, characters: null },
	];

	const segments: TranscriptSegment[] = [
		wordSegments[0], // "视"
		wordSegments[1], // "频"
		wordSegments[2], // "呢"
		wordSegments[3], // "？"
		{ text: " ", start: 24.24, end: 24.5, type: "spacing", speaker_id: null, logprob: 0, characters: null },
		wordSegments[4], // "这"
		wordSegments[5], // "是"
		wordSegments[6], // "什"
		wordSegments[7], // "么"
	];

	const edus: FullEDU[] = [
		{
			edu_index: 0,
			edu_content: "视频呢？",
			edu_start: 22.55,
			edu_end: 24.24,
			words: [wordSegments[0], wordSegments[1], wordSegments[2], wordSegments[3]],
		},
		{
			edu_index: 1,
			edu_content: "这是什么",
			edu_start: 24.5,
			edu_end: 25.3,
			words: [wordSegments[4], wordSegments[5], wordSegments[6], wordSegments[7]],
		},
	];

	return { segments, edus };
}

async function main() {
	console.log("Testing recoverEDUs function\n");
	console.log("=" .repeat(50));

	// Test 1: English text with spacing and audio_event
	console.log("\nTest 1: English text with non-word segments");
	console.log("-".repeat(50));
	const { segments: engSegments, edus: engEDUs } = createTestData();

	console.log("Input EDUs:");
	engEDUs.forEach(edu => {
		console.log(`  EDU ${edu.edu_index}: "${edu.edu_content}"`);
	});

	console.log("\nInput segments (including non-words):");
	engSegments.forEach(seg => {
		console.log(`  [${seg.type}] "${seg.text}"`);
	});

	const recoveredEngEDUs = recoverEDUs(engEDUs, engSegments);

	console.log("\nRecovered EDUs:");
	recoveredEngEDUs.forEach(edu => {
		console.log(`  EDU ${edu.edu_index}: "${edu.edu_content}" (${edu.words.length} segments)`);
	});

	// Test 2: Chinese text to verify no duplicates
	console.log("\n" + "=".repeat(50));
	console.log("\nTest 2: Chinese text - checking for duplicates");
	console.log("-".repeat(50));
	const { segments: cnSegments, edus: cnEDUs } = createChineseTestData();

	console.log("Input EDUs:");
	cnEDUs.forEach(edu => {
		console.log(`  EDU ${edu.edu_index}: "${edu.edu_content}"`);
	});

	console.log("\nInput segments (including non-words):");
	cnSegments.forEach(seg => {
		console.log(`  [${seg.type}] "${seg.text}"`);
	});

	const recoveredCnEDUs = recoverEDUs(cnEDUs, cnSegments);

	console.log("\nRecovered EDUs:");
	recoveredCnEDUs.forEach(edu => {
		console.log(`  EDU ${edu.edu_index}: "${edu.edu_content}" (${edu.words.length} segments)`);
		console.log(`    Words: ${edu.words.map(w => w.text).join("")}`);
	});

	// Verify no duplicates
	console.log("\n" + "=".repeat(50));
	console.log("\nVerification: Checking for duplicate words");
	console.log("-".repeat(50));

	const allWords = new Set<string>();
	let hasDuplicates = false;

	recoveredCnEDUs.forEach(edu => {
		edu.words.forEach(word => {
			if (word.type === "word") {
				const key = `${word.text}_${word.start}_${word.end}`;
				if (allWords.has(key)) {
					console.log(`  ❌ DUPLICATE FOUND: "${word.text}" at ${word.start}-${word.end}`);
					hasDuplicates = true;
				} else {
					allWords.add(key);
				}
			}
		});
	});

	if (!hasDuplicates) {
		console.log("  ✅ No duplicate words found!");
	}

	console.log("\n" + "=".repeat(50));
	console.log("Test completed!");
}

main().catch(console.error);