/* eslint-disable @typescript-eslint/no-var-requires */
import type { Readable, Transform, TransformCallback } from "stream";
import type File from "vinyl";
import Quilt, { IQuiltOptions } from "./Quilt";
import Warp from "./Warp";

const nodeMode = typeof require !== "undefined";
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires,  @typescript-eslint/no-unsafe-assignment
const ExtensionClass = (nodeMode ? require("stream").Transform : TransformStream) as new (transformer?: Transformer) => Transform & TransformStream;

export interface IQuiltFileTransformerOptions extends IQuiltOptions {
	/** @default true */
	types?: boolean;
	/** By default, uses the same directory as the input file */
	outTypes?: string;
	/** @default 16 */
	highWaterMark?: number;
	encoding?: string;
}

export default class QuiltTransformer extends ExtensionClass {

	public static stream (source: string, warps?: Warp[]): Transform | ReadableStream<any>;
	public static stream (source: string, options?: IQuiltOptions, warps?: Warp[]): Transform | ReadableStream<any>;
	public static stream (source: string, options?: IQuiltOptions | Warp[], warps?: Warp[]) {
		if (Array.isArray(options))
			warps = options, options = undefined;

		if (nodeMode) {
			const { Readable } = require("stream") as typeof import("stream");
			return Readable.from([source])
				.pipe(new QuiltTransformer(options, warps) as any as Transform);
		}

		return new ReadableStream({
			start: controller => {
				controller.enqueue(source);
				controller.close();
			},
		})
			.pipeThrough(new QuiltTransformer({}, warps) as any as TransformStream);
	}

	public static create (warps?: Warp[]): QuiltTransformer;
	public static create (options?: IQuiltOptions, warps?: Warp[]): QuiltTransformer;
	public static create (options?: IQuiltOptions | Warp[], warps?: Warp[]) {
		if (Array.isArray(options))
			warps = options, options = undefined;
		return new QuiltTransformer(options, warps);
	}

	public static createFileTransformer (warps?: Warp[]): Transform;
	public static createFileTransformer (options?: IQuiltFileTransformerOptions, warps?: Warp[]): Transform;
	public static createFileTransformer (opts?: IQuiltFileTransformerOptions | Warp[], warps?: Warp[]) {
		if (!nodeMode)
			throw new Error("A quilt file transformer is only supported in node.js");

		if (Array.isArray(opts))
			warps = opts, opts = undefined;

		const options = opts;

		const { Transform, Readable } = require("stream") as typeof import("stream");

		const transform = new Transform({ objectMode: true, highWaterMark: options?.highWaterMark ?? 16 }); // using value from through2 idk make an issue if this is bad
		transform._transform = (file: File, enc, cb) => {
			const contentsStream = file.isBuffer() ? Readable.from(file.contents.toString("utf8")) : file.contents as NodeJS.ReadableStream;
			if (!contentsStream)
				file.contents = null;

			else {
				const quilt = new QuiltTransformer(options, warps);
				if (options?.types !== false) {
					// eslint-disable-next-line @typescript-eslint/no-var-requires
					const path = require("path") as typeof import("path");
					const fs = require("fs") as typeof import("fs");
					const outTypes = path.resolve(options?.outTypes ?? file.dirname);
					const filename = file.basename.slice(0, -file.extname.length);
					quilt.definitions.pipe(fs.createWriteStream(path.join(outTypes, `${filename}.d.ts`)));
				}

				file.extname = ".js";
				file.contents = contentsStream.pipe(quilt);
			}

			cb(null, file);
		};

		return transform;
	}

	private readonly quilt: Quilt;

	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires, @typescript-eslint/no-empty-function
	public readonly definitions: Readable & ReadableStream;
	public readonly errors: Error[];

	private constructor (options?: IQuiltOptions, warps?: Warp[]) {
		let definitionsController!: ReadableStreamController<any>;
		let controller!: TransformStreamDefaultController<any>;

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires, @typescript-eslint/no-empty-function
		const definitions = (nodeMode ? new class extends (require("stream").Readable as typeof import("stream").Readable) { override _read () { } }
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			: new ReadableStream({ start: controller => { definitionsController = controller; } })) as any;

		const errors: Error[] = [];
		const quilt = new Quilt(options, warps)
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
			.onScript(chunk => nodeMode ? this.push(chunk) : controller.enqueue(chunk))
			.onDefinitions(chunk => nodeMode ? (this.definitions as Readable).push(chunk) : definitionsController.enqueue(chunk))
			.onError(error => errors.push(error));

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		super(...nodeMode ? [] : [{
			start: (c) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				controller = c;
				quilt.start();
			},
			transform: (chunk) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
				quilt.transform(chunk.toString());
			},
			flush: () => {
				quilt.complete();
				definitionsController.close();
				for (const error of errors)
					controller.error(error);
			},
		} as Transformer]);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		this.definitions = definitions;
		this.errors = errors;

		if (nodeMode) {
			this.quilt = quilt;
			this.quilt.start();
		}
	}

	public override _transform (chunk: Buffer, enc: string, cb: TransformCallback) {
		this.quilt.transform(chunk.toString());
		cb();
	}

	public override _flush (cb: TransformCallback) {
		this.quilt.complete();
		for (const error of this.errors)
			this.emit("error", error);
		(this.definitions as Readable).destroy();
		cb(this.errors.length ? new Error(`${this.errors.length} errors`) : undefined);
	}
}
