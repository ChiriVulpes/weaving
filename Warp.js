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
    exports.Match = void 0;
    class Warp {
        constructor() {
            this._matches = [];
        }
        get matches() {
            return this._matches.length === 0 ? Match.BASIC : this._matches;
        }
        match(...matches) {
            this._matches.push(...matches);
            return this;
        }
        setTokeniser(tokeniser) {
            this.tokenise = tokeniser;
            return this;
        }
    }
    exports.default = Warp;
    class Match {
        constructor(start, end) {
            this.start = [Match.BASIC_START];
            this.end = [Match.BASIC_END];
            if (start !== undefined)
                this.start[0] = start;
            if (end !== undefined)
                this.end[0] = end;
        }
        setStart(...starts) {
            this.start = starts;
            return this;
        }
        addStarts(...starts) {
            this.start.push(...starts);
            return this;
        }
        setEnd(...ends) {
            this.end = ends;
            return this;
        }
        addEnds(...ends) {
            this.end.push(...ends);
            return this;
        }
        clone() {
            return new Match( /* this.match */)
                .setStart(...this.start)
                .setEnd(...this.end);
        }
    }
    exports.Match = Match;
    Match.BASIC_START = "{";
    Match.BASIC_END = "}";
    Match.BASIC = new Match();
});
