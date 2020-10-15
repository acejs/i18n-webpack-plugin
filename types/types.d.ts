import { compilation } from 'webpack';
import { AsyncSeriesWaterfallHook } from 'tapable';
export declare type StringFn = () => string;
export declare type VoidFn = () => void;
export declare type FILTER = (str: string) => boolean;
export interface IOptions {
    path: string;
    getLanguage: StringFn;
    action: string;
    filter: RegExp | FILTER;
    cacheSplit: string;
    type: string[];
}
export declare type LogFn = (message: string, color?: 'red' | 'blue' | 'green') => void;
export interface CompilationHooksWithHtml extends compilation.CompilationHooks {
    htmlWebpackPluginAlterAssetTags: AsyncSeriesWaterfallHook;
}
