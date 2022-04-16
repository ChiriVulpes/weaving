import StringWalker from "../StringWalker";
import Token, { IArgument, IToken } from "../Token";
import Warp, { IWarpAPI, Match } from "../Warp";

export default new Warp()
	.setTokeniser(tokeniseArgument);

class ValueToken extends Token {
	public override compiled = "&";
	public override string = "&";
}

const WarpValue = new Warp()
	.match(new Match().setStart("&").setEnd(""))
	.setTokeniser(() => new ValueToken);

export function tokeniseArgument (walker: StringWalker, match: Match, api: IWarpAPI, valueMode = false) {
	walker.walkWhitespace();
	const argument = walker.walkArgument() ?? "";
	if (argument)
		walker.walkWhitespace();

	const join = walker.walkChar("*");
	if (!argument && !join && !valueMode)
		return undefined;

	let accessor = IArgument.accessor(argument);
	if (join) {
		let entryTokens: IToken[] | undefined;
		let separatorTokens = api.with([WarpValue]).tokenise(walker, [...match.end, ":"]);
		if (walker.walkChar(":")) {
			entryTokens = separatorTokens;
			separatorTokens = api.tokenise(walker, match.end);
		}

		const entry = !entryTokens ? ""
			: `,v=>c([${entryTokens.map(token => token instanceof ValueToken ? "{content:v}" : token.compiled).join(",")}])`

		accessor = `j(${accessor},\`${separatorTokens.map(token => token.string ?? "").join("")}\`${entry})`;
	}

	return new Token()
		.addArgument(argument, "any")
		.setCompiled({ content: accessor }, Token.rawGenerator(accessor));
}
