import StringWalker from "./StringWalker"
import type { IToken } from "./Token"
import Token from "./Token"
import type Warp from "./Warp"
import type { IWarpAPI, Match } from "./Warp"
import WarpArgument from "./warps/WarpArgument"
import WarpConditional from "./warps/WarpConditional"
import WarpTag from "./warps/WarpTag"

export default class Weave implements IWarpAPI {

	public static compile (source: string, warps?: Warp[]) {
		return Weave.compileTokens(...new Weave(source, warps).tokenise())
	}

	private static compileTokens (...tokens: IToken[]) {
		let compiled = ""
		const argTypes: Set<string>[] = []
		let lastRequiredIndex = -1
		const optionals: boolean[] = []

		for (const token of tokens) {
			if (!token.compiled)
				continue

			compiled += `${token.compiled},`

			for (const { path, type, optional } of token.args ?? []) {
				const keys = path.split(".")
				if (keys.length === 0)
					continue

				if (isNaN(+keys[0]))
					keys.unshift("0")

				const generatedType = this.compileType(keys.slice(1), type)

				const index = +keys[0];
				(argTypes[index] ??= new Set()).add(generatedType)

				if (!optional)
					lastRequiredIndex = Math.max(index, lastRequiredIndex)

				optionals[index] ??= true
				optionals[index] &&= optional
			}
		}

		compiled = compiled.slice(0, -1)

		let args = ""
		if (argTypes.length)
			args = argTypes
				.map((typeSet, i) => {
					if (typeSet.size > 1)
						// prevent `Explicit Types & any`
						typeSet.delete("any")

					const type = [...typeSet].join(" & ")
					return `arg_${i}${lastRequiredIndex < i ? "?" : ""}: ${optionals[i] && lastRequiredIndex >= i ? `(${type}) | undefined` : type}`
				})
				.join(", ")

		return {
			script: `${args ? "(...a)" : "_"}=>c([${compiled}])`,
			definitions: `(${args}): Weave`,
		}
	}

	private static compileType (keys: string[], type: string) {
		let result = type
		for (let i = keys.length - 1; i >= 0; i--)
			result = `{ "${keys[i]}": ${result} }`
		return result
	}

	public static DEFAULT_WARPS: Warp[] = [
		WarpTag,
		WarpConditional,
		WarpArgument,
	]

	public constructor (private readonly raw: string, private readonly warps = Weave.DEFAULT_WARPS) {
	}

	public tokenise (walker = new StringWalker(this.raw), until?: string[]) {
		const tokens: IToken[] = []
		let token: IToken | undefined
		const warps = this.buildWarpCache()

		until ??= []

		let char = walker.char
		NextChar: do {
			if (until.some(substr => walker.hasNext(substr)))
				break

			const matchingFirstChar = warps[char!]
			if (matchingFirstChar !== undefined && matchingFirstChar.size > 0) {
				const result = this.tokeniseWarp(walker, matchingFirstChar)
				if (result) {
					tokens.push(...result)
					token = tokens[tokens.length - 1]
					walker.prev()
					continue NextChar
				}
			}

			if (!(token instanceof Token.Text))
				tokens.push(token = new Token.Text());
			(token as Token.Text).text += char

			// eslint-disable-next-line no-cond-assign
		} while (char = walker.next())

		return tokens
	}

	public tokeniseWarp (walker: StringWalker, warps: Set<Warp>): IToken[] | undefined {
		const matching: [Warp, Match, StringWalker][] = []
		for (const warp of warps)
			for (const match of arrayOr(warp.matches))
				for (const start of match.start)
					if (walker.hasNext(start))
						matching.push([warp, match, walker.clone().walk(start.length)])

		for (const [warp, match, warpWalker] of matching) {
			const warpTokens = warp.tokenise?.(warpWalker, match, this)
			if (!warpTokens)
				continue

			if (!warpWalker.walkSubstr(...match.end) && !warpWalker.ended)
				continue

			walker.walkTo(warpWalker.cursor)
			return arrayOr(warpTokens)
		}

		return undefined
	}

	public with (warps: Warp[]) {
		return new Weave(this.raw, [...warps, ...this.warps])
	}

	private warpCache?: Record<string, Set<Warp> | undefined>
	/**
	 * @returns A Record mapping all warps to the first character of each of their starts
	 */
	private buildWarpCache () {
		if (this.warpCache)
			return this.warpCache

		const cache: Record<string, Set<Warp> | undefined> = {}
		for (const warp of this.warps) {
			for (const match of arrayOr(warp.matches)) {
				for (const start of match.start) {
					cache[start[0]] ??= new Set()
					cache[start[0]]!.add(warp)
				}
			}
		}

		return this.warpCache = cache
	}
}

function arrayOr<T> (val: T | T[]) {
	return Array.isArray(val) ? val : [val]
}
