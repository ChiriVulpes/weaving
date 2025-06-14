var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "fs", "path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const fs_1 = __importDefault(require("fs"));
    const path_1 = __importDefault(require("path"));
    var File;
    (function (File) {
        async function stat(file) {
            return fs_1.default.promises.stat(file).catch(() => null);
        }
        File.stat = stat;
        async function children(dir) {
            return fs_1.default.promises.readdir(dir)
                .then(files => files.map(file => path_1.default.resolve(dir, file)))
                .catch(() => []);
        }
        File.children = children;
        function relative(file) {
            file = path_1.default.relative(process.cwd(), file);
            return file.startsWith(".") ? file : `.${path_1.default.sep}${file}`;
        }
        File.relative = relative;
    })(File || (File = {}));
    exports.default = File;
});
