import fs from "fs";
declare namespace File {
    function stat(file: string): Promise<fs.Stats | null>;
    function children(dir: string): Promise<string[] | never[]>;
    function relative(file: string): string;
}
export default File;
