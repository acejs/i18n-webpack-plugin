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
const terser_1 = require("terser");
const prefix = '%%function%%';
/**
 * 获取用户自定义的内容 主要是对自定义函数、方法的处理
 * @param customize
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
    if (utils_1.isType(result, 'Null') || (result === null || result === void 0 ? void 0 : result.code) == undefined)
        return '';
    return result.code;
}
exports.i18nFile = (I18nWebpackPlugin) => __awaiter(void 0, void 0, void 0, function* () {
    const { path: langPath, getLanguage, type } = I18nWebpackPlugin;
    const i18n = {};
    const hasCust = utils_1.checkDirExists(path_1.default.join(langPath, `customize`));
    for (const value of type.values()) {
        const target = path_1.default.join(langPath, `${value}.json`);
        if (!utils_1.checkDirExists(target)) {
            utils_1.warn(`
          i18n package ${value} load failed, 
          Please check the legality of the Chinese language pack naming!`);
        }
        i18n[value] = JSON.parse(fs_1.default.readFileSync(target, 'utf8'));
        try {
            const customize = path_1.default.join(langPath, `customize/${value}.js`);
            if (hasCust && utils_1.checkDirExists(customize)) {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                require('@babel/register')({
                    presets: ['@babel/preset-env'],
                });
                i18n[value].c = yield getCustomizeContent(customize);
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
    const currenLanguage = getLanguage()
    const i18n = ${JSON.stringify(i18n)}
    walk(i18n)
    window.i18n = i18n[currenLanguage]
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
// 获取缓存的数据
exports.getCache = (path, split) => {
    let result = [];
    const content = utils_1.checkFileExists(path);
    if (content === '')
        return result;
    try {
        result = content.split(split);
    }
    catch (error) {
        utils_1.log('Cache reading failed, check whether the cache file is maliciously damaged', 'red');
    }
    return result;
};
