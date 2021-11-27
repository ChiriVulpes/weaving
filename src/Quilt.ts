import Warp from "./Warp";
import Weave from "./Weave";

const UMD_HEADER = "(function(factory){if(typeof module===\"object\"&&typeof module.exports===\"object\"){var v=factory(require, exports);if(v!==undefined)module.exports=v}else if(typeof define===\"function\"&&define.amd){define([\"require\",\"exports\"],factory);}})(function(require,exports){\"use strict\";Object.defineProperty(exports,\"__esModule\",{value:true});";
const UMD_FOOTER = "})";

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
	return dictionary.split(/(?<=[^\\]|(\\\\)+)\//).map(segment => segment.trim());
}

function pathify (...path: string[][]) {
	return path.flat().join("/");
}

export default class Quilt {

	public constructor (private readonly warps?: Warp[]) {
	}

	private scriptConsumer?: (chunk: string) => any;
	public onScript (consumer: (chunk: string) => any) {
		this.scriptConsumer = consumer;
		return this;
	}

	private definitionsConsumer?: (chunk: string) => any;
	public onDefinitions (consumer: (chunk: string) => any) {
		this.definitionsConsumer = consumer;
		return this;
	}

	public start () {
		this.scriptConsumer?.(`${UMD_HEADER}let r=t=>Array.isArray(t)?t.map(r).join(""):typeof t.content=="object"?r(t.content):t.content;let c=c=>({content:c,toString(){return r(this.content)}});exports.default={`);
		this.definitionsConsumer?.(`
declare type StringResolvable = string | { toString (): string };

interface Weft {
	content: StringResolvable
}

declare const quilt: {
		`.trim() + "\n");
		return this;
	}

	private readonly dictionaries: string[][] = [];
	private mode = Mode.CommentOrDictionaryOrEntry;
	private pendingDictionary = "";
	private level = -1;
	private pendingEntry = "";
	private nextEscaped = false;
	private pendingTranslation = "";
	private pendingTranslationOrEntry = "";

	public transform (chunk: string) {
		let mode = this.mode;
		let pendingDictionary = this.pendingDictionary;
		let level = this.level;
		let pendingEntry = this.pendingEntry;
		let nextEscaped = this.nextEscaped;
		let pendingTranslation = this.pendingTranslation;
		let pendingTranslationOrEntry = this.pendingTranslationOrEntry;

		for (let i = 0; i < chunk.length; i++) {
			const char = chunk[i];
			switch (mode) {
				case Mode.CommentOrDictionaryOrEntry:
					mode = char === "#" ? Mode.DictionaryLevel : Mode.CommentOrEntry;
					break;
				case Mode.TranslationOrDictionaryOrEntry:
					if (char !== "#")
						mode = Mode.TranslationOrEntry;
					else {
						mode = Mode.DictionaryLevel;
						this.pushEntry(pendingEntry, pendingTranslation);
						pendingEntry = "";
						pendingTranslation = "";
					}
					break;
			}

			switch (mode) {
				case Mode.DictionaryLevel:
					if (char === "#")
						level++;
					else
						mode = Mode.Dictionary;
					continue;

				case Mode.Dictionary:
					if (nextEscaped && char !== "\r") {
						pendingDictionary += char;
						nextEscaped = false;
						continue;
					}

					switch (char) {
						case "#":
							level++;
							continue;

						case "\n":
							this.dictionaries.splice(level, Infinity, unpathify(pendingDictionary));
							mode = Mode.CommentOrDictionaryOrEntry;
							pendingDictionary = "";
							level = -1;
							continue;

						case "\\":
							nextEscaped = true;
							continue;

						default:
							mode = Mode.Dictionary;
							if (char !== "\r")
								pendingDictionary += char;
							continue;
					}

				case Mode.CommentOrEntry:
					if (nextEscaped && char !== "\r") {
						pendingEntry += char;
						nextEscaped = false;
						continue;
					}

					switch (char) {
						case "\n":
							mode = Mode.CommentOrDictionaryOrEntry;
							pendingEntry = "";
							continue;

						case "\\":
							nextEscaped = true;
							continue;

						case ":":
							mode = Mode.Translation;
							continue;

						default:
							if (char !== "\r")
								pendingEntry += char;
							continue;
					}

				case Mode.TranslationOrEntry:
					if (nextEscaped && char !== "\r") {
						pendingTranslationOrEntry += char;
						nextEscaped = false;
						continue;
					}

					switch (char) {
						case "\n":
							pendingTranslation += pendingTranslationOrEntry + "\n";
							mode = Mode.TranslationOrDictionaryOrEntry;
							continue;

						case "\\":
							nextEscaped = true;
							continue;

						case ":":
							this.pushEntry(pendingEntry, pendingTranslation);
							pendingEntry = pendingTranslationOrEntry;
							pendingTranslationOrEntry = "";
							pendingTranslation = "";
							mode = Mode.Translation;
							continue;

						default:
							if (char !== "\r")
								pendingTranslationOrEntry += char;
							continue;
					}

				case Mode.Translation:
					if (nextEscaped && char !== "\r") {
						pendingTranslation += char;
						nextEscaped = false;
						continue;
					}

					switch (char) {
						case "\n":
							mode = Mode.TranslationOrDictionaryOrEntry;
							continue;

						case "\\":
							nextEscaped = true;
							continue;

						default:
							if (char !== "\r")
								pendingTranslation += char;
							continue;
					}

			}
		}

		this.mode = mode;
		this.pendingDictionary = pendingDictionary;
		this.level = level;
		this.pendingEntry = pendingEntry;
		this.nextEscaped = nextEscaped;
		this.pendingTranslation = pendingTranslation;
		this.pendingTranslationOrEntry = pendingTranslationOrEntry;
		return this;
	}

	public complete () {
		switch (this.mode) {
			case Mode.Translation:
			case Mode.TranslationOrEntry:
			case Mode.TranslationOrDictionaryOrEntry:
				this.pushEntry();
				break;
		}

		this.scriptConsumer?.(`}${UMD_FOOTER}`);
		this.definitionsConsumer?.(`
};

export default quilt;
		`.trim());
		return this;
	}

	private pushEntry (pendingEntry = this.pendingEntry, pendingTranslation = this.pendingTranslation) {
		const entry = pathify(...this.dictionaries, unpathify(pendingEntry));
		if (pendingTranslation[0] === " ")
			pendingTranslation = pendingTranslation.trim();
		const translation = Weave.compile(pendingTranslation, this.warps);
		this.scriptConsumer?.(`"${entry}":${translation.script},`);
		this.definitionsConsumer?.(`\t"${entry}"${translation.definitions};\n`);
	}
}
