import React, { useEffect, useRef } from "react";
import TranscriptSegment from "./TranscriptSegment";
import useTranscriptStore from "../store/use-transcript-store";
import useUploadStore from "../store/use-upload-store";
import { useTranscriptSync } from "../hooks/use-transcript-sync";

const TranscriptEditor: React.FC = () => {
  const { segments, activeSegmentId, initSegments } = useTranscriptStore();
  const { transcriptions, transcriptionStatus } = useUploadStore();
  const listRef = useRef<HTMLDivElement>(null);

  // Enable synchronization
  useTranscriptSync();

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeSegmentId) {
      const element = document.getElementById(`segment-${activeSegmentId}`);
      element?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeSegmentId]);

  // Load transcriptions from upload store when available
  useEffect(() => {
    // Check if there are any completed transcriptions
    const completedTranscriptions = Object.entries(transcriptions).filter(
      ([uploadId, segments]) =>
        transcriptionStatus[uploadId] === "completed" && segments?.length > 0
    );

    // If we have transcriptions from uploads, use the most recent one
    if (completedTranscriptions.length > 0 && segments.length === 0) {
      // Use the first completed transcription (could be enhanced to allow selection)
      const [uploadId, transcriptSegments] = completedTranscriptions[0];
      initSegments(transcriptSegments);
    }
  }, [transcriptions, transcriptionStatus, segments.length, initSegments]);

  // // Load test data from debug.json in development (fallback)
  // useEffect(() => {
  //   if (process.env.NODE_ENV === 'development' && segments.length === 0) {
  //     // Only load debug data if no transcriptions are available from uploads
  //     const hasTranscriptions = Object.keys(transcriptions).length > 0;
  //     if (!hasTranscriptions) {
  //       // Load debug transcript data
  //       fetch('/debug/debug.json')
  //         .then(response => response.json())
  //         .then(data => {
  //           // Convert the data format to match our interface
  //           const formattedSegments = data.map((item: any, index: number) => ({
  //             id: String(index + 1),
  //             text: item.text,
  //             startTime: item.start * 1000, // Convert seconds to milliseconds
  //             endTime: item.end * 1000, // Convert seconds to milliseconds
  //             type: item.type || 'word',
  //             speaker_id: item.speaker_id,
  //             logprob: item.logprob || 0,
  //             characters: item.characters
  //           }));

  //           initSegments(formattedSegments);
  //         })
  //         .catch(error => {
  //           console.error('Failed to load debug transcript:', error);
  //           // Fallback to simple test data if debug.json fails to load
  //           const fallbackSegments = [
  //             {
  //               id: '1',
  //               text: 'Upload an audio or video file to see transcripts here.',
  //               startTime: 0,
  //               endTime: 3000,
  //               type: 'speech',
  //               speaker_id: 'system',
  //               logprob: 1.0,
  //               characters: null
  //             }
  //           ];
  //           initSegments(fallbackSegments);
  //         });
  //     }
  //   }
  // }, [segments.length, initSegments, transcriptions]);

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-medium text-sm">Transcript</h3>
        {segments.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {segments.length} segments
          </p>
        )}
      </div>

      {/* Transcript List */}
      <div
        className="flex-1 overflow-y-auto px-3 py-2 scroll-smooth"
        ref={listRef}
      >
        {segments.length === 0 ? (
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
            {segments.map((segment) => (
              <TranscriptSegment
                key={segment.id}
                segment={segment}
                isActive={segment.id === activeSegmentId}
              />
            ))}
            {/* Add some padding at the bottom for better scroll experience */}
            <div className="h-20" />
          </div>
        )}
      </div>

      {/* Status Bar */}
      {activeSegmentId && segments.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Playing segment{" "}
            {segments.findIndex((s) => s.id === activeSegmentId) + 1} of{" "}
            {segments.length}
          </p>
        </div>
      )}
    </div>
  );
};

export default TranscriptEditor;
