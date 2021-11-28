import { Readable, Transform, TransformCallback } from "stream";
import Quilt from "./Quilt";
import Warp from "./Warp";

const nodeMode = typeof TransformStream === "undefined";
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires,  @typescript-eslint/no-unsafe-assignment
const ExtensionClass = (nodeMode ? require("stream").Transform : TransformStream) as new (transformer?: Transformer) => Transform & TransformStream;

export default class QuiltTransformer extends ExtensionClass {

	public static stream (source: string, warps?: Warp[]) {
		if (nodeMode)
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			return (require("stream") as typeof import("stream")).Readable.from([source])
				.pipe(new QuiltTransformer(warps) as any as Transform);
		else
			return new ReadableStream({
				start: controller => {
					controller.enqueue(source);
					controller.close();
				},
			})
				.pipeThrough(new QuiltTransformer(warps) as any as TransformStream);
	}

	public static create (warps?: Warp[]) {
		return new QuiltTransformer(warps);
	}

	private readonly quilt: Quilt;

	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires, @typescript-eslint/no-empty-function
	public readonly definitions: Readable & ReadableStream;

	private constructor (warps?: Warp[]) {
		let definitionsController!: ReadableStreamController<any>;
		let controller!: TransformStreamDefaultController<any>;

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires, @typescript-eslint/no-empty-function
		const definitions = (nodeMode ? new class extends (require("stream").Readable as typeof import("stream").Readable) { override _read () { } }
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			: new ReadableStream({ start: controller => { definitionsController = controller; } })) as any;

		const quilt = new Quilt(warps)
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
			.onScript(chunk => nodeMode ? this.push(chunk) : controller.enqueue(chunk))
			.onDefinitions(chunk => nodeMode ? (this.definitions as Readable).push(chunk) : definitionsController.enqueue(chunk));

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
			},
		} as Transformer]);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		this.definitions = definitions;

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
		(this.definitions as Readable).destroy();
		cb();
	}
}
