import Quilt from './Quilt';
export { Quilt };
declare namespace Weaving {
    interface Options extends Quilt.Options {
        verbose?: true;
        out?: string;
        types?: true;
        outTypes?: string;
        dry?: true;
    }
    function quilt(file: string, options?: Options, warps?: import("./Warp").default[]): Promise<boolean>;
}
export default Weaving;
