"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
// eslint-disable-next-line no-control-regex
exports.chReg = /[^\x00-\xff]+/;
// 精准匹配中文的正则
exports.onlyChReg = /\p{Unified_Ideograph}+/u;
// 正则中需要转义的符号
exports.needEscapeSymbol = new Set([
    '*',
    '.',
    '?',
    '+',
    '$',
    '^',
    '[',
    ']',
    '(',
    ')',
    '{',
    '}',
    '|',
    '/',
    '\\',
]);
exports.thirdModulsReg = /\/node_modules\//;
// // eslint-disable-next-line no-control-regex
// export const chReg2 = /([^\x00-\xff]+[*&]{1}[^\x00-\xff]+)|[^\x00-\xff]+/
exports.jsFileReg = /\.js$/;
exports.defaultOptions = {
    type: ['zh', 'en'],
    customize: 'customize',
    excel: 'excel',
    filter: (value) => value.trim() !== '',
};
exports.isType = (target, type) => {
    return Object.prototype.toString.call(target) === `[object ${type}]`;
};
exports.isAbsolute = (target) => {
    return path_1.default.isAbsolute(target);
};
// export const isHtmlTag = (str: string): boolean => {
//   return str.includes('<') && str.includes('</')
// }
exports.dealWithOriginalStr = (str) => {
    return str.trim();
};
exports.configFileExists = (file) => {
    if (!fs_1.default.existsSync(file))
        exports.warn('Can not read i18n.config.js');
};
/**
 * 检测目标文件是否存在
 * 若存在返回对应的内容
 * 若不存在，创建该文件并返回空字符串
 * @param path 目标文件
 */
exports.checkFileExists = (path) => {
    let result = '';
    try {
        result = fs_1.default.readFileSync(path, 'utf8');
    }
    catch (error) {
        fs_1.default.writeFileSync(path, '');
    }
    return result;
};
/**
 * 检测目标目录是否存在
 * @param path 目录
 */
exports.checkDirExists = (path) => {
    let result;
    try {
        fs_1.default.accessSync(path);
        result = true;
    }
    catch (_a) {
        result = false;
    }
    return result;
};
/**
 * 检测目标目录是否存在，不存在则创建
 * @param path 目录
 */
exports.mkdirDirUnExists = (path) => {
    if (!exports.checkDirExists(path))
        fs_1.default.mkdirSync(path);
};
/**
 * 跳过的 chunk
 * @param chunk
 * 是否仅仅包含第三发模块，临时的解决方案、需要更确切的方案
 * 无需翻译的模块
 */
// onlyThirdChunk
exports.ignoreChunk = (chunk) => {
    if (chunk.chunkReason !== undefined && chunk.chunkReason.includes('name:')) {
        return true;
    }
    else {
        for (const modules of chunk.modulesIterable) {
            if (modules.rootModule &&
                modules.rootModule.resource &&
                modules.rootModule.resource.includes('withouti18n=true')) {
                return true;
            }
        }
    }
    return false;
};
exports.log = (message, color = 'blue') => {
    console.log(chalk_1.default[color](`
	
    ******************************** I18nWebpackPlugin ********************************

    ${message}
	
	`));
};
exports.warn = (message, color = 'red') => {
    exports.log(message, color);
    process.exit(0);
};
