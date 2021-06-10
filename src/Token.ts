export interface IArgument {
	path: string;
	type: string;
}

export namespace IArgument {
	const REGEX_WORD = /^\w+$/;
	export function accessor (path: string) {
		let argumentPath = path.split(".")
			.map(argument =>
				// numeric key
				!isNaN(parseInt(argument)) ? `[${argument}]`
					// string key
					: REGEX_WORD.test(argument) ? `${argument}`
						// string key (invalid characters)
						: `["${argument}"]`);

		if (argumentPath[0][0] !== "[" || argumentPath[0][1] === "\"")
			argumentPath.unshift("[0]");

		argumentPath = argumentPath.map((argument, i) => i ? `?.${argument}` : argument)

		argumentPath.unshift("a")
		return argumentPath.join("");
	}
}

export interface IToken {
	compiled?: string;
	args?: IArgument[];
}

export interface IWeft {
	content: string;
	details?: Record<string, string>;
}

export namespace IWeft {
	export function compile (weft: IWeft) {
		return `{content:${weft.content}${weft.details ? JSON.stringify(weft.details) : ""}}`;
	}
}

class Token implements IToken {

	public static compile (...tokens: IToken[]) {
		return tokens.map(token => token.compiled).join(",");
	}

	public compiled?: string;
	public setCompiled (compiled: IWeft | string) {
		this.compiled = typeof compiled === "string" ? compiled : IWeft.compile(compiled);
		return this;
	}

	public args: IArgument[] = [];
	public addArgument (path: string, type: string) {
		this.args.push({ path, type });
		return this;
	}
}

namespace Token {
	export class Text implements IToken {

		public text = "";
		public get compiled () {
			return `{content:${JSON.stringify(this.text)}}`;
		}
	}
}

export default Token;
