import { useEffect } from "react";
import { invokeAction } from "@/constants/actions";
import { useKeybindingsStore } from "@/store/use-keybindings-store";

export function useKeybindingsListener() {
	const { keybindings, getKeybindingString, keybindingsEnabled, isRecording } =
		useKeybindingsStore();

	useEffect(() => {
		const handleKeyDown = (ev: KeyboardEvent) => {
			if (!keybindingsEnabled) return;
			if (isRecording) return;

			const binding = getKeybindingString(ev);
			if (!binding) return;

			const boundAction = keybindings[binding];
			if (!boundAction) return;

			const activeElement = document.activeElement;
			const isTextInput =
				activeElement &&
				(activeElement.tagName === "INPUT" ||
					activeElement.tagName === "TEXTAREA" ||
					(activeElement as HTMLElement).isContentEditable);

			if (isTextInput) return;

			ev.preventDefault();

			let actionArgs: any;

			if (boundAction === "seek-forward") {
				actionArgs = { seconds: 1 };
			} else if (boundAction === "seek-backward") {
				actionArgs = { seconds: 1 };
			} else if (boundAction === "jump-forward") {
				actionArgs = { seconds: 5 };
			} else if (boundAction === "jump-backward") {
				actionArgs = { seconds: 5 };
			}

			invokeAction(boundAction, actionArgs, "keypress");
		};

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [keybindings, getKeybindingString, keybindingsEnabled, isRecording]);
}

export function useKeybindingDisabler() {
	const { disableKeybindings, enableKeybindings } = useKeybindingsStore();

	return {
		disableKeybindings,
		enableKeybindings,
	};
}

export const bindings = {};
