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
    exports.default = Colour;
    let chalk;
    let ansicolor;
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        chalk = require("chalk");
        // eslint-disable-next-line no-empty
    }
    catch { }
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ansicolor = require("ansicolor");
        // eslint-disable-next-line no-empty
    }
    catch { }
    function Colour(text, color) {
        if (!chalk && !ansicolor)
            return text;
        if (ansicolor)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            return ansicolor[color](text);
        let c2 = color.startsWith("light") ? `${color.slice(5).toLowerCase()}Bright` : color;
        if (c2 === "darkGray")
            c2 = "blackBright";
        if (c2 === "white")
            c2 = "whiteBright";
        if (c2 === "grayBright")
            c2 = "white";
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return chalk[c2](text);
    }
});
