import { spawn } from "child_process";
import fs from "fs/promises";
import Task from "./utilities/Task";

export default Task("meta", async () => {
	await fs.mkdir("build", { recursive: true });

	const packageJson = JSON.parse(await fs.readFile("package.json", "utf8")) as Partial<typeof import("../package.json")>;
	delete (packageJson as any).private;
	delete packageJson.scripts;
	delete packageJson.devDependencies;
	await fs.writeFile("build/package.json", JSON.stringify(packageJson, null, "\t"));

	await fs.copyFile("LICENSE", "build/LICENSE");
	await fs.copyFile("README.md", "build/README.md");

	await fs.writeFile("build/.gitignore", `
		node_modules/
	`.split("\n").map(path => path.trim()).filter(path => path).join("\n") + "\n");

	await new Promise<void>((resolve, reject) => {
		const ext = process.platform === "win32" ? ".cmd" : "";
		const childProcess = spawn("npm" + ext, ["install"], { cwd: "build", stdio: [process.stdin, process.stdout, process.stderr] });
		childProcess.on("error", reject);
		childProcess.on("exit", code => {
			if (code === 1) reject("Error code 1");
			else resolve();
		});
	});
});
