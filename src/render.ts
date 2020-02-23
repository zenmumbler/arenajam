import { TMXMap, TileLayer } from "./tilemap";

export class ArenaRender {
	map: TMXMap;
	width: number;
	height: number;
	bg: HTMLCanvasElement;
	fg: HTMLCanvasElement;

	tileForGID(gid: number): { src: CanvasImageSource, tx: number, ty: number, dim: number } {
		let tsi = this.map.tileSets.length - 1;
		while (tsi > 0) {
			if (gid >= this.map.tileSets[tsi].firstGID) {
				break;
			}
			tsi--;
		}

		const ts = this.map.tileSets[tsi];
		const tsti = gid - ts.firstGID;
		const tileY = (tsti / ts.columns) | 0;
		const tileX = tsti % ts.columns;
		return {
			src: ts.image,
			tx: tileX * ts.tileDim,
			ty: tileY * ts.tileDim,
			dim: ts.tileDim
		};
	}

	drawLayerInto(layer: TileLayer, ctx: CanvasRenderingContext2D) {
		const w = this.map.tileWidth;
		const h = this.map.tileHeight;

		let offset = 0;
		for (let y = 0; y < layer.height; ++y) {
			for (let x = 0; x < layer.width; ++x) {
				const gid = layer.tileIDs[offset];
				if (gid > 0) {
					const { src, tx, ty, dim } = this.tileForGID(gid);
					ctx.drawImage(src, tx, ty, dim, dim, x * w, y * w, dim, dim);
				}
				offset += 1;
			}
		}
	}

	constructor(map: TMXMap) {
		this.map = map;
		this.width = map.width * map.tileWidth;
		this.height = map.height * map.tileHeight;

		this.bg = document.createElement("canvas");
		this.bg.width = this.width;
		this.bg.height = this.height;
		this.fg = document.createElement("canvas");
		this.fg.width = this.width;
		this.fg.height = this.height;

		const bctx = this.bg.getContext("2d")!;
		const fctx = this.fg.getContext("2d")!;

		let isBG = true;

		for (const layer of map.layers) {
			if (layer.type === "object") {
				isBG = false;
			}
			else {
				this.drawLayerInto(layer, isBG ? bctx : fctx);
			}
		}
	}
}
