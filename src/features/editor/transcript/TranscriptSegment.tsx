import React from "react";
import { TranscriptSegment as TranscriptSegmentType } from "../transcript/types";
import { dispatch } from "@designcombo/events";
import { TRANSCRIPT_SELECT } from "../constants/events";

interface TranscriptSegmentProps {
	segment: TranscriptSegmentType;
	isActive: boolean;
}

const TranscriptSegment: React.FC<TranscriptSegmentProps> = ({
	segment,
	isActive,
}) => {
	const handleClick = () => {
		// Dispatch select event
		dispatch(TRANSCRIPT_SELECT, {
			payload: {
				segmentId: segment.id,
				time: segment.start,
			},
		});
	};

	// Format time from milliseconds to MM:SS
	const formatTime = (ms: number) => {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
			.toString()
			.padStart(2, "0")}`;
	};

	return (
		<div
			className={`
        p-3 mb-2 rounded cursor-pointer transition-all duration-200
        ${
					isActive
						? "bg-primary/20 border-l-4 border-primary shadow-sm"
						: "hover:bg-muted border-l-4 border-transparent"
				}
      `}
			onClick={handleClick}
			id={`segment-${segment.id}`}
		>
			<div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
				<span className="font-mono">
					{formatTime(segment.start)} - {formatTime(segment.end)}
				</span>
				{segment.speaker_id && (
					<>
						<span className="text-muted-foreground/50">•</span>
						<span className="font-medium">{segment.speaker_id}</span>
					</>
				)}
				{segment.type && (
					<>
						<span className="text-muted-foreground/50">•</span>
						<span className="italic text-muted-foreground">
							[{segment.type}]
						</span>
					</>
				)}
			</div>
			<div className="text-sm leading-relaxed">{segment.text}</div>
		</div>
	);
};

export default TranscriptSegment;
