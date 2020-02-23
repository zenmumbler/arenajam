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

export interface SpriteSheet {
	tileDim: number;
	columns: number;
	rows: number;
	image: CanvasImageSource;
}

export async function loadSpriteSheet(fileName: string, ownerURL: string, tileDim: number): Promise<SpriteSheet> {
	const fullURL = resolveRelativePath(fileName, ownerURL);
	const image = await loadImage(fullURL);
	return {
		tileDim,
		columns: (image.width / tileDim) | 0,
		rows: (image.height / tileDim) | 0,
		image
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
