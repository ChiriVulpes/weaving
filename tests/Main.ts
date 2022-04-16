import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import fs from "fs";
import Weaving from "../build/Weaving";

chai.use(chaiAsPromised);
// @ts-ignore
const expect = chai.expect;

// async function sleep<T>(ms: number, returnValue?: T) {
// 	return new Promise<T>(resolve => setTimeout(() => resolve(returnValue), ms));
// }

try { fs.mkdirSync("tests/temp"); } catch { }

const quilt = Weaving.createQuiltTransformer();
quilt.definitions.pipe(fs.createWriteStream("tests/temp/test.d.ts"));
fs.createReadStream("tests/test.quilt")
	.pipe(quilt)
	.pipe(fs.createWriteStream("tests/temp/test.js"))
	.on("error", (err) => {
		err.message = `Failed to compile quilt: ${err.message}`;
		throw err;
	})
	.on("finish", () => {
		try {
			const quilt = require("./temp/test.js").default;
			for (const key in quilt) {
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
				});
				console.log(key, result.content, result.toString());
			}
		} catch (err: any) {
			err.message = `Failed to execute quilt: ${err.message}`;
			throw err;
		}
	});
