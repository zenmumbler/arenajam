import { UInt8, Double } from "stardazed/core";
import { StructOfArrays, StructField } from "stardazed/container";

export interface ButtonState {
	down: boolean;
	halfTransitionCount: number;
}

export enum Key {
	NONE = 0,

	UP = 38,
	DOWN = 40,
	LEFT = 37,
	RIGHT = 39,

	BACKSPACE = 8,
	TAB = 9,
	RETURN = 13,
	ESC = 27,
	SPACE = 32,

	PAGEUP = 33,
	PAGEDOWN = 34,
	HOME = 36,
	END = 35,
	DELETE = 46,

	// charCode equals keyCode for A-Z
	A = "A".charCodeAt(0), B = "B".charCodeAt(0), C = "C".charCodeAt(0), D = "D".charCodeAt(0),
	E = "E".charCodeAt(0), F = "F".charCodeAt(0), G = "G".charCodeAt(0), H = "H".charCodeAt(0),
	I = "I".charCodeAt(0), J = "J".charCodeAt(0), K = "K".charCodeAt(0), L = "L".charCodeAt(0),
	M = "M".charCodeAt(0), N = "N".charCodeAt(0), O = "O".charCodeAt(0), P = "P".charCodeAt(0),
	Q = "Q".charCodeAt(0), R = "R".charCodeAt(0), S = "S".charCodeAt(0), T = "T".charCodeAt(0),
	U = "U".charCodeAt(0), V = "V".charCodeAt(0), W = "W".charCodeAt(0), X = "X".charCodeAt(0),
	Y = "Y".charCodeAt(0), Z = "Z".charCodeAt(0)
}

const enum StdButton {
	FACE_DOWN = 0,
	FACE_RIGHT = 1,
	FACE_LEFT = 2,
	FACE_UP = 3,

	L1 = 4,
	R1 = 5,
	L2 = 6,
	R2 = 7,

	META = 8,
	OPTIONS = 9,

	L3 = 10,
	R3 = 11,

	DP_UP = 12,
	DP_DOWN = 13,
	DP_LEFT = 14,
	DP_RIGHT = 15,

	HOME = 16,
	EXTRA = 17
}


export interface Keyboard {
	keyState(kc: Key): ButtonState;
	down(kc: Key): boolean;
	pressed(kc: Key): boolean;
	released(kc: Key): boolean;
	halfTransitions(kc: Key): number;

	reset(): void;
	resetPerFrameData(): void;
}


class KeyboardImpl implements Keyboard {
	private keyData_: StructOfArrays;
	private downBase_: Uint8Array;
	private halfTransBase_: Uint8Array;
	private lastEventBase_: Float64Array;

	constructor() {
		const fields: StructField[] = [
			{ type: UInt8, width: 1 },  // down
			{ type: UInt8, width: 1 },  // halfTransitionCount
			{ type: Double, width: 1 }, // lastEvent
		];
		this.keyData_ = new StructOfArrays(fields, 128);
		this.downBase_ = this.keyData_.fieldArrayView(0) as Uint8Array;
		this.halfTransBase_ = this.keyData_.fieldArrayView(1) as Uint8Array;
		this.lastEventBase_ = this.keyData_.fieldArrayView(2) as Float64Array;

		// The extra check in the key handlers for the timeStamp was added
		// after I encountered a rare, but frequently enough occurring bug
		// where, when a key is pressed for a longer time so that repeat
		// keydown events are fired, _very_ occasionally the last keydown
		// would be fired with the same timeStamp as the keyup event but
		// the event handler for that last down event was fired AFTER the
		// keyup event handler, causing the key to appear to be "stuck".
		window.addEventListener("keydown", evt => {
			const lastEvent = this.lastEventBase_[evt.keyCode];
			const wasDown = this.downBase_[evt.keyCode];

			if (lastEvent < evt.timeStamp) {
				if (!wasDown) { // ignore key repeat events
					this.downBase_[evt.keyCode] = 1;
					++this.halfTransBase_[evt.keyCode];
				}
				this.lastEventBase_[evt.keyCode] = evt.timeStamp;
			}

			if (!evt.metaKey) {
				evt.preventDefault();
			}
		}, true);

		window.addEventListener("keyup", evt => {
			this.downBase_[evt.keyCode] = 0;
			++this.halfTransBase_[evt.keyCode];
			this.lastEventBase_[evt.keyCode] = evt.timeStamp;

			evt.preventDefault();
		}, true);
	}

	keyState(kc: Key): ButtonState {
		return {
			down: !!this.downBase_[kc],
			halfTransitionCount: this.halfTransBase_[kc]
		};
	}

	down(kc: Key): boolean {
		return !!this.downBase_[kc];
	}

	halfTransitions(kc: Key): number {
		return this.halfTransBase_[kc];
	}

	pressed(kc: Key): boolean {
		return this.downBase_[kc] ? (this.halfTransBase_[kc] > 0) : false;
	}

	released(kc: Key): boolean {
		return !this.downBase_[kc] ? (this.halfTransBase_[kc] > 0) : false;
	}

	reset() {
		this.keyData_.data.fill(0);
	}

	resetPerFrameData() {
		this.halfTransBase_.fill(0);
	}
}


class InputHandler {
	keyboard: Keyboard = new KeyboardImpl();
	gamepadIndex = -1;
	gamepad: Gamepad | undefined;

	constructor() {
		window.onblur = () => {
			this.active = false;
			if (this.onActiveChange) {
				this.onActiveChange(this.active);
			}
		};
		window.onfocus = () => {
			this.active = true;
			if (this.onActiveChange) {
				this.onActiveChange(this.active);
			}
		};

		window.addEventListener("gamepadconnected", (e) => {
			const gp = navigator.getGamepads()[(e as GamepadEvent).gamepad.index]!;
			console.info("GAMEPAD!", gp);
			if (gp.mapping === "standard") {
				console.info("setting default gamepad");
				this.gamepadIndex = gp.index;
			}
		});
	}

	update() {
		if (this.gamepadIndex > -1) {
			this.gamepad = navigator.getGamepads()[this.gamepadIndex]!;
		}
	}

	get left() {
		let l = this.keyboard.down(Key.LEFT);
		if (this.gamepad) {
			l = l || this.gamepad.buttons[StdButton.DP_LEFT].pressed;
		}
		return l;
	}

	get right() {
		let r = this.keyboard.down(Key.RIGHT);
		if (this.gamepad) {
			r = r || this.gamepad.buttons[StdButton.DP_RIGHT].pressed;
		}
		return r;
	}

	get up() {
		let u = this.keyboard.down(Key.UP);
		if (this.gamepad) {
			u = u || this.gamepad.buttons[StdButton.DP_UP].pressed;
		}
		return u;
	}

	get down() {
		let d = this.keyboard.down(Key.DOWN);
		if (this.gamepad) {
			d = d || this.gamepad.buttons[StdButton.DP_DOWN].pressed;
		}
		return d;
	}

	onActiveChange: ((active: boolean) => void) | undefined;
	active = true;
}

export const Input = new InputHandler();
