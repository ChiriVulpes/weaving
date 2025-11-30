import fs from "fs/promises"
import { Task } from "task"
import type packagejson from "../package.json"

export default Task("meta", async task => {
	await fs.mkdir("build", { recursive: true })

	const packageJson = JSON.parse(await fs.readFile("package.json", "utf8")) as Partial<typeof packagejson>
	delete packageJson.private
	delete packageJson.scripts
	delete packageJson.devDependencies
	delete packageJson.pnpm
	await fs.writeFile("build/package.json", JSON.stringify(packageJson, null, "\t"))

	await fs.copyFile("LICENSE", "build/LICENSE")
	await fs.copyFile("README.md", "build/README.md")

	await fs.writeFile("build/.gitignore", `
		node_modules/
	`.split("\n").map(path => path.trim()).filter(path => path).join("\n") + "\n")

	const ocwd = process.cwd()
	process.chdir("build")
	await task.exec("NPM:PATH:pnpm", "install")
	process.chdir(ocwd)
})
