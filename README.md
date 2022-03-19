# weaving
[![GitHub issues](https://img.shields.io/github/issues/ChiriVulpes/weaving.svg?style=flat-square)](https://github.com/ChiriVulpes/weaving)
[![GitHub build](https://img.shields.io/github/workflow/status/ChiriVulpes/weaving/CI.svg?style=flat-square)](https://github.com/ChiriVulpes/weaving/actions/workflows/main.yml)

A simplified syntax for i18n files that compiles down into efficient JavaScript with TypeScript definitions. ✨

## What

1. Create a main i18n file in your project's primary language, for example `en-au.quilt`.
```quilt
# action
leave: Leave
eatApples: Eat {0} Apples
```
2. Use weaving to compile the quilt file in a build step. An `en-au.js` and an `en-au.d.ts` file are created.
3. Reference the `en-au.d.ts` file in your TypeScript project as types for the `en-au.js` file.
```ts
import Quilt from "en-au";

const leaveActionTranslation = Quilt["action/leave"]().toString(); // "Leave"
const eatApplesActionTranslation = Quilt["action/eatApples"]().toString(); // errors: missing argument 0
const eatApplesActionTranslation = Quilt["action/eatApples"](5).toString(); // "Eat 5 Apples"
```

## Why

String interpolation or templating is a very common requirement of language files for projects. Generally, that's handled by interpolating at runtime, whether by using regex replacement or a faster alternative that parses through input strings one character at a time. Neither of these are particularly efficient, the regex one worse. Even with the advent of tagged template literals in ES6, these techniques would still be required for translations in other languages.

Weaving is a completely different, specialised way of handling all of this. 
- Instead of the project's code determining the arguments that will be provided to the language, the primary language specifies what arguments the code needs to provide.
- All languages are compiled into executable JavaScript and referenceable TypeScript. No run-time parsing, and the arguments you pass to your translations are enforced!
- Greater control is given to you in interpolations ("warps") than most string interpolation solutions, from interpolating specific properties in arguments, to conditional interpolations, and more.
- Support for new warps allows you to add new interpolation syntaxes for your specific use cases.

# Programmatic Usage

## Gulp
```ts
import gulp from "gulp";
import Weaving from "weaving";

gulp.task("i18n", () => gulp.src("lang/**/*.quilt")
	.pipe(Weaving.createFileTransformer({ outTypes: "src/lang" }))
	.pipe("out/script/lang"));
```

## Manually transforming a single quilt file
```ts
import fs from "fs";
import Weaving from "weaving";

const quilt = Weaving.createQuiltTransformer();
quilt.definitions.pipe(fs.createWriteStream("en-au.d.ts"));
fs.createReadStream("en-au.quilt")
	.pipe(quilt)
	.pipe(fs.createWriteStream("en-au.js"));
	// TODO @user handle "error" and "finish" events
```

# Custom Warps (Interpolations)

## Using custom warps

```ts
import MyCustomWarp from "./warps/MyCustomWarp"; // see this file below in "Creating new warps"
import Weaving from "weaving";

// Spread the existing warps into your warp array to use both your custom and the default ones:
const customWarps = [MyCustomWarp, ...Weaving.DEFAULT_WARPS];
// Or create an array with just your warps to exclude the default warps:
const customWarps = [MyCustomWarp];

// Either modify the default warps:
Weaving.DEFAULT_WARPS = customWarps;
// Or pass in custom warps to `QuiltTransformer`:
Weaving.createFileTransformer(customWarps);
Weaving.createQuiltTransformer(customWarps);
```

## Creating new warps

```ts
// ./warps/MyCustomWarp.ts

import Warp from "weaving/Warp";

export default new Warp()
	.setTokeniser((walker, match, api) => {
		// When Weaving encounters an opening curly brace { it goes through all the warps, 
		// running through their tokenisers to check if they apply.
		// When execution reaches this tokeniser, we begin consuming 
		// what we expect to see in our custom interpolation.
		
		// If the walker fails to walk over something, it returns false, and in those cases 
		// it means this is either a different kind of interpolation or a malformed one.
		// In either case we don't want to tokenise it with our warp, so we return `undefined`.
		
		// First, we allow any amount of whitespace after the opening curly brace
		walker.walkWhitespace();
		// Then, we require the exact string "FOO"
		if (!walker.walkSubstr("FOO"))
			// This interpolation doesn't match, so don't tokenise it
			return undefined;
		// Then, we allow any amount of whitespace
		walker.walkWhitespace();

		return new Token()
			// And then we return the output text we want
			.setCompiled("bar");
	});
```

For more complex examples of custom warps, see the warps Weaving has to begin with:
- [WarpArgument](./src/warps/WarpArgument.ts)
- [WarpConditional](./src/warps/WarpConditional.ts)
- [WarpTag](./src/warps/WarpTag.ts)
