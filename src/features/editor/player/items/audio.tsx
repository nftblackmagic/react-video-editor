import { IAudio } from "@designcombo/types";
import { Audio as RemotionAudio } from "remotion";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";

export default function Audio(props: {
	item: IAudio;
	options: SequenceItemOptions;
}) {
	// Add safety checks
	if (!props) {
		console.error("❌ Audio component called without props");
		return null;
	}

	const { item, options } = props;

	if (!item) {
		console.error("❌ Audio component called without item");
		return null;
	}

	if (!options) {
		console.error(
			`❌ Audio component called without options for item ${item.id}`,
		);
		return null;
	}

	const { fps } = options;
	const { details } = item;

	if (!details || !details.src) {
		console.error(`❌ Audio item ${item.id} has no details or src`);
		return null;
	}

	const playbackRate = item.playbackRate || 1;

	// Check if URL is valid
	if (!details.src) {
		return null;
	}

	// Calculate proper frame values for trim (how much to skip from the original audio)
	// Note: startFrom is how many frames to skip from the beginning of the audio file
	// endAt is NOT used here - the duration is controlled by the Sequence wrapper
	const startFromFrame = item.trim?.from
		? Math.round((item.trim.from / 1000) * fps)
		: 0;

	const children = (
		<RemotionAudio
			startFrom={startFromFrame}
			playbackRate={playbackRate}
			src={details.src}
			volume={(details.volume ?? 100) / 100}
			muted={false}
		/>
	);
	return BaseSequence({ item, options, children });
}
