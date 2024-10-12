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
        _matches = [];
        get matches() {
            return this._matches.length === 0 ? Match.BASIC : this._matches;
        }
        match(...matches) {
            this._matches.push(...matches);
            return this;
        }
        tokenise;
        setTokeniser(tokeniser, ...args) {
            this.tokenise = (walker, match, api) => tokeniser(walker, match, api, ...args);
            return this;
        }
        _weftProperties = [];
        addWeftProperty(property, type) {
            this._weftProperties.push([property, type]);
            return this;
        }
    }
    exports.default = Warp;
    class Match {
        static BASIC_START = "{";
        static BASIC_END = "}";
        static BASIC = new Match();
        constructor(start, end) {
            if (start !== undefined)
                this.start[0] = start;
            if (end !== undefined)
                this.end[0] = end;
        }
        start = [Match.BASIC_START];
        setStart(...starts) {
            this.start = starts;
            return this;
        }
        addStarts(...starts) {
            this.start.push(...starts);
            return this;
        }
        end = [Match.BASIC_END];
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
});
