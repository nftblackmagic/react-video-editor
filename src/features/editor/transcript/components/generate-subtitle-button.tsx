import { Button } from "@/components/ui/button";
import { Subtitles } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import useStore from "../../store/use-store";
import useTranscriptStore from "../../store/use-transcript-store";
import { loadTimelineGranularly } from "../../utils/granular-dispatch";
import { generateSubtitleTrackFromTranscript } from "../../utils/transcript-to-timeline";

const GenerateSubtitleButton: React.FC = () => {
	const { fullEDUs } = useTranscriptStore();
	const { tracks, trackItemsMap } = useStore();

	const handleGenerateSubtitles = () => {
		if (fullEDUs.length === 0) {
			toast.error("No transcript available to generate subtitles");
			return;
		}

		// Check if subtitle track already exists
		// Tracks are identified by their accepts array, not a type field
		const existingSubtitleTrack = tracks.find((track) =>
			track.accepts?.includes("subtitle"),
		);
		if (existingSubtitleTrack) {
			toast.info("Subtitle track already exists");
			return;
		}

		// Generate subtitle track and items
		const { track, items } = generateSubtitleTrackFromTranscript(
			fullEDUs,
			tracks.length, // Place at the end
		);

		// Create the track items map
		const newTrackItemsMap: Record<string, any> = {};
		for (const item of items) {
			newTrackItemsMap[item.id] = item;
		}

		// Get current state to merge with new subtitle track
		const currentTracks = [...tracks, track];
		const currentTrackItems = { ...trackItemsMap, ...newTrackItemsMap };

		// Use loadTimelineGranularly to properly update the state
		const result = loadTimelineGranularly({
			tracks: currentTracks,
			trackItems: currentTrackItems,
		});

		if (result.valid) {
			toast.success(`Generated subtitle track with ${items.length} words`);
		} else {
			toast.error("Failed to generate subtitle track");
			console.error("Subtitle track generation failed:", result.errors);
		}
	};

	return (
		<Button
			onClick={handleGenerateSubtitles}
			variant="outline"
			size="sm"
			className="w-full"
			disabled={fullEDUs.length === 0}
		>
			<Subtitles className="w-4 h-4 mr-2" />
			Generate Subtitle Track
		</Button>
	);
};

export default GenerateSubtitleButton;
