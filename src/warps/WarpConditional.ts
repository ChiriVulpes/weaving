import Token, { IArgument } from "../Token";
import Warp from "../Warp";

export default new Warp()
	.setTokeniser((walker, match, api) => {
		walker.walkWhitespace();
		const argument = walker.walkArgument();
		if (!argument)
			return undefined;

		walker.walkWhitespace();
		if (!walker.walkSubstr("?"))
			return undefined;

		const ifTrue = api.tokenise(walker, [":", ...match.end]);
		walker.walkSubstr(":");
		const ifFalse = api.tokenise(walker, match.end);

		if (!walker.walkSubstr(...match.end))
			return undefined;

		return new Token()
			.addArgument(argument, "any")
			.setCompiled(`...${IArgument.accessor(argument)}?[${Token.compile(...ifTrue)}]:[${Token.compile(...ifFalse)}]`);
	});
