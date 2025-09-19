import React, { useEffect, useRef } from "react";
import TranscriptEDU from "./TranscriptEDU";
import useTranscriptStore from "../store/use-transcript-store";
import useUploadStore from "../store/use-upload-store";
import { useTranscriptSync } from "../hooks/use-transcript-sync";

const TranscriptEditor: React.FC = () => {
	const { fullEDUs, activeEDUIndex, initEDUs } = useTranscriptStore();
	const { transcriptions, transcriptionStatus } = useUploadStore();
	const listRef = useRef<HTMLDivElement>(null);

	// Enable synchronization
	useTranscriptSync();

	// Auto-scroll to active EDU
	useEffect(() => {
		if (activeEDUIndex !== null && activeEDUIndex >= 0) {
			const element = document.getElementById(`edu-${activeEDUIndex}`);
			element?.scrollIntoView({
				behavior: "smooth",
				block: "center",
			});
		}
	}, [activeEDUIndex]);

	// Load transcriptions from upload store when available
	useEffect(() => {
		// Check if there are any completed transcriptions
		const completedTranscriptions = Object.entries(transcriptions).filter(
			([uploadId, edus]) =>
				transcriptionStatus[uploadId] === "completed" && edus?.length > 0,
		);

		// If we have transcriptions from uploads, use the most recent one
		if (completedTranscriptions.length > 0 && fullEDUs.length === 0) {
			// Use the first completed transcription (could be enhanced to allow selection)
			const [uploadId, transcriptEDUs] = completedTranscriptions[0];
			initEDUs(transcriptEDUs);
		}
	}, [transcriptions, transcriptionStatus, fullEDUs.length, initEDUs]);

	return (
		<div className="h-full flex flex-col bg-background border-l border-border">
			{/* Header */}
			<div className="px-4 py-3 border-b border-border">
				<h3 className="font-medium text-sm">Transcript</h3>
				{fullEDUs.length > 0 && (
					<p className="text-xs text-muted-foreground mt-0.5">
						{fullEDUs.length} EDUs
					</p>
				)}
			</div>

			{/* Transcript List */}
			<div
				className="flex-1 overflow-y-auto px-3 py-2 scroll-smooth"
				ref={listRef}
			>
				{fullEDUs.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-center px-4">
						<div className="text-muted-foreground">
							<p className="text-sm mb-2">No transcript available</p>
							<p className="text-xs">
								Upload a video with captions or add transcript segments to get
								started
							</p>
						</div>
					</div>
				) : (
					<div className="space-y-1">
						{fullEDUs.map((edu, index) => (
							<TranscriptEDU
								key={`edu-${edu.edu_index}`}
								edu={edu}
								isActive={index === activeEDUIndex}
								showWords={false}
							/>
						))}
						{/* Add some padding at the bottom for better scroll experience */}
						<div className="h-20" />
					</div>
				)}
			</div>

			{/* Status Bar */}
			{activeEDUIndex !== null && fullEDUs.length > 0 && (
				<div className="px-4 py-2 border-t border-border bg-muted/30">
					<p className="text-xs text-muted-foreground">
						Playing EDU {activeEDUIndex + 1} of {fullEDUs.length}
					</p>
				</div>
			)}
		</div>
	);
};

export default TranscriptEditor;
