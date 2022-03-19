var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./QuiltTransformer", "./Weave"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DEFAULT_WARPS = exports.stream = exports.createFileTransformer = exports.createQuiltTransformer = exports.QuiltTransformer = void 0;
    const QuiltTransformer_1 = __importDefault(require("./QuiltTransformer"));
    exports.QuiltTransformer = QuiltTransformer_1.default;
    const Weave_1 = __importDefault(require("./Weave"));
    const { create, createFileTransformer, stream } = QuiltTransformer_1.default;
    exports.createQuiltTransformer = create;
    exports.createFileTransformer = createFileTransformer;
    exports.stream = stream;
    const { DEFAULT_WARPS } = Weave_1.default;
    exports.DEFAULT_WARPS = DEFAULT_WARPS;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    exports.default = exports;
});
