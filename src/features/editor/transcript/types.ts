// Re-export FullEDU from LLM types for easier imports
export type { FullEDU } from "@/lib/llm/types";

export interface TranscriptStyle {
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	color?: string;
	fontSize?: number;
	backgroundColor?: string;
	fontFamily?: string;
	textAlign?: "left" | "center" | "right";
}

// Keep TranscriptSegment as it's used for individual words within EDUs
export interface TranscriptSegment {
	id: string;
	text: string;
	type: string;
	start: number;
	end: number;
	speaker_id: string | null;
	logprob: number;
	characters: string | null;
	isActive?: boolean;
	style?: TranscriptStyle;
}

export interface TranscriptToolbarAction {
	type:
		| "bold"
		| "italic"
		| "underline"
		| "color"
		| "backgroundColor"
		| "fontSize"
		| "align";
	value?: string | number | boolean;
}

export interface TranscriptEditorProps {
	segments: TranscriptSegment[];
	activeSegmentId: string | null;
	editingSegmentId: string | null;
	onSegmentClick: (segmentId: string) => void;
	onSegmentEdit: (segmentId: string, text: string) => void;
	onSegmentStyleChange: (segmentId: string, style: TranscriptStyle) => void;
	onTimeChange: (segmentId: string, startTime: number, endTime: number) => void;
}

export interface TranscriptSegmentProps {
	segment: TranscriptSegment;
	isActive: boolean;
	isEditing: boolean;
	onEdit: (text: string) => void;
	onClick: () => void;
	onStartEdit: () => void;
	onEndEdit: () => void;
	onStyleChange: (style: TranscriptStyle) => void;
}

export interface TranscriptToolbarProps {
	currentStyle: TranscriptStyle;
	onStyleChange: (action: TranscriptToolbarAction) => void;
	disabled?: boolean;
}

export interface TimeRange {
	startTime: number;
	endTime: number;
}

export type FormatCommand =
	| "bold"
	| "italic"
	| "underline"
	| "strikeThrough"
	| "removeFormat";

export interface TranscriptSyncEvent {
	type: "select" | "update" | "sync";
	segmentId?: string;
	time?: number;
	data?: any;
}
