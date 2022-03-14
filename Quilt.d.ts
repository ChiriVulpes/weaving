import Warp from "./Warp";
export default class Quilt {
    private readonly warps?;
    constructor(warps?: Warp[] | undefined);
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
