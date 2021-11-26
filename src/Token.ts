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
	string?: string;
	args?: IArgument[];
}

export interface IWeft {
	content: string | IToken[];
	details?: Record<string, string>;
}

export namespace IWeft {
	export function compile (weft: IWeft): string {
		const content = typeof weft.content === "string" ? weft.content : `[${weft.content.map(token => token.compiled).join(",")}]`;
		return `{content:${content}${weft.details ? `,${JSON.stringify(weft.details)}` : ""}}`;
	}
}

class Token implements IToken {

	public static compile (...tokens: IToken[]) {
		return tokens.map(token => token.compiled ?? "\"\"").join(",");
	}

	public static stringify (inner: true, ...tokens: IToken[]): string;
	public static stringify (...tokens: IToken[]): string;
	public static stringify (inner: boolean | IToken, ...tokens: IToken[]) {
		if (inner !== true)
			tokens.unshift(inner as IToken), inner = false;
		return `${inner ? "" : "`"}${tokens.map(token => token.string ?? "").join("")}${inner ? "" : "`"}`;
	}

	public static rawGenerator (generator: string) {
		return `\${${generator}}`;
	}

	public compiled?: string;
	public string?: string;
	public setCompiled (compiled: IWeft | string, string: string) {
		this.compiled = typeof compiled === "string" ? compiled : IWeft.compile(compiled);
		this.string = string;
		return this;
	}

	public args: IArgument[] = [];
	public addArgument (path: string, type: string) {
		this.args.push({ path, type });
		return this;
	}

	public inheritArguments (...tokens: IToken[]) {
		for (const token of tokens)
			if (token instanceof Token)
				for (let i = this.args.length; i < token.args.length; i++)
					this.args.push(token.args[i]);

		return this;
	}
}

namespace Token {
	export class Text implements IToken {

		public text = "";
		public get compiled () {
			return `{content:${JSON.stringify(this.text)}}`;
		}

		public get string () {
			return this.text;
		}
	}
}

export default Token;
