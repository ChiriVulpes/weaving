import mocha from "gulp-mocha";
import replace from "gulp-replace";
import NPM from "./gulp/NPM";
import Task, { Pipe, remove, Series, watch } from "./gulp/Task";
import TypescriptWatch from "./gulp/TypescriptWatch";

const initBuildFolder = new Series(remove("build"))
	.then("init-build-folder", Pipe.create(["package-lock.json", "LICENSE", "README.md", ".npmignore"])
		.pipe("build"))
	.then("init-package-json", Pipe.create("package.json")
		.pipe(() => replace(/"private": true,\s*\r?\n\s*/, ""))
		.pipe("build"));

Task.create("mocha", Pipe.create(["tests/**/*.ts", "!tests/temp/**/*"], { read: false })
	.pipe(() => mocha({ reporter: "even-more-min", require: ["ts-node/register"] } as any))
	.on("error", () => process.exitCode = 1));


////////////////////////////////////
// Compile
//

const compileCommonJS = async () => new TypescriptWatch("src", "build").once();

new Task("compile-test", initBuildFolder)
	.then("compile", compileCommonJS)
	.then("mocha")
	.create();


////////////////////////////////////
// Watch
//

const watchCommonJS = async () => new TypescriptWatch("src", "build")
	.onComplete(Task.get("mocha"))
	.watch()
	.waitForInitial();

new Task("watch", initBuildFolder)
	.then("compile-test", watchCommonJS)
	.then("watch-tests", watch(["tests/**/*.ts", "!tests/temp/**/*", "tests/**/*.quilt"], "mocha"))
	.then("mocha")
	.create();


////////////////////////////////////
// Default
//

Task.create("default", "watch");


////////////////////////////////////
// Publish
//

new Task("publish", initBuildFolder)
	.then("compile", compileCommonJS)
	.then("mocha")
	.then("publish-main", NPM.publish("build"))
	.create();
