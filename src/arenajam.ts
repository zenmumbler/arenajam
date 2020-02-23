// ArenaJam
// (c) 2020 by Tobi Guse and Arthur Langereis

import { on, show, hide } from "./util";
import { Input } from "./input";
import { SpriteSheet, Animation, AnimationFrame, loadAnimation } from "./assets";
import { TMXMap, loadTMXMap } from "./tilemap";
import { ArenaRender } from "./render";

let running = true;
let context: CanvasRenderingContext2D;
let map: TMXMap;
let render: ArenaRender;
const anims: Record<string, Animation> = {};

interface Entity {
	name: string;
}

interface Positioned {
	x: number;
	y: number;
}

function isPositioned(o: any): o is Positioned {
	return o && typeof(o) === "object" && typeof o.x === "number" && typeof o.y === "number";
}

interface Actor {
	update(): void;
}

function isActor(o: any): o is Actor {
	return o && typeof (o) === "object" && typeof o.update === "function";
}

interface Sprite {
	animation: Animation;
	frameStart: number;
	frameIndex: number;
}

function isSprite(o: any): o is Sprite {
	return o && typeof (o) === "object" && o.animation && typeof o.frameStart === "number" && typeof o.frameIndex === "number";
}

function startAnimation(spr: Sprite, anim: Animation) {
	spr.animation = anim;
	spr.frameStart = Date.now();
	spr.frameIndex = 0;
}

const sprites = new Map<string, Entity & Sprite & Positioned>();
const actors = new Map<string, Entity & Actor>();

function addEntity(ent: Entity) {
	if (isActor(ent)) {
		actors.set(ent.name, ent);
	}
	if (isSprite(ent) && isPositioned(ent)) {
		sprites.set(ent.name, ent);
	}
}

class Player implements Entity, Actor, Positioned, Sprite {
	name = "player";
	x = 0;
	y = 0;
	lastDir = "-";
	animation!: Animation;
	frameStart!: number;
	frameIndex!: number;

	constructor() {
		startAnimation(this, anims.walk);
		this.x = 100;
		this.y = 100;
	}

	update() {
		if (Input.left) {
			startAnimation(this, anims.attack);
		}
		else if (Input.right) {
			startAnimation(this, anims.walk);
		}
	}
}

function frame() {
	Input.update();
	const now = Date.now();

	// update actors
	for (const [_, actor] of actors) {
		actor.update();
	}

	// draw bg layers
	const cw = context.canvas.width;
	const ch = context.canvas.height;
	context.drawImage(render.bg, 0, 0, cw, ch);

	// draw sprites
	for (const [_, sprite] of sprites) {
		// update current frame
		let frame = sprite.animation.frames[sprite.frameIndex];
		if (now - sprite.frameStart > frame.duration) {
			sprite.frameStart += frame.duration;
			sprite.frameIndex = (sprite.frameIndex + 1) % sprite.animation.frames.length;
			frame = sprite.animation.frames[sprite.frameIndex];
		}

		const sheet = sprite.animation.sheet;
		const dim = sheet.tileDim;
		const tileX = frame.tileIndex % sheet.columns;
		const tileY = (frame.tileIndex / sheet.columns) | 0;
		context.drawImage(sheet.image, tileX * dim, tileY * dim, dim, dim, sprite.x * 2, sprite.y * 2, dim * 2, dim * 2);
	}

	// draw fg layers
	context.drawImage(render.fg, 0, 0, cw, ch);

	Input.keyboard.resetPerFrameData();
	if (running) {
		requestAnimationFrame(frame);
	}
}

async function init() {
	const canvas = document.querySelector("canvas")!;
	context = canvas.getContext("2d")!;
	context.imageSmoothingEnabled = false;
	let deactivationTime = 0;

	Input.onActiveChange = (newActive) => {
		running = newActive;
		if (running) {
			const deltaTime = Date.now() - deactivationTime;
			for (const [_, sprite] of sprites) {
				sprite.frameStart += deltaTime;
			}
			frame();
		}
		else {
			deactivationTime = Date.now();
		}
	};

	map = await loadTMXMap("maps/arena.xml");
	anims.walk = await loadAnimation("source-assets/sprites/walking-sprite.png", {
		tileDim: 64,
		frames: [
			{ tileIndex: 0, duration: 100 },
			{ tileIndex: 1, duration: 100 },
			{ tileIndex: 2, duration: 100 },
			{ tileIndex: 3, duration: 100 },
		]
	});
	anims.attack = await loadAnimation("source-assets/sprites/attack-sprite.png", {
		tileDim: 64,
		frames: [
			{ tileIndex: 0, duration: 100 },
			{ tileIndex: 1, duration: 100 },
			{ tileIndex: 2, duration: 100 },
			{ tileIndex: 3, duration: 100 },
		]
	});
	render = new ArenaRender(map);

	addEntity(new Player());

	frame();
}

on(window, "load", init);
