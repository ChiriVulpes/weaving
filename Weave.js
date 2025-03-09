var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./StringWalker", "./Token"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const StringWalker_1 = __importDefault(require("./StringWalker"));
    const Token_1 = __importDefault(require("./Token"));
    class Weave {
        raw;
        warps;
        static compile(source, warps) {
            return Weave.compileTokens(...new Weave(source, warps).tokenise());
        }
        static compileTokens(...tokens) {
            let compiled = "";
            const argTypes = [];
            let lastRequiredIndex = -1;
            const optionals = [];
            let hasRest = false;
            for (const token of tokens) {
                if (!token.compiled)
                    continue;
                compiled += `${token.compiled},`;
                for (const { path, type, optional, rest } of token.args ?? []) {
                    if (rest) {
                        hasRest = true;
                        break;
                    }
                    const keys = path.split(".");
                    if (keys.length === 0)
                        continue;
                    if (isNaN(+keys[0]))
                        keys.unshift("0");
                    const generatedType = this.compileType(keys.slice(1), type);
                    const index = +keys[0];
                    (argTypes[index] ??= new Set()).add(generatedType);
                    if (!optional)
                        lastRequiredIndex = Math.max(index, lastRequiredIndex);
                    optionals[index] ??= true;
                    optionals[index] &&= optional;
                }
            }
            compiled = compiled.slice(0, -1);
            let args = "";
            if (argTypes.length)
                args = argTypes
                    .map((typeSet, i) => {
                    if (typeSet.size > 1)
                        // prevent `Explicit Types & any`
                        typeSet.delete("any");
                    const type = [...typeSet].join(" & ");
                    return `arg_${i}${lastRequiredIndex < i ? "?" : ""}: ${optionals[i] && lastRequiredIndex >= i ? `(${type}) | undefined` : type}`;
                })
                    .join(", ");
            if (hasRest)
                args += `${args ? ", " : ""}...args: WeavingArg[]`;
            return {
                script: `${args ? "(...a)" : "_"}=>c([${compiled}])`,
                definitions: `(${args}): Weave`,
            };
        }
        static compileType(keys, type) {
            let result = type;
            for (let i = keys.length - 1; i >= 0; i--)
                result = `{ "${keys[i]}": ${result} }`;
            return result;
        }
        constructor(raw, warps) {
            this.raw = raw;
            this.warps = warps;
        }
        tokenise(walker = new StringWalker_1.default(this.raw), until) {
            const tokens = [];
            let token;
            const warps = this.buildWarpCache();
            until ??= [];
            let char = walker.char;
            NextChar: do {
                if (until.some(substr => walker.hasNext(substr)))
                    break;
                const matchingFirstChar = warps[char];
                if (matchingFirstChar !== undefined && matchingFirstChar.size > 0) {
                    const result = this.tokeniseWarp(walker, matchingFirstChar);
                    if (result) {
                        tokens.push(...result);
                        token = tokens[tokens.length - 1];
                        walker.prev();
                        continue NextChar;
                    }
                }
                if (!(token instanceof Token_1.default.Text))
                    tokens.push(token = new Token_1.default.Text());
                token.text += char;
                // eslint-disable-next-line no-cond-assign
            } while (char = walker.next());
            return tokens;
        }
        tokeniseWarp(walker, warps) {
            const matching = [];
            for (const warp of warps)
                for (const match of arrayOr(warp.matches))
                    for (const start of match.start)
                        if (walker.hasNext(start))
                            matching.push([warp, match, walker.clone().walk(start.length)]);
            for (const [warp, match, warpWalker] of matching) {
                const warpTokens = warp.tokenise?.(warpWalker, match, this);
                if (!warpTokens)
                    continue;
                if (!warpWalker.walkSubstr(...match.end) && !warpWalker.ended)
                    continue;
                walker.walkTo(warpWalker.cursor);
                return arrayOr(warpTokens);
            }
            return undefined;
        }
        with(warps) {
            return new Weave(this.raw, [...warps, ...this.warps]);
        }
        warpCache;
        /**
         * @returns A Record mapping all warps to the first character of each of their starts
         */
        buildWarpCache() {
            if (this.warpCache)
                return this.warpCache;
            const cache = {};
            for (const warp of this.warps) {
                for (const match of arrayOr(warp.matches)) {
                    for (const start of match.start) {
                        cache[start[0]] ??= new Set();
                        cache[start[0]].add(warp);
                    }
                }
            }
            return this.warpCache = cache;
        }
    }
    exports.default = Weave;
    function arrayOr(val) {
        return Array.isArray(val) ? val : [val];
    }
});
