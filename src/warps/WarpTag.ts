import Token from "../Token"
import Warp, { Match } from "../Warp"

export default new Warp()
	.match(new Match(`${Match.BASIC_START}#`))
	.setTokeniser((walker, match, api) => {
		walker.walkWhitespace()
		const tag = api.tokenise(walker, [":", ...match.end])
		if (!tag)
			return undefined

		if (!walker.walkSubstr(":"))
			return undefined

		const content = api.tokenise(walker, match.end)
		if (!content)
			return undefined

		return new Token()
			.inheritArguments(...tag, ...content)
			// TODO optimise output here by compressing a single token into this object
			.setCompiled(`{content:[${Token.compile(...content)}],tag:${Token.stringify(...tag)}}`,
				Token.stringify(true, ...content))
	})
	.addWeftProperty("tag", "string")
