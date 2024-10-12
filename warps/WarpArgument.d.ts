import type StringWalker from "../StringWalker";
import Token from "../Token";
import type { IWarpAPI } from "../Warp";
import Warp, { Match } from "../Warp";
declare const _default: Warp;
export default _default;
export declare function tokeniseArgument(walker: StringWalker, match: Match, api: IWarpAPI, valueMode?: boolean): Token | undefined;
