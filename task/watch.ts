import { Task } from "task"
import { tsWatch } from "./ts"

export default Task("watch", async task => {
	await task.run(tsWatch)
})
