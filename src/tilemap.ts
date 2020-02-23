// Minimal support for orthogonal right-down order, base64 encoded tile data

import { loadXMLDocument, SpriteSheet, loadSpriteSheet, resolveRelativePath } from "./assets";

function stringAttr(el: Element, name: string, def = "") {
	return el.attributes.getNamedItem(name)?.textContent ?? def;
}

function intAttr(el: Element, name: string, def = 0) {
	const str = stringAttr(el, name);
	return str.length ? parseInt(str, 10) : def;
}

function forEachChildElement(el: Element, cb: (cel: Element) => void) {
	el.childNodes.forEach(node => {
		if (node.nodeType !== Node.ELEMENT_NODE) {
			return;
		}
		cb(node as Element);
	});
}

export const enum TileRot {
	None = 0,
	Diag = 1,
	Vert = 2,
	Horiz = 4
}

export interface Layer {
	id: number;
	name: string;
	properties: Record<string, string>;
}

export interface ObjectLayer extends Layer {
	type: "object";
	objects: string[];
}

export interface TileLayer extends Layer {
	type: "tile";
	width: number;
	height: number;
	tileRotations: Uint8Array;
	tileIDs: Uint32Array;
}

export type TMXLayer = ObjectLayer | TileLayer;

function readLayerProps(layerEl: Element): Layer {
	const id = intAttr(layerEl, "id");
	const name = stringAttr(layerEl, "name");
	const properties: Record<string, string> = {};

	forEachChildElement(layerEl, el => {
		if (el.nodeName === "properties") {
			forEachChildElement(el, prop => {
				const propName = stringAttr(prop, "name");
				const propVal = stringAttr(prop, "value");
				properties[propName] = propVal;
			});
		}
	});

	return {
		id,
		name,
		properties
	};
}

function loadObjectLayer(layerEl: Element): ObjectLayer {
	const layer = readLayerProps(layerEl);
	return {
		type: "object",
		...layer,
		objects: []
	};
}

function loadTileLayer(layerEl: Element): TileLayer {
	const layer = readLayerProps(layerEl);
	const width = intAttr(layerEl, "width");
	const height = intAttr(layerEl, "height");
	const compression = intAttr(layerEl, "compressionlevel", 0);
	let tileIDs: Uint32Array | undefined;
	let tileRotations: Uint8Array | undefined;

	if (compression > 0) {
		throw new Error("compressed layer data not supported");
	}

	forEachChildElement(layerEl, el => {
		if (el.nodeName === "data") {
			const dataStr = el.textContent || "";
			const enc = stringAttr(el, "encoding");
			if (enc === "base64") {
				const byteView = new Uint8Array(atob(dataStr).split("").map(c => { return c.charCodeAt(0); }));
				tileIDs = new Uint32Array(byteView.buffer);
			}
			else if (enc === "csv") {
				tileIDs = new Uint32Array(dataStr.split(",").map(s => parseInt(s.trim(), 10)));
			}
			else {
				throw new Error(`unknown layer data encoding: ${enc}`);
			}

			// extract rotation data into separate array, clearing the meta bits off of the tileID
			tileRotations = new Uint8Array(tileIDs.length);
			for (let off = 0; off < tileIDs.length; ++off) {
				const tile = tileIDs[off];
				tileRotations[off] = tile >>> 28;
				tileIDs[off] = tile & 0x1FFF_FFFF;
			}
		}
	});

	if (tileIDs && tileRotations) {
		return {
			type: "tile",
			...layer,
			width,
			height,
			tileIDs,
			tileRotations
		};
	}
	throw new Error("No layer data present in layer");
}

export interface TileSet extends SpriteSheet {
	name: string;
	firstGID: number;
}

async function loadTileSet(def: Element, ownerURL: string): Promise<TileSet> {
	const firstGID = intAttr(def, "firstgid");
	const source = stringAttr(def, "source");
	if (source) {
		ownerURL = resolveRelativePath(source, ownerURL);
		def = await loadXMLDocument(ownerURL);
	}
	const tileWidth = intAttr(def, "tilewidth");
	const tileHeight = intAttr(def, "tileheight");

	const image = def.firstElementChild;
	if (image && image.nodeName === "image") {
		const imageURL = stringAttr(image, "source");
		const sheet = await loadSpriteSheet(imageURL, ownerURL, tileWidth, tileHeight);
		return {
			...sheet,
			firstGID,
			name
		};
	}
	else {
		throw new Error("expected image as first child of tilset");
	}
}

export interface TMXMap {
	width: number;
	height: number;
	tileWidth: number;
	tileHeight: number;
	layers: TMXLayer[];
	tileSets: TileSet[];
}

export async function loadTMXMap(url: string): Promise<TMXMap> {
	const tileDoc = await loadXMLDocument(url);

	const width = intAttr(tileDoc, "width");
	const height = intAttr(tileDoc, "height");
	const tileWidth = intAttr(tileDoc, "tilewidth");
	const tileHeight = intAttr(tileDoc, "tileheight");
	const layers: TMXLayer[] = [];
	const tileSetLoads: Promise<TileSet>[] = [];

	forEachChildElement(tileDoc, el => {
		if (el.nodeName === "tileset") {
			tileSetLoads.push(loadTileSet(el, url));
		}
		else if (el.nodeName === "layer") {
			layers.push(loadTileLayer(el));
		}
		else if (el.nodeName === "objectgroup") {
			layers.push(loadObjectLayer(el));
		}
	});

	return {
		width,
		height,
		tileWidth,
		tileHeight,
		layers,
		tileSets: await Promise.all(tileSetLoads)
	};
}
