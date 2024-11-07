import type Warp from "./Warp";
import Weave from "./Weave";
export interface IQuiltOptions {
    /** Replace the default weaving function with an edited implementation. The default implementation resides in `Weave.compile` */
    weave?: typeof Weave.compile;
    whitespace?: true;
}
export declare class QuiltError extends Error {
    readonly line: number;
    readonly column: number;
    constructor(reason: string, line: number, column: number);
}
export default class Quilt {
    private readonly options?;
    private readonly warps;
    static DEFAULT_WARPS: Warp[];
    private tab;
    private space;
    private newline;
    constructor(options?: IQuiltOptions | undefined, warps?: Warp[]);
    private scriptConsumer?;
    onScript(consumer: (chunk: string) => any): this;
    private definitionsConsumer?;
    onDefinitions(consumer: (chunk: string) => any): this;
    private errorConsumer?;
    onError(consumer: (error: Error) => any): this;
    start(): this;
    private readonly dictionaries;
    private mode;
    private pendingDictionary;
    private level;
    private pendingEntry;
    private nextEscaped;
    private pendingTranslation;
    private pendingTranslationOrEntry;
    private line;
    private column;
    error(reason: string): void;
    transform(chunk: string): this;
    complete(): this;
    private pushEntry;
    private pushReference;
}
