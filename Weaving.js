var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "fs/promises", "path", "./Colour", "./File", "./Quilt"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Quilt = void 0;
    const promises_1 = __importDefault(require("fs/promises"));
    const path_1 = __importDefault(require("path"));
    const Colour_1 = __importDefault(require("./Colour"));
    const File_1 = __importDefault(require("./File"));
    const Quilt_1 = __importDefault(require("./Quilt"));
    exports.Quilt = Quilt_1.default;
    const UMD_HEADER = "(function(factory){if(typeof module===\"object\"&&typeof module.exports===\"object\"){var v=factory(require, exports);if(v!==undefined)module.exports=v}else if(typeof define===\"function\"&&define.amd){define([\"require\",\"exports\"],factory);}})(function(require,exports){\"use strict\";Object.defineProperty(exports,\"__esModule\",{value:true});let r=Symbol();let rts=Symbol();exports.WeavingArg={setRenderable:(t,ts)=>(t[r]=true,t[rts]=ts,t),isRenderable:t=>!!t[r]};";
    const UMD_FOOTER = "})";
    const FUNCTIONS = {
        STRINGIFY: "let s=t=>typeof t==\"string\"?t:Array.isArray(t)?t.map(s).join(\"\"):typeof t=='object'&&rts in t?t[rts]():typeof t!=\"object\"||t===null||!t.content?String(t):typeof t.content!=\"object\"?String(t.content):s(t.content);",
        IS_ITERABLE: "let ii=u=>(typeof u==\"object\"||typeof u==\"function\")&&Symbol.iterator in u;",
        CONTENT: "let c=c=>({content:c,toString(){return s(this.content)}});",
        WEFT_ARG: "let w=a=>typeof a=='object'&&'content' in a?a:{content:a};",
        JOIN: "let j=(a,s,v)=>{a=(!a?[]:Array.isArray(a)?a:ii(a)?[...a]:[a]);return (v?a.map(v):a).flatMap((v,i)=>i<a.length-1?[].concat(w(v),s):w(v))};",
        LENGTH: "let l=v=>!v?0:typeof v.length==\"number\"?v.length:typeof v.size==\"number\"?v.size:ii(v)?[...v].length:typeof v==\"object\"?Object.keys(v).length:0;",
    };
    const QUILT_HEADER_PRE_WEFT = `\
export interface Weave {
	content: Weft[]
	toString(): string
}

export interface Weft {
	content: WeavingArg | Weft[]
`;
    const QUILT_HEADER_POST_WEFT = `}

declare const SYMBOL_WEAVING_RENDERABLE: unique symbol
declare const SYMBOL_WEAVING_RENDERABLE_TO_STRING: unique symbol

export interface WeavingRenderable {
	[SYMBOL_WEAVING_RENDERABLE]: true
	[SYMBOL_WEAVING_RENDERABLE_TO_STRING]?(): string
}
	
export type WeavingArg = Weave | Weft | WeavingRenderable | string | number | undefined | null
export namespace WeavingArg {
	export function setRenderable<T>(value: T, toString?: () => string): T & WeavingRenderable
	export function isRenderable<T>(value: T): value is T & WeavingRenderable
}

export interface Quilt {
`;
    const QUILT_FOOTER = `}

declare const quilt: Quilt

export namespace Quilt {
	export type Key = keyof Quilt
	export type SimpleKey = keyof { [KEY in keyof Quilt as Parameters<Quilt[KEY]> extends [infer First, ...infer Rest] ? never : KEY]: true }
	export type Handler<ARGS extends any[] = []> = (quilt: Quilt, ...args: ARGS) => Weave
}

export default quilt
`;
    var Weaving;
    (function (Weaving) {
        async function quilt(file, options, warps = Quilt_1.default.DEFAULT_WARPS) {
            if (!file.endsWith(".quilt"))
                throw new Error("Source file should be a .quilt file");
            const relativeFile = File_1.default.relative(file);
            const basename = relativeFile.slice(0, -6);
            let outTypes = path_1.default.resolve(process.cwd(), options?.outTypes ?? options?.out ?? "", `${basename}.d.ts`);
            outTypes = outTypes.endsWith(".d.ts") ? outTypes : `${outTypes}${path_1.default.sep}${basename}.d.ts`;
            let out = path_1.default.resolve(process.cwd(), options?.out ?? "", `${basename}.js`);
            out = out.endsWith(".js") ? out : `${out}${path_1.default.sep}${basename}.js`;
            await promises_1.default.mkdir(path_1.default.dirname(out), { recursive: true });
            if (options?.types)
                await promises_1.default.mkdir(path_1.default.dirname(outTypes), { recursive: true });
            let quilt;
            try {
                quilt = await (0, Quilt_1.default)(file, options, warps);
            }
            catch (e) {
                const err = e instanceof Error ? e : new Error("Unknown error", { cause: e });
                let message;
                const errorMessage = options?.verbose ? err.stack?.slice(7).replace(/\n/g, "\n   ") ?? "" : err.message;
                if (err instanceof Quilt_1.default.Error) {
                    const errorPosition = `${file}${err.line === undefined ? "" : `:${err.line}${err.column === undefined ? "" : `:${err.column}`}`}`;
                    message = `Compilation error at ${(0, Colour_1.default)(errorPosition, "red")}: ${errorMessage}`;
                }
                else {
                    message = `Failed to compile ${(0, Colour_1.default)(relativeFile, "red")}: ${errorMessage}`;
                }
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                console.log((0, Colour_1.default)("X ", "lightRed"), (0, Colour_1.default)(message, "darkGray"));
                return false;
            }
            const tab = options?.whitespace ? "\t" : "";
            const space = options?.whitespace ? " " : "";
            const newline = options?.whitespace ? "\n" : "";
            let js = `${UMD_HEADER}${Object.values(FUNCTIONS).join("")}var q={${newline}`;
            let dts = "";
            if (options?.types) {
                dts += QUILT_HEADER_PRE_WEFT;
                for (const warp of warps ?? [])
                    for (const [property, type] of warp["_weftProperties"])
                        dts += `\t${property}?: ${type}\n`;
                dts += QUILT_HEADER_POST_WEFT;
            }
            for (const key in quilt.threads) {
                const value = quilt.threads[key];
                const keyString = JSON.stringify(key);
                js += `${tab}${keyString}:${space}${value.script},${newline}`;
                if (options?.types)
                    dts += `\t${keyString}${value.definition}\n`;
            }
            js += `};exports.default=q${UMD_FOOTER}`;
            if (options?.types)
                dts += QUILT_FOOTER;
            await Promise.all([
                promises_1.default.writeFile(out, js),
                options?.types && promises_1.default.writeFile(outTypes, dts),
            ]);
            let files = [out];
            if (options?.types)
                files.push(outTypes);
            files = files.map(file => (0, Colour_1.default)(File_1.default.relative(file), "lightGreen"));
            console.log((0, Colour_1.default)("✓ ", "lightGreen"), (0, Colour_1.default)(`Compiled ${(0, Colour_1.default)(relativeFile, "lightGreen")} => ${files.join(", ")}`, "darkGray"));
            return true;
        }
        Weaving.quilt = quilt;
    })(Weaving || (Weaving = {}));
    exports.default = Weaving;
});
