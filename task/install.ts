import { Task } from "task";

export default Task("install", async (task) => task.install(
	{
		path: ".",
		dependencies: {
			task: { repo: "chirivulpes/task", branch: "package" },
			lint: { repo: "fluff4me/lint" },
		},
	}
))
