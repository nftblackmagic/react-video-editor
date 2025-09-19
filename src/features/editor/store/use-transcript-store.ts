import { create } from "zustand";
import { FullEDU, TranscriptSegment } from "../transcript/types";

interface TranscriptStore {
	// Source of truth
	fullEDUs: FullEDU[];

	// Active states
	activeEDUIndex: number | null;
	activeWordGlobalIndex: number | null;
	isManualSelection: boolean; // Flag to track manual selection

	// Cached computed properties
	_flatWordsCache: TranscriptSegment[] | null;
	_wordIndexMapCache: Map<
		number,
		{ eduIndex: number; wordIndex: number }
	> | null;

	// Getters for computed properties
	getFlatWords: () => TranscriptSegment[];
	getWordIndexMap: () => Map<number, { eduIndex: number; wordIndex: number }>;

	// Actions
	initEDUs: (edus: FullEDU[]) => void;
	setActiveEDUByTime: (currentTimeMs: number) => void;
	setActiveEDUByIndex: (index: number) => void;
	clearManualSelection: () => void;

	// Utilities
	getEDUAtTime: (timeMs: number) => FullEDU | null;
	getWordAtTime: (
		timeMs: number,
	) => { word: TranscriptSegment; eduIndex: number } | null;

	// Cache management
	invalidateCaches: () => void;
}

const useTranscriptStore = create<TranscriptStore>((set, get) => ({
	// Source of truth
	fullEDUs: [],

	// Active states
	activeEDUIndex: null,
	activeWordGlobalIndex: null,
	isManualSelection: false,

	// Cached computed properties
	_flatWordsCache: null,
	_wordIndexMapCache: null,

	// Getters for computed properties
	getFlatWords: () => {
		if (get()._flatWordsCache === null) {
			// Compute flat words from EDUs
			const flatWords: TranscriptSegment[] = [];
			for (const edu of get().fullEDUs) {
				if (edu.words && Array.isArray(edu.words)) {
					flatWords.push(...edu.words);
				}
			}
			set({ _flatWordsCache: flatWords });
		}
		return get()._flatWordsCache!;
	},

	getWordIndexMap: () => {
		if (get()._wordIndexMapCache === null) {
			const map = new Map<number, { eduIndex: number; wordIndex: number }>();
			let globalIndex = 0;

			get().fullEDUs.forEach((edu, eduIndex) => {
				if (edu.words && Array.isArray(edu.words)) {
					edu.words.forEach((word, wordIndex) => {
						map.set(globalIndex, { eduIndex, wordIndex });
						globalIndex++;
					});
				}
			});

			set({ _wordIndexMapCache: map });
		}
		return get()._wordIndexMapCache!;
	},

	// Actions
	initEDUs: (edus) => {
		set({
			fullEDUs: edus.sort((a, b) => a.edu_start - b.edu_start),
			_flatWordsCache: null,
			_wordIndexMapCache: null,
		});
	},

	setActiveEDUByTime: (currentTimeMs) => {
		// Skip time-based updates if there's an active manual selection
		if (get().isManualSelection) {
			return;
		}

		const edu = get().getEDUAtTime(currentTimeMs);
		const newActiveIndex = edu ? get().fullEDUs.indexOf(edu) : null;

		if (newActiveIndex !== get().activeEDUIndex) {
			set({ activeEDUIndex: newActiveIndex });
		}
	},

	setActiveEDUByIndex: (index) => {
		set({ activeEDUIndex: index, isManualSelection: true });

		// Clear manual selection flag after a short delay
		setTimeout(() => {
			set({ isManualSelection: false });
		}, 500);
	},

	clearManualSelection: () => {
		set({ isManualSelection: false });
	},

	getEDUAtTime: (timeMs) => {
		// Find EDU where time is within the range
		const edus = get().fullEDUs;

		// First, try to find an EDU that starts exactly at this time
		const exactStartMatch = edus.find((edu) => edu.edu_start === timeMs);
		if (exactStartMatch) return exactStartMatch;

		// Otherwise, find EDU where time is within the range (start inclusive, end exclusive)
		return (
			edus.find((edu) => timeMs >= edu.edu_start && timeMs < edu.edu_end) ||
			null
		);
	},

	getWordAtTime: (timeMs) => {
		// Find the specific word at this time
		const edus = get().fullEDUs;

		for (let eduIndex = 0; eduIndex < edus.length; eduIndex++) {
			const edu = edus[eduIndex];
			if (edu.words && Array.isArray(edu.words)) {
				for (const word of edu.words) {
					// Check if word is a TranscriptSegment with timing
					if (word.start !== undefined && word.end !== undefined) {
						if (timeMs >= word.start && timeMs < word.end) {
							return { word, eduIndex };
						}
					}
				}
			}
		}
		return null;
	},

	invalidateCaches: () => {
		set({
			_flatWordsCache: null,
			_wordIndexMapCache: null,
		});
	},
}));

export default useTranscriptStore;
