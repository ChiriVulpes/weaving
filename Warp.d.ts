import type StringWalker from "./StringWalker";
import type { IToken } from "./Token";
export interface IWarpAPI {
    tokenise(walker: StringWalker, until?: string[]): IToken[];
    tokeniseWarp(walker: StringWalker, warps: Iterable<Warp>): IToken[] | undefined;
    with(warps: Warp[]): IWarpAPI;
}
export type Tokeniser<ARGS extends any[] = []> = (walker: StringWalker, match: Match, api: IWarpAPI, ...args: ARGS) => IToken | IToken[] | undefined;
export default class Warp {
    private readonly _matches;
    get matches(): Match | Match[];
    match(...matches: Match[]): this;
    tokenise?: Tokeniser<[]>;
    setTokeniser<ARGS extends any[]>(tokeniser: Tokeniser<ARGS>, ...args: ARGS): this;
}
export declare class Match {
    static BASIC_START: string;
    static BASIC_END: string;
    static readonly BASIC: Match;
    constructor();
    constructor(start: string, end?: string);
    start: string[];
    setStart(...starts: string[]): this;
    addStarts(...starts: string[]): this;
    end: string[];
    setEnd(...ends: string[]): this;
    addEnds(...ends: string[]): this;
    clone(): Match;
}
