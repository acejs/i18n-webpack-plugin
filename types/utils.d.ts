import { LogFn } from './types';
export declare const chReg: RegExp;
export declare const chRegAll: RegExp;
export declare const thirdModulsReg: RegExp;
export declare const jsFileReg: RegExp;
export declare const isType: (target: unknown, type: string) => boolean;
export declare const isAbsolute: (target: string) => boolean;
export declare const isHtmlTag: (str: string) => boolean;
/**
 * 检测目标文件是否存在
 * 若存在返回对应的内容
 * 若不存在，创建该文件并返回空字符串
 * @param path 目标文件
 */
export declare const checkFileExists: (path: string) => string;
/**
 * 检测目标目录是否存在，不存在则创建
 * @param path 目录
 */
export declare const checkDirExists: (path: string) => void;
/**
 * 是否仅仅包含第三发模块
 * @param chunk
 */
export declare const onlyThirdChunk: (chunk: any) => boolean;
export declare const log: LogFn;
export declare const warn: LogFn;
