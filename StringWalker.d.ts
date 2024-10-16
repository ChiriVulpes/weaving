export default class StringWalker {
    readonly str: string;
    cursor: number;
    get char(): string | undefined;
    get nextChar(): string | undefined;
    get ended(): boolean;
    constructor(str: string);
    prev(): string | undefined;
    next(): string | undefined;
    walk(amount: number): this;
    walkTo(index: number): this;
    walkUntil(substr: string): this;
    walkWhitespace(): string;
    walkArgument(): string | undefined;
    walkFloat(canHaveBigInt?: boolean): number | bigint | undefined;
    walkInteger(canHaveBigInt?: boolean): number | bigint | undefined;
    private walkNumber;
    private walkDigits;
    private savedCursors;
    save(): this;
    unsave(): this;
    restore(): this;
    hasNext(substr: string): boolean;
    walkChar(char: string): boolean;
    walkSubstr(...substr: string[]): boolean;
    clone(): StringWalker;
    isAtSubstr(substr: string): boolean;
}
