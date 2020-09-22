export declare type StringFn = () => string;
export declare type VoidFn = () => string;
export declare type FILTER = (str: string) => boolean;
export interface IOptions {
    path: string;
    getLanguage: StringFn;
    action: string;
    filter: RegExp | FILTER;
    cacheSplit: string;
    type: string[];
}
export declare type LogFn = (message: string, color: 'red' | 'blue' | 'green') => void;
