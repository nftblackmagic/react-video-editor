import { IAudio } from "@designcombo/types";
import { Audio as RemotionAudio } from "remotion";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import React from "react";

const AudioComponent = (props: {
	item: IAudio;
	options: SequenceItemOptions;
}) => {
	const { item, options } = props;

	const { fps } = options;
	const { details } = item;

	if (!details || !details.src) {
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
			src={details.src}
			crossOrigin="anonymous"
			volume={(details.volume ?? 100) / 100}
			muted={false}
			startFrom={startFromFrame}
			playbackRate={playbackRate}
		/>
	);

	return BaseSequence({ item, options, children });
};

// Memoize the component to prevent unnecessary re-renders
const Audio = React.memo(AudioComponent, (prevProps, nextProps) => {
	// Only re-render if item or options actually changed
	return (
		prevProps.item.id === nextProps.item.id &&
		prevProps.item.details.src === nextProps.item.details.src &&
		prevProps.item.details.volume === nextProps.item.details.volume &&
		prevProps.item.playbackRate === nextProps.item.playbackRate &&
		prevProps.item.display.from === nextProps.item.display.from &&
		prevProps.item.display.to === nextProps.item.display.to &&
		prevProps.item.trim?.from === nextProps.item.trim?.from &&
		prevProps.item.trim?.to === nextProps.item.trim?.to &&
		prevProps.options.fps === nextProps.options.fps
	);
});

Audio.displayName = "Audio";

export default Audio;
