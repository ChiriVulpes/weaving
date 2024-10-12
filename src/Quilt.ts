import type Warp from "./Warp"
import WarpArgument from "./warps/WarpArgument"
import WarpConditional from "./warps/WarpConditional"
import WarpTag from "./warps/WarpTag"
import Weave from "./Weave"

const UMD_HEADER = "(function(factory){if(typeof module===\"object\"&&typeof module.exports===\"object\"){var v=factory(require, exports);if(v!==undefined)module.exports=v}else if(typeof define===\"function\"&&define.amd){define([\"require\",\"exports\"],factory);}})(function(require,exports){\"use strict\";Object.defineProperty(exports,\"__esModule\",{value:true});"
const UMD_FOOTER = "})"

const FUNCTIONS = {
	STRINGIFY: "let s=t=>Array.isArray(t)?t.map(s).join(\"\"):typeof t.content==\"object\"?s(t.content):t.content;",
	IS_ITERABLE: "let ii=u=>(typeof u==\"object\"||typeof u==\"function\")&&Symbol.iterator in u;",
	CONTENT: "let c=c=>({content:c,toString(){return s(this.content)}});",
	JOIN: "let j=(a,s,v)=>{a=(!a?[]:Array.isArray(a)?a:ii(a)?[...a]:[a]);a=v?a.map(v):a;return a.join(s)};",
	LENGTH: "let l=v=>!v?0:typeof v.length==\"number\"?v.length:typeof v.size==\"number\"?v.size:ii(v)?[...v].length:typeof v==\"object\"?Object.keys(v).length:0;",
}

const QUILT_HEADER_PRE_WEFT = `
export interface Weave {
	content: Weft[];
	toString(): string;
}

export interface Weft {
	content: StringResolvable;
`
const QUILT_HEADER_POST_WEFT = `}
	
export type StringResolvable = string | Weft[];

export interface Quilt {
`

const QUILT_FOOTER = `}

declare const quilt: Quilt;

export namespace Quilt {
	export type Key = keyof Quilt
	export type SimpleKey = keyof { [KEY in keyof Quilt as Parameters<Quilt[KEY]>["length"] extends 0 ? KEY : never]: true }
	export type Handler = (quilt: Quilt) => Weave
}

export default quilt;
`

const enum Mode {
	CommentOrDictionaryOrEntry,
	CommentOrEntry,
	DictionaryLevel,
	Dictionary,
	Translation,
	TranslationOrEntry,
	TranslationOrDictionaryOrEntry,
}

function unpathify (dictionary: string) {
	return dictionary.split(/(?<=[^\\]|(?:\\\\)+)\//).map(segment => segment.trim())
}

function pathify (...path: string[][]) {
	return path.flat().join("/")
}

export interface IQuiltOptions {
	/** Replace the default weaving function with an edited implementation. The default implementation resides in `Weave.compile` */
	weave?: typeof Weave.compile
}

export class QuiltError extends Error {
	public constructor (reason: string, public readonly line: number, public readonly column: number) {
		super(reason)
	}
}

export default class Quilt {

	public static DEFAULT_WARPS: Warp[] = [
		WarpTag,
		WarpConditional,
		WarpArgument,
	]

	public constructor (private readonly options?: IQuiltOptions, private readonly warps = Quilt.DEFAULT_WARPS) {
	}

	private scriptConsumer?: (chunk: string) => any
	public onScript (consumer: (chunk: string) => any) {
		this.scriptConsumer = consumer
		return this
	}

	private definitionsConsumer?: (chunk: string) => any
	public onDefinitions (consumer: (chunk: string) => any) {
		this.definitionsConsumer = consumer
		return this
	}

	private errorConsumer?: (error: Error) => any
	public onError (consumer: (error: Error) => any) {
		this.errorConsumer = consumer
		return this
	}

	public start () {
		this.scriptConsumer?.(`${UMD_HEADER}${Object.values(FUNCTIONS).join("")}exports.default={`)
		this.definitionsConsumer?.(QUILT_HEADER_PRE_WEFT)
		for (const warp of this.warps ?? [])
			for (const [property, type] of warp["_weftProperties"])
				this.definitionsConsumer?.(`\t${property}?: ${type};\n`)
		this.definitionsConsumer?.(QUILT_HEADER_POST_WEFT)
		return this
	}

	private readonly dictionaries: string[][] = []
	private mode = Mode.CommentOrDictionaryOrEntry
	private pendingDictionary = ""
	private level = -1
	private pendingEntry = ""
	private nextEscaped = false
	private pendingTranslation = ""
	private pendingTranslationOrEntry = ""
	private line = 0
	private column = 0

	public error (reason: string) {
		this.errorConsumer?.(new QuiltError(reason, this.line, this.column))
	}

	public transform (chunk: string) {
		let mode = this.mode
		let pendingDictionary = this.pendingDictionary
		let level = this.level
		let pendingEntry = this.pendingEntry
		let nextEscaped = this.nextEscaped
		let pendingTranslation = this.pendingTranslation
		let pendingTranslationOrEntry = this.pendingTranslationOrEntry

		for (let i = 0; i < chunk.length; i++) {
			const char = chunk[i]
			if (char === "\n") this.line++, this.column = 0
			else this.column++

			switch (mode) {
				case Mode.CommentOrDictionaryOrEntry:
					mode = char === "#" ? Mode.DictionaryLevel : Mode.CommentOrEntry
					break
				case Mode.TranslationOrDictionaryOrEntry:
					if (char !== "#")
						mode = Mode.TranslationOrEntry
					else {
						mode = Mode.DictionaryLevel
						this.pushEntry(pendingEntry, pendingTranslation)
						pendingEntry = ""
						pendingTranslation = ""
					}
					break
			}

			switch (mode) {
				case Mode.DictionaryLevel:
					if (char === "#")
						level++
					else
						mode = Mode.Dictionary
					continue

				case Mode.Dictionary:
					if (nextEscaped && char !== "\r") {
						pendingDictionary += char
						nextEscaped = false
						continue
					}

					switch (char) {
						case "#":
							level++
							continue

						case "\n":
							this.dictionaries.splice(level, Infinity, unpathify(pendingDictionary))
							mode = Mode.CommentOrDictionaryOrEntry
							pendingDictionary = ""
							level = -1
							continue

						case "\\":
							nextEscaped = true
							continue

						default:
							mode = Mode.Dictionary
							if (char !== "\r")
								pendingDictionary += char
							continue
					}

				case Mode.CommentOrEntry:
					if (nextEscaped && char !== "\r") {
						pendingEntry += char
						nextEscaped = false
						continue
					}

					switch (char) {
						case "\n":
							mode = Mode.CommentOrDictionaryOrEntry
							pendingEntry = ""
							continue

						case "\\":
							nextEscaped = true
							continue

						case ":":
							mode = Mode.Translation
							continue

						default:
							if (char !== "\r")
								pendingEntry += char
							continue
					}

				case Mode.TranslationOrEntry:
					if (nextEscaped && char !== "\r") {
						pendingTranslationOrEntry += char
						nextEscaped = false
						continue
					}

					switch (char) {
						case "\n":
							pendingTranslation += pendingTranslationOrEntry + "\n"
							mode = Mode.TranslationOrDictionaryOrEntry
							continue

						case "\\":
							nextEscaped = true
							continue

						case ":":
							this.pushEntry(pendingEntry, pendingTranslation)
							pendingEntry = pendingTranslationOrEntry
							pendingTranslationOrEntry = ""
							pendingTranslation = ""
							mode = Mode.Translation
							continue

						default:
							if (char !== "\r")
								pendingTranslationOrEntry += char
							continue
					}

				case Mode.Translation:
					if (nextEscaped && char !== "\r") {
						pendingTranslation += char
						nextEscaped = false
						continue
					}

					switch (char) {
						case "\n":
							mode = Mode.TranslationOrDictionaryOrEntry
							continue

						case "\\":
							nextEscaped = true
							continue

						default:
							if (char !== "\r")
								pendingTranslation += char
							continue
					}

			}
		}

		this.mode = mode
		this.pendingDictionary = pendingDictionary
		this.level = level
		this.pendingEntry = pendingEntry
		this.nextEscaped = nextEscaped
		this.pendingTranslation = pendingTranslation
		this.pendingTranslationOrEntry = pendingTranslationOrEntry
		return this
	}

	public complete () {
		switch (this.mode) {
			case Mode.Translation:
			case Mode.TranslationOrEntry:
			case Mode.TranslationOrDictionaryOrEntry:
				this.pushEntry()
				break
		}

		this.scriptConsumer?.(`}${UMD_FOOTER}`)
		this.definitionsConsumer?.(QUILT_FOOTER)
		return this
	}

	private pushEntry (pendingEntry = this.pendingEntry, pendingTranslation = this.pendingTranslation) {
		const entry = pathify(...this.dictionaries, unpathify(pendingEntry))
		if (pendingTranslation[0] === " ")
			pendingTranslation = pendingTranslation.trim()
		const compile = this.options?.weave ?? Weave.compile
		const translation = compile(pendingTranslation, this.warps)
		this.scriptConsumer?.(`"${entry}":${translation.script},`)
		this.definitionsConsumer?.(`\t"${entry}"${translation.definitions};\n`)
	}
}
