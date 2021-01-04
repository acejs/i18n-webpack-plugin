#!/usr/bin/env ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = __importDefault(require("yargs"));
const utils_1 = require("./utils");
const find_1 = __importDefault(require("./script/find"));
const merge_1 = __importDefault(require("./script/merge"));
const argv = yargs_1.default
    .options({
    find: {
        alias: 'f',
        description: '查找指定文字所在的 excel 文件及行数',
        type: 'array',
    },
    merge: {
        alias: 'm',
        description: '合并 excel 文件',
        type: 'array',
    },
})
    .help().argv;
if (argv.find) {
    if (!argv.find.length)
        utils_1.log('Please enter the words to search!');
    find_1.default(argv.find);
}
else if (argv.merge) {
    const list = argv.merge.length === 0 ? 'all' : argv.merge;
    merge_1.default(list);
}
