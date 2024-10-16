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
    const UMD_HEADER = "(function(factory){if(typeof module===\"object\"&&typeof module.exports===\"object\"){var v=factory(require, exports);if(v!==undefined)module.exports=v}else if(typeof define===\"function\"&&define.amd){define([\"require\",\"exports\"],factory);}})(function(require,exports){\"use strict\";Object.defineProperty(exports,\"__esModule\",{value:true});";
    const UMD_FOOTER = "})";
    const FUNCTIONS = {
        STRINGIFY: "let s=t=>typeof t==\"string\"?t:Array.isArray(t)?t.map(s).join(\"\"):typeof t.content==\"object\"?s(t.content):t.content;",
        IS_ITERABLE: "let ii=u=>(typeof u==\"object\"||typeof u==\"function\")&&Symbol.iterator in u;",
        CONTENT: "let c=c=>({content:c,toString(){return s(this.content)}});",
        JOIN: "let j=(a,s,v)=>{a=(!a?[]:Array.isArray(a)?a:ii(a)?[...a]:[a]);return (v?a.map(v):a).flatMap((v,i)=>i<a.length-1?[].concat(v,s):v)};",
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
	
export type WeavingArg = Weave | string | number | undefined | null;

export interface Quilt {
`;
    const QUILT_FOOTER = `}

declare const quilt: Quilt;

export namespace Quilt {
	export type Key = keyof Quilt
	export type SimpleKey = keyof { [KEY in keyof Quilt as Parameters<Quilt[KEY]>["length"] extends 0 ? KEY : never]: true }
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
        constructor(options, warps = Quilt.DEFAULT_WARPS) {
            this.options = options;
            this.warps = warps;
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
            this.scriptConsumer?.(`${UMD_HEADER}${Object.values(FUNCTIONS).join("")}exports.default={`);
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
        pendingTranslationOrEntry = "";
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
            let pendingTranslationOrEntry = this.pendingTranslationOrEntry;
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
                            pendingEntry += char;
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
                            default:
                                if (char !== "\r")
                                    pendingEntry += char;
                                continue;
                        }
                    case 5 /* Mode.TranslationOrEntry */:
                        if (nextEscaped && char !== "\r") {
                            pendingTranslationOrEntry += char;
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
                            pendingTranslation += char;
                            nextEscaped = false;
                            continue;
                        }
                        switch (char) {
                            case "\n":
                                mode = 6 /* Mode.TranslationOrDictionaryOrEntry */;
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
        complete() {
            switch (this.mode) {
                case 4 /* Mode.Translation */:
                case 5 /* Mode.TranslationOrEntry */:
                case 6 /* Mode.TranslationOrDictionaryOrEntry */:
                    this.pushEntry();
                    break;
            }
            this.scriptConsumer?.(`}${UMD_FOOTER}`);
            this.definitionsConsumer?.(QUILT_FOOTER);
            return this;
        }
        pushEntry(pendingEntry = this.pendingEntry, pendingTranslation = this.pendingTranslation) {
            const entry = pathify(...this.dictionaries, unpathify(pendingEntry));
            if (pendingTranslation[0] === " ")
                pendingTranslation = pendingTranslation.trim();
            const compile = this.options?.weave ?? Weave_1.default.compile;
            const translation = compile(pendingTranslation, this.warps);
            this.scriptConsumer?.(`"${entry}":${translation.script},`);
            this.definitionsConsumer?.(`\t"${entry}"${translation.definitions};\n`);
        }
    }
    exports.default = Quilt;
});
