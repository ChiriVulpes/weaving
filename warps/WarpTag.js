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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
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
    const Token_1 = __importDefault(require("../Token"));
    const Warp_1 = __importStar(require("../Warp"));
    exports.default = new Warp_1.default()
        .match(new Warp_1.Match(`${Warp_1.Match.BASIC_START}#`))
        .setTokeniser((walker, match, api) => {
        walker.walkWhitespace();
        const tag = api.tokenise(walker, [":", ...match.end]);
        if (!tag)
            return undefined;
        if (!walker.walkSubstr(":"))
            return undefined;
        const content = api.tokenise(walker, match.end);
        if (!content)
            return undefined;
        return new Token_1.default()
            .inheritArguments(...tag, ...content)
            // TODO optimise output here by compressing a single token into this object
            .setCompiled(`{content:[${Token_1.default.compile(...content)}],tag:${Token_1.default.stringify(...tag)}}`, Token_1.default.stringify(true, ...content));
    })
        .addWeftProperty("tag", "string");
});
