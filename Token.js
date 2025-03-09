(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IWeft = exports.IArgument = void 0;
    var IArgument;
    (function (IArgument) {
        const REGEX_WORD = /^\w+$/;
        function accessor(path) {
            const valueMode = path.startsWith("&");
            if (valueMode)
                path = path.slice(1);
            const length = path.endsWith("..");
            if (length)
                path = path.slice(0, -2);
            let argumentPath = path.length === 0 ? []
                : path.split(".")
                    .map(argument => 
                // numeric key
                !isNaN(parseInt(argument)) ? `[${argument}]`
                    // string key
                    : REGEX_WORD.test(argument) ? `${argument}`
                        // string key (invalid characters)
                        : `["${argument}"]`);
            if (!valueMode && argumentPath.length && (argumentPath[0][0] !== "[" || argumentPath[0][1] === "\""))
                argumentPath.unshift("[0]");
            argumentPath = argumentPath.map((argument, i) => i || valueMode ? `?.${argument}` : argument);
            argumentPath.unshift(valueMode ? "v" : "a");
            const accessor = argumentPath.join("");
            return length ? `l(${accessor})` : accessor;
        }
        IArgument.accessor = accessor;
        function index(path) {
            const firstPeriod = path.indexOf(".");
            const firstKey = firstPeriod === -1 ? path : path.slice(0, firstPeriod);
            const firstIndex = parseInt(firstKey);
            return isNaN(firstIndex) ? 0 : firstIndex;
        }
        IArgument.index = index;
        function filteredIndexPresent(presentIndex, args) {
            return args.map(arg => index(arg.path) === presentIndex ? { ...arg, optional: true } : arg);
        }
        IArgument.filteredIndexPresent = filteredIndexPresent;
    })(IArgument || (exports.IArgument = IArgument = {}));
    var IWeft;
    (function (IWeft) {
        function compile(weft) {
            const content = typeof weft.content === "string" ? weft.content : `[${weft.content.map(token => token.compiled).join(",")}]`;
            return `{content:${content}${weft.details ? `,${JSON.stringify(weft.details)}` : ""}}`;
        }
        IWeft.compile = compile;
    })(IWeft || (exports.IWeft = IWeft = {}));
    class Token {
        static compile(...tokens) {
            return tokens.map(token => token.compiled ?? "\"\"").join(",");
        }
        static stringify(inner, ...tokens) {
            if (inner !== true)
                tokens.unshift(inner), inner = false;
            return `${inner ? "" : "`"}${tokens.map(token => token.string ?? "").join("")}${inner ? "" : "`"}`;
        }
        static rawGenerator(generator) {
            return `\${${generator}}`;
        }
        compiled;
        string;
        setCompiled(compiled, string) {
            this.compiled = typeof compiled === "string" ? compiled : IWeft.compile(compiled);
            this.string = string === undefined ? compiled : string;
            return this;
        }
        args = [];
        addArgument(path, type, optional = false, rest = false) {
            if (this.args.at(-1)?.rest)
                throw new Error("Cannot add argument after rest argument");
            this.args.push({ path, type, optional, rest });
            return this;
        }
        inheritArguments(optional, ...tokens) {
            if (typeof optional !== "number")
                tokens.unshift(optional), optional = -1;
            for (const token of tokens)
                if (token instanceof Token)
                    for (const arg of token.args)
                        this.args.push(optional === IArgument.index(arg.path) ? { ...arg, optional: true } : arg);
            return this;
        }
    }
    (function (Token) {
        class Text {
            text = "";
            get compiled() {
                return `{content:${JSON.stringify(this.text)}}`;
            }
            get string() {
                return this.text;
            }
        }
        Token.Text = Text;
    })(Token || (Token = {}));
    exports.default = Token;
});
