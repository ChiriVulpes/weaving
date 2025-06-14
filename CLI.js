#!/usr/bin/env node
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "chokidar", "path", "yargs", "yargs/helpers", "./Colour", "./File", "./Weaving"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const chokidar_1 = __importDefault(require("chokidar"));
    const path_1 = __importDefault(require("path"));
    const yargs_1 = __importDefault(require("yargs"));
    const helpers_1 = require("yargs/helpers");
    const Colour_1 = __importDefault(require("./Colour"));
    const File_1 = __importDefault(require("./File"));
    const Weaving_1 = __importDefault(require("./Weaving"));
    const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
        .alias("v", "version")
        .options({
        out: { type: "string", alias: "o", description: "A directory that emitted `.js` files will reside in. By default, files are emitted to the same directory as their respective `.quilt` files." },
        outTypes: { type: "string", description: "A directory that emitted `.d.ts` files will reside in. By default, files are emitted to the same directory as specified in `--out`, or the same directory as their respective `.quilt` files if there is no out directory specified." },
        types: { type: "boolean", alias: "t", description: "Whether weaving should emit `.d.ts` TypeScript definition files.", default: true },
        watch: { type: "boolean", alias: "w", description: "Whether the provided paths will be watched for changes." },
        verbose: { type: "boolean", description: "Whether to print internal error stacks on compilation errors." },
        outWhitespace: { type: "boolean", description: "Whether to include whitespace in the emitted `.js` files." },
    })
        .parseSync();
    let files = argv._.map(arg => `${arg}`);
    let excludedFiles = [];
    for (let i = 0; i < files.length; i++)
        if (files[i][0] === "!")
            excludedFiles.push(files.splice(i--, 1)[0].slice(1));
    if (!files.length)
        files.push(process.cwd());
    function resolveFiles(files) {
        return Array.from(new Set(files.map(file => path_1.default.resolve(file))));
    }
    files = resolveFiles(files);
    excludedFiles = resolveFiles(excludedFiles);
    void compileFiles(files)
        .then(() => {
        if (!argv.watch)
            return;
        console.log((0, Colour_1.default)("> ", "lightYellow"), (0, Colour_1.default)("Watching for changes...", "darkGray"));
        for (const listedFile of files)
            chokidar_1.default.watch(listedFile, { ignoreInitial: true, disableGlobbing: true })
                .on("all", (event, file) => {
                if (event === "unlink" || event === "unlinkDir")
                    return;
                void compileFiles([file], false);
            });
    });
    async function compileFiles(files, allowAddingExt = true) {
        NextFile: for (let file of files) {
            for (const excludedFile of excludedFiles)
                if (file.startsWith(excludedFile))
                    continue NextFile;
            let stat = await File_1.default.stat(file);
            if (!stat && !file.endsWith(".quilt") && allowAddingExt) {
                file += ".quilt";
                stat = await File_1.default.stat(file);
                if (!stat)
                    file = file.slice(0, -6);
            }
            if (!stat) {
                const relativeFile = File_1.default.relative(file);
                console.log((0, Colour_1.default)("X ", "lightRed"), (0, Colour_1.default)(`File ${(0, Colour_1.default)(relativeFile, "red")} does not exist`, "darkGray"));
                continue;
            }
            if (stat.isDirectory()) {
                await compileFiles(await File_1.default.children(file), false);
                continue;
            }
            await compileFile(file);
        }
    }
    async function compileFile(file) {
        if (!file.endsWith(".quilt"))
            return;
        const relativeFile = File_1.default.relative(file);
        await Weaving_1.default.quilt(relativeFile, {
            out: argv.out,
            outTypes: argv.outTypes,
            types: argv.types ? true : undefined,
            verbose: argv.verbose ? true : undefined,
            whitespace: argv.outWhitespace ? true : undefined,
        });
    }
});
