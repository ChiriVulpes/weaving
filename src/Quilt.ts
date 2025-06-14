import * as fs from "fs/promises"
import File from "./File"
import StringWalker from "./StringWalker"
import type Warp from "./Warp"
import WarpArgument from "./warps/WarpArgument"
import WarpConditional from "./warps/WarpConditional"
import WarpTag from "./warps/WarpTag"
import type { Thread } from "./Weave"
import Weave from "./Weave"

interface Quilt {
	file: string
	contents: string
	threads: Record<string, Thread>
}

async function Quilt (file: string, options?: Quilt.Options, warps = Quilt.DEFAULT_WARPS): Promise<Quilt> {
	file = File.relative(file)
	const contents = await fs.readFile(file, "utf8")

	const quilt: Quilt = {
		file,
		contents,
		threads: {},
	}

	const walker = new StringWalker(contents)
	let currentLevel = 0

	const weave = options?.weave ?? Weave.compile

	async function consume (): Promise<Record<string, Thread>> {
		const threads: Record<string, Thread> = {}

		while (!walker.ended) {
			if (walker.hasNext("#")) {
				const section = await consumeSection()
				if (!section)
					break

				Object.assign(threads, section)
				continue
			}

			if (walker.hasNext("- ")) {
				// comment
				walker.walkLine()
				walker.walkNewlines()
				continue
			}

			const threadName = consumeThreadName()
			threads[threadName] = consumeThread()
			walker.walkNewlines()
		}

		return threads
	}

	function consumeThread (): Thread {
		switch (walker.char) {
			case ":": {
				walker.walkChar(":") // Consume the colon
				return consumeWeaveOpportunity()
			}
			case "=": {
				walker.walkChar("=") // Consume the equals sign
				const refThreadName = consumeThreadName()
				if (walker.walkWhitespace() && walker.walkChar("|")) {
					// Reference with argument(s)
					const argumentWeave = consumeWeaveOpportunity()
					return {
						script: `(...a) => q["${refThreadName}"]((${argumentWeave.script})(), ...a)`,
						// This definition structure is based on QuiltOld.ts for binding one argument
						// and passing through the rest.
						definition: `: Quilt["${refThreadName}"] extends (_arg0: any, ...parameters: infer P) => infer R ? (...parameters: P) => R : never`,
					}
				}

				// Simple reference (no arguments provided here)
				return {
					script: `(...a) => q["${refThreadName}"](...a)`,
					definition: `: Quilt["${refThreadName}"]`,
				}
			}
			default:
				throw error("Expected ':' or '=' after thread name'")
		}
	}

	function consumeWeaveOpportunity () {
		if (walker.walkNewlines())
			return consumeMultilineWeave()

		if (walker.walkChar(" "))
			return consumeWeave()

		throw error("Expected whitespace after thread name")
	}

	function consumeWeave () {
		const line = walker.walkLine()
		const text = processEscapeCharacters(line)
		return weave(text, warps)
	}

	function consumeMultilineWeave () {
		let text = ""
		while (walker.walkChar("\t")) {
			const line = walker.walkLine()
			text += line + "\n"
			walker.walkNewlines()
		}

		if (text) text = text.slice(0, -1)
		text = processEscapeCharacters(text)
		return weave(text, warps)
	}

	function processEscapeCharacters (text: string): string {
		let result = ""
		for (let i = 0; i < text.length; i++) {
			const char = text[i]
			if (char !== "\\") {
				result += char
				continue
			}

			const nextChar = text[i + 1]
			switch (nextChar) {
				case "n":
					result += "\n"
					i++
					continue
				case "t":
					result += "\t"
					i++
					continue
				case "\n":
					// Skip the newline character
					i++
					continue
				case "\\":
					result += "\\"
					i++
					continue

				case "x": {
					const hex = text.slice(i + 2, i + 4)
					if (hex.length !== 2)
						throw error("Invalid hex escape sequence, expected 2 characters after \\x")

					const charCode = parseInt(hex, 16)
					if (isNaN(charCode))
						throw error(`Invalid hex escape sequence: \\x${hex}`)

					result += String.fromCharCode(charCode)
					i += 3
					continue
				}

				case "u": {
					const hex = text.slice(i + 2, i + 6)
					if (hex.length !== 4)
						throw error("Invalid unicode escape sequence, expected 4 characters after \\u")

					const charCode = parseInt(hex, 16)
					if (isNaN(charCode))
						throw error(`Invalid unicode escape sequence: \\u${hex}`)

					result += String.fromCharCode(charCode)
					i += 5
					continue
				}

				default:
					throw error(`Unnecessary escape sequence: \\${nextChar}`)
			}
		}

		return result
	}

	async function consumeSection (): Promise<Record<string, Thread> | null> {
		walker.save()
		const levelBefore = currentLevel
		const level = walker.walkUntilNot("#").length
		if (level <= levelBefore) {
			walker.restore()
			return null
		}

		currentLevel = level
		walker.unsave()
		walker.walkWhitespace()

		const name = consumeThreadName()

		if (!walker.walkNewlines())
			throw new Error("Expected newline after thread name")

		const threads = await consume()
		currentLevel = levelBefore
		return Object.fromEntries(
			Object.entries(threads)
				.map(([threadName, thread]) => {
					return [`${name}/${threadName}`, thread]
				})
		)
	}

	function consumeThreadName () {
		for (let i = walker.cursor; i < walker.str.length; i++) {
			const charCode = walker.str.charCodeAt(i)

			const isValidChar = false
				|| (charCode >= 97 && charCode <= 122) // a-z
				|| (charCode >= 48 && charCode <= 57) // 0-9
				|| charCode === 47 // /
				|| charCode === 45 // -
				|| charCode === 95 // _

			if (!isValidChar) {
				const name = walker.str.slice(walker.cursor, i)
				if (!name)
					throw error("Expected thread name")

				walker.walkTo(i)
				return name
			}
		}

		throw error("Unexpected end of file")
	}

	function error (message: string) {
		return new Quilt.Error(message, walker.line, walker.column)
	}

	Object.assign(quilt.threads, await consume())
	return quilt
}

const BaseError = Error
namespace Quilt {

	export interface Options {
		/** Replace the default weaving function with an edited implementation. The default implementation resides in `Weave.compile` */
		weave?: typeof Weave.compile
		whitespace?: true
	}
	export const DEFAULT_WARPS: Warp[] = [
		WarpTag,
		WarpConditional,
		WarpArgument,
	]

	export class Error extends BaseError {
		public constructor (reason: string, public readonly line: number, public readonly column: number) {
			super(reason)
		}
	}
}

export default Quilt
