import fs from "node:fs";
import { TranscriptSegment } from "@/features/editor/transcript/types";
import { groupEDUs } from "@/lib/llm/operations/text-operations";
import { config } from "dotenv";

// Load environment variables
config();

async function main() {
	// load the input json file
	const inputPath = "src/lib/transcription/debug/input/chinese-transcript.json";
	console.log("Loading input from:", inputPath);

	const input = fs.readFileSync(inputPath, "utf8");
	const segments = JSON.parse(input) as TranscriptSegment[];
	console.log("Segments loaded:", segments.length);

	console.log("Processing segments into EDUs using groupEDUs...");

	// Use the new groupEDUs function
	const fullEDUs = await groupEDUs(segments);

	console.log("EDUs count:", fullEDUs.length);
	console.log("First few EDUs:");
	fullEDUs.slice(0, 3).forEach((edu, i) => {
		console.log(`  ${i + 1}: ${edu.edu_content}`);
	});

	// save the edus to a json file
	fs.writeFileSync(
		"src/lib/transcription/debug/output/edus.json",
		JSON.stringify(fullEDUs, null, 2),
	);
	console.log("Saved EDUs to edus.json");

	// Extract flat words for backward compatibility if needed
	const flatWords = fullEDUs.flatMap((edu) => edu.words || []);
	fs.writeFileSync(
		"src/lib/transcription/debug/output/flat-words.json",
		JSON.stringify(flatWords, null, 2),
	);
	console.log("Saved flat words to flat-words.json");
}

main().catch(console.error);
