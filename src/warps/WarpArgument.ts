import Token, { IArgument } from "../Token";
import Warp from "../Warp";

export default new Warp()
	.setTokeniser((walker, match, api) => {
		walker.walkWhitespace();
		const argument = walker.walkArgument();
		if (!argument)
			return undefined;

		walker.walkWhitespace();
		if (!walker.walkSubstr(...match.end))
			return undefined;

		return new Token()
			.addArgument(argument, "any")
			.setCompiled({ content: IArgument.accessor(argument) });
	});
