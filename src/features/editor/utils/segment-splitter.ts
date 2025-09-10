import { dispatch } from "@designcombo/events";
import { generateId } from "@designcombo/timeline";
import { ADD_AUDIO, ADD_VIDEO } from "@designcombo/state";
import { TranscriptSegment } from "../transcript/types";

export interface SegmentSplitOptions {
  autoSplit?: boolean;
  minSegmentLength?: number; // minimum segment length in ms
  mergeShortSegments?: boolean;
}

/**
 * Add media to timeline split by transcript segments
 */
export function addSegmentedMedia(
  upload: any,
  segments: TranscriptSegment[],
  options: SegmentSplitOptions = {}
) {
  const {
    minSegmentLength = 500, // 500ms minimum
    mergeShortSegments = false,
  } = options;

  const isAudio = upload.type?.startsWith("audio/") || upload.type === "audio";
  const isVideo = upload.type?.startsWith("video/") || upload.type === "video";

  if (!isAudio && !isVideo) {
    console.error("Upload is neither audio nor video:", upload.type);
    return;
  }

  // Process segments (merge short ones if needed)
  let processedSegments = [...segments];
  if (mergeShortSegments) {
    processedSegments = mergeShortSegmentsByLength(segments, minSegmentLength);
  }


  // Add each segment as a separate track item
  processedSegments.forEach((segment, index) => {
    const payload = {
      id: generateId(),
      type: isAudio ? "audio" : "video",
      details: {
        src: upload.metadata?.uploadedUrl || upload.url,
      },
      display: {
        from: segment.start, // Position on timeline
        to: segment.end,
      },
      trim: {
        from: segment.start, // Where to start in source file
        to: segment.end, // Where to end in source file
      },
      duration: segment.end - segment.start,
      metadata: {
        ...upload.metadata,
        segmentId: segment.id,
        segmentText: segment.text,
        segmentIndex: index,
        originalUploadId: upload.id,
      },
    };

    // Dispatch the appropriate add event
    if (isAudio) {
      dispatch(ADD_AUDIO, {
        payload,
        options: {},
      });
    } else if (isVideo) {
      dispatch(ADD_VIDEO, {
        payload: {
          ...payload,
          metadata: {
            ...payload.metadata,
            previewUrl: upload.metadata?.previewUrl || "",
          },
        },
        options: {
          resourceId: "main",
          scaleMode: "fit",
        },
      });
    }
  });
}

/**
 * Merge segments that are too short
 */
function mergeShortSegmentsByLength(
  segments: TranscriptSegment[],
  minLength: number
): TranscriptSegment[] {
  const merged: TranscriptSegment[] = [];
  let currentMerged: TranscriptSegment | null = null;

  for (const segment of segments) {
    const segmentLength = segment.end - segment.start;

    if (!currentMerged) {
      currentMerged = { ...segment };
    } else if (segmentLength < minLength) {
      // Merge with current
      currentMerged.end = segment.end;
      currentMerged.text += ` ${segment.text}`;
    } else {
      // Save current and start new
      if (currentMerged.end - currentMerged.start >= minLength) {
        merged.push(currentMerged);
        currentMerged = { ...segment };
      } else {
        // Current is also too short, keep merging
        currentMerged.end = segment.end;
        currentMerged.text += ` ${segment.text}`;
      }
    }
  }

  // Don't forget the last segment
  if (currentMerged) {
    merged.push(currentMerged);
  }

  return merged;
}

/**
 * Group segments by speaker
 */
export function groupSegmentsBySpeaker(
  segments: TranscriptSegment[]
): TranscriptSegment[] {
  const grouped: TranscriptSegment[] = [];
  let currentGroup: TranscriptSegment | null = null;

  for (const segment of segments) {
    if (!currentGroup || currentGroup.speaker_id !== segment.speaker_id) {
      // Start new group
      if (currentGroup) {
        grouped.push(currentGroup);
      }
      currentGroup = { ...segment };
    } else {
      // Continue current group
      currentGroup.end = segment.end;
      currentGroup.text += ` ${segment.text}`;
    }
  }

  // Add last group
  if (currentGroup) {
    grouped.push(currentGroup);
  }

  return grouped;
}

/**
 * Split segments by silence gaps
 */
export function splitSegmentsBySilence(
  segments: TranscriptSegment[],
  silenceThreshold = 1000 // 1 second
): TranscriptSegment[] {
  const result: TranscriptSegment[] = [];

  segments.forEach((segment, index) => {
    result.push(segment);

    // Check gap to next segment
    if (index < segments.length - 1) {
      const gap = segments[index + 1].start - segment.end;
      if (gap > silenceThreshold) {
        // Add a silence marker (optional)
      }
    }
  });

  return result;
}
