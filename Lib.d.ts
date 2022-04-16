import QuiltTransformer from "./QuiltTransformer";
declare const create: typeof QuiltTransformer.create, createFileTransformer: typeof QuiltTransformer.createFileTransformer, stream: typeof QuiltTransformer.stream;
declare const DEFAULT_WARPS: import("./Warp").default[];
export { QuiltTransformer, create as createQuiltTransformer, createFileTransformer, stream, DEFAULT_WARPS };
