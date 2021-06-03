import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import Weave from "../build/Weaving";

chai.use(chaiAsPromised);
// @ts-ignore
const expect = chai.expect;

// async function sleep<T>(ms: number, returnValue?: T) {
// 	return new Promise<T>(resolve => setTimeout(() => resolve(returnValue), ms));
// }

const tokens = new Weave("{GREET?Hello{GREET? there}:Goodbye} {NAME}").tokenise();
console.log("\n");
console.log("tokens:")
tokens.forEach(token => console.log(token));
const fn = Weave.compile(...tokens);
console.log("function", fn);
console.log("result", globalThis.eval(fn)({ GREET: true, NAME: "Joe" }));
