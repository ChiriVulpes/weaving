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
        define(["require", "exports", "chokidar", "fs", "path", "yargs", "yargs/helpers", "./Quilt", "./Weaving"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const chokidar_1 = __importDefault(require("chokidar"));
    const fs_1 = __importDefault(require("fs"));
    const path_1 = __importDefault(require("path"));
    const yargs_1 = __importDefault(require("yargs"));
    const helpers_1 = require("yargs/helpers");
    const Quilt_1 = require("./Quilt");
    const Weaving_1 = __importDefault(require("./Weaving"));
    // #region fs/path
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
            return file.startsWith(".") ? file : `.\\${file}`;
        }
        File.relative = relative;
    })(File || (File = {}));
    // #endregion
    // #region color
    let chalk;
    let ansicolor;
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        chalk = require("chalk");
        // eslint-disable-next-line no-empty
    }
    catch { }
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ansicolor = require("ansicolor");
        // eslint-disable-next-line no-empty
    }
    catch { }
    function color(text, color) {
        if (!chalk && !ansicolor)
            return text;
        if (ansicolor)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            return ansicolor[color](text);
        let c2 = color.startsWith("light") ? `${color.slice(5).toLowerCase()}Bright` : color;
        if (c2 === "darkGray")
            c2 = "blackBright";
        if (c2 === "white")
            c2 = "whiteBright";
        if (c2 === "grayBright")
            c2 = "white";
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return chalk[c2](text);
    }
    // #endregion
    const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
        .alias("v", "version")
        .options({
        out: { type: "string", alias: "o", description: "A directory that compiled `.js` files will reside in. By default, files are compiled to the same directory as their respective `.quilt` files." },
        outTypes: { type: "string", description: "A directory that compiled `.d.ts` files will reside in. By default, files are compiled to the same directory as specified in `--out`, or the same directory as their respective `.quilt` files if there is no out directory specified." },
        types: { type: "boolean", alias: "t", description: "Whether weaving should output `.d.ts` TypeScript definition files.", default: true },
        watch: { type: "boolean", alias: "w", description: "Whether the provided paths will be watched for changes." },
        verbose: { type: "boolean", description: "Whether to print internal error stacks on compilation errors." },
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
        console.log(color("> ", "lightYellow"), color("Watching for changes...", "darkGray"));
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
            let stat = await File.stat(file);
            if (!stat && !file.endsWith(".quilt") && allowAddingExt) {
                file += ".quilt";
                stat = await File.stat(file);
                if (!stat)
                    file = file.slice(0, -6);
            }
            if (!stat) {
                const relativeFile = File.relative(file);
                console.log(color("X ", "lightRed"), color(`File ${color(relativeFile, "red")} does not exist`, "darkGray"));
                continue;
            }
            if (stat.isDirectory()) {
                await compileFiles(await File.children(file), false);
                continue;
            }
            await compileFile(file);
        }
    }
    async function compileFile(file) {
        if (!file.endsWith(".quilt"))
            return;
        const relativeFile = File.relative(file);
        const basename = relativeFile.slice(0, -6);
        const dts = path_1.default.resolve(process.cwd(), argv.outTypes ?? argv.out ?? "", `${basename}.d.ts`);
        const js = path_1.default.resolve(process.cwd(), argv.out ?? "", `${basename}.js`);
        await fs_1.default.promises.mkdir(path_1.default.dirname(js), { recursive: true });
        await fs_1.default.promises.mkdir(path_1.default.dirname(dts), { recursive: true });
        return new Promise(resolve => {
            const quilt = Weaving_1.default.createQuiltTransformer();
            if (argv.types)
                quilt.definitions.pipe(fs_1.default.createWriteStream(dts));
            const readStream = fs_1.default.createReadStream(file);
            const stream = readStream
                .pipe(quilt)
                .pipe(fs_1.default.createWriteStream(js));
            quilt.on("error", (err) => {
                let message;
                const errorMessage = argv.verbose ? err.stack?.slice(7).replace(/\n/g, "\n   ") ?? "" : err.message;
                if (err instanceof Quilt_1.QuiltError) {
                    const errorPosition = `${relativeFile}${err.line === undefined ? "" : `:${err.line}${err.column === undefined ? "" : `:${err.column}`}`}`;
                    message = `Compilation error at ${color(errorPosition, "red")}: ${errorMessage}`;
                }
                else {
                    message = `Failed to compile ${color(relativeFile, "red")}: ${errorMessage}`;
                }
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                console.log(color("X ", "lightRed"), color(message, "darkGray"));
                readStream.close();
                resolve();
            });
            stream.on("finish", () => {
                let files = [js];
                if (argv.types)
                    files.push(dts);
                files = files.map(file => color(File.relative(file), "lightGreen"));
                console.log(color("✓ ", "lightGreen"), color(`Compiled ${color(relativeFile, "lightGreen")} => ${files.join(", ")}`, "darkGray"));
                readStream.close();
                resolve();
            });
        });
    }
});
