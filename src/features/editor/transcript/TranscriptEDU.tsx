import React from "react";
import { FullEDU } from "../transcript/types";
import { dispatch } from "@designcombo/events";
import { TRANSCRIPT_SELECT } from "../constants/events";

interface TranscriptEDUProps {
	edu: FullEDU;
	isActive: boolean;
	showWords?: boolean;
}

const TranscriptEDU: React.FC<TranscriptEDUProps> = ({
	edu,
	isActive,
	showWords = false,
}) => {
	const handleClick = () => {
		// Dispatch select event with EDU index
		dispatch(TRANSCRIPT_SELECT, {
			payload: {
				eduIndex: edu.edu_index,
				time: edu.edu_start,
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

	// Get first word's speaker ID if available
	const speakerId = edu.words?.[0]?.speaker_id || null;

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
			id={`edu-${edu.edu_index}`}
		>
			<div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
				<span className="font-mono">
					{formatTime(edu.edu_start)} - {formatTime(edu.edu_end)}
				</span>
				{speakerId && (
					<>
						<span className="text-muted-foreground/50">•</span>
						<span className="font-medium">{speakerId}</span>
					</>
				)}
				{edu.words?.length && (
					<>
						<span className="text-muted-foreground/50">•</span>
						<span className="text-xs text-muted-foreground">
							{edu.words.length} words
						</span>
					</>
				)}
			</div>
			<div className="text-sm leading-relaxed">
				{edu.edu_content}
				{showWords && edu.words && (
					<div className="mt-2 pt-2 border-t border-muted text-xs opacity-70">
						{edu.words.map((word, index) => (
							<span key={index} className="inline-block mr-1">
								{word.text}
							</span>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default TranscriptEDU;
