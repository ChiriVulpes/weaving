var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "fs/promises", "path", "./File", "./StringWalker", "./warps/WarpArgument", "./warps/WarpConditional", "./warps/WarpTag", "./Weave"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const fs = __importStar(require("fs/promises"));
    const path_1 = __importDefault(require("path"));
    const File_1 = __importDefault(require("./File"));
    const StringWalker_1 = __importDefault(require("./StringWalker"));
    const WarpArgument_1 = __importDefault(require("./warps/WarpArgument"));
    const WarpConditional_1 = __importDefault(require("./warps/WarpConditional"));
    const WarpTag_1 = __importDefault(require("./warps/WarpTag"));
    const Weave_1 = __importDefault(require("./Weave"));
    async function Quilt(file, options, warps = Quilt.DEFAULT_WARPS) {
        if (!file.endsWith(".quilt"))
            file += ".quilt";
        file = File_1.default.relative(file);
        options?.watcher?.add(file);
        const contents = await fs.readFile(file, "utf8").catch(() => null);
        if (contents === null)
            throw error(`Unable to read quilt file: ${file}`);
        const quilt = {
            file,
            contents,
            threads: {},
        };
        const walker = new StringWalker_1.default(contents);
        let currentLevel = 0;
        const weave = options?.weave ?? Weave_1.default.compile;
        async function consume() {
            const threads = {};
            while (!walker.ended) {
                if (walker.hasNext("#")) {
                    const section = await consumeSection();
                    if (!section)
                        break;
                    Object.assign(threads, section);
                    continue;
                }
                if (walker.hasNext("- ")) {
                    // comment
                    walker.walkLine();
                    walker.walkNewlines();
                    continue;
                }
                if (walker.walkChar("~")) {
                    const importFile = path_1.default.join(path_1.default.dirname(file), walker.walkLine());
                    const subThreads = await Quilt(importFile, options, warps);
                    Object.assign(threads, subThreads.threads);
                    walker.walkNewlines();
                    continue;
                }
                const threadName = consumeThreadName();
                threads[threadName] = consumeThread();
                walker.walkNewlines();
            }
            return threads;
        }
        function consumeThread() {
            switch (walker.char) {
                case ":": {
                    walker.walkChar(":"); // Consume the colon
                    return consumeWeaveOpportunity();
                }
                case "=": {
                    walker.walkChar("="); // Consume the equals sign
                    const refThreadName = consumeThreadName();
                    if (walker.walkWhitespace() && walker.walkChar("|")) {
                        // Reference with argument(s)
                        const argumentWeave = consumeWeaveOpportunity();
                        return {
                            script: `(...a) => q["${refThreadName}"]((${argumentWeave.script})(), ...a)`,
                            // This definition structure is based on QuiltOld.ts for binding one argument
                            // and passing through the rest.
                            definition: `: Quilt["${refThreadName}"] extends (_arg0: any, ...parameters: infer P) => infer R ? (...parameters: P) => R : never`,
                        };
                    }
                    // Simple reference (no arguments provided here)
                    return {
                        script: `(...a) => q["${refThreadName}"](...a)`,
                        definition: `: Quilt["${refThreadName}"]`,
                    };
                }
                default:
                    throw error("Expected ':' or '=' after thread name'");
            }
        }
        function consumeWeaveOpportunity() {
            if (walker.walkNewlines())
                return consumeMultilineWeave();
            if (walker.walkChar(" "))
                return consumeWeave();
            throw error("Expected whitespace after thread name");
        }
        function consumeWeave() {
            const line = walker.walkLine();
            const text = processEscapeCharacters(line);
            return weave(text, warps);
        }
        function consumeMultilineWeave() {
            let text = "";
            while (walker.walkChar("\t")) {
                const line = walker.walkLine();
                text += line + "\n";
                walker.walkNewlines();
            }
            if (text)
                text = text.slice(0, -1);
            text = processEscapeCharacters(text);
            return weave(text, warps);
        }
        function processEscapeCharacters(text) {
            let result = "";
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                if (char !== "\\") {
                    result += char;
                    continue;
                }
                const nextChar = text[i + 1];
                switch (nextChar) {
                    case "n":
                        result += "\n";
                        i++;
                        continue;
                    case "t":
                        result += "\t";
                        i++;
                        continue;
                    case "\n":
                        // Skip the newline character
                        i++;
                        continue;
                    case "\\":
                        result += "\\";
                        i++;
                        continue;
                    case "x": {
                        const hex = text.slice(i + 2, i + 4);
                        if (hex.length !== 2)
                            throw error("Invalid hex escape sequence, expected 2 characters after \\x");
                        const charCode = parseInt(hex, 16);
                        if (isNaN(charCode))
                            throw error(`Invalid hex escape sequence: \\x${hex}`);
                        result += String.fromCharCode(charCode);
                        i += 3;
                        continue;
                    }
                    case "u": {
                        const hex = text.slice(i + 2, i + 6);
                        if (hex.length !== 4)
                            throw error("Invalid unicode escape sequence, expected 4 characters after \\u");
                        const charCode = parseInt(hex, 16);
                        if (isNaN(charCode))
                            throw error(`Invalid unicode escape sequence: \\u${hex}`);
                        result += String.fromCharCode(charCode);
                        i += 5;
                        continue;
                    }
                    default:
                        throw error(`Unnecessary escape sequence: \\${nextChar}`);
                }
            }
            return result;
        }
        async function consumeSection() {
            walker.save();
            const levelBefore = currentLevel;
            const level = walker.walkUntilNot("#").length;
            if (level <= levelBefore) {
                walker.restore();
                return null;
            }
            currentLevel = level;
            walker.unsave();
            walker.walkWhitespace();
            const name = consumeThreadName();
            if (!walker.walkNewlines())
                throw new Error("Expected newline after thread name");
            const threads = await consume();
            currentLevel = levelBefore;
            return Object.fromEntries(Object.entries(threads)
                .map(([threadName, thread]) => {
                return [`${name}/${threadName}`, thread];
            }));
        }
        function consumeThreadName() {
            for (let i = walker.cursor; i < walker.str.length; i++) {
                const charCode = walker.str.charCodeAt(i);
                const isValidChar = false
                    || (charCode >= 97 && charCode <= 122) // a-z
                    || (charCode >= 48 && charCode <= 57) // 0-9
                    || charCode === 47 // /
                    || charCode === 45 // -
                    || charCode === 95; // _
                if (!isValidChar) {
                    const name = walker.str.slice(walker.cursor, i);
                    if (!name)
                        throw error("Expected thread name");
                    walker.walkTo(i);
                    return name;
                }
            }
            throw error("Unexpected end of file");
        }
        function error(message) {
            return new Quilt.Error(message, walker.line, walker.column);
        }
        Object.assign(quilt.threads, await consume());
        return quilt;
    }
    const BaseError = Error;
    (function (Quilt) {
        Quilt.DEFAULT_WARPS = [
            WarpTag_1.default,
            WarpConditional_1.default,
            WarpArgument_1.default,
        ];
        class Error extends BaseError {
            line;
            column;
            constructor(reason, line, column) {
                super(reason);
                this.line = line;
                this.column = column;
            }
        }
        Quilt.Error = Error;
    })(Quilt || (Quilt = {}));
    exports.default = Quilt;
});
