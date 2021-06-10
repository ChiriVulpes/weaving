import { Readable, Transform, TransformCallback } from "stream";
import Quilt from "./Quilt";
import Warp from "./Warp";

export default class QuiltBuilderNode extends Transform {

	public static stream (source: string, warps?: Warp[]) {
		return Readable.from([source])
			.pipe(new QuiltBuilderNode(warps));
	}

	private readonly quilt: Quilt;

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public readonly definitions = new class extends Readable { override _read () { } };

	public constructor (warps?: Warp[]) {
		super();
		this.quilt = new Quilt(warps)
			.onScript(chunk => this.push(chunk))
			.onDefinitions(chunk => this.definitions.push(chunk))
			.start();
	}

	public override _transform (chunk: Buffer, enc: string, cb: TransformCallback) {
		this.quilt.transform(chunk.toString());
		cb();
	}

	public override _flush (cb: TransformCallback) {
		this.quilt.complete();
		this.definitions.destroy();
		cb();
	}
}
