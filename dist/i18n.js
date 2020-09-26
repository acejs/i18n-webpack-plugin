#!/usr/bin/env ts-node --script-mode --transpile-only
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_xlsx_1 = __importDefault(require("node-xlsx"));
const yargs_1 = __importDefault(require("yargs"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
const argv = yargs_1.default
    .options({
    xlsx: {
        alias: 'x',
        describe: '包含语言包的 Excel 文件',
        type: 'string',
        demandOption: true,
    },
    out: {
        alias: 'o',
        describe: '文件输出目录',
        type: 'string',
        demandOption: true,
    },
    type: {
        alias: 't',
        describe: "语言种类， '|' 分隔",
        type: 'string',
        default: 'zh|en',
    },
})
    .help().argv;
// 生成语言包 key 值
const prefix = 'i18n';
const genKey = (index) => {
    if (!index)
        throw new Error('KEY Error');
    return `${prefix}${String(index).padStart(5, '0')}`;
};
// 读取 excel 内容
let data;
try {
    const file = fs_1.default.readFileSync(argv.xlsx);
    data = node_xlsx_1.default.parse(file)[0].data;
}
catch ({ message }) {
    utils_1.warn(message);
    process.exit(0);
}
// 获取 语言类型 数组
const range = argv.type.split('|').map((item) => item.trim());
const exists = {};
let start = 0;
// 遍历获取已存在的语言类型
for (const r of range) {
    const content = utils_1.checkFileExists(path_1.default.join(argv.out, `${r}.json`));
    if (content === '') {
        exists[r] = {};
        continue;
    }
    exists[r] = JSON.parse(content);
    if (r === 'zh' && typeof exists[r] === 'object') {
        start = Object.keys(exists[r]).length;
    }
}
// 缓存已已存在的中文
const cacheMap = new Set();
for (const val of Object.values(exists.zh)) {
    cacheMap.add(val);
}
let gap = 0;
// 记录语言对应的索引
const target = {};
for (const [index, value] of data.entries()) {
    if (index === 0) {
        value.forEach((item, index) => void (target[item] = index));
        continue;
    }
    // 检测是否已经存在
    if (cacheMap.has(value[target.zh]) || value.length !== range.length) {
        ++gap;
        continue;
    }
    const key = genKey(index + start - gap);
    for (const l of range) {
        exists[l][key] = value[target[l]];
    }
}
if (Object.keys(exists.zh).length === start) {
    utils_1.warn('未检测到新的中文字符！', 'blue');
}
for (const [key, value] of Object.entries(exists)) {
    fs_1.default.writeFileSync(path_1.default.join(argv.out, `${key}.json`), JSON.stringify(value), 'utf8');
}
utils_1.log('语言文件写入成功！', 'green');
