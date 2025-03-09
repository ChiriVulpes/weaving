import type StringWalker from "../StringWalker"
import type { IToken } from "../Token"
import Token, { IArgument } from "../Token"
import type { IWarpAPI } from "../Warp"
import Warp, { Match } from "../Warp"

// basic warp matching anything inside {}
export default new Warp()
	.setTokeniser(tokeniseArgument)

export function tokeniseArgument (walker: StringWalker, match: Match, api: IWarpAPI, valueMode = false) {
	const whitespaceBefore = walker.walkWhitespace()
	const argument = walker.walkArgument() ?? ""
	const whitespaceAfter = argument && walker.walkWhitespace()

	const join = walker.walkChar("*")
	const orElse = !join && walker.walkSubstr("??")
	if (!argument && !join && !valueMode && !orElse)
		return undefined

	let accessor = IArgument.accessor(argument)
	if (join) {
		let entryTokens: IToken[] | undefined
		let separatorTokens = api.with([WarpValue]).tokenise(walker, [...match.end, ":"])
		if (walker.walkChar(":")) {
			entryTokens = separatorTokens
			separatorTokens = api.tokenise(walker, match.end)
		}

		const entry = !entryTokens ? ""
			: `,v=>[${entryTokens.map(token => token instanceof ValueToken ? "{content:v}" : token.compiled).join(",")}]`

		accessor = `j(${accessor},[${separatorTokens.map(token => token.compiled).join(",")}]${entry})`

	} else if (orElse) {
		const orElseTokens = api.tokenise(walker, match.end)
		const orElseString = `[${orElseTokens.map(token => token.compiled).join(",")}]`
		const whitespacedValue = !whitespaceBefore && !whitespaceAfter ? accessor
			: `[${whitespaceBefore && `{content:"${whitespaceBefore}"},`}${accessor}${whitespaceAfter && `,{content:"${whitespaceAfter}"}`}]`
		accessor = `(${accessor}?${whitespacedValue}:${orElseString})`
	}

	return new Token()
		.addArgument(argument, "WeavingArg", !!orElse, join && !argument)
		.setCompiled({ content: accessor }, Token.rawGenerator(accessor))
}

// internal warp for matching & inside a join warp
const WarpValue = new Warp()
	.match(new Match().setStart("&").setEnd(""))
	.setTokeniser(() => new ValueToken)

class ValueToken extends Token {
	public override compiled = "&"
	public override string = "&"
}
