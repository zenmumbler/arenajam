// Minimal support for orthogonal right-down order, base64 encoded tile data

import { loadXMLDocument, SpriteSheet, loadSpriteSheet, resolveRelativePath } from "./assets";

function stringAttr(el: Element, name: string, def = "") {
	return el.attributes.getNamedItem(name)?.textContent ?? def;
}

function intAttr(el: Element, name: string, def = 0) {
	const str = stringAttr(el, name);
	return str.length ? parseInt(str, 10) : def;
}

export const enum TileRot {
	None = 0,
	Diag = 1,
	Vert = 2,
	Horiz = 4
}

export interface TMXLayer {
	name: string;
	width: number;
	height: number;
	properties: Record<string, string>;
	tileRotations: Uint8Array;
	tileIDs: Uint32Array;
}

/*
class TMXLayer {
	tileAt(col: number, row: number) {
		if (row < 0 || col < 0 || row >= this.height || col >= this.width) {
			return -1;
		}
		return this.tileIDs[(row * this.width) + col];
	}

	setTileAt(col: number, row: number, tile: number) {
		if (row < 0 || col < 0 || row >= this.height || col >= this.width) {
			return;
		}
		this.tileIDs[(row * this.width) + col] = tile;
	}

	eachTile(callback: (row: number, col: number, tile: number, rot: TileRot) => void) {
		let off = 0;
		for (let row = 0; row < this.height; ++row) {
			for (let col = 0; col < this.width; ++col) {
				if (this.tileIDs[off]) {
					callback(row, col, this.tileIDs[off], this.tileRotations[off]);
				}
				++off;
			}
		}
	}
}
*/

function loadLayer(layerEl: Element): TMXLayer {
	const width = intAttr(layerEl, "width");
	const height = intAttr(layerEl, "height");
	const name = stringAttr(layerEl, "name");
	const compression = intAttr(layerEl, "compressionlevel", 0);
	const properties: Record<string, string> = {};
	let tileIDs: Uint32Array | undefined;
	let tileRotations: Uint8Array | undefined;

	if (compression > 0) {
		throw new Error("compressed layer data not supported");
	}

	layerEl.childNodes.forEach(node => {
		if (node.nodeType !== Node.ELEMENT_NODE) {
			return;
		}
		const el = node as Element;
		if (el.nodeName === "properties") {
			el.childNodes.forEach(prop => {
				if (prop.nodeType !== Node.ELEMENT_NODE) {
					return;
				}
				const propEl = prop as Element;
				const propName = stringAttr(propEl, "name");
				const propVal = stringAttr(propEl, "value");
				properties[propName] = propVal;
			});
		}
		else if (el.nodeName === "data") {
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
			width,
			height,
			name,
			properties,
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
	const tileDim = intAttr(def, "tilewidth");

	const image = def.firstElementChild;
	if (image && image.nodeName === "image") {
		const imageURL = stringAttr(image, "source");
		const sheet = await loadSpriteSheet(imageURL, ownerURL, tileDim);
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
	layers: TMXLayer[];
	tileSets: TileSet[];
	width: number;
	height: number;
}

export async function loadTMXMap(url: string): Promise<TMXMap> {
	const tileDoc = await loadXMLDocument(url);

	const width = intAttr(tileDoc, "width");
	const height = intAttr(tileDoc, "height");
	const layers: TMXLayer[] = [];
	const tileSetLoads: Promise<TileSet>[] = [];

	tileDoc.childNodes.forEach(node => {
		if (node.nodeType !== Node.ELEMENT_NODE) {
			return;
		}
		const el = node as Element;
		if (node.nodeName === "tileset") {
			tileSetLoads.push(loadTileSet(el, url));
		}
		if (node.nodeName === "layer") {
			layers.push(loadLayer(el));
		}
	});

	return {
		width,
		height,
		layers,
		tileSets: await Promise.all(tileSetLoads)
	};
}
