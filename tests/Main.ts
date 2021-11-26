import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as fs from "fs";
import QuiltBuilderNode from "../build/QuiltBuilderNode";

chai.use(chaiAsPromised);
// @ts-ignore
const expect = chai.expect;

// async function sleep<T>(ms: number, returnValue?: T) {
// 	return new Promise<T>(resolve => setTimeout(() => resolve(returnValue), ms));
// }

const quilt = new QuiltBuilderNode();
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
				const result = quilt[key]({ NAME: "joe", REMAINING: 5 }, 2, 3);
				console.log(key, result.content, result.toString());
			}
		} catch (err: any) {
			err.message = `Failed to execute quilt: ${err.message}`;
			throw err;
		}
	});
