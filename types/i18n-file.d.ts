import plugin from './index';
import { IOptions } from './types';
interface II18nFile {
    input: string;
    filename: string;
}
export declare const i18nFile: (plugin: plugin, all: {
    [props: string]: string[];
}, index: Map<number, string>) => Promise<II18nFile>;
export declare function getAllExcel(dir: string, all?: boolean): string[];
export declare const fromExistsExcel: (options: IOptions, range: "all" | "zh") => {
    [props: string]: string[];
};
export {};
