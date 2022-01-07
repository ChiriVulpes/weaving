export interface IArgument {
    path: string;
    type: string;
}
export declare namespace IArgument {
    function accessor(path: string): string;
}
export interface IToken {
    compiled?: string;
    string?: string;
    args?: IArgument[];
}
export interface IWeft {
    content: string | IToken[];
    details?: Record<string, string>;
}
export declare namespace IWeft {
    function compile(weft: IWeft): string;
}
declare class Token implements IToken {
    static compile(...tokens: IToken[]): string;
    static stringify(inner: true, ...tokens: IToken[]): string;
    static stringify(...tokens: IToken[]): string;
    static rawGenerator(generator: string): string;
    compiled?: string;
    string?: string;
    setCompiled(compiled: IWeft | string, string: string): this;
    args: IArgument[];
    addArgument(path: string, type: string): this;
    inheritArguments(...tokens: IToken[]): this;
}
declare namespace Token {
    class Text implements IToken {
        text: string;
        get compiled(): string;
        get string(): string;
    }
}
export default Token;
