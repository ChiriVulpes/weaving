import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import Weave from "../build/Weaving";

chai.use(chaiAsPromised);
// @ts-ignore
const expect = chai.expect;

// async function sleep<T>(ms: number, returnValue?: T) {
// 	return new Promise<T>(resolve => setTimeout(() => resolve(returnValue), ms));
// }

const tokens = new Weave("{GREET?Hello:Goodbye}{GREET? there} {NAME}").tokenise();
console.log(...tokens);
console.log(Weave.compile(...tokens));
