"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const spark_md5_1 = __importDefault(require("spark-md5"));
const core_1 = require("@babel/core");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
const node_xlsx_1 = __importDefault(require("node-xlsx"));
const terser_1 = require("terser");
const prefix = '%%function%%';
/**
 * 获取用户自定义的内容 主要是对自定义函数、方法的处理
 * @param customize 文件夹
 */
const getCustomizeContent = (customize) => {
    return new Promise((resolve, reject) => {
        try {
            Promise.resolve().then(() => __importStar(require(customize))).then(({ default: o }) => {
                for (const [key, value] of Object.entries(o)) {
                    if (typeof value === 'function') {
                        o[key] = prefix + value.toString();
                    }
                }
                return resolve(JSON.stringify(o));
            });
        }
        catch (error) {
            return reject(error);
        }
    });
};
// parser code
function babelCode(str) {
    const result = core_1.transform(str, {
        configFile: false,
        presets: ['@babel/preset-env'],
    });
    if (result === null || (result === null || result === void 0 ? void 0 : result.code) == undefined)
        return '';
    return result.code;
}
exports.i18nFile = (plugin, all, index) => __awaiter(void 0, void 0, void 0, function* () {
    const { root, customize, getLanguage, type } = plugin.options;
    const i18n = {};
    const hasCust = utils_1.checkDirExists(path_1.default.join(root, customize));
    for (const t of type) {
        const list = all[t];
        const cur = {};
        let i = 1;
        for (const lang of list) {
            cur[index.get(i++)] = lang;
        }
        i18n[t] = cur;
        try {
            const cus = path_1.default.join(root, customize, `${t}.js`);
            if (hasCust && utils_1.checkDirExists(cus)) {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                require('@babel/register')({
                    presets: ['@babel/preset-env'],
                });
                i18n[t].c = yield getCustomizeContent(cus);
            }
        }
        catch (error) {
            utils_1.log('Failed to read custom language pack, please follow the naming rules', 'red');
        }
    }
    const str = `
  function setCurrentI18nList () {
    function walk (o) {
      for (const val of Object.values(o)) {
        if (!val.c) continue
        const customize = val.c = JSON.parse(val.c)
  
        for (const [key, value] of Object.entries(customize)) {
          if (value.indexOf('${prefix}') >=0) {
            customize[key] = eval('(' + value.replace('${prefix}', '') + ')')
          }
        }
  
      }
      return o
    }

    const getLanguage = ${getLanguage}
    const currentLanguage = getLanguage()
    const i18n = ${JSON.stringify(i18n)}
    walk(i18n)
    // 考虑到兼容性，不要使用 Reflect
    Object.defineProperty(window, 'i18n', {
      value: i18n[currentLanguage]
    })
  }
  setCurrentI18nList()
  `;
    const { code } = yield terser_1.minify(babelCode(str));
    const input = code || '';
    const spark = new spark_md5_1.default();
    spark.append(input);
    const hash = spark.end().slice(0, 6);
    const filename = `i18n-${hash}.js`;
    return {
        input,
        filename,
    };
});
// 获取 excel 文件夹下的所有 excel 文件
function getAllExcel(dir, all = false) {
    return fs_1.default
        .readdirSync(dir)
        .filter((name) => name !== '.DS_Store' && (all || name.startsWith('i18n')));
}
exports.getAllExcel = getAllExcel;
// 获取缓存的数据
exports.fromExistsExcel = (options, range) => {
    // 当前所有语言类型存储
    const map = {};
    const { root, type, excel } = options;
    const files = getAllExcel(path_1.default.join(root, excel), range === 'zh');
    if (files.length === 0)
        return map;
    const cur = range === 'all' ? type : ['zh'];
    for (const t of cur) {
        map[t] = [];
    }
    // 遍历读取文件
    for (const file of files) {
        const data = node_xlsx_1.default.parse(path_1.default.join(root, excel, file))[0].data;
        if (file === '.ignore.xlsx') {
            // 忽略文件的处理
            map.ignore = [];
            for (let i = 1; i < data.length; i++) {
                if (!data[i][0])
                    continue;
                map.ignore.push(data[i][0]);
            }
            continue;
        }
        // 获取指定 index => lang
        const keyMap = new Map();
        data[0].forEach((lang, index) => cur.includes(lang) && keyMap.set(index, lang));
        for (let i = 1; i < data.length; i++) {
            data[i].forEach((item, index) => {
                keyMap.has(index) && map[keyMap.get(index)].push(item);
            });
        }
    }
    return map;
};
