import StringWalker from "./StringWalker";
import { IToken } from "./Token";

export interface IWarpAPI {
	tokenise (walker: StringWalker, until?: string[]): IToken[];
	tokeniseWarp (walker: StringWalker, warps: Iterable<Warp>): IToken[] | undefined;
}

export default class Warp {

	private readonly _matches: Match[] = [];
	public get matches () {
		return this._matches.length === 0 ? Match.BASIC : this._matches;
	}

	public match (...matches: Match[]) {
		this._matches.push(...matches);
		return this;
	}

	public tokenise?: (walker: StringWalker, match: Match, api: IWarpAPI) => IToken | IToken[] | undefined;
	public setTokeniser (tokeniser: (walker: StringWalker, match: Match, api: IWarpAPI) => IToken | IToken[] | undefined) {
		this.tokenise = tokeniser;
		return this;
	}
}

export class Match {

	public static BASIC_START = "{";
	public static BASIC_END = "}";
	public static readonly BASIC = new Match();

	public constructor ();
	public constructor (start: string, end?: string);
	public constructor (start?: string, end?: string) {
		if (start !== undefined)
			this.start[0] = start;
		if (end !== undefined)
			this.end[0] = end;
	}

	public start: string[] = [Match.BASIC_START];

	public setStart (...starts: string[]) {
		this.start = starts;
		return this;
	}

	public addStarts (...starts: string[]) {
		this.start.push(...starts);
		return this;
	}

	public end: string[] = [Match.BASIC_END];

	public setEnd (...ends: string[]) {
		this.end = ends;
		return this;
	}

	public addEnds (...ends: string[]) {
		this.end.push(...ends);
		return this;
	}

	public clone () {
		return new Match(/* this.match */)
			.setStart(...this.start)
			.setEnd(...this.end);
	}
}
