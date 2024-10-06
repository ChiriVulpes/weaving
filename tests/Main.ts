import chai from "chai"
import chaiAsPromised from "chai-as-promised"
import fs from "fs"
import Weaving from "../build/Weaving"

chai.use(chaiAsPromised)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const expect = chai.expect

// async function sleep<T>(ms: number, returnValue?: T) {
// 	return new Promise<T>(resolve => setTimeout(() => resolve(returnValue), ms));
// }

console.log(process.cwd())
try { fs.mkdirSync("temp") } catch { }

const quilt = Weaving.createQuiltTransformer()
quilt.definitions.pipe(fs.createWriteStream("temp/test.d.ts"))
fs.createReadStream("test.quilt")
	.pipe(quilt)
	.pipe(fs.createWriteStream("temp/test.js"))
	.on("error", (err) => {
		err.message = `Failed to compile quilt: ${err.message}`
		throw err
	})
	.on("finish", () => {
		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
			const quilt = require("./temp/test.js").default
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
				console.log(key, result.content, result.toString())
			}
		} catch (err: any) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			err.message = `Failed to execute quilt: ${err.message}`
			throw err
		}
	})
