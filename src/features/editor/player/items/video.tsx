import { IVideo } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { calculateMediaStyles } from "../styles";
import { OffthreadVideo } from "remotion";
import useStore from "../../store/use-store";

export const Video = ({
	item,
	options,
}: {
	item: IVideo;
	options: SequenceItemOptions;
}) => {
	const { playerRef } = useStore();
	const { fps } = options;
	const { details, animations } = item;
	const playbackRate = item.playbackRate || 1;
	const crop = details?.crop || {
		x: 0,
		y: 0,
		width: details.width,
		height: details.height,
	};

	const handleAutoPlayError = () => {
		console.warn(
			`Autoplay failed for video: ${details.src}. Video will be muted and retried.`,
		);
		// Pause the player to show user that autoplay failed
		playerRef?.current?.pause();
	};

	const children = (
		<div style={calculateMediaStyles(details, crop)}>
			<OffthreadVideo
				startFrom={((item.trim?.from ?? 0) / 1000) * fps}
				endAt={((item.trim?.to ?? 0) / 1000) * fps || 1 / fps}
				playbackRate={playbackRate}
				src={details.src}
				volume={(details.volume ?? 100) / 100}
				onAutoPlayError={handleAutoPlayError}
			/>
		</div>
	);

	return BaseSequence({ item, options, children });
};

export default Video;
