// ArenaJam
// (c) 2020 by Tobi Guse and Arthur Langereis

import { on, show, hide } from "./util";
import { Input } from "./input";
import { SpriteSheet } from "./assets";
import { TMXMap, loadTMXMap } from "./tilemap";

let running = true;
let context: CanvasRenderingContext2D;
let map: TMXMap;

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

	update() {
		//
	}
}

function frame() {
	// update actors
	for (const [_, actor] of actors) {
		actor.update();
	}

	// draw bg layers
	context.clearRect(0, 0, context.canvas.width, context.canvas.height);

	// draw sprites
	for (const [_, sprite] of sprites) {
		const dim = sprite.sheet.tileDim;
		context.drawImage(sprite.sheet.image, sprite.spriteTileX * dim, sprite.spriteTileY * dim, dim, dim, sprite.x, sprite.y, dim, dim);
	}

	// draw fg layers

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

	addEntity(new Player());

	frame();
}

on(window, "load", init);
