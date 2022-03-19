import Warp from "./Warp";
import Weave from "./Weave";
export interface IQuiltOptions {
    /** Replace the default weaving function with an edited implementation. The default implementation resides in `Weave.compile` */
    weave?: typeof Weave.compile;
}
export default class Quilt {
    private readonly options?;
    private readonly warps?;
    constructor(options?: IQuiltOptions | undefined, warps?: Warp[] | undefined);
    private scriptConsumer?;
    onScript(consumer: (chunk: string) => any): this;
    private definitionsConsumer?;
    onDefinitions(consumer: (chunk: string) => any): this;
    start(): this;
    private readonly dictionaries;
    private mode;
    private pendingDictionary;
    private level;
    private pendingEntry;
    private nextEscaped;
    private pendingTranslation;
    private pendingTranslationOrEntry;
    transform(chunk: string): this;
    complete(): this;
    private pushEntry;
}
