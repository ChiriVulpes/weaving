var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./Quilt", "./QuiltTransformer"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.stream = exports.createQuiltTransformer = exports.createFileTransformer = exports.QuiltTransformer = exports.DEFAULT_WARPS = void 0;
    const Quilt_1 = __importDefault(require("./Quilt"));
    const QuiltTransformer_1 = __importDefault(require("./QuiltTransformer"));
    exports.QuiltTransformer = QuiltTransformer_1.default;
    const { create, createFileTransformer, stream } = QuiltTransformer_1.default;
    exports.createQuiltTransformer = create;
    exports.createFileTransformer = createFileTransformer;
    exports.stream = stream;
    const { DEFAULT_WARPS } = Quilt_1.default;
    exports.DEFAULT_WARPS = DEFAULT_WARPS;
});
