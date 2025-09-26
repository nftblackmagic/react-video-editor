"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ActionWithOptionalArgs } from "@/constants/actions";
import { isAppleDevice, isDOMElement, isTypableElement } from "@/lib/utils";
import { KeybindingConfig, ShortcutKey } from "@/types/keybinding";

export const defaultKeybindings: KeybindingConfig = {
	space: "toggle-play",
	j: "seek-backward",
	k: "toggle-play",
	l: "seek-forward",
	left: "frame-step-backward",
	right: "frame-step-forward",
	"shift+left": "jump-backward",
	"shift+right": "jump-forward",
	home: "goto-start",
	enter: "goto-start",
	end: "goto-end",
	s: "split-element",
	n: "toggle-snapping",
	"ctrl+a": "select-all",
	"ctrl+d": "duplicate-selected",
	"ctrl+c": "copy-selected",
	"ctrl+v": "paste-selected",
	"ctrl+z": "undo",
	"ctrl+shift+z": "redo",
	"ctrl+y": "redo",
	delete: "delete-selected",
	backspace: "delete-selected",
};

export interface KeybindingConflict {
	key: ShortcutKey;
	existingAction: ActionWithOptionalArgs;
	newAction: ActionWithOptionalArgs;
}

interface KeybindingsState {
	keybindings: KeybindingConfig;
	isCustomized: boolean;
	keybindingsEnabled: boolean;
	isRecording: boolean;

	updateKeybinding: (key: ShortcutKey, action: ActionWithOptionalArgs) => void;
	removeKeybinding: (key: ShortcutKey) => void;
	resetToDefaults: () => void;
	importKeybindings: (config: KeybindingConfig) => void;
	exportKeybindings: () => KeybindingConfig;
	enableKeybindings: () => void;
	disableKeybindings: () => void;
	setIsRecording: (isRecording: boolean) => void;

	validateKeybinding: (
		key: ShortcutKey,
		action: ActionWithOptionalArgs,
	) => KeybindingConflict | null;
	getKeybindingsForAction: (action: ActionWithOptionalArgs) => ShortcutKey[];

	getKeybindingString: (ev: KeyboardEvent) => ShortcutKey | null;
}

export const useKeybindingsStore = create<KeybindingsState>()(
	persist(
		(set, get) => ({
			keybindings: { ...defaultKeybindings },
			isCustomized: false,
			keybindingsEnabled: true,
			isRecording: false,

			updateKeybinding: (key: ShortcutKey, action: ActionWithOptionalArgs) => {
				set((state) => {
					const newKeybindings = { ...state.keybindings };
					newKeybindings[key] = action;

					return {
						keybindings: newKeybindings,
						isCustomized: true,
					};
				});
			},

			removeKeybinding: (key: ShortcutKey) => {
				set((state) => {
					const newKeybindings = { ...state.keybindings };
					delete newKeybindings[key];

					return {
						keybindings: newKeybindings,
						isCustomized: true,
					};
				});
			},

			resetToDefaults: () => {
				set({
					keybindings: { ...defaultKeybindings },
					isCustomized: false,
				});
			},

			enableKeybindings: () => {
				set({ keybindingsEnabled: true });
			},

			disableKeybindings: () => {
				set({ keybindingsEnabled: false });
			},

			importKeybindings: (config: KeybindingConfig) => {
				for (const [key, action] of Object.entries(config)) {
					if (typeof key !== "string" || key.length === 0) {
						throw new Error(`Invalid key format: ${key}`);
					}
				}
				set({
					keybindings: { ...config },
					isCustomized: true,
				});
			},

			exportKeybindings: () => {
				return get().keybindings;
			},

			validateKeybinding: (
				key: ShortcutKey,
				action: ActionWithOptionalArgs,
			) => {
				const { keybindings } = get();
				const existingAction = keybindings[key];

				if (existingAction && existingAction !== action) {
					return {
						key,
						existingAction,
						newAction: action,
					};
				}

				return null;
			},
			setIsRecording: (isRecording: boolean) => {
				set({ isRecording });
			},

			getKeybindingsForAction: (action: ActionWithOptionalArgs) => {
				const { keybindings } = get();
				return Object.keys(keybindings).filter(
					(key) => keybindings[key as ShortcutKey] === action,
				) as ShortcutKey[];
			},

			getKeybindingString: (ev: KeyboardEvent) => {
				return generateKeybindingString(ev) as ShortcutKey | null;
			},
		}),
		{
			name: "opencut-keybindings",
			version: 2,
		},
	),
);

function generateKeybindingString(ev: KeyboardEvent): ShortcutKey | null {
	const target = ev.target;

	const modifierKey = getActiveModifier(ev);

	const key = getPressedKey(ev);
	if (!key) return null;

	if (modifierKey) {
		if (
			modifierKey === "shift" &&
			isDOMElement(target) &&
			isTypableElement(target)
		) {
			return null;
		}

		return `${modifierKey}+${key}` as ShortcutKey;
	}

	if (isDOMElement(target) && isTypableElement(target)) return null;

	return `${key}` as ShortcutKey;
}

function getPressedKey(ev: KeyboardEvent): string | null {
	const key = (ev.key ?? "").toLowerCase();
	const code = ev.code ?? "";

	if (code === "Space" || key === " " || key === "spacebar" || key === "space")
		return "space";

	if (key.startsWith("arrow")) {
		return key.slice(5);
	}

	if (key === "tab") return "tab";
	if (key === "home") return "home";
	if (key === "end") return "end";
	if (key === "delete") return "delete";
	if (key === "backspace") return "backspace";

	if (code.startsWith("Key")) {
		const letter = code.slice(3).toLowerCase();
		if (letter.length === 1 && letter >= "a" && letter <= "z") {
			return letter;
		}
	}

	if (code.startsWith("Digit")) {
		const digit = code.slice(5);
		if (digit.length === 1 && digit >= "0" && digit <= "9") {
			return digit;
		}
	}

	const isDigit = key.length === 1 && key >= "0" && key <= "9";
	if (isDigit) return key;

	if (key === "/" || key === "." || key === "enter") return key;

	return null;
}

function getActiveModifier(ev: KeyboardEvent): string | null {
	const modifierKeys = {
		ctrl: isAppleDevice() ? ev.metaKey : ev.ctrlKey,
		alt: ev.altKey,
		shift: ev.shiftKey,
	};

	const activeModifier = Object.keys(modifierKeys)
		.filter((key) => modifierKeys[key as keyof typeof modifierKeys])
		.join("+");

	return activeModifier === "" ? null : activeModifier;
}
