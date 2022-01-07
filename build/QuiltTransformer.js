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
        constructor(warps) {
            let definitionsController;
            let controller;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires, @typescript-eslint/no-empty-function
            const definitions = (nodeMode ? new class extends require("stream").Readable {
                _read() { }
            }
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                : new ReadableStream({ start: controller => { definitionsController = controller; } }));
            const quilt = new Quilt_1.default(warps)
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
        static stream(source, warps) {
            if (nodeMode)
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                return require("stream").Readable.from([source])
                    .pipe(new QuiltTransformer(warps));
            else
                return new ReadableStream({
                    start: controller => {
                        controller.enqueue(source);
                        controller.close();
                    },
                })
                    .pipeThrough(new QuiltTransformer(warps));
        }
        static create(warps) {
            return new QuiltTransformer(warps);
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
