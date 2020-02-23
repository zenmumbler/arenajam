// ArenaJam
// (c) 2020 by Tobi Guse and Arthur Langereis

import { on, show, hide } from "./util";
import { Input } from "./input";
import { SpriteSheet } from "./assets";
import { TMXMap, loadTMXMap } from "./tilemap";
import { ArenaRender } from "./render";

let running = true;
let context: CanvasRenderingContext2D;
let map: TMXMap;
let render: ArenaRender;

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
	sheet: SpriteSheet;
	spriteEnabled: boolean;
	spriteTileX: number;
	spriteTileY: number;
}

function isSprite(o: any): o is Sprite {
	return o && typeof (o) === "object" && o.sheet && typeof o.spriteEnabled === "boolean" && typeof o.spriteTileX === "number" && typeof o.spriteTileY === "number";
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

class Player implements Entity, Actor, Positioned {
	name = "player";
	x = 0;
	y = 0;
	lastDir = "-";

	update() {
		let dir = "-";
		if (Input.left) {
			dir = "left";
		}
		else if (Input.right) {
			dir = "right";
		}
		else if (Input.up) {
			dir = "up";
		}
		else if (Input.down) {
			dir = "down";
		}
		if (dir !== this.lastDir) {
			document.querySelector("#dir")!.textContent = dir;
			this.lastDir = dir;
		}
	}
}

function frame() {
	Input.update();

	// update actors
	for (const [_, actor] of actors) {
		actor.update();
	}

	// draw bg layers
	const cw = context.canvas.width;
	const ch = context.canvas.height;
	// context.clearRect(0, 0, cw, ch);
	context.drawImage(render.bg, 0, 0, cw, ch);

	// draw sprites
	for (const [_, sprite] of sprites) {
		const dim = sprite.sheet.tileDim;
		context.drawImage(sprite.sheet.image, sprite.spriteTileX * dim, sprite.spriteTileY * dim, dim, dim, sprite.x, sprite.y, dim, dim);
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

	Input.onActiveChange = (newActive) => {
		running = newActive;
		if (running) {
			frame();
		}
	};

	map = await loadTMXMap("maps/arena.xml");
	console.info("Map", map);
	render = new ArenaRender(map);
	console.info("Render", render);

	addEntity(new Player());

	frame();
}

on(window, "load", init);
