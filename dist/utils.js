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
exports.chRegAll = new RegExp(exports.chReg, 'g');
exports.thirdModulsReg = /\/node_modules\//;
// // eslint-disable-next-line no-control-regex
// export const chReg2 = /([^\x00-\xff]+[*&]{1}[^\x00-\xff]+)|[^\x00-\xff]+/
exports.jsFileReg = /\.js$/;
exports.isType = (target, type) => {
    return Object.prototype.toString.call(target) === `[object ${type}]`;
};
exports.isAbsolute = (target) => {
    return path_1.default.isAbsolute(target);
};
exports.isHtmlTag = (str) => {
    return str.includes('<') && str.includes('</');
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
 * 检测目标目录是否存在，不存在则创建
 * @param path 目录
 */
exports.checkDirExists = (path) => {
    try {
        fs_1.default.accessSync(path);
    }
    catch (error) {
        fs_1.default.mkdirSync(path);
    }
};
/**
 * 是否仅仅包含第三发模块
 * @param chunk
 */
exports.onlyThirdChunk = (chunk) => {
    let only = true;
    for (const module of chunk.modulesIterable) {
        if (module.resource === undefined || exports.thirdModulsReg.test(module.resource))
            continue;
        only = false;
    }
    return only;
};
exports.log = (message, color) => {
    console.log(chalk_1.default[color](`
	
		--------  ${message}！  --------
	
	`));
};
exports.warn = (...args) => {
    exports.log(...args);
    process.exit(0);
};
