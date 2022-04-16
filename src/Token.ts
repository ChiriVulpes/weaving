export interface IArgument {
	path: string;
	type: string;
	optional: boolean;
}

export namespace IArgument {
	const REGEX_WORD = /^\w+$/;
	export function accessor (path: string) {
		const valueMode = path.startsWith("&");
		if (valueMode)
			path = path.slice(1);

		const length = path.endsWith("..");
		if (length)
			path = path.slice(0, -2);

		let argumentPath = path.length === 0 ? []
			: path.split(".")
				.map(argument =>
					// numeric key
					!isNaN(parseInt(argument)) ? `[${argument}]`
						// string key
						: REGEX_WORD.test(argument) ? `${argument}`
							// string key (invalid characters)
							: `["${argument}"]`);

		if (!valueMode && argumentPath.length && (argumentPath[0][0] !== "[" || argumentPath[0][1] === "\""))
			argumentPath.unshift("[0]");

		argumentPath = argumentPath.map((argument, i) => i || valueMode ? `?.${argument}` : argument);

		argumentPath.unshift(valueMode ? "v" : "a");
		const accessor = argumentPath.join("");
		return length ? `l(${accessor})` : accessor;
	}

	export function index (path: string) {
		const firstPeriod = path.indexOf(".");
		const firstKey = firstPeriod === -1 ? path : path.slice(0, firstPeriod);
		const firstIndex = parseInt(firstKey);
		return isNaN(firstIndex) ? 0 : firstIndex;
	}

	export function filteredIndexPresent (presentIndex: number, args: IArgument[]) {
		return args.map(arg => index(arg.path) === presentIndex ? { ...arg, optional: true } : arg);
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
	public setCompiled (compiled: string, string?: string): this;
	public setCompiled (compiled: IWeft | string, string: string): this;
	public setCompiled (compiled: IWeft | string, string?: string) {
		this.compiled = typeof compiled === "string" ? compiled : IWeft.compile(compiled);
		this.string = string === undefined ? compiled as string : string;
		return this;
	}

	public args: IArgument[] = [];
	public addArgument (path: string, type: string, optional = false) {
		this.args.push({ path, type, optional });
		return this;
	}

	public inheritArguments (optional: number, ...tokens: IToken[]): this;
	public inheritArguments (...tokens: IToken[]): this;
	public inheritArguments (optional: IToken | number, ...tokens: IToken[]) {
		if (typeof optional !== "number")
			tokens.unshift(optional), optional = -1;

		for (const token of tokens)
			if (token instanceof Token)
				for (const arg of token.args)
					this.args.push(optional === IArgument.index(arg.path) ? { ...arg, optional: true } : arg);

		return this;
	}

	// public require (fn: string) {

	// }
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
