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
	console.log("Grouping EDUs...");

	const groupedEDUs = await groupEDUs(segments);

	console.log("EDUs groups:", groupedEDUs);

	// save the edus to a json file
	fs.writeFileSync(
		"src/lib/transcription/debug/output/grouped-edus.json",
		JSON.stringify(groupedEDUs, null, 2),
	);
	console.log("Saved EDUs to grouped-edus.json");
}

main().catch(console.error);
