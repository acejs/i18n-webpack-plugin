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
class I18nWebpackPlugin {
    constructor(options) {
        this.filter = (value) => value.trim() !== '';
        this.cacheSplit = '^+-+^';
        this.type = ['zh', 'en'];
        this.webpackConfig = {
            publicPath: '',
            mode: 'development',
            path: '',
        };
        const { path, action, getLanguage, filter, cacheSplit, type } = options;
        if (!path || !utils_1.isAbsolute(path))
            utils_1.warn(`options path is required and must be absolute`);
        if (typeof getLanguage !== 'function')
            utils_1.warn(`options getLanguage must be a function`);
        this.path = path;
        this.getLanguage = getLanguage;
        this.action = action;
        cacheSplit && (this.cacheSplit = cacheSplit);
        Array.isArray(type) && (this.type = type);
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
        const { publicPath, path: outPath } = output || {};
        // 获取 webpack 配置
        Object.assign(this.webpackConfig, {
            publicPath: publicPath || '',
            mode,
            path: outPath || path_1.default.join(process.cwd(), 'dist'),
        });
        utils_1.mkdirDirUnExists(self.path);
        if (mode === 'development' && this.action === 'collect') {
            utils_1.warn(`
        Don't collect chinese in development mode.
        Set action to empty or delete it！
      `);
        }
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
           Please check the legality of the Chinese language pack naming!`);
            }
            // load i18n package
            compiler.hooks.compilation.tap(self.constructor.name, (compilation) => {
                // This is set in html-webpack-plugin pre-v4.
                let hook = compilation.hooks
                    .htmlWebpackPluginAlterAssetTags;
                if (!hook) {
                    if (!Array.isArray(compiler.options.plugins)) {
                        utils_1.warn(`No plugin has registered.`);
                        process.exit(0);
                    }
                    const [htmlPlugin] = compiler.options.plugins.filter((plugin) => plugin.constructor.name === 'HtmlWebpackPlugin');
                    // temp
                    hook = htmlPlugin.constructor.getHooks(compilation)
                        .alterAssetTagGroups;
                }
                hook.tapAsync(this.constructor.name, (htmlPluginData, cb) => __awaiter(this, void 0, void 0, function* () {
                    const result = yield i18n_file_1.i18nFile(self);
                    input = result.input;
                    filename = result.filename;
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
                            src: `${self.webpackConfig.publicPath}${filename}`,
                        };
                    }
                    htmlPluginData.plugin.version >= 4
                        ? htmlPluginData.headTags.unshift(o)
                        : htmlPluginData.head.unshift(o);
                    cb();
                }));
                compilation.hooks.optimizeChunkAssets.tap(self.constructor.name, (chunks) => {
                    const i18nTemplate = template_1.default.expression(`
                window.i18n[%%key%%]
              `);
                    const visitor = {
                        enter(path) {
                            if (types_1.isStringLiteral(path.node)) {
                                let { value } = path.node;
                                if (utils_1.chReg.test(value) && !utils_1.isHtmlTag(value)) {
                                    value = utils_1.dealWithOriginalStr(value);
                                    if (cacheMap.has(value)) {
                                        const key = cacheMap.get(value);
                                        const tAst = i18nTemplate({
                                            key: types_1.stringLiteral(key),
                                        });
                                        path.replaceWith(tAst);
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
                    fs_1.default.writeFile(path_1.default.resolve(self.webpackConfig.path, filename), input, { encoding: 'utf8' }, (err) => {
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
        const visitor = {
            enter(path) {
                if (types_1.isStringLiteral(path.node)) {
                    let { value } = path.node;
                    if (utils_1.chReg.test(value) && !utils_1.isHtmlTag(value)) {
                        value = utils_1.dealWithOriginalStr(value);
                        if (self.filter(value) &&
                            !arr.includes(value) &&
                            !cacheList.includes(value)) {
                            arr.push(value);
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
        utils_1.mkdirDirUnExists(path_1.default.join(self.path, 'excel'));
        fs_1.default.writeFile(path_1.default.resolve(self.path, 'excel', `i18n-${now}.xlsx`), new Uint8Array(buffer), { flag: 'w' }, (err) => {
            if (err)
                return reject(err);
            // 写入缓存
            const cache = cacheList.length > 0
                ? self.cacheSplit + arr.join(self.cacheSplit)
                : arr.join(self.cacheSplit);
            fs_1.default.appendFileSync(path_1.default.resolve(self.path, '.cache'), cache, {
                encoding: 'utf8',
            });
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
