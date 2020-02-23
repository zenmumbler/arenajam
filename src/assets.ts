export function loadImage(url: string) {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		const image = new Image();
		image.onload = function() {
			resolve(image);
		};
		image.onerror = function() {
			reject(`Could not load image at ${url}`);
		};
		image.src = url;
	});
}

export async function loadImageData(fileName: string) {
	const image = await loadImage(fileName);
	const canvas = document.createElement("canvas");
	canvas.width = image.width;
	canvas.height = image.height;
	const ctx = canvas.getContext("2d")!;
	ctx.imageSmoothingEnabled = false;
	ctx.drawImage(image, 0, 0);
	return ctx.getImageData(0, 0, image.width, image.height);
}

type CanvasDrawable = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

export interface SpriteSheet {
	tileWidth: number;
	tileHeight: number;
	columns: number;
	rows: number;
	image: CanvasDrawable;
	hFlipImage: CanvasDrawable;
}

export interface AnimationFrame {
	tileIndex: number;
	duration: number;
}

export interface Animation {
	sheet: SpriteSheet;
	offsetX: number;
	offsetY: number;
	frames: AnimationFrame[];
}

export interface AnimationDesc {
	tileWidth: number;
	tileHeight: number;
	offsetX: number;
	offsetY: number;
	frames: AnimationFrame[];
}

function flipImageHoriz(image: CanvasDrawable) {
	const hc = document.createElement("canvas");
	hc.width = image.width as number;
	hc.height = image.height as number;
	const hctx = hc.getContext("2d")!;
	hctx.scale(-1, 1);
	hctx.drawImage(image, -image.width, 0);
	hctx.resetTransform();
	return hc;
}

export async function loadSpriteSheet(fileName: string, ownerURL: string, tileWidth: number, tileHeight: number): Promise<SpriteSheet> {
	const fullURL = resolveRelativePath(fileName, ownerURL);
	const image = await loadImage(fullURL);

	return {
		tileWidth,
		tileHeight,
		columns: (image.width / tileWidth) | 0,
		rows: (image.height / tileWidth) | 0,
		image,
		hFlipImage: flipImageHoriz(image)
	};
}

export async function loadAnimation(fileName: string, desc: AnimationDesc): Promise<Animation> {
	const sheet = await loadSpriteSheet(fileName, "", desc.tileWidth, desc.tileHeight);
	return {
		sheet,
		offsetX: desc.offsetX,
		offsetY: desc.offsetY,
		frames: desc.frames
	};
}

export async function loadXMLDocument(url: string) {
	const response = await fetch(url);
	const text = await response.text();
	const parser = new DOMParser();
	const doc = parser.parseFromString(text, "application/xml");
	return doc.firstElementChild!;
}

export function resolveRelativePath(relPath: string, basePath: string) {
	return (new URL(relPath, "file:///" + basePath)).pathname.slice(1);
}
