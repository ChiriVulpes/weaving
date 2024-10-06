/* eslint-disable no-control-regex */
import ansicolor from "ansicolor";
import { spawn } from "child_process";
import path from "path";
import test from "./test";
import Task from "./utilities/Task";
import { stopwatch, Stopwatch, timestamp } from "./utilities/Time";

export default Task("watch", api => new Promise<void>((resolve, reject) => {
	process.chdir("src");

	const ext = process.platform === "win32" ? ".cmd" : "";
	const childProcess = spawn(path.resolve("../node_modules/.bin/tsc" + ext), ["--watch", "--pretty", "--preserveWatchOutput"]);
	childProcess.on("error", reject);
	childProcess.on("exit", code => {
		if (code === 1) reject("Error code 1");
		else resolve();
	});

	let compileWatch: Stopwatch | null = null;
	childProcess.stdout.on("data", (buffer: Buffer) => {
		let data = buffer.toString("utf8");

		data = data
			.replace(/\[\u001b\[90m\d{1,2}:\d{2}:\d{2} [AP]M\u001b\[0m\] /gi, "") // remove time
			.replace(/(\u001b\[96m)(.*?\u001b\[0m:\u001b\[93m)/g, "$1src/$2"); // longer file paths

		const lines = data.split("\n");
		for (let line of lines) {
			if (line.trim().length === 0) {
				// ignore boring lines
				continue;
			}

			if (line.includes("Starting compilation in watch mode...")) {
				compileWatch = stopwatch();
				continue; // ignore start watch line cuz we already have a "starting watch..." thing

			} else if (line.includes("Starting incremental compilation...")) {
				if (compileWatch !== null) {
					// ignore duplicate "starting incremental compilation" line
					continue;
				}

				compileWatch = stopwatch();
			}

			line = line
				.replace(/(?<!\d)0 errors/, ansicolor.lightGreen("0 errors"))
				.replace(/(?<!\d)(?!0)(\d+) error(s?)/, ansicolor.lightRed("$1 error$2"));

			if (line.includes(". Watching for file changes.") && compileWatch) {
				compileWatch.stop();
				line = line.replace(". Watching for file changes.", ` after ${compileWatch.time()}`);
				compileWatch = null;

				api.debounce(test);
			}

			process.stdout.write(`${timestamp()} ${line}\n`);
		}
	});

	childProcess.stderr.on("data", (data: string) => {
		process.stderr.write(data);
	});

	process.chdir("..");
}));