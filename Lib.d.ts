import QuiltTransformer from "./QuiltTransformer";
declare const create: typeof QuiltTransformer.create, createFileTransformer: typeof QuiltTransformer.createFileTransformer, stream: typeof QuiltTransformer.stream;
declare const DEFAULT_WARPS: import("./Warp").default[];
export { DEFAULT_WARPS, QuiltTransformer, createFileTransformer, create as createQuiltTransformer, stream };
