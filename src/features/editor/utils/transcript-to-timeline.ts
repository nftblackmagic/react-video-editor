import { FullEDU } from "@/features/editor/transcript/types";
import { generateId } from "@designcombo/timeline";
import { ITrack, ITrackItem } from "@designcombo/types";

/**
 * Convert fullEDUs words to subtitle timeline items
 * Each word becomes an individual timeline item
 */
export function wordsToSubtitleItems(fullEDUs: FullEDU[]): ITrackItem[] {
	const subtitleItems: ITrackItem[] = [];

	for (const edu of fullEDUs) {
		for (const word of edu.words) {
			const itemId = generateId();
			subtitleItems.push({
				id: itemId,
				type: "subtitle",
				display: {
					from: word.start, // Already in milliseconds from transcription
					to: word.end, // Already in milliseconds from transcription
				},
				details: {
					text: word.text,
					wordId: word.id, // Link back to transcript
				},
				// Additional properties for timeline rendering
				playbackRate: 1,
				trim: { from: 0, to: word.end - word.start },
				duration: word.end - word.start,
			} as any as ITrackItem);
		}
	}

	return subtitleItems;
}

/**
 * Create a subtitle track with the given items
 */
export function createSubtitleTrack(items: ITrackItem[], index = 1): ITrack {
	return {
		id: generateId(),
		items: items.map((item) => item.id),
		accepts: ["subtitle"],
		index,
	} as ITrack;
}

/**
 * Generate subtitle track data from fullEDUs
 * Returns both the track and items ready for dispatch
 */
export function generateSubtitleTrackFromTranscript(
	fullEDUs: FullEDU[],
	trackIndex = 1,
): {
	track: ITrack;
	items: ITrackItem[];
} {
	const items = wordsToSubtitleItems(fullEDUs);
	const track = createSubtitleTrack(items, trackIndex);

	return { track, items };
}
