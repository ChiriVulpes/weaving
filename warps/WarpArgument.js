var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "../Token", "../Warp"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.tokeniseArgument = void 0;
    const Token_1 = __importStar(require("../Token"));
    const Warp_1 = __importStar(require("../Warp"));
    // basic warp matching anything inside {}
    exports.default = new Warp_1.default()
        .setTokeniser(tokeniseArgument);
    function tokeniseArgument(walker, match, api, valueMode = false) {
        var _a;
        walker.walkWhitespace();
        const argument = (_a = walker.walkArgument()) !== null && _a !== void 0 ? _a : "";
        if (argument)
            walker.walkWhitespace();
        const join = walker.walkChar("*");
        if (!argument && !join && !valueMode)
            return undefined;
        let accessor = Token_1.IArgument.accessor(argument);
        if (join) {
            let entryTokens;
            let separatorTokens = api.with([WarpValue]).tokenise(walker, [...match.end, ":"]);
            if (walker.walkChar(":")) {
                entryTokens = separatorTokens;
                separatorTokens = api.tokenise(walker, match.end);
            }
            const entry = !entryTokens ? ""
                : `,v=>c([${entryTokens.map(token => token instanceof ValueToken ? "{content:v}" : token.compiled).join(",")}])`;
            accessor = `j(${accessor},\`${separatorTokens.map(token => { var _a; return (_a = token.string) !== null && _a !== void 0 ? _a : ""; }).join("")}\`${entry})`;
        }
        return new Token_1.default()
            .addArgument(argument, "any")
            .setCompiled({ content: accessor }, Token_1.default.rawGenerator(accessor));
    }
    exports.tokeniseArgument = tokeniseArgument;
    // internal warp for matching & inside a join warp
    const WarpValue = new Warp_1.default()
        .match(new Warp_1.Match().setStart("&").setEnd(""))
        .setTokeniser(() => new ValueToken);
    class ValueToken extends Token_1.default {
        constructor() {
            super(...arguments);
            this.compiled = "&";
            this.string = "&";
        }
    }
});
