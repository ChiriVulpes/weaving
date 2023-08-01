# weaving
[![GitHub issues](https://img.shields.io/github/issues/ChiriVulpes/weaving.svg?style=flat-square)](https://github.com/ChiriVulpes/weaving)
[![GitHub build](https://img.shields.io/github/actions/workflow/status/ChiriVulpes/weaving/main.yml?style=flat-square)](https://github.com/ChiriVulpes/weaving/actions/workflows/main.yml)

A simplified syntax for i18n files that compiles down into efficient JavaScript with TypeScript definitions. ✨

## What

1. Create a main i18n file in your project's primary language, for example `en-au.quilt`.
```quilt
# action
leave: Leave
eatApples: Eat {0} Apples
```
2. Use [weaving to compile the quilt file](#usage) in a build step. An `en-au.js` and an `en-au.d.ts` file are created.
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

# Syntax

## Quilt file anatomy
```quilt
topLevelTranslationKey: Translation Text

# dictionary
This is a comment describing what's in this dictionary. As an example I'm making it a dictionary of desserts.

brownies: Brownies
iceCream: {FLAVOUR} Ice Cream
iceCream/description: Ice cream is a delicious, cold treat.
I will continue to describe ice cream on this second line.

## subDictionary
This is a dictionary inside the previous dictionary — you can tell because it's got more #'s.

# dictLevel1/dictLevel2
dictLevel3/key: This translation will be keyed with "dictLevel1/dictLevel2/dictLevel3/key".
```

## Default warps (interpolations)

### Arguments

#### Interpolate a specific argument:
```quilt
hello: Hello, {0}!
```
|Args|Output|
|-|-|
|`["Joe"]`|`"Hello, Joe!"`|

#### Interpolate a property of an argument:
```quilt
hello: Hello, {2.NAME}!
```
|Args|Output|
|-|-|
|`[*, *, { NAME: "Joe" }]`|`"Hello, Joe!"`|

#### You can omit the `0.` when accessing properties of the first argument:
```quilt
hello: Hello, {NAME}!
```
|Args|Output|
|-|-|
|`[{ NAME: "Joe" }]`|`"Hello, Joe!"`|
|`[{ NAME: "Joe" }, { NAME: "Suzy" }]`|`"Hello, Joe!"`|

#### You can chain as many property accesses as necessary:
```quilt
hello: Hello, {PEOPLE.2.IDENTITY.NAME}!
```
|Args|Output|
|-|-|
|`[{ PEOPLE: [*, *, { IDENTITY: { NAME: "Joe" } }] }]`|`"Hello, Joe!"`|

#### You can interpolate the length of an array argument:
```quilt
countMembers: There are {MEMBERS..} members!
```
|Args|Output|
|-|-|
|`[{ MEMBERS: [...] }]`|`"There are 37 members!"`|


### Joining

#### Basic joining items with no separator:
```quilt
favouriteLetters: Here's my favourite letters: {LETTERS*}
```
|Args|Output|
|-|-|
|`[{ LETTERS: ["a", "s", "d", "l", "k", "f"] }]`|`"Here's my favourite letters: asdlkf"`|

#### Customising the separator between items:
```quilt
favouriteFoods: Here's my favourite foods: {FOODS*, }
```
|Args|Output|
|-|-|
|`[{ FOODS: ["Pizza", "Mac 'n Cheese", "Fried Food"] }]`|`"Here's my favourite foods: Pizza, Mac 'n Cheese, Fried Food"`|

#### Displaying custom text for each item:
```quilt
teamMembers: Team Members: {MEMBERS*Member "&":, }
```
|Args|Output|
|-|-|
|`[{ MEMBERS: ["Joe", "Suzy", "Dennis"] }]`|`"Team Members: Member "Joe", Member "Suzy", Member "Dennis""`|

#### Accessing properties on each item:
```quilt
teamMembers: Team Members: {MEMBERS*{&NAME}:, }
```
|Args|Output|
|-|-|
|`[{ MEMBERS: [{ NAME: "Joe" }, { NAME: "Suzy" }, { NAME: "Dennis" }] }]`|`"Team Members: Joe, Suzy, Dennis"`|


### Conditionals

#### Only display text if an argument is present*:
```quilt
hello: Hello{0?, {0}}!
```
|Args|Output|
|-|-|
|`[]`|`"Hello!"`|
|`["Joe"]`|`"Hello, Joe!"`|

*Note that the actual check is more complex than just checking for the presence of an argument. The condition will fail if the argument is ["falsy"](https://developer.mozilla.org/en-US/docs/Glossary/Falsy).

#### Displaying different text when the conditional *fails*; "else" text:
```quilt
likeCatsResponse: {LIKES.CATS?I know, {NAME}!! They're so cuddly!:You're dead to me, {NAME}.}
```
|Args|Output|
|-|-|
|`[{ NAME: "Joe", LIKES: { CATS: true }}]`|`"I know, Joe!! They're so cuddly!"`|
|`[{ NAME: "Suzy", LIKES: { CATS: false }}]`|`"You're dead to me, Suzy."`|

```quilt
hello: Hello!{0?: Oh... there's no one here.}
```
|Args|Output|
|-|-|
|`[]`|`"Hello! Oh... there's no one here."`|
|`["Joe"]`|`"Hello!"`|

#### Invert a check by starting it with an exclamation mark:
```quilt
upgradesResponse: Upgrades: You have {UPGRADES..} available.{!UPGRADES..? Wait, what?? You don't have any?}
```
|Args|Output|
|-|-|
|`[{ UPGRADES: [] }]`|`"Upgrades: You have 0 available. Wait, what?? You don't have any?"`|
|`[{ UPGRADES: ["Speed", "Strength"] }]`|`"Upgrades: You have 2 available."`|


# Usage

```bat
npm install weaving --save-dev
```
Note 1: It's recommended to install this module in dev dependencies, given that it's only used for compiling quilt files.

Note 2: The node module has not yet been published, `weaving` is currently a prior iteration of this project.

## CLI
This information can also be viewed with `npx weaving --help`.

### Basic usage: 
```bat
npx weaving ./lang
```

### Full syntax:
```bat
npx weaving [--watch] [--out <directory>] [--types false] [--outTypes <directory>] <...paths>
```

#### `--watch`
The provided paths will be watched for changes.

#### `--out <directory>`
Provide a directory that compiled `.js` files will reside in. By default, files are compiled to the same directory as their respective `.quilt` files.

#### `--types false` or `--types=false`
Disable outputting `.d.ts` TypeScript definition files.

#### `--outTypes <directory>`
Provide a directory that compiled `.d.ts` files will reside in. By default, files are compiled to the same directory as specified in `--out`, or the same directory as their respective `.quilt` files if there is no out directory specified.


## Programmatic Usage

### Gulp
```ts
import gulp from "gulp";
import Weaving from "weaving";

gulp.task("i18n", () => gulp.src("lang/**/*.quilt")
	.pipe(Weaving.createFileTransformer({ outTypes: "src/lang" }))
	.pipe("out/script/lang"));
```

### Manually transforming a single quilt file:
```ts
import fs from "fs";
import Weaving from "weaving";

const quilt = Weaving.createQuiltTransformer();
quilt.definitions.pipe(fs.createWriteStream("en-au.d.ts"));
const stream = fs.createReadStream("en-au.quilt")
	.pipe(quilt)
	.pipe(fs.createWriteStream("en-au.js"));
	
quilt.on("error", /* TODO @user */);
stream.on("finish", /* TODO @user */);
```

### Custom Warps (Interpolations)

#### Using custom warps:

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

#### Creating new warps:

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
