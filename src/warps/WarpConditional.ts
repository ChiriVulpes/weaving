import Token, { IArgument } from "../Token"
import Warp from "../Warp"

export default new Warp()
	.setTokeniser((walker, match, api) => {
		walker.save()
		walker.walkWhitespace()

		let argument: string | undefined
		let checkExpression: string | undefined

		ArgumentMode: {
			let inverted = false
			if (walker.walkSubstr("!")) {
				inverted = true
				walker.walkWhitespace()
			}

			argument = walker.walkArgument()
			if (!argument)
				break ArgumentMode

			walker.walkWhitespace()
			if (!walker.walkSubstr("?")) {
				argument = undefined
				break ArgumentMode
			}

			if (walker.walkSubstr("?")) {
				// handled by argument warp
				walker.restore()
				return undefined
			}

			checkExpression = `${inverted ? "!" : ""}${IArgument.accessor(argument)}`
		}

		if (argument) walker.unsave()
		else {
			walker.restore()
			return undefined

			// const 
		}

		const ifTrue = api.tokenise(walker, [":", ...match.end])
		walker.walkSubstr(":")
		const ifFalse = api.tokenise(walker, match.end)

		const token = new Token()
			.inheritArguments(...ifFalse)
			.setCompiled(`...${checkExpression}?[${Token.compile(...ifTrue)}]:[${Token.compile(...ifFalse)}]`,
				Token.rawGenerator(`${checkExpression}?\`${Token.stringify(true, ...ifTrue)}\`:\`${Token.stringify(true, ...ifFalse)}\``))

		if (argument)
			token.addArgument(argument, "any", true)
				.inheritArguments(IArgument.index(argument), ...ifTrue)
		else
			token.inheritArguments(...ifTrue)

		return token
	})

// const

// function compileExpression (walker: StringWalker, api: IWarpAPI): Token | undefined {
// 	const token = new Token();
// 	let expression = "";
// 	let char = walker.char;
// 	do {
// 		let value = "";

// 		switch (char) {
// 			case "(": {
// 				value += "(";
// 				walker.next();

// 				const compiled = compileExpression(walker, api);
// 				if (!compiled)
// 					return undefined;

// 				value += compiled.string;
// 				if (walker.char !== ")")
// 					return undefined;

// 				value += ")";
// 				break;
// 			}
// 			case "{": {
// 				const argument = api.tokeniseWarp(walker, [WarpArgument])?.[0];
// 				if (!argument)
// 					return undefined;

// 				value += argument.string?.slice(2, -1);
// 				token.inheritArguments(argument);
// 				break;
// 			}
// 			default: {
// 				const number = walker.walkFloat(true);
// 				if (number !== undefined)
// 					value += number;
// 			}
// 		}

// 		if (!value) {
// 			api.tokenise(walker, [""])
// 		}

// 	} while ();
// }
