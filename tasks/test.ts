import { spawn } from "child_process";
import path from "path";
import Task from "./utilities/Task";

export default Task("test", () => new Promise<void>((resolve, reject) => {
	const ext = process.platform === "win32" ? ".cmd" : "";
	const mochaPath = path.resolve("node_modules/.bin/mocha" + ext);
	process.chdir("tests");

	const childProcess = spawn(
		mochaPath,
		[
			"*.ts",
			"-R", "even-more-min",
			"-r", "ts-node/register"
		],
		{ stdio: [process.stdin, process.stdout, process.stderr] });
	childProcess.on("error", reject);
	childProcess.on("exit", code => {
		if (code === 1) reject("Error code 1");
		else resolve();
	});

	process.chdir("..");
}));
