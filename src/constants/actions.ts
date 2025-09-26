import {
	useEffect,
	useRef,
	useState,
	useCallback,
	MutableRefObject,
} from "react";

class ActionEmitter {
	private listeners: Array<(actions: Action[]) => void> = [];

	subscribe(listener: (actions: Action[]) => void) {
		this.listeners.push(listener);
		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener);
		};
	}

	emit(actions: Action[]) {
		this.listeners.forEach((listener) => listener(actions));
	}
}

const actionEmitter = new ActionEmitter();

export type Action =
	| "toggle-play"
	| "stop-playback"
	| "seek-forward"
	| "seek-backward"
	| "frame-step-forward"
	| "frame-step-backward"
	| "jump-forward"
	| "jump-backward"
	| "goto-start"
	| "goto-end"
	| "split-element"
	| "delete-selected"
	| "select-all"
	| "duplicate-selected"
	| "toggle-snapping"
	| "undo"
	| "redo"
	| "copy-selected"
	| "paste-selected";

type ActionArgsMap = {
	"seek-forward": { seconds: number } | undefined;
	"seek-backward": { seconds: number } | undefined;
	"jump-forward": { seconds: number } | undefined;
	"jump-backward": { seconds: number } | undefined;
};

type KeysWithValueUndefined<T> = {
	[K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

export type ActionWithArgs = keyof ActionArgsMap;

export type ActionWithOptionalArgs =
	| ActionWithNoArgs
	| KeysWithValueUndefined<ActionArgsMap>;

export type ActionWithNoArgs = Exclude<Action, ActionWithArgs>;

type ArgOfHoppAction<A extends Action> = A extends ActionWithArgs
	? ActionArgsMap[A]
	: undefined;

type ActionFunc<A extends Action> = A extends ActionWithArgs
	? (arg: ArgOfHoppAction<A>, trigger?: InvocationTriggers) => void
	: (_?: undefined, trigger?: InvocationTriggers) => void;

type BoundActionList = {
	[A in Action]?: Array<ActionFunc<A>>;
};

const boundActions: BoundActionList = {};

let currentActiveActions: Action[] = [];

function updateActiveActions() {
	const newActions = Object.keys(boundActions) as Action[];
	currentActiveActions = newActions;
	actionEmitter.emit(newActions);
}

export function bindAction<A extends Action>(
	action: A,
	handler: ActionFunc<A>,
) {
	if (boundActions[action]) {
		boundActions[action]?.push(handler);
	} else {
		boundActions[action] = [handler] as any;
	}

	updateActiveActions();
}

export type InvocationTriggers = "keypress" | "mouseclick";

type InvokeActionFunc = {
	(
		action: ActionWithOptionalArgs,
		args?: undefined,
		trigger?: InvocationTriggers,
	): void;
	<A extends ActionWithArgs>(action: A, args: ActionArgsMap[A]): void;
};

export const invokeAction: InvokeActionFunc = <A extends Action>(
	action: A,
	args?: ArgOfHoppAction<A>,
	trigger?: InvocationTriggers,
) => {
	boundActions[action]?.forEach((handler) => (handler as any)(args, trigger));
};

export function unbindAction<A extends Action>(
	action: A,
	handler: ActionFunc<A>,
) {
	boundActions[action] = boundActions[action]?.filter(
		(x) => x !== handler,
	) as any;

	if (boundActions[action]?.length === 0) {
		delete boundActions[action];
	}

	updateActiveActions();
}

export function isActionBound(action: Action): boolean {
	return !!boundActions[action];
}

export function useActionHandler<A extends Action>(
	action: A,
	handler: ActionFunc<A>,
	isActive: MutableRefObject<boolean> | boolean | undefined,
) {
	const handlerRef = useRef(handler);
	const [isBound, setIsBound] = useState(false);

	useEffect(() => {
		handlerRef.current = handler;
	}, [handler]);

	const stableHandler = useCallback(
		(args: any, trigger?: InvocationTriggers) => {
			(handlerRef.current as any)(args, trigger);
		},
		[],
	) as ActionFunc<A>;

	useEffect(() => {
		const shouldBind =
			isActive === undefined ||
			(typeof isActive === "boolean" ? isActive : isActive.current);

		if (shouldBind && !isBound) {
			bindAction(action, stableHandler);
			setIsBound(true);
		} else if (!shouldBind && isBound) {
			unbindAction(action, stableHandler);
			setIsBound(false);
		}

		return () => {
			if (isBound) {
				unbindAction(action, stableHandler);
				setIsBound(false);
			}
		};
	}, [action, stableHandler, isActive, isBound]);

	useEffect(() => {
		if (isActive && typeof isActive === "object" && "current" in isActive) {
			const interval = setInterval(() => {
				const shouldBind = isActive.current;
				if (shouldBind !== isBound) {
					if (shouldBind) {
						bindAction(action, stableHandler);
					} else {
						unbindAction(action, stableHandler);
					}
					setIsBound(shouldBind);
				}
			}, 100);
			return () => clearInterval(interval);
		}
	}, [action, stableHandler, isActive, isBound]);
}

export function useActiveActions(): Action[] {
	const [activeActions, setActiveActions] = useState<Action[]>([]);

	useEffect(() => {
		setActiveActions(currentActiveActions);

		const unsubscribe = actionEmitter.subscribe(setActiveActions);
		return unsubscribe;
	}, []);

	return activeActions;
}

export function useIsActionBound(action: Action): boolean {
	const [isBound, setIsBound] = useState(() => isActionBound(action));

	useEffect(() => {
		const updateBoundState = () => {
			setIsBound(isActionBound(action));
		};

		updateBoundState();

		const unsubscribe = actionEmitter.subscribe(updateBoundState);
		return unsubscribe;
	}, [action]);

	return isBound;
}
