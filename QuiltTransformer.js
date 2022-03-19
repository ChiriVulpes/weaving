var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./Quilt"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const Quilt_1 = __importDefault(require("./Quilt"));
    const nodeMode = typeof TransformStream === "undefined";
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires,  @typescript-eslint/no-unsafe-assignment
    const ExtensionClass = (nodeMode ? require("stream").Transform : TransformStream);
    class QuiltTransformer extends ExtensionClass {
        constructor(options, warps) {
            let definitionsController;
            let controller;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires, @typescript-eslint/no-empty-function
            const definitions = (nodeMode ? new class extends require("stream").Readable {
                _read() { }
            }
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                : new ReadableStream({ start: controller => { definitionsController = controller; } }));
            const quilt = new Quilt_1.default(options, warps)
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
                .onScript(chunk => nodeMode ? this.push(chunk) : controller.enqueue(chunk))
                .onDefinitions(chunk => nodeMode ? this.definitions.push(chunk) : definitionsController.enqueue(chunk));
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            super(...nodeMode ? [] : [{
                    start: (c) => {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        controller = c;
                        quilt.start();
                    },
                    transform: (chunk) => {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                        quilt.transform(chunk.toString());
                    },
                    flush: () => {
                        quilt.complete();
                        definitionsController.close();
                    },
                }]);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            this.definitions = definitions;
            if (nodeMode) {
                this.quilt = quilt;
                this.quilt.start();
            }
        }
        static stream(source, options, warps) {
            if (Array.isArray(options))
                warps = options, options = undefined;
            if (nodeMode) {
                const { Readable } = require("stream");
                return Readable.from([source])
                    .pipe(new QuiltTransformer(options, warps));
            }
            return new ReadableStream({
                start: controller => {
                    controller.enqueue(source);
                    controller.close();
                },
            })
                .pipeThrough(new QuiltTransformer({}, warps));
        }
        static create(options, warps) {
            if (Array.isArray(options))
                warps = options, options = undefined;
            return new QuiltTransformer(options, warps);
        }
        static createFileTransformer(opts, warps) {
            var _a;
            if (!nodeMode)
                throw new Error("A quilt file transformer is only supported in node.js");
            if (Array.isArray(opts))
                warps = opts, opts = undefined;
            const options = opts;
            const { Transform, Readable } = require("stream");
            const transform = new Transform({ objectMode: true, highWaterMark: (_a = options === null || options === void 0 ? void 0 : options.highWaterMark) !== null && _a !== void 0 ? _a : 16 }); // using value from through2 idk make an issue if this is bad
            transform._transform = (file, enc, cb) => {
                var _a;
                const contentsStream = file.isBuffer() ? Readable.from(file.contents.toString("utf8")) : file.contents;
                if (!contentsStream)
                    file.contents = null;
                else {
                    const quilt = new QuiltTransformer(options, warps);
                    if ((options === null || options === void 0 ? void 0 : options.types) !== false) {
                        // eslint-disable-next-line @typescript-eslint/no-var-requires
                        const path = require("path");
                        const fs = require("fs");
                        const outTypes = path.resolve((_a = options === null || options === void 0 ? void 0 : options.outTypes) !== null && _a !== void 0 ? _a : file.dirname);
                        const filename = file.basename.slice(0, -file.extname.length);
                        quilt.definitions.pipe(fs.createWriteStream(path.join(outTypes, `${filename}.d.ts`)));
                    }
                    file.extname = ".js";
                    file.contents = contentsStream.pipe(quilt);
                }
                cb(null, file);
            };
            return transform;
        }
        _transform(chunk, enc, cb) {
            this.quilt.transform(chunk.toString());
            cb();
        }
        _flush(cb) {
            this.quilt.complete();
            this.definitions.destroy();
            cb();
        }
    }
    exports.default = QuiltTransformer;
});
