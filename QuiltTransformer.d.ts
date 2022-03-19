/// <reference types="node" />
import type { Readable, Transform, TransformCallback } from "stream";
import { IQuiltOptions } from "./Quilt";
import Warp from "./Warp";
declare const ExtensionClass: new (transformer?: Transformer<any, any> | undefined) => Transform & TransformStream;
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
    static stream(source: string, warps?: Warp[]): Transform | ReadableStream<any>;
    static stream(source: string, options?: IQuiltOptions, warps?: Warp[]): Transform | ReadableStream<any>;
    static create(warps?: Warp[]): QuiltTransformer;
    static create(options?: IQuiltOptions, warps?: Warp[]): QuiltTransformer;
    static createFileTransformer(warps?: Warp[]): Transform;
    static createFileTransformer(options?: IQuiltFileTransformerOptions, warps?: Warp[]): Transform;
    private readonly quilt;
    readonly definitions: Readable & ReadableStream;
    private constructor();
    _transform(chunk: Buffer, enc: string, cb: TransformCallback): void;
    _flush(cb: TransformCallback): void;
}
export {};
