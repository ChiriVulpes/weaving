/// <reference types="node" />
import { Readable, Transform, TransformCallback } from "stream";
import Warp from "./Warp";
declare const ExtensionClass: new (transformer?: Transformer<any, any> | undefined) => Transform & TransformStream;
export default class QuiltTransformer extends ExtensionClass {
    static stream(source: string, warps?: Warp[]): ReadableStream<any> | Transform;
    static create(warps?: Warp[]): QuiltTransformer;
    private readonly quilt;
    readonly definitions: Readable & ReadableStream;
    private constructor();
    _transform(chunk: Buffer, enc: string, cb: TransformCallback): void;
    _flush(cb: TransformCallback): void;
}
export {};
