import { Task, TypeScript } from "task"
import Env from "./utility/Env"

const options = Env.ENVIRONMENT === "dev"
	? ["--inlineSourceMap", "--inlineSources", "--incremental"]
	: ["--pretty"]

const ts = Task("ts", task => task.series(
	task.series(
		() => TypeScript.compile(task, "src", "--pretty", ...options),
		// () => fs.unlink('docs/service/index.tsbuildinfo'),
	),
))

export default ts

export const tsWatch = Task("ts (watch)", task => task.series(
	ts,
	task.parallel(
		() => TypeScript.compile(task, "src", "--watch", "--preserveWatchOutput", "--pretty", ...options),
	),
))
