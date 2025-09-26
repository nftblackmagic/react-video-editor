import { ActionWithOptionalArgs } from "@/constants/actions";

export type ModifierKeys =
	| "ctrl"
	| "alt"
	| "shift"
	| "ctrl+shift"
	| "alt+shift"
	| "ctrl+alt"
	| "ctrl+alt+shift";

export type Key =
	| "a"
	| "b"
	| "c"
	| "d"
	| "e"
	| "f"
	| "g"
	| "h"
	| "i"
	| "j"
	| "k"
	| "l"
	| "m"
	| "n"
	| "o"
	| "p"
	| "q"
	| "r"
	| "s"
	| "t"
	| "u"
	| "v"
	| "w"
	| "x"
	| "y"
	| "z"
	| "0"
	| "1"
	| "2"
	| "3"
	| "4"
	| "5"
	| "6"
	| "7"
	| "8"
	| "9"
	| "up"
	| "down"
	| "left"
	| "right"
	| "/"
	| "?"
	| "."
	| "enter"
	| "tab"
	| "space"
	| "escape"
	| "esc"
	| "backspace"
	| "delete"
	| "home"
	| "end";

export type ModifierBasedShortcutKey = `${ModifierKeys}+${Key}`;
export type SingleCharacterShortcutKey = `${Key}`;

export type ShortcutKey = ModifierBasedShortcutKey | SingleCharacterShortcutKey;

export type KeybindingConfig = {
	[key in ShortcutKey]?: ActionWithOptionalArgs;
};
