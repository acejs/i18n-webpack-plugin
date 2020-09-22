import { StringFn, FILTER, IOptions } from './types';
import { Compiler } from 'webpack';
declare class I18nWebpackPlugin {
    path: string;
    getLanguage: StringFn;
    action: string;
    filter: FILTER;
    cacheSplit: string;
    type: string[];
    webpackConfig: {
        publicPath: string;
        mode: string;
        outputPath: string;
    };
    constructor(options: IOptions);
    apply(compiler: Compiler): void;
}
export default I18nWebpackPlugin;
