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
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("@babel/parser");
const traverse_1 = __importDefault(require("@babel/traverse"));
const types_1 = require("@babel/types");
const template_1 = __importDefault(require("@babel/template"));
const generator_1 = __importDefault(require("@babel/generator"));
const path_1 = __importDefault(require("path"));
const node_xlsx_1 = __importDefault(require("node-xlsx"));
const fs_1 = __importDefault(require("fs"));
const i18n_file_1 = require("./i18n-file");
const utils_1 = require("./utils");
const webpack_sources_1 = require("webpack-sources");
const i18nTemplate = template_1.default.expression(`
  window.i18n[%%key%%]
`);
const ni18nTemplate = template_1.default.expression(`
  %%value%%
`);
class I18nWebpackPlugin {
    constructor(options) {
        this.filter = (value) => value.trim() !== '';
        this.cacheSplit = '^+-+^';
        this.webpackConfig = {
            publicPath: '',
            mode: 'development',
            outputPath: '',
        };
        const { path, action, getLanguage, filter, cacheSplit, type } = options;
        if (!path || !utils_1.isAbsolute(path))
            utils_1.warn(`${this.constructor.name} - options path is required and must be absolute`, 'red');
        if (typeof getLanguage !== 'function')
            utils_1.warn(`${this.constructor.name} - options getLanguage must be a function`, 'red');
        this.path = path;
        this.getLanguage = getLanguage;
        this.action = action;
        cacheSplit && (this.cacheSplit = cacheSplit);
        this.type = type;
        if (typeof filter === 'function') {
            this.filter = filter;
        }
        else if (utils_1.isType(filter, 'RegExp')) {
            this.filter = (value) => value.replace(filter, '') !== '';
        }
    }
    apply(compiler) {
        const self = this;
        const { mode, output } = compiler.options;
        // 获取 webpack 配置
        Object.assign(this.webpackConfig, {
            publicPath: (output === null || output === void 0 ? void 0 : output.publicPath) || '/',
            mode,
            outputPath: (output === null || output === void 0 ? void 0 : output.path) || path_1.default.join(process.cwd(), 'dist'),
        });
        utils_1.checkDirExists(self.path);
        if (this.action === 'collect') {
            const callback = (compilation) => {
                collectChineseFromChunk(compilation, self)
                    .then((res) => void utils_1.log(res, 'blue'))
                    .catch(({ message }) => void utils_1.log(message, 'red'))
                    .finally(() => void process.exit(0));
            };
            compiler.hooks.emit.tap(self.constructor.name, callback);
        }
        else {
            let input, filename;
            if (mode === 'development')
                compiler.options.devtool = undefined;
            try {
                addCache(self);
            }
            catch (error) {
                utils_1.warn(`No valid Chinese language pack detected, 
           Please check the legality of the Chinese language pack naming!`, 'red');
            }
            // load i18n package
            compiler.hooks.compilation.tap(self.constructor.name, (compilation) => {
                let alterAssetTags;
                for (const [key, value] of Object.entries(compilation.hooks)) {
                    if (key === 'htmlWebpackPluginAlterAssetTags')
                        alterAssetTags = value;
                }
                if (!alterAssetTags) {
                    utils_1.warn(`Unable to find an instance of HtmlWebpackPlugin in the current compilation`, 'red');
                }
                alterAssetTags.tapAsync(this.constructor.name, (htmlPluginData, cb) => __awaiter(this, void 0, void 0, function* () {
                    const result = yield i18n_file_1.i18nFile(self);
                    input = result.input;
                    filename = result.filename;
                    const { head } = htmlPluginData;
                    const o = {
                        tagName: 'script',
                        voidTag: false,
                        attributes: {
                            type: 'text/javascript',
                        },
                    };
                    if (self.webpackConfig.mode === 'development') {
                        o.innerHTML = input;
                    }
                    else {
                        o.attributes = {
                            type: 'text/javascript',
                            src: `/${path_1.default.join(self.webpackConfig.publicPath, filename)}`,
                        };
                    }
                    head.unshift(o);
                    cb();
                }));
                compilation.hooks.optimizeChunkAssets.tap(self.constructor.name, (chunks) => {
                    const visitor = {
                        enter(path) {
                            if (types_1.isStringLiteral(path.node)) {
                                let { value } = path.node;
                                if (utils_1.chReg.test(value) && self.filter(value)) {
                                    value = value.trim();
                                    if (utils_1.isHtmlTag(value)) {
                                        let needReplace = false;
                                        const matches = value.match(utils_1.chRegAll) || [];
                                        for (const match of matches.values()) {
                                            const key = cacheMap.get(match);
                                            if (!key)
                                                continue;
                                            value = value.replace(match, `window.i18n.${key}`);
                                            needReplace = true;
                                        }
                                        if (needReplace) {
                                            path.replaceWith(ni18nTemplate({
                                                value: types_1.stringLiteral(value),
                                            }));
                                        }
                                    }
                                    else {
                                        if (cacheMap.has(value)) {
                                            const key = cacheMap.get(value);
                                            const tAst = i18nTemplate({
                                                key: types_1.stringLiteral(key),
                                            });
                                            path.replaceWith(tAst);
                                        }
                                    }
                                }
                            }
                        },
                    };
                    for (const chunk of chunks.values()) {
                        // 跳过仅包含第三方模块的chunk
                        if (utils_1.onlyThirdChunk(chunk))
                            continue;
                        for (const filename of chunk.files.values()) {
                            if (!utils_1.jsFileReg.test(filename))
                                continue;
                            const source = compilation.assets[filename].source();
                            const ast = parser_1.parse(source, { sourceType: 'script' });
                            traverse_1.default(ast, visitor);
                            compilation.assets[filename] = new webpack_sources_1.ConcatSource(generator_1.default(ast).code);
                        }
                    }
                });
            });
            // production load by script
            if (self.webpackConfig.mode === 'production') {
                compiler.hooks.done.tapAsync(this.constructor.name, (compilation, cb) => {
                    fs_1.default.writeFile(path_1.default.resolve(self.webpackConfig.outputPath, filename), input, { encoding: 'utf8' }, (err) => {
                        if (err)
                            throw err;
                        cb();
                    });
                });
            }
        }
    }
}
function collectChineseFromChunk(compilation, self) {
    return new Promise((resolve, reject) => {
        const cacheList = i18n_file_1.getCache(path_1.default.resolve(self.path, '.cache'), self.cacheSplit);
        const arr = [];
        function push(value) {
            value = value.trim();
            if (value &&
                !arr.includes(value) &&
                !cacheList.includes(value) &&
                utils_1.chReg.test(value)) {
                arr.push(value);
            }
        }
        const visitor = {
            enter(path) {
                if (types_1.isStringLiteral(path.node)) {
                    const { value } = path.node;
                    if (utils_1.chReg.test(value) && self.filter(value)) {
                        if (utils_1.isHtmlTag(value)) {
                            const matches = value.match(utils_1.chRegAll);
                            if (Array.isArray(matches) && matches.length > 0) {
                                matches.forEach((match) => {
                                    push(match);
                                });
                            }
                        }
                        else {
                            push(value);
                        }
                    }
                }
            },
        };
        for (const chunk of compilation.chunks.values()) {
            // 跳过仅包含第三方模块的chunk
            if (utils_1.onlyThirdChunk(chunk))
                continue;
            const { files } = chunk;
            if (!Array.isArray(files) || files.length === 0)
                continue;
            for (const filename of files.values()) {
                if (utils_1.jsFileReg.test(filename)) {
                    const source = compilation.assets[filename].source();
                    const ast = parser_1.parse(source, { sourceType: 'script' });
                    traverse_1.default(ast, visitor);
                }
            }
        }
        if (arr.length === 0) {
            return resolve('Scanning is complete, no new Chinese characters are detected!');
        }
        const data = [self.type];
        arr.forEach((ch) => {
            data.push([ch]);
        });
        const buffer = node_xlsx_1.default.build([{ name: 'i18n', data }]);
        const now = Date.now();
        // 检测目录是否存在
        utils_1.checkDirExists(path_1.default.join(self.path, 'excel'));
        fs_1.default.writeFile(path_1.default.resolve(self.path, 'excel', `i18n-${now}.xlsx`), new Uint8Array(buffer), { flag: 'w' }, (err) => {
            if (err)
                return reject(err);
            // 写入缓存
            i18n_file_1.writeCache(path_1.default.resolve(self.path, '.cache'), cacheList.concat(arr), self.cacheSplit);
            return resolve('Scan successfully!');
        });
    });
}
/**
 * cache
 */
const cacheMap = new Map();
function addCache(plugin) {
    const { path: cachePath, type } = plugin;
    const zhJson = fs_1.default.readFileSync(path_1.default.join(cachePath, `${type[0]}.json`), 'utf8');
    const zh = JSON.parse(zhJson);
    for (const [key, value] of Object.entries(zh)) {
        cacheMap.set(value, key);
    }
}
exports.default = I18nWebpackPlugin;
