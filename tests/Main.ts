import chai from "chai"
import chaiAsPromised from "chai-as-promised"
import fs from "fs"
import { inspect } from "util"
import Weaving from "../build/Weaving"

chai.use(chaiAsPromised)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const expect = chai.expect

// async function sleep<T>(ms: number, returnValue?: T) {
// 	return new Promise<T>(resolve => setTimeout(() => resolve(returnValue), ms));
// }

fs.rmSync("temp", { recursive: true, force: true })
try { fs.mkdirSync("temp") } catch { }

void (async () => {
	try {
		const compiled = await Weaving.quilt("test.quilt", { verbose: true, whitespace: true, types: true, out: "temp" })
		if (!compiled)
			return

	} catch (err) {
		throw err instanceof Error ? err : new Error("Failed to compile quilt", { cause: err })
	}

	try {
		let quilt: Record<string, (...args: any[]) => any> | undefined
		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
			quilt = require("./temp/test.js").default
		} catch { }

		if (!quilt)
			throw new Error("Quilt js file not found")

		for (const key in quilt) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			const result = quilt[key]({
				PEOPLE: [
					{
						FIRST: "Hue", NICK: "Not an Alien", LAST: "Mann",
						CHILDREN: [
							{ FIRST: "Undulating", NICK: "Swarm of Bees", LAST: "Mass" },
							{ FIRST: "Final", NICK: "Cube", LAST: "Shape" },
						],
					},
					{ FIRST: "Chiri", NICK: "Smolest Bean", LAST: "Vulpes" },
				],
				THINGS: ["Pineapple", "Banana", "Fudge Sundae"],
			}, "hi", "wow")
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
			console.log(key, inspect(result.content, undefined, Infinity, true), inspect(result.toString(), undefined, undefined, true))
		}
	} catch (err) {
		throw err instanceof Error ? err : new Error("Failed to execute quilt", { cause: err })
	}
})().catch(err => {
	console.error(err)
})
