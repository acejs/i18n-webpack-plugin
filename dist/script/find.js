"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_xlsx_1 = __importDefault(require("node-xlsx"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("../utils");
const i18n_file_1 = require("../i18n-file");
function find(words) {
    const configPath = path_1.default.join(process.cwd(), 'i18n.config.js');
    utils_1.configFileExists(configPath);
    const map = new Map(words.map((w) => [w, []]));
    const { root, excel = utils_1.defaultOptions.excel, } = require(configPath);
    const existsExcel = i18n_file_1.getAllExcel(path_1.default.join(root, excel), true);
    for (const file of existsExcel) {
        const data = node_xlsx_1.default.parse(path_1.default.join(root, excel, file))[0].data;
        const index = data[0].indexOf('zh');
        for (let i = 1; i < data.length; i++) {
            if (map.has(data[i][index])) {
                map.get(data[i][index]).push(file);
            }
        }
    }
    const ans = {};
    for (const [word, files] of map) {
        ans[word] = {};
        files.forEach((file, index) => (ans[word][`excel${index + 1}`] = file));
    }
    console.table(ans);
    process.exit(0);
}
exports.default = find;
