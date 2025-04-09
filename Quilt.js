var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./warps/WarpArgument", "./warps/WarpConditional", "./warps/WarpTag", "./Weave"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.QuiltError = void 0;
    const WarpArgument_1 = __importDefault(require("./warps/WarpArgument"));
    const WarpConditional_1 = __importDefault(require("./warps/WarpConditional"));
    const WarpTag_1 = __importDefault(require("./warps/WarpTag"));
    const Weave_1 = __importDefault(require("./Weave"));
    const UMD_HEADER = "(function(factory){if(typeof module===\"object\"&&typeof module.exports===\"object\"){var v=factory(require, exports);if(v!==undefined)module.exports=v}else if(typeof define===\"function\"&&define.amd){define([\"require\",\"exports\"],factory);}})(function(require,exports){\"use strict\";Object.defineProperty(exports,\"__esModule\",{value:true});let r=Symbol();let rts=Symbol();exports.WeavingArg={setRenderable:(t,ts)=>(t[r]=true,t[rts]=ts,t),isRenderable:t=>!!t[r]};";
    const UMD_FOOTER = "})";
    const FUNCTIONS = {
        STRINGIFY: "let s=t=>typeof t==\"string\"?t:Array.isArray(t)?t.map(s).join(\"\"):typeof t=='object'&&rts in t?t[rts]():typeof t!=\"object\"||t===null||!t.content?String(t):typeof t.content!=\"object\"?String(t.content):s(t.content);",
        IS_ITERABLE: "let ii=u=>(typeof u==\"object\"||typeof u==\"function\")&&Symbol.iterator in u;",
        CONTENT: "let c=c=>({content:c,toString(){return s(this.content)}});",
        WEFT_ARG: "let w=a=>typeof a=='object'&&'content' in a?a:{content:a};",
        JOIN: "let j=(a,s,v)=>{a=(!a?[]:Array.isArray(a)?a:ii(a)?[...a]:[a]);return (v?a.map(v):a).flatMap((v,i)=>i<a.length-1?[].concat(w(v),s):w(v))};",
        LENGTH: "let l=v=>!v?0:typeof v.length==\"number\"?v.length:typeof v.size==\"number\"?v.size:ii(v)?[...v].length:typeof v==\"object\"?Object.keys(v).length:0;",
    };
    const QUILT_HEADER_PRE_WEFT = `
export interface Weave {
	content: Weft[];
	toString(): string;
}

export interface Weft {
	content: WeavingArg | Weft[];
`;
    const QUILT_HEADER_POST_WEFT = `}

declare const SYMBOL_WEAVING_RENDERABLE: unique symbol;
declare const SYMBOL_WEAVING_RENDERABLE_TO_STRING: unique symbol;

export interface WeavingRenderable {
	[SYMBOL_WEAVING_RENDERABLE]: true
	[SYMBOL_WEAVING_RENDERABLE_TO_STRING]?(): string
}
	
export type WeavingArg = Weave | WeavingRenderable | string | number | undefined | null;
export namespace WeavingArg {
	export function setRenderable<T>(value: T, toString?: () => string): T & WeavingRenderable;
	export function isRenderable<T>(value: T): value is T & WeavingRenderable;
}

export interface Quilt {
`;
    const QUILT_FOOTER = `}

declare const quilt: Quilt;

export namespace Quilt {
	export type Key = keyof Quilt
	export type SimpleKey = keyof { [KEY in keyof Quilt as Parameters<Quilt[KEY]> extends [infer First, ...infer Rest] ? never : KEY]: true }
	export type Handler<ARGS extends any[] = []> = (quilt: Quilt, ...args: ARGS) => Weave
}

export default quilt;
`;
    function unpathify(dictionary) {
        return dictionary.split(/(?<=[^\\]|(?:\\\\)+)\//).map(segment => segment.trim());
    }
    function pathify(...path) {
        return path.flat().join("/");
    }
    class QuiltError extends Error {
        line;
        column;
        constructor(reason, line, column) {
            super(reason);
            this.line = line;
            this.column = column;
        }
    }
    exports.QuiltError = QuiltError;
    class Quilt {
        options;
        warps;
        static DEFAULT_WARPS = [
            WarpTag_1.default,
            WarpConditional_1.default,
            WarpArgument_1.default,
        ];
        tab;
        space;
        newline;
        constructor(options, warps = Quilt.DEFAULT_WARPS) {
            this.options = options;
            this.warps = warps;
            this.tab = this.options?.whitespace ? "\t" : "";
            this.space = this.options?.whitespace ? " " : "";
            this.newline = this.options?.whitespace ? "\n" : "";
        }
        scriptConsumer;
        onScript(consumer) {
            this.scriptConsumer = consumer;
            return this;
        }
        definitionsConsumer;
        onDefinitions(consumer) {
            this.definitionsConsumer = consumer;
            return this;
        }
        errorConsumer;
        onError(consumer) {
            this.errorConsumer = consumer;
            return this;
        }
        start() {
            this.scriptConsumer?.(`${UMD_HEADER}${Object.values(FUNCTIONS).join("")}var q={${this.newline}`);
            this.definitionsConsumer?.(QUILT_HEADER_PRE_WEFT);
            for (const warp of this.warps ?? [])
                for (const [property, type] of warp["_weftProperties"])
                    this.definitionsConsumer?.(`\t${property}?: ${type};\n`);
            this.definitionsConsumer?.(QUILT_HEADER_POST_WEFT);
            return this;
        }
        dictionaries = [];
        mode = 0 /* Mode.CommentOrDictionaryOrEntry */;
        pendingDictionary = "";
        level = -1;
        pendingEntry = "";
        nextEscaped = false;
        pendingTranslation = "";
        pendingReference = "";
        pendingReferenceParameters = [];
        pendingTranslationOrEntry = "";
        isMultilineTranslation = false;
        hasIndentedLine = false;
        line = 0;
        column = 0;
        error(reason) {
            this.errorConsumer?.(new QuiltError(reason, this.line, this.column));
        }
        transform(chunk) {
            let mode = this.mode;
            let pendingDictionary = this.pendingDictionary;
            let level = this.level;
            let pendingEntry = this.pendingEntry;
            let nextEscaped = this.nextEscaped;
            let pendingTranslation = this.pendingTranslation;
            let pendingReference = this.pendingTranslation;
            const pendingReferenceParameters = this.pendingReferenceParameters;
            let pendingTranslationOrEntry = this.pendingTranslationOrEntry;
            let isMultilineTranslation = this.isMultilineTranslation;
            let hasIndentedLine = this.hasIndentedLine;
            for (let i = 0; i < chunk.length; i++) {
                const char = chunk[i];
                if (char === "\n")
                    this.line++, this.column = 0;
                else
                    this.column++;
                switch (mode) {
                    case 0 /* Mode.CommentOrDictionaryOrEntry */:
                        mode = char === "#" ? 2 /* Mode.DictionaryLevel */ : 1 /* Mode.CommentOrEntry */;
                        break;
                    case 6 /* Mode.TranslationOrDictionaryOrEntry */:
                        if (char !== "#")
                            mode = 5 /* Mode.TranslationOrEntry */;
                        else {
                            mode = 2 /* Mode.DictionaryLevel */;
                            this.pushEntry(pendingEntry, pendingTranslation);
                            pendingEntry = "";
                            pendingTranslation = "";
                        }
                        break;
                    case 9 /* Mode.ReferenceParameterOrDictionaryOrEntry */:
                        if (char === "#")
                            mode = 2 /* Mode.DictionaryLevel */;
                        else if (char === "\t" && chunk[i + 1] === "|") {
                            mode = 8 /* Mode.ReferenceParameter */;
                            i++;
                            this.column++;
                        }
                        else
                            mode = 1 /* Mode.CommentOrEntry */;
                        if (mode !== 8 /* Mode.ReferenceParameter */) {
                            this.pushReference(pendingEntry, pendingReference, pendingReferenceParameters);
                            pendingEntry = "";
                            pendingReference = "";
                            pendingReferenceParameters.splice(0, Infinity);
                        }
                        break;
                }
                switch (mode) {
                    case 2 /* Mode.DictionaryLevel */:
                        if (char === "#")
                            level++;
                        else
                            mode = 3 /* Mode.Dictionary */;
                        continue;
                    case 3 /* Mode.Dictionary */:
                        if (nextEscaped && char !== "\r") {
                            pendingDictionary += char === "n" ? "\n" : char;
                            nextEscaped = false;
                            continue;
                        }
                        switch (char) {
                            case "#":
                                level++;
                                continue;
                            case "\n":
                                this.dictionaries.splice(level, Infinity, unpathify(pendingDictionary));
                                mode = 0 /* Mode.CommentOrDictionaryOrEntry */;
                                pendingDictionary = "";
                                level = -1;
                                continue;
                            case "\\":
                                nextEscaped = true;
                                continue;
                            default:
                                mode = 3 /* Mode.Dictionary */;
                                if (char !== "\r")
                                    pendingDictionary += char;
                                continue;
                        }
                    case 1 /* Mode.CommentOrEntry */:
                        if (nextEscaped && char !== "\r") {
                            pendingEntry += char === "n" ? "\n" : char;
                            nextEscaped = false;
                            continue;
                        }
                        switch (char) {
                            case "\n":
                                mode = 0 /* Mode.CommentOrDictionaryOrEntry */;
                                pendingEntry = "";
                                continue;
                            case "\\":
                                nextEscaped = true;
                                continue;
                            case ":":
                                mode = 4 /* Mode.Translation */;
                                continue;
                            case "=":
                                mode = 7 /* Mode.Reference */;
                                continue;
                            default:
                                if (char !== "\r")
                                    pendingEntry += char;
                                continue;
                        }
                    case 5 /* Mode.TranslationOrEntry */:
                        if (nextEscaped && char !== "\r") {
                            pendingTranslationOrEntry += char === "n" ? "\n" : char;
                            nextEscaped = false;
                            continue;
                        }
                        switch (char) {
                            case "\n":
                                pendingTranslation += pendingTranslationOrEntry + "\n";
                                mode = 6 /* Mode.TranslationOrDictionaryOrEntry */;
                                continue;
                            case "\\":
                                nextEscaped = true;
                                continue;
                            case "=":
                                this.pushEntry(pendingEntry, pendingTranslation);
                                pendingEntry = pendingTranslationOrEntry;
                                pendingTranslationOrEntry = "";
                                pendingTranslation = "";
                                mode = 7 /* Mode.Reference */;
                                continue;
                            case ":":
                                this.pushEntry(pendingEntry, pendingTranslation);
                                pendingEntry = pendingTranslationOrEntry;
                                pendingTranslationOrEntry = "";
                                pendingTranslation = "";
                                mode = 4 /* Mode.Translation */;
                                continue;
                            default:
                                if (char !== "\r")
                                    pendingTranslationOrEntry += char;
                                continue;
                        }
                    case 4 /* Mode.Translation */:
                        if (nextEscaped && char !== "\r") {
                            pendingTranslation += char === "n" ? "\n" : char;
                            nextEscaped = false;
                            continue;
                        }
                        if (isMultilineTranslation && !hasIndentedLine) {
                            if (char === "\t") {
                                hasIndentedLine = true;
                                continue;
                            }
                            if (char !== "\n" && char !== "\r") {
                                if (pendingTranslation.endsWith("\n"))
                                    pendingTranslation = pendingTranslation.slice(0, -1);
                                this.pushEntry(pendingEntry, pendingTranslation);
                                pendingEntry = "";
                                pendingTranslation = "";
                                mode = 0 /* Mode.CommentOrDictionaryOrEntry */;
                                isMultilineTranslation = false;
                                i--;
                                continue;
                            }
                        }
                        switch (char) {
                            case "\n":
                                if (!pendingTranslation.trim().length) {
                                    isMultilineTranslation = true;
                                    continue;
                                }
                                if (!isMultilineTranslation) {
                                    this.pushEntry(pendingEntry, pendingTranslation);
                                    pendingEntry = "";
                                    pendingTranslation = "";
                                    mode = 0 /* Mode.CommentOrDictionaryOrEntry */;
                                    isMultilineTranslation = false;
                                }
                                else {
                                    pendingTranslation += "\n";
                                    hasIndentedLine = false;
                                }
                                continue;
                            case "\\":
                                nextEscaped = true;
                                continue;
                            default:
                                if (char !== "\r")
                                    pendingTranslation += char;
                                continue;
                        }
                    case 7 /* Mode.Reference */:
                        if (nextEscaped && char !== "\r") {
                            pendingReference += char === "n" ? "\n" : char;
                            nextEscaped = false;
                            continue;
                        }
                        switch (char) {
                            case "\n":
                                this.pushReference(pendingEntry, pendingReference, pendingReferenceParameters);
                                pendingEntry = "";
                                pendingReference = "";
                                pendingReferenceParameters.splice(0, Infinity);
                                mode = 6 /* Mode.TranslationOrDictionaryOrEntry */;
                                continue;
                            case "\\":
                                nextEscaped = true;
                                continue;
                            case "|":
                                mode = 8 /* Mode.ReferenceParameter */;
                                continue;
                            case " ":
                                if (chunk[i + 1] === "|") {
                                    mode = 8 /* Mode.ReferenceParameter */;
                                    i++;
                                    continue;
                                }
                            // eslint-disable-next-line no-fallthrough
                            default:
                                if (char !== "\r")
                                    pendingReference += char;
                                continue;
                        }
                    case 8 /* Mode.ReferenceParameter */:
                        if (nextEscaped && char !== "\r") {
                            pendingTranslation += char === "n" ? "\n" : char;
                            nextEscaped = false;
                            continue;
                        }
                        switch (char) {
                            case "\n":
                                pendingReferenceParameters.push(pendingTranslation);
                                pendingTranslation = "";
                                mode = 9 /* Mode.ReferenceParameterOrDictionaryOrEntry */;
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
            this.pendingReference = pendingReference;
            this.pendingTranslationOrEntry = pendingTranslationOrEntry;
            this.isMultilineTranslation = isMultilineTranslation;
            this.hasIndentedLine = hasIndentedLine;
            return this;
        }
        complete() {
            switch (this.mode) {
                case 4 /* Mode.Translation */:
                case 5 /* Mode.TranslationOrEntry */:
                case 6 /* Mode.TranslationOrDictionaryOrEntry */:
                    this.pushEntry();
                    break;
            }
            this.scriptConsumer?.(`};exports.default=q${UMD_FOOTER}`);
            this.definitionsConsumer?.(QUILT_FOOTER);
            return this;
        }
        pushEntry(pendingEntry = this.pendingEntry, pendingTranslation = this.pendingTranslation) {
            if (!pendingEntry || !pendingTranslation)
                return;
            const entry = pathify(...this.dictionaries, unpathify(pendingEntry));
            if (pendingTranslation[0] === " ")
                pendingTranslation = pendingTranslation.trim();
            const compile = this.options?.weave ?? Weave_1.default.compile;
            const translation = compile(pendingTranslation, this.warps);
            this.scriptConsumer?.(`${this.tab}"${entry}":${this.space}${translation.script},${this.newline}`);
            this.definitionsConsumer?.(`\t"${entry}"${translation.definitions};\n`);
        }
        pushReference(pendingEntry = this.pendingEntry, pendingReference = this.pendingReference, pendingReferenceParameters = this.pendingReferenceParameters) {
            const entry = pathify(...this.dictionaries, unpathify(pendingEntry));
            if (pendingReference[0] === " ")
                pendingReference = pendingReference.trim();
            const compile = this.options?.weave ?? Weave_1.default.compile;
            const translations = pendingReferenceParameters.map(parameter => `(${compile(parameter.trim(), this.warps).script})(),`);
            this.scriptConsumer?.(`${this.tab}"${entry}":${this.space}(...a) => q["${pendingReference}"](${translations.join("")}...a),${this.newline}`);
            if (!pendingReferenceParameters.length)
                this.definitionsConsumer?.(`\t"${entry}": Quilt["${pendingReference}"];\n`);
            else
                this.definitionsConsumer?.(`\t"${entry}": Quilt["${pendingReference}"] extends (${pendingReferenceParameters.map((_, i) => `_${i}: any, `).join("")}...parameters: infer P) => infer R ? (...parameters: P) => R : never;\n`);
        }
    }
    exports.default = Quilt;
});
