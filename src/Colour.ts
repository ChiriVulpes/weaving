import type * as AnsicolorModule from "ansicolor"
import type * as ChalkModule from "chalk"

let chalk: typeof ChalkModule | undefined
let ansicolor: typeof AnsicolorModule | undefined
try {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	chalk = require("chalk")
	// eslint-disable-next-line no-empty
} catch { }
try {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	ansicolor = require("ansicolor")
	// eslint-disable-next-line no-empty
} catch { }

export default function Colour (text: string, color: keyof typeof AnsicolorModule): string {
	if (!chalk && !ansicolor)
		return text

	if (ansicolor)
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
		return (ansicolor as any)[color](text)

	let c2 = color.startsWith("light") ? `${color.slice(5).toLowerCase()}Bright` : color

	if (c2 === "darkGray") c2 = "blackBright"
	if (c2 === "white") c2 = "whiteBright"
	if (c2 === "grayBright") c2 = "white"

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
	return (chalk as any)[c2](text)
}
