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
    const nodeMode = typeof require !== "undefined";
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires,  @typescript-eslint/no-unsafe-assignment
    const ExtensionClass = (nodeMode ? require("stream").Transform : TransformStream);
    class QuiltTransformer extends ExtensionClass {
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
            if (!nodeMode)
                throw new Error("A quilt file transformer is only supported in node.js");
            if (Array.isArray(opts))
                warps = opts, opts = undefined;
            const options = opts;
            const { Transform, Readable } = require("stream");
            const transform = new Transform({ objectMode: true, highWaterMark: options?.highWaterMark ?? 16 }); // using value from through2 idk make an issue if this is bad
            transform._transform = (file, enc, cb) => {
                const contentsStream = file.isBuffer() ? Readable.from(file.contents.toString("utf8")) : file.contents;
                if (!contentsStream)
                    file.contents = null;
                else {
                    const quilt = new QuiltTransformer(options, warps);
                    if (options?.types !== false) {
                        // eslint-disable-next-line @typescript-eslint/no-var-requires
                        const path = require("path");
                        const fs = require("fs");
                        const outTypes = path.resolve(options?.outTypes ?? file.dirname);
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
        quilt;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires, @typescript-eslint/no-empty-function
        definitions;
        errors;
        constructor(options, warps) {
            let definitionsController;
            let controller;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires, @typescript-eslint/no-empty-function
            const definitions = (nodeMode ? new class extends require("stream").Readable {
                _read() { }
            }
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                : new ReadableStream({ start: controller => { definitionsController = controller; } }));
            const errors = [];
            const quilt = new Quilt_1.default(options, warps)
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
                .onScript(chunk => nodeMode ? this.push(chunk) : controller.enqueue(chunk))
                .onDefinitions(chunk => nodeMode ? this.definitions.push(chunk) : definitionsController.enqueue(chunk))
                .onError(error => errors.push(error));
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            super(...nodeMode ? [] : [{
                    start: (c) => {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        controller = c;
                        quilt.start();
                    },
                    transform: (chunk) => {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
                        quilt.transform(chunk.toString());
                    },
                    flush: () => {
                        quilt.complete();
                        definitionsController.close();
                        for (const error of errors)
                            controller.error(error);
                    },
                }]);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            this.definitions = definitions;
            this.errors = errors;
            if (nodeMode) {
                this.quilt = quilt;
                this.quilt.start();
            }
        }
        _transform(chunk, enc, cb) {
            this.quilt.transform(chunk.toString());
            cb();
        }
        _flush(cb) {
            this.quilt.complete();
            for (const error of this.errors)
                this.emit("error", error);
            this.definitions.destroy();
            cb(this.errors.length ? new Error(`${this.errors.length} errors`) : undefined);
        }
    }
    exports.default = QuiltTransformer;
});
