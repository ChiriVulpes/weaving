var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./StringWalker", "./Token", "./warps/WarpArgument", "./warps/WarpConditional", "./warps/WarpTag"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const StringWalker_1 = __importDefault(require("./StringWalker"));
    const Token_1 = __importDefault(require("./Token"));
    const WarpArgument_1 = __importDefault(require("./warps/WarpArgument"));
    const WarpConditional_1 = __importDefault(require("./warps/WarpConditional"));
    const WarpTag_1 = __importDefault(require("./warps/WarpTag"));
    class Weave {
        constructor(raw, warps = Weave.DEFAULT_WARPS) {
            this.raw = raw;
            this.warps = warps;
        }
        static compile(source, warps) {
            return Weave.compileTokens(...new Weave(source, warps).tokenise());
        }
        static compileTokens(...tokens) {
            var _a, _b, _c;
            let compiled = "";
            const argTypes = [];
            let lastRequiredIndex = -1;
            const optionals = [];
            for (const token of tokens) {
                if (!token.compiled)
                    continue;
                compiled += `${token.compiled},`;
                for (const { path, type, optional } of (_a = token.args) !== null && _a !== void 0 ? _a : []) {
                    const keys = path.split(".");
                    if (keys.length === 0)
                        continue;
                    if (isNaN(+keys[0]))
                        keys.unshift("0");
                    const generatedType = this.compileType(keys.slice(1), type);
                    const index = +keys[0];
                    ((_b = argTypes[index]) !== null && _b !== void 0 ? _b : (argTypes[index] = new Set())).add(generatedType);
                    if (!optional)
                        lastRequiredIndex = Math.max(index, lastRequiredIndex);
                    (_c = optionals[index]) !== null && _c !== void 0 ? _c : (optionals[index] = true);
                    optionals[index] && (optionals[index] = optional);
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
        tokenise(walker = new StringWalker_1.default(this.raw), until) {
            const tokens = [];
            let token;
            const warps = this.buildWarpCache();
            until !== null && until !== void 0 ? until : (until = []);
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
            } while (char = walker.next());
            return tokens;
        }
        tokeniseWarp(walker, warps) {
            var _a;
            const matching = [];
            for (const warp of warps)
                for (const match of arrayOr(warp.matches))
                    for (const start of match.start)
                        if (walker.hasNext(start))
                            matching.push([warp, match, walker.clone().walk(start.length)]);
            for (const [warp, match, warpWalker] of matching) {
                const warpTokens = (_a = warp.tokenise) === null || _a === void 0 ? void 0 : _a.call(warp, warpWalker, match, this);
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
        /**
         * @returns A Record mapping all warps to the first character of each of their starts
         */
        buildWarpCache() {
            var _a;
            var _b;
            if (this.warpCache)
                return this.warpCache;
            const cache = {};
            for (const warp of this.warps) {
                for (const match of arrayOr(warp.matches)) {
                    for (const start of match.start) {
                        (_a = cache[_b = start[0]]) !== null && _a !== void 0 ? _a : (cache[_b] = new Set());
                        cache[start[0]].add(warp);
                    }
                }
            }
            return this.warpCache = cache;
        }
    }
    exports.default = Weave;
    Weave.DEFAULT_WARPS = [
        WarpTag_1.default,
        WarpConditional_1.default,
        WarpArgument_1.default,
    ];
    function arrayOr(val) {
        return Array.isArray(val) ? val : [val];
    }
});
