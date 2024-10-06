import StringWalker from "./StringWalker";
import type { IToken } from "./Token";
import type Warp from "./Warp";
import type { IWarpAPI } from "./Warp";
export default class Weave implements IWarpAPI {
    private readonly raw;
    private readonly warps;
    static compile(source: string, warps?: Warp[]): {
        script: string;
        definitions: string;
    };
    private static compileTokens;
    private static compileType;
    static DEFAULT_WARPS: Warp[];
    constructor(raw: string, warps?: Warp[]);
    tokenise(walker?: StringWalker, until?: string[]): IToken[];
    tokeniseWarp(walker: StringWalker, warps: Set<Warp>): IToken[] | undefined;
    with(warps: Warp[]): Weave;
    private warpCache?;
    /**
     * @returns A Record mapping all warps to the first character of each of their starts
     */
    private buildWarpCache;
}
