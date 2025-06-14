import type Warp from "./Warp";
import type { Thread } from "./Weave";
import Weave from "./Weave";
interface Quilt {
    file: string;
    contents: string;
    threads: Record<string, Thread>;
}
declare function Quilt(file: string, options?: Quilt.Options, warps?: Warp[]): Promise<Quilt>;
declare const BaseError: ErrorConstructor;
declare namespace Quilt {
    interface Options {
        /** Replace the default weaving function with an edited implementation. The default implementation resides in `Weave.compile` */
        weave?: typeof Weave.compile;
        whitespace?: true;
    }
    const DEFAULT_WARPS: Warp[];
    class Error extends BaseError {
        readonly line: number;
        readonly column: number;
        constructor(reason: string, line: number, column: number);
    }
}
export default Quilt;
