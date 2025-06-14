const BASE_CODES = {
	120: 16 as const, /* x */
	88: 16 as const, /* X */
	98: 2 as const, /* b */
	66: 2 as const, /* B */
	111: 8 as const, /* o */
	79: 8 as const, /* O */
}

function isWordChar (n: number) {
	return (n >= 65 && n < 91) // uppercase
		|| (n >= 97 && n < 123) // lowercase
		|| n === 95 // _
		|| n >= 48 && n < 58 // numbers
}

function isDigit (n: number, base: number) {
	if (base <= 10)
		return n >= 48 && n < 48 + base // 0 through 9 (less based on base)

	return (n >= 48 && n < 58) // 0 through 9
		|| (n >= 65 && n < 65 + base) // A through Z (less based on base)
		|| (n >= 97 && n < 97 + base) // a through z (less based on base)
}

export default class StringWalker {

	public cursor = 0
	public get char (): string | undefined { return this.str[this.cursor] }
	public get nextChar (): string | undefined { return this.str[this.cursor + 1] }
	public get ended () { return this.cursor >= this.str.length }

	public get line (): number {
		return this.str.slice(0, this.cursor).split("\n").length
	}

	public get column (): number {
		const lastNewline = this.str.lastIndexOf("\n", this.cursor)
		return lastNewline === -1
			? this.cursor + 1
			: this.cursor - lastNewline
	}

	public constructor (public readonly str: string) { }

	public prev () {
		--this.cursor
		return this.char
	}

	public next () {
		++this.cursor
		return this.char
	}

	public walk (amount: number) {
		this.cursor += amount
		return this
	}

	public walkTo (index: number) {
		this.cursor = index
		return this
	}

	public walkUntil (substr: string) {
		let char = this.char
		do {
			if (char === substr[0] && this.isAtSubstr(substr))
				break

			char = this.next()
		} while (char)

		return this
	}

	public walkUntilNot (substr: string) {
		const start = this.cursor
		let char = this.char
		do {
			if (char !== substr[0] || !this.isAtSubstr(substr))
				break

			this.walk(substr.length)
			char = this.char
		} while (char)

		return this.str.slice(start, this.cursor)
	}

	public walkLine () {
		const start = this.cursor
		let char = this.char
		do {
			if (char === "\r" || char === "\n")
				break

			char = this.next()
		} while (char)

		return this.str.slice(start, this.cursor)
	}

	public walkIndent () {
		return this.walkUntilNot("\t")
	}

	public walkWhitespace () {
		let whitespace = ""
		let char = this.char
		do {
			if (char !== " " && char !== "\t" && char !== "\r" && char !== "\n")
				break

			whitespace += char
			char = this.next()
		} while (char)

		return whitespace
	}

	public walkArgument () {
		let argument = ""
		if (this.walkChar("&"))
			argument += "&"

		let char = this.char
		do {
			const n = char!.charCodeAt(0)
			const word = isWordChar(n)
				|| (n === 46 && isWordChar(this.nextChar?.charCodeAt(0) ?? 0)) // .

			if (!word)
				break

			argument += char
			char = this.next()
		} while (char)

		this.save()
		this.walkWhitespace()
		if (this.walkSubstr("..")) {
			this.unsave()
			argument += ".."
		} else {
			this.restore()
		}

		return argument || undefined
	}

	public walkFloat (canHaveBigInt = true) {
		return this.walkNumber(canHaveBigInt)
	}

	public walkInteger (canHaveBigInt = true): number | bigint | undefined {
		return this.walkNumber(canHaveBigInt, false)
	}

	private walkNumber (canHaveBigInt: boolean, canHaveFloat = true, canHaveExponent = true): number | bigint | undefined {
		const negative = this.walkChar("-")
		if (!negative)
			this.walkChar("+")

		let char = this.char
		let code = char?.charCodeAt(0)
		let base = 10

		let parseable = negative ? "-" : ""
		const canHaveBase = code === 48 /* 0 */
		if (canHaveBase) {
			char = this.nextChar, code = char?.charCodeAt(0)
			base = BASE_CODES[code as keyof typeof BASE_CODES] ?? base
			if (base !== 10) {
				canHaveFloat = false
				parseable += `0${char!}`
				this.walk(2)
				char = this.char, code = char?.charCodeAt(0)
			}
		}

		parseable += this.walkDigits(base, char, code)

		let isFloat = false
		if (canHaveFloat && code === 46 /* . */) {
			const nextCode = this.nextChar?.charCodeAt(0)
			if (nextCode && isDigit(nextCode, base)) {
				isFloat = true
				this.next()
				parseable += `.${this.walkDigits(base)}`
			}
		}

		if (!parseable)
			return undefined

		let bigint = false
		if (!isFloat && canHaveBigInt && (code === 110 /* n */ || code === 78 /* N */)) {
			bigint = true
			this.next()
			char = this.next(), code = char?.charCodeAt(0)
		}

		let integer = bigint ? BigInt(parseable) : isFloat ? parseFloat(parseable) : parseInt(parseable, base)
		if (canHaveExponent && (code === 101 /* e */ || code === 69 /* E */)) {
			let exponent = this.walkNumber(canHaveBigInt, undefined, false)
			if (exponent === undefined)
				return integer

			if (typeof integer === "bigint") {
				if (typeof exponent !== "bigint")
					exponent = BigInt(exponent)
				return integer ** exponent
			} else {
				if (typeof exponent === "bigint")
					integer = BigInt(integer)
				return (integer as number) ** (exponent as number)
			}
		}

		return integer
	}

	private walkDigits (base: number, char = this.char, code = char?.charCodeAt(0)) {
		let digits = ""
		let canUnderscore = false
		let nextIsDigit: boolean | undefined
		do {
			const digit = code && (nextIsDigit ?? isDigit(code, base))
			if (!digit) {
				if (canUnderscore && code === 95 /* _ */) {
					const nextCode = this.nextChar?.charCodeAt(0)
					nextIsDigit = nextCode ? isDigit(nextCode, base) : undefined
					if (nextIsDigit) {
						// consume the underscore
						canUnderscore = false
						continue
					}
				}

				break
			}

			canUnderscore = true
			digits += char
		} while (char = this.next(), code = char?.charCodeAt(0))

		return digits
	}

	private savedCursors: number[] = []
	public save () {
		this.savedCursors.push(this.cursor)
		return this
	}

	public unsave () {
		this.savedCursors.pop()
		return this
	}

	public restore () {
		this.cursor = this.savedCursors.pop() ?? this.cursor
		return this
	}

	public hasNext (substr: string) {
		const str = this.str
		const index = this.cursor
		for (let i = 0; i < substr.length; i++) {
			if (str[index + i] !== substr[i]) {
				return false
			}
		}

		return true
	}

	public walkNewlines () {
		const start = this.cursor
		do if (this.char === "\r") this.next()
		while (this.walkChar("\n"))
		return this.cursor > start
	}

	public walkNewline () {
		const start = this.cursor
		if (this.char === "\r") this.next()
		if (this.char === "\n") this.next()
		return this.cursor > start
	}

	public walkChar (char: string) {
		if (this.char === char) {
			this.next()
			return true
		}

		return false
	}

	public walkSubstr (...substr: string[]) {
		for (const str of substr) {
			if (this.hasNext(str)) {
				this.cursor += str.length
				return str
			}
		}

		return null
	}

	public clone () {
		return new StringWalker(this.str)
			.walkTo(this.cursor)
	}

	public isAtSubstr (substr: string) {
		if (this.cursor + substr.length > this.str.length)
			return false

		for (let i = 0; i < substr.length; i++)
			if (this.str[this.cursor + i] !== substr[i])
				return false

		return true
	}
}