import { create } from "zustand";
import { TranscriptSegment } from "../transcript/types";

interface TranscriptStore {
  segments: TranscriptSegment[];
  activeSegmentId: string | null;
  isManualSelection: boolean; // Flag to track manual selection

  // Actions
  initSegments: (segments: TranscriptSegment[]) => void;
  setActiveSegmentByTime: (currentTimeMs: number) => void;
  setActiveSegmentById: (segmentId: string) => void;
  clearManualSelection: () => void;

  // Utilities
  getSegmentAtTime: (timeMs: number) => TranscriptSegment | null;
}

const useTranscriptStore = create<TranscriptStore>((set, get) => ({
  segments: [],
  activeSegmentId: null,
  isManualSelection: false,

  initSegments: (segments) => {
    set({ segments: segments.sort((a, b) => a.start - b.start) });
  },

  setActiveSegmentByTime: (currentTimeMs) => {
    // Skip time-based updates if there's an active manual selection
    if (get().isManualSelection) {
      return;
    }
    
    const segment = get().getSegmentAtTime(currentTimeMs);
    const newActiveId = segment?.id || null;

    if (newActiveId !== get().activeSegmentId) {
      set({ activeSegmentId: newActiveId });
    }
  },

  setActiveSegmentById: (segmentId) => {
    set({ activeSegmentId: segmentId, isManualSelection: true });
    
    // Clear manual selection flag after a short delay
    setTimeout(() => {
      set({ isManualSelection: false });
    }, 500);
  },
  
  clearManualSelection: () => {
    set({ isManualSelection: false });
  },

  getSegmentAtTime: (timeMs) => {
    // Find segment where time is within the range
    // For overlapping segments or boundary cases, prefer the segment that starts at this time
    const segments = get().segments;
    
    // First, try to find a segment that starts exactly at this time
    const exactStartMatch = segments.find((seg) => seg.start === timeMs);
    if (exactStartMatch) return exactStartMatch;
    
    // Otherwise, find segment where time is within the range (start inclusive, end exclusive)
    return segments.find((seg) => timeMs >= seg.start && timeMs < seg.end) || null;
  },
}));

export default useTranscriptStore;
