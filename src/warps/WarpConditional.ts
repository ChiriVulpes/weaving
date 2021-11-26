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

		walker.walkSubstr(...match.end);

		const accessor = IArgument.accessor(argument);
		return new Token()
			.addArgument(argument, "any")
			.inheritArguments(...ifTrue, ...ifFalse)
			.setCompiled(`...${accessor}?[${Token.compile(...ifTrue)}]:[${Token.compile(...ifFalse)}]`,
				Token.rawGenerator(`${accessor}?\`${Token.stringify(true, ...ifTrue)}\`:\`${Token.stringify(true, ...ifFalse)}\``));
	});
