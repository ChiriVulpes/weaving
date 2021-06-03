export default class StringWalker {

	public cursor = 0;
	public get char () { return this.str[this.cursor]; }

	public constructor (public readonly str: string) { }

	public prev () {
		--this.cursor;
		return this.char;
	}

	public next () {
		++this.cursor;
		return this.char;
	}

	public walk (amount: number) {
		this.cursor += amount;
		return this;
	}

	public walkWhitespace () {
		let char = this.char;
		do {
			if (char !== " " && char !== "\t" && char !== "\r" && char !== "\n")
				break;
		} while (char = this.next());

		return this;
	}

	public walkArgument () {
		let argument = "";
		let char = this.char;
		do {
			const n = char.charCodeAt(0);
			const isWordChar =
				(n >= 65 && n < 91) // uppercase
				|| (n >= 97 && n < 123) // lowercase
				|| (n >= 48 && n < 58) // numbers
				|| n === 95 // _
				|| n === 46; // .

			if (!isWordChar)
				break;

			argument += char;
		} while (char = this.next());

		return argument;
	}

	public hasNext (substr: string) {
		const str = this.str;
		const index = this.cursor;
		for (let i = 0; i < substr.length; i++) {
			if (str[index + i] !== substr[i]) {
				return false;
			}
		}

		return true;
	}

	public walkSubstr (...substr: string[]) {
		for (const str of substr) {
			if (this.hasNext(str)) {
				this.cursor += str.length;
				return true;
			}
		}

		return false;
	}

	public clone () {
		return new StringWalker(this.str)
			.walk(this.cursor);
	}
}
