var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./Weave"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const Weave_1 = __importDefault(require("./Weave"));
    const UMD_HEADER = "(function(factory){if(typeof module===\"object\"&&typeof module.exports===\"object\"){var v=factory(require, exports);if(v!==undefined)module.exports=v}else if(typeof define===\"function\"&&define.amd){define([\"require\",\"exports\"],factory);}})(function(require,exports){\"use strict\";Object.defineProperty(exports,\"__esModule\",{value:true});";
    const UMD_FOOTER = "})";
    const FUNCTION_STRINGIFY = "let s=t=>Array.isArray(t)?t.map(s).join(\"\"):typeof t.content==\"object\"?s(t.content):t.content;";
    const FUNCTION_CONTENT = "let c=c=>({content:c,toString(){return s(this.content)}});";
    const FUNCTION_LENGTH = "let l=v=>!v?0:typeof v.length==\"number\"?v.length:typeof v.size==\"number\"?v.size:(typeof v==\"object\"||typeof v==\"function\")&&Symbol.iterator in v?[...v].length:typeof v==\"object\"?Object.keys(v).length:0;";
    const QUILT_HEADER = `
export type StringResolvable = string | Weave;

export interface Weft {
	content: StringResolvable;
}

export type Weave = Weft[];

export interface Quilt {
`;
    const QUILT_FOOTER = `}

declare const quilt: Quilt;

export default quilt;
`;
    function unpathify(dictionary) {
        return dictionary.split(/(?<=[^\\]|(?:\\\\)+)\//).map(segment => segment.trim());
    }
    function pathify(...path) {
        return path.flat().join("/");
    }
    class Quilt {
        constructor(options, warps) {
            this.options = options;
            this.warps = warps;
            this.dictionaries = [];
            this.mode = 0 /* CommentOrDictionaryOrEntry */;
            this.pendingDictionary = "";
            this.level = -1;
            this.pendingEntry = "";
            this.nextEscaped = false;
            this.pendingTranslation = "";
            this.pendingTranslationOrEntry = "";
        }
        onScript(consumer) {
            this.scriptConsumer = consumer;
            return this;
        }
        onDefinitions(consumer) {
            this.definitionsConsumer = consumer;
            return this;
        }
        start() {
            var _a, _b;
            (_a = this.scriptConsumer) === null || _a === void 0 ? void 0 : _a.call(this, `${UMD_HEADER}${FUNCTION_STRINGIFY}${FUNCTION_CONTENT}${FUNCTION_LENGTH}exports.default={`);
            (_b = this.definitionsConsumer) === null || _b === void 0 ? void 0 : _b.call(this, QUILT_HEADER);
            return this;
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
                switch (mode) {
                    case 0 /* CommentOrDictionaryOrEntry */:
                        mode = char === "#" ? 2 /* DictionaryLevel */ : 1 /* CommentOrEntry */;
                        break;
                    case 6 /* TranslationOrDictionaryOrEntry */:
                        if (char !== "#")
                            mode = 5 /* TranslationOrEntry */;
                        else {
                            mode = 2 /* DictionaryLevel */;
                            this.pushEntry(pendingEntry, pendingTranslation);
                            pendingEntry = "";
                            pendingTranslation = "";
                        }
                        break;
                }
                switch (mode) {
                    case 2 /* DictionaryLevel */:
                        if (char === "#")
                            level++;
                        else
                            mode = 3 /* Dictionary */;
                        continue;
                    case 3 /* Dictionary */:
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
                                mode = 0 /* CommentOrDictionaryOrEntry */;
                                pendingDictionary = "";
                                level = -1;
                                continue;
                            case "\\":
                                nextEscaped = true;
                                continue;
                            default:
                                mode = 3 /* Dictionary */;
                                if (char !== "\r")
                                    pendingDictionary += char;
                                continue;
                        }
                    case 1 /* CommentOrEntry */:
                        if (nextEscaped && char !== "\r") {
                            pendingEntry += char;
                            nextEscaped = false;
                            continue;
                        }
                        switch (char) {
                            case "\n":
                                mode = 0 /* CommentOrDictionaryOrEntry */;
                                pendingEntry = "";
                                continue;
                            case "\\":
                                nextEscaped = true;
                                continue;
                            case ":":
                                mode = 4 /* Translation */;
                                continue;
                            default:
                                if (char !== "\r")
                                    pendingEntry += char;
                                continue;
                        }
                    case 5 /* TranslationOrEntry */:
                        if (nextEscaped && char !== "\r") {
                            pendingTranslationOrEntry += char;
                            nextEscaped = false;
                            continue;
                        }
                        switch (char) {
                            case "\n":
                                pendingTranslation += pendingTranslationOrEntry + "\n";
                                mode = 6 /* TranslationOrDictionaryOrEntry */;
                                continue;
                            case "\\":
                                nextEscaped = true;
                                continue;
                            case ":":
                                this.pushEntry(pendingEntry, pendingTranslation);
                                pendingEntry = pendingTranslationOrEntry;
                                pendingTranslationOrEntry = "";
                                pendingTranslation = "";
                                mode = 4 /* Translation */;
                                continue;
                            default:
                                if (char !== "\r")
                                    pendingTranslationOrEntry += char;
                                continue;
                        }
                    case 4 /* Translation */:
                        if (nextEscaped && char !== "\r") {
                            pendingTranslation += char;
                            nextEscaped = false;
                            continue;
                        }
                        switch (char) {
                            case "\n":
                                mode = 6 /* TranslationOrDictionaryOrEntry */;
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
            var _a, _b;
            switch (this.mode) {
                case 4 /* Translation */:
                case 5 /* TranslationOrEntry */:
                case 6 /* TranslationOrDictionaryOrEntry */:
                    this.pushEntry();
                    break;
            }
            (_a = this.scriptConsumer) === null || _a === void 0 ? void 0 : _a.call(this, `}${UMD_FOOTER}`);
            (_b = this.definitionsConsumer) === null || _b === void 0 ? void 0 : _b.call(this, QUILT_FOOTER);
            return this;
        }
        pushEntry(pendingEntry = this.pendingEntry, pendingTranslation = this.pendingTranslation) {
            var _a, _b, _c, _d;
            const entry = pathify(...this.dictionaries, unpathify(pendingEntry));
            if (pendingTranslation[0] === " ")
                pendingTranslation = pendingTranslation.trim();
            const compile = (_b = (_a = this.options) === null || _a === void 0 ? void 0 : _a.weave) !== null && _b !== void 0 ? _b : Weave_1.default.compile;
            const translation = compile(pendingTranslation, this.warps);
            (_c = this.scriptConsumer) === null || _c === void 0 ? void 0 : _c.call(this, `"${entry}":${translation.script},`);
            (_d = this.definitionsConsumer) === null || _d === void 0 ? void 0 : _d.call(this, `\t"${entry}"${translation.definitions};\n`);
        }
    }
    exports.default = Quilt;
});
