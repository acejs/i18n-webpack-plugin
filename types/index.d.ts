import { IProps, IOptions } from './types';
import { Compiler } from 'webpack';
declare class I18nWebpackPlugin {
    webpackConfig: {
        publicPath: string;
        mode: string;
        path: string;
    };
    options: IOptions;
    constructor(props: IProps);
    apply(compiler: Compiler): void;
}
export default I18nWebpackPlugin;
