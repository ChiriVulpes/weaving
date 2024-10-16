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
    const BASE_CODES = {
        120: 16, /* x */
        88: 16, /* X */
        98: 2, /* b */
        66: 2, /* B */
        111: 8, /* o */
        79: 8, /* O */
    };
    function isWordChar(n) {
        return (n >= 65 && n < 91) // uppercase
            || (n >= 97 && n < 123) // lowercase
            || n === 95 // _
            || n >= 48 && n < 58; // numbers
    }
    function isDigit(n, base) {
        if (base <= 10)
            return n >= 48 && n < 48 + base; // 0 through 9 (less based on base)
        return (n >= 48 && n < 58) // 0 through 9
            || (n >= 65 && n < 65 + base) // A through Z (less based on base)
            || (n >= 97 && n < 97 + base); // a through z (less based on base)
    }
    class StringWalker {
        str;
        cursor = 0;
        get char() { return this.str[this.cursor]; }
        get nextChar() { return this.str[this.cursor + 1]; }
        get ended() { return this.cursor >= this.str.length; }
        constructor(str) {
            this.str = str;
        }
        prev() {
            --this.cursor;
            return this.char;
        }
        next() {
            ++this.cursor;
            return this.char;
        }
        walk(amount) {
            this.cursor += amount;
            return this;
        }
        walkTo(index) {
            this.cursor = index;
            return this;
        }
        walkUntil(substr) {
            let char = this.char;
            do {
                if (char === substr[0] && this.isAtSubstr(substr))
                    break;
                char = this.next();
            } while (char);
            return this;
        }
        walkWhitespace() {
            let whitespace = "";
            let char = this.char;
            do {
                if (char !== " " && char !== "\t" && char !== "\r" && char !== "\n")
                    break;
                whitespace += char;
                char = this.next();
            } while (char);
            return whitespace;
        }
        walkArgument() {
            let argument = "";
            if (this.walkChar("&"))
                argument += "&";
            let char = this.char;
            do {
                const n = char.charCodeAt(0);
                const word = isWordChar(n)
                    || (n === 46 && isWordChar(this.nextChar?.charCodeAt(0) ?? 0)); // .
                if (!word)
                    break;
                argument += char;
                char = this.next();
            } while (char);
            this.save();
            this.walkWhitespace();
            if (this.walkSubstr("..")) {
                this.unsave();
                argument += "..";
            }
            else {
                this.restore();
            }
            return argument || undefined;
        }
        walkFloat(canHaveBigInt = true) {
            return this.walkNumber(canHaveBigInt);
        }
        walkInteger(canHaveBigInt = true) {
            return this.walkNumber(canHaveBigInt, false);
        }
        walkNumber(canHaveBigInt, canHaveFloat = true, canHaveExponent = true) {
            const negative = this.walkChar("-");
            if (!negative)
                this.walkChar("+");
            let char = this.char;
            let code = char?.charCodeAt(0);
            let base = 10;
            let parseable = negative ? "-" : "";
            const canHaveBase = code === 48; /* 0 */
            if (canHaveBase) {
                char = this.nextChar, code = char?.charCodeAt(0);
                base = BASE_CODES[code] ?? base;
                if (base !== 10) {
                    canHaveFloat = false;
                    parseable += `0${char}`;
                    this.walk(2);
                    char = this.char, code = char?.charCodeAt(0);
                }
            }
            parseable += this.walkDigits(base, char, code);
            let isFloat = false;
            if (canHaveFloat && code === 46 /* . */) {
                const nextCode = this.nextChar?.charCodeAt(0);
                if (nextCode && isDigit(nextCode, base)) {
                    isFloat = true;
                    this.next();
                    parseable += `.${this.walkDigits(base)}`;
                }
            }
            if (!parseable)
                return undefined;
            let bigint = false;
            if (!isFloat && canHaveBigInt && (code === 110 /* n */ || code === 78 /* N */)) {
                bigint = true;
                this.next();
                char = this.next(), code = char?.charCodeAt(0);
            }
            let integer = bigint ? BigInt(parseable) : isFloat ? parseFloat(parseable) : parseInt(parseable, base);
            if (canHaveExponent && (code === 101 /* e */ || code === 69 /* E */)) {
                let exponent = this.walkNumber(canHaveBigInt, undefined, false);
                if (exponent === undefined)
                    return integer;
                if (typeof integer === "bigint") {
                    if (typeof exponent !== "bigint")
                        exponent = BigInt(exponent);
                    return integer ** exponent;
                }
                else {
                    if (typeof exponent === "bigint")
                        integer = BigInt(integer);
                    return integer ** exponent;
                }
            }
            return integer;
        }
        walkDigits(base, char = this.char, code = char?.charCodeAt(0)) {
            let digits = "";
            let canUnderscore = false;
            let nextIsDigit;
            do {
                const digit = code && (nextIsDigit ?? isDigit(code, base));
                if (!digit) {
                    if (canUnderscore && code === 95 /* _ */) {
                        const nextCode = this.nextChar?.charCodeAt(0);
                        nextIsDigit = nextCode ? isDigit(nextCode, base) : undefined;
                        if (nextIsDigit) {
                            // consume the underscore
                            canUnderscore = false;
                            continue;
                        }
                    }
                    break;
                }
                canUnderscore = true;
                digits += char;
            } while (char = this.next(), code = char?.charCodeAt(0));
            return digits;
        }
        savedCursors = [];
        save() {
            this.savedCursors.push(this.cursor);
            return this;
        }
        unsave() {
            this.savedCursors.pop();
            return this;
        }
        restore() {
            this.cursor = this.savedCursors.pop() ?? this.cursor;
            return this;
        }
        hasNext(substr) {
            const str = this.str;
            const index = this.cursor;
            for (let i = 0; i < substr.length; i++) {
                if (str[index + i] !== substr[i]) {
                    return false;
                }
            }
            return true;
        }
        walkChar(char) {
            if (this.char === char) {
                this.next();
                return true;
            }
            return false;
        }
        walkSubstr(...substr) {
            for (const str of substr) {
                if (this.hasNext(str)) {
                    this.cursor += str.length;
                    return true;
                }
            }
            return false;
        }
        clone() {
            return new StringWalker(this.str)
                .walkTo(this.cursor);
        }
        isAtSubstr(substr) {
            if (this.cursor + substr.length > this.str.length)
                return false;
            for (let i = 0; i < substr.length; i++)
                if (this.str[this.cursor + i] !== substr[i])
                    return false;
            return true;
        }
    }
    exports.default = StringWalker;
});
