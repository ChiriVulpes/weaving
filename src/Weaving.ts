import StringWalker from "./StringWalker";
import Token, { IToken } from "./Token";
import Warp, { IWarpAPI, Match } from "./Warp";
import WarpArgument from "./warps/WarpArgument";
import WarpConditional from "./warps/WarpConditional";
import WarpTag from "./warps/WarpTag";

export default class Weave implements IWarpAPI {

	public static compile (source: string, warps?: Warp[]) {
		return this.compileTokens(...new Weave(source, warps).tokenise());
	}

	private static compileTokens (...tokens: IToken[]) {
		let args = false;
		let compiled = "";
		// const args: any[] = [];
		for (const token of tokens) {
			if (!token.compiled)
				continue;

			compiled += `${token.compiled},`;

			for (const { path /* , type */ } of token.args ?? []) {
				const keys = path.split(".");
				if (keys.length === 0)
					continue;

				args = true;
				// 	if (isNaN(+keys[0]))
				// 		keys.unshift("0");

				// 	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				// 	let cursorObject: any = args;
				// 	for (let i = 0; i < keys.length; i++) {
				// 		const key = keys[i];
				// 		if (key in cursorObject) {
				// 			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				// 			const incompatible = (i < keys.length - 1 && typeof cursorObject[key] !== "object")
				// 				|| (i === keys.length - 1 && typeof cursorObject[key] === "object");
				// 			if () {
				// 				// there's more keys, these arguments aren't compatible
				// 				console.warn(`Incompatible arguments: ${keys.slice(0, i + 1).join(".")}`);
				// 			}
				// 		}
				// 	}
			}
		}
		return {
			script: `${args ? "(...a)" : "_"}=>c([${compiled}])`,
			definitions: `(${args ? "...arguments: any[]" : ""}): Weft[]`,
		};
	}

	public static defaultWarps: Warp[] = [
		WarpTag,
		WarpConditional,
		WarpArgument,
	];

	public constructor (private readonly raw: string, private readonly warps = Weave.defaultWarps) {
	}

	public tokenise (walker = new StringWalker(this.raw), until?: string[]) {
		const tokens: IToken[] = [];
		let token: IToken | undefined;
		const warps = this.buildWarpCache();

		until ??= [];

		let char = walker.char;
		NextChar: do {
			if (until.some(substr => walker.hasNext(substr)))
				break;

			const matchingFirstChar = warps[char];
			if (matchingFirstChar !== undefined && matchingFirstChar.size > 0) {
				const matching: [Warp, Match, StringWalker][] = [];
				for (const warp of matchingFirstChar)
					for (const match of arrayOr(warp.matches))
						for (const start of match.start)
							if (walker.hasNext(start))
								matching.push([warp, match, walker.clone().walk(start.length)]);

				for (const [warp, match, warpWalker] of matching) {
					const warpTokens = warp.tokenise?.(warpWalker, match, this);
					if (!warpTokens)
						continue;

					walker.walkTo(warpWalker.cursor);
					tokens.push(...arrayOr(warpTokens));
					token = tokens[tokens.length - 1];
					walker.prev();
					continue NextChar;
				}
			}

			if (!(token instanceof Token.Text))
				tokens.push(token = new Token.Text());
			(token as Token.Text).text += char;
		} while (char = walker.next());

		return tokens;
	}

	/**
	 * @returns A Record mapping all warps to the first character of each of their starts
	 */
	private buildWarpCache () {
		const cache: Partial<Record<string, Set<Warp>>> = {};
		for (const warp of this.warps) {
			for (const match of arrayOr(warp.matches)) {
				for (const start of match.start) {
					cache[start[0]] ??= new Set();
					cache[start[0]]!.add(warp);
				}
			}
		}

		return cache;
	}
}

function arrayOr<T> (val: T | T[]) {
	return Array.isArray(val) ? val : [val];
}
