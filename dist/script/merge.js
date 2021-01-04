"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_xlsx_1 = __importDefault(require("node-xlsx"));
const path_1 = __importDefault(require("path"));
const inquirer_1 = __importDefault(require("inquirer"));
const utils_1 = require("../utils");
const i18n_file_1 = require("../i18n-file");
const fs_1 = __importDefault(require("fs"));
function merge(range) {
    const configPath = path_1.default.join(process.cwd(), 'i18n.config.js');
    utils_1.configFileExists(configPath);
    const { root, excel = utils_1.defaultOptions.excel, type = utils_1.defaultOptions.type, } = require(configPath);
    const existsExcel = i18n_file_1.getAllExcel(path_1.default.join(root, excel));
    // 检测文件是否存在
    if (range !== 'all' && range.some((name) => !existsExcel.includes(name))) {
        utils_1.warn('non-existent excel file is specified.');
    }
    // 合并所有 或者指定合并中必须合并到 i18n.xlsx 中
    const needMergeFiles = range === 'all' ? existsExcel : range;
    if (needMergeFiles.length <= 1) {
        utils_1.warn('Must specify two or more excel files.');
    }
    const cache = new Map();
    const repeat = [];
    for (const file of needMergeFiles) {
        const data = node_xlsx_1.default.parse(path_1.default.join(root, excel, file))[0].data;
        const first = data[0];
        const zhIndex = first.indexOf('zh');
        for (let i = 1; i < data.length; i++) {
            // 获取每一行的对象格式
            const o = { file };
            for (let j = 0; j < first.length; j++) {
                if (j === zhIndex)
                    continue;
                o[first[j]] = data[i][j];
            }
            const zh = data[i][zhIndex];
            if (cache.has(zh)) {
                // 判断翻译 是否完全一致
                const arr = cache.get(zh);
                if (arr.length === 1) {
                    // 当只有一条重复的记录时，需要判断是否一致
                    let same = true;
                    for (const [key, value] of Object.entries(arr[0])) {
                        if (key === 'file')
                            continue;
                        if (o[key] !== value) {
                            same = false;
                            break;
                        }
                    }
                    // 重复的内容全部相同，直接忽略
                    if (same)
                        continue;
                    else {
                        arr.push(o);
                        cache.set(zh, arr);
                        // 添加重复的中文记录
                        repeat.push(zh);
                    }
                }
                else {
                    // 判断重复的内容超过一条时，直接添加
                    arr.push(o);
                    cache.set(zh, arr);
                }
            }
            else {
                cache.set(zh, [o]);
            }
        }
    }
    // 处理重复的字符
    if (repeat.length > 0) {
        inquirer_1.default
            .prompt([
            {
                type: 'list',
                name: 'select',
                message: '出现重复的翻译，请选择合并方式',
                choices: [
                    {
                        name: '手动合并',
                        value: 'manual',
                    },
                    // {
                    //   name: '命令行合并',
                    //   value: 'terminal',
                    // },
                    {
                        name: '自动合并',
                        value: 'auto',
                    },
                ],
            },
        ])
            .then((answer) => {
            const { select } = answer;
            if (select === 'manual') {
                const ans = {};
                for (const word of repeat) {
                    ans[word] = {};
                    cache.get(word).forEach(({ file }, index) => {
                        ans[word][`excel${index + 1}`] = file;
                    });
                }
                console.table(ans);
                process.exit(0);
            }
            else if (select === 'terminal') {
                // TO DO
                // const prompt = []
                // for (const word of repeat) {
                //   const arr = cache.get(word)!
                //   for (const lang of type) {
                //     if (lang === 'zh') continue
                //     const item = {
                //       type: 'list',
                //       name: 'select',
                //       message: `word -- ${lang}`,
                //       choices: [],
                //     }
                //     // 遍历并对比所有的翻译字符
                //   }
                // }
            }
            else if (select === 'auto') {
                // 获取第一个
                for (const word of repeat) {
                    cache.set(word, cache.get(word).splice(0, 1));
                }
                gen(cache, type, root, excel, needMergeFiles);
            }
        });
    }
    gen(cache, type, root, excel, needMergeFiles);
}
function gen(cache, type, root, excel, files) {
    const data = [type];
    for (const [zh, info] of cache.entries()) {
        const tmp = [];
        for (let i = 0; i < type.length; i++) {
            if (type[i] === 'zh')
                tmp.push(zh);
            else
                tmp.push(info[0][type[i]]);
        }
        data.push(tmp);
    }
    const name = `i18n-${Date.now()}.xlsx`;
    const buffer = node_xlsx_1.default.build([{ name, data }]);
    fs_1.default.writeFileSync(path_1.default.resolve(root, excel, name), new Uint8Array(buffer), {
        flag: 'w',
    });
    for (const file of files) {
        fs_1.default.unlinkSync(path_1.default.resolve(root, excel, file));
    }
    utils_1.log(`Merge finished, ${name}`);
    process.exit(0);
}
exports.default = merge;
