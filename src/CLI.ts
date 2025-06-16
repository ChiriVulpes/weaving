#!/usr/bin/env node

import type { FSWatcher } from "chokidar"
import chokidar from "chokidar"
import path from "path"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import Colour from "./Colour"
import File from "./File"
import Weaving from "./Weaving"

const argv = yargs(hideBin(process.argv))
	.alias("v", "version")
	.options({
		out: { type: "string", alias: "o", description: "A directory that emitted `.js` files will reside in. By default, files are emitted to the same directory as their respective `.quilt` files." },
		outTypes: { type: "string", description: "A directory that emitted `.d.ts` files will reside in. By default, files are emitted to the same directory as specified in `--out`, or the same directory as their respective `.quilt` files if there is no out directory specified." },
		types: { type: "boolean", alias: "t", description: "Whether weaving should emit `.d.ts` TypeScript definition files.", default: true },
		watch: { type: "boolean", alias: "w", description: "Whether the provided paths will be watched for changes." },
		verbose: { type: "boolean", description: "Whether to print internal error stacks on compilation errors." },
		outWhitespace: { type: "boolean", description: "Whether to include whitespace in the emitted `.js` files." },
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

const watcher = !argv.watch ? undefined
	: chokidar.watch([], { ignoreInitial: true, disableGlobbing: true })
		.on("all", (event, file) => {
			if (event === "unlink" || event === "unlinkDir")
				return

			void compileFiles(files, false, watcher)
		})

void compileFiles(files, undefined, watcher)
	.then(() => {
		if (!watcher)
			return

		console.log(Colour("> ", "lightYellow"), Colour("Watching for changes...", "darkGray"))
		for (const listedFile of files)
			watcher.add(listedFile)
	})

async function compileFiles (files: string[], allowAddingExt = true, watcher?: FSWatcher) {
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
			console.log(Colour("X ", "lightRed"), Colour(`File ${Colour(relativeFile, "red")} does not exist`, "darkGray"))
			continue
		}

		if (stat.isDirectory()) {
			await compileFiles(await File.children(file), false)
			continue
		}

		await compileFile(file, watcher)
	}
}

async function compileFile (file: string, watcher?: FSWatcher) {
	if (!file.endsWith(".quilt"))
		return

	const relativeFile = File.relative(file)
	await Weaving.quilt(relativeFile, {
		out: argv.out,
		outTypes: argv.outTypes,
		types: argv.types ? true : undefined,
		verbose: argv.verbose ? true : undefined,
		whitespace: argv.outWhitespace ? true : undefined,
		watcher,
	})
}
