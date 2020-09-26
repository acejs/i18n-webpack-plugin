import plugin from './index';
interface II18nFile {
    input: string;
    filename: string;
}
export declare const i18nFile: (I18nWebpackPlugin: plugin) => Promise<II18nFile>;
export declare const getCache: (path: string, split: string) => string[];
export {};
