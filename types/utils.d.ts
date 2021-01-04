import { LogFn } from './types';
export declare const chReg: RegExp;
export declare const onlyChReg: RegExp;
export declare const needEscapeSymbol: Set<string>;
export declare const thirdModulsReg: RegExp;
export declare const jsFileReg: RegExp;
export declare const defaultOptions: {
    type: string[];
    customize: string;
    excel: string;
    filter: (value: string) => boolean;
};
export declare const isType: (target: unknown, type: string) => boolean;
export declare const isAbsolute: (target: string) => boolean;
export declare const dealWithOriginalStr: (str: string) => string;
export declare const configFileExists: (file: string) => void;
/**
 * 检测目标文件是否存在
 * 若存在返回对应的内容
 * 若不存在，创建该文件并返回空字符串
 * @param path 目标文件
 */
export declare const checkFileExists: (path: string) => string;
/**
 * 检测目标目录是否存在
 * @param path 目录
 */
export declare const checkDirExists: (path: string) => boolean;
/**
 * 检测目标目录是否存在，不存在则创建
 * @param path 目录
 */
export declare const mkdirDirUnExists: (path: string) => void;
/**
 * 跳过的 chunk
 * @param chunk
 * 是否仅仅包含第三发模块，临时的解决方案、需要更确切的方案
 * 无需翻译的模块
 */
export declare const ignoreChunk: (chunk: any) => boolean;
export declare const log: LogFn;
export declare const warn: LogFn;
