import Token, { IArgument } from "../Token";
import Warp from "../Warp";

export default new Warp()
	.setTokeniser((walker, match, api) => {
		walker.walkWhitespace();
		const argument = walker.walkArgument();
		if (!argument)
			return undefined;

		walker.walkWhitespace();
		walker.walkSubstr(...match.end);

		const accessor = IArgument.accessor(argument);
		return new Token()
			.addArgument(argument, "any")
			.setCompiled({ content: accessor }, Token.rawGenerator(accessor));
	});
