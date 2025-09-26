import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function isAppleDevice(): boolean {
	if (typeof navigator === "undefined") return false;
	return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

export function isDOMElement(
	target: EventTarget | null,
): target is HTMLElement {
	return target instanceof HTMLElement;
}

export function isTypableElement(element: HTMLElement): boolean {
	const tagName = element.tagName.toUpperCase();
	const isInput = tagName === "INPUT";
	const isTextarea = tagName === "TEXTAREA";
	const isContentEditable = element.isContentEditable;
	const isSelect = tagName === "SELECT";

	if (isInput) {
		const inputType = (element as HTMLInputElement).type;
		const nonTypableInputTypes = [
			"checkbox",
			"radio",
			"submit",
			"button",
			"file",
			"image",
		];
		return !nonTypableInputTypes.includes(inputType);
	}

	return isTextarea || isContentEditable || isSelect;
}
