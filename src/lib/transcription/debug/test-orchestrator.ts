import fs from "node:fs";
import { TranscriptSegment } from "@/features/editor/transcript/types";
import { processArticle } from "@/lib/llm/operations/text-operations";
import {
	postProcessTranscript,
	reconstructureEdus,
} from "@/lib/transcription/orchestrator";
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

	const postProcessedSegments = postProcessTranscript(segments);
	console.log("Post processed segments:", postProcessedSegments.length);
	fs.writeFileSync(
		"src/lib/transcription/debug/output/post-processed-segments.json",
		JSON.stringify(postProcessedSegments, null, 2),
	);
	console.log("Saved post processed segments to post-processed-segments.json");

	console.log("Segments loaded:", postProcessedSegments.length);

	// Get pure article text (same logic as orchestrator.getPureArticle)
	const article = postProcessedSegments
		.filter((segment) => segment.type === "word")
		.map((segment) => segment.text)
		.join("");

	console.log("Article length:", article.length);
	console.log("Processing article into EDUs...");

	const edus = await processArticle(article, postProcessedSegments);

	console.log("EDUs count:", edus.edus.length);
	console.log("First few EDUs:");
	edus.edus.slice(0, 3).forEach((edu, i) => {
		console.log(`  ${i + 1}: ${edu.content}`);
	});

	// save the edus to a json file
	fs.writeFileSync(
		"src/lib/transcription/debug/output/edus.json",
		JSON.stringify(edus, null, 2),
	);
	console.log("Saved EDUs to edus.json");

	const reconstructuredSegments = reconstructureEdus(
		edus,
		postProcessedSegments,
	);

	fs.writeFileSync(
		"src/lib/transcription/debug/output/reconstructured-segments.json",
		JSON.stringify(reconstructuredSegments, null, 2),
	);
	console.log(
		"Saved reconstructured segments to reconstructured-segments.json",
	);
}

main().catch(console.error);
