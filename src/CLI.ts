#!/usr/bin/env node

import type * as AnsicolorModule from "ansicolor"
import type * as ChalkModule from "chalk"
import chokidar from "chokidar"
import fs from "fs"
import path from "path"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { QuiltError } from "./Quilt"
import Weaving from "./Weaving"

// #region fs/path
namespace File {
	export async function stat (file: string) {
		return fs.promises.stat(file).catch(() => null)
	}

	export async function children (dir: string) {
		return fs.promises.readdir(dir)
			.then(files => files.map(file => path.resolve(dir, file)))
			.catch(() => [])
	}

	export function relative (file: string) {
		file = path.relative(process.cwd(), file)
		return file.startsWith(".") ? file : `.\\${file}`
	}
}
// #endregion

// #region color
let chalk: typeof ChalkModule | undefined
let ansicolor: typeof AnsicolorModule | undefined
try {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	chalk = require("chalk")
	// eslint-disable-next-line no-empty
} catch { }
try {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	ansicolor = require("ansicolor")
	// eslint-disable-next-line no-empty
} catch { }

function color (text: string, color: keyof typeof AnsicolorModule): string {
	if (!chalk && !ansicolor)
		return text

	if (ansicolor)
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
		return (ansicolor as any)[color](text)

	let c2 = color.startsWith("light") ? `${color.slice(5).toLowerCase()}Bright` : color

	if (c2 === "darkGray") c2 = "blackBright"
	if (c2 === "white") c2 = "whiteBright"
	if (c2 === "grayBright") c2 = "white"

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
	return (chalk as any)[c2](text)
}

// #endregion

const argv = yargs(hideBin(process.argv))
	.alias("v", "version")
	.options({
		out: { type: "string", alias: "o", description: "A directory that compiled `.js` files will reside in. By default, files are compiled to the same directory as their respective `.quilt` files." },
		outTypes: { type: "string", description: "A directory that compiled `.d.ts` files will reside in. By default, files are compiled to the same directory as specified in `--out`, or the same directory as their respective `.quilt` files if there is no out directory specified." },
		types: { type: "boolean", alias: "t", description: "Whether weaving should output `.d.ts` TypeScript definition files.", default: true },
		watch: { type: "boolean", alias: "w", description: "Whether the provided paths will be watched for changes." },
		verbose: { type: "boolean", description: "Whether to print internal error stacks on compilation errors." },
	})
	.parseSync()

let files = argv._.map(arg => `${arg}`)

let excludedFiles: string[] = []
for (let i = 0; i < files.length; i++)
	if (files[i][0] === "!")
		excludedFiles.push(files.splice(i--, 1)[0].slice(1))

if (!files.length)
	files.push(process.cwd())

function resolveFiles (files: string[]) {
	return Array.from(new Set(files.map(file => path.resolve(file))))
}

files = resolveFiles(files)
excludedFiles = resolveFiles(excludedFiles)

void compileFiles(files)
	.then(() => {
		if (!argv.watch)
			return

		console.log(color("> ", "lightYellow"), color("Watching for changes...", "darkGray"))
		for (const listedFile of files)
			chokidar.watch(listedFile, { ignoreInitial: true, disableGlobbing: true })
				.on("all", (event, file) => {
					if (event === "unlink" || event === "unlinkDir")
						return

					void compileFiles([file], false)
				})
	})

async function compileFiles (files: string[], allowAddingExt = true) {
	NextFile: for (let file of files) {
		for (const excludedFile of excludedFiles)
			if (file.startsWith(excludedFile))
				continue NextFile

		let stat = await File.stat(file)
		if (!stat && !file.endsWith(".quilt") && allowAddingExt) {
			file += ".quilt"
			stat = await File.stat(file)
			if (!stat) file = file.slice(0, -6)
		}

		if (!stat) {
			const relativeFile = File.relative(file)
			console.log(color("X ", "lightRed"), color(`File ${color(relativeFile, "red")} does not exist`, "darkGray"))
			continue
		}

		if (stat.isDirectory()) {
			await compileFiles(await File.children(file), false)
			continue
		}

		await compileFile(file)
	}
}

async function compileFile (file: string) {
	if (!file.endsWith(".quilt"))
		return

	return new Promise<void>(resolve => {
		const relativeFile = File.relative(file)

		const basename = relativeFile.slice(0, -6)
		const dts = path.resolve(process.cwd(), argv.outTypes ?? argv.out ?? "", `${basename}.d.ts`)
		const js = path.resolve(process.cwd(), argv.out ?? "", `${basename}.js`)

		const quilt = Weaving.createQuiltTransformer()
		if (argv.types)
			quilt.definitions.pipe(fs.createWriteStream(dts))
		const readStream = fs.createReadStream(file)
		const stream = readStream
			.pipe(quilt)
			.pipe(fs.createWriteStream(js))

		quilt.on("error", (err) => {
			let message: string
			const errorMessage = argv.verbose ? err.stack?.slice(7).replace(/\n/g, "\n   ") ?? "" : err.message
			if (err instanceof QuiltError) {
				const errorPosition = `${relativeFile}${err.line === undefined ? "" : `:${err.line}${err.column === undefined ? "" : `:${err.column}`}`}`
				message = `Compilation error at ${color(errorPosition, "red")}: ${errorMessage}`
			} else {
				message = `Failed to compile ${color(relativeFile, "red")}: ${errorMessage}`
			}

			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
			console.log(color("X ", "lightRed"), color(message, "darkGray"))
			readStream.close()
			resolve()
		})

		stream.on("finish", () => {
			let files = [js]
			if (argv.types)
				files.push(dts)
			files = files.map(file => color(File.relative(file), "lightGreen"))

			console.log(color("✓ ", "lightGreen"), color(`Compiled ${color(relativeFile, "lightGreen")} => ${files.join(", ")}`, "darkGray"))
			readStream.close()
			resolve()
		})
	})
}
