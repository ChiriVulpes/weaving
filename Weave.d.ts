import StringWalker from "./StringWalker";
import type { IToken } from "./Token";
import type Warp from "./Warp";
import type { IWarpAPI } from "./Warp";
export interface Thread {
    script: string;
    definition: string;
}
export default class Weave implements IWarpAPI {
    private readonly raw;
    private readonly warps;
    static compile(source: string, warps: Warp[]): Thread;
    private static compileTokens;
    private static compileType;
    constructor(raw: string, warps: Warp[]);
    tokenise(walker?: StringWalker, until?: string[]): IToken[];
    tokeniseWarp(walker: StringWalker, warps: Set<Warp>): IToken[] | undefined;
    with(warps: Warp[]): Weave;
    private warpCache?;
    /**
     * @returns A Record mapping all warps to the first character of each of their starts
     */
    private buildWarpCache;
}
