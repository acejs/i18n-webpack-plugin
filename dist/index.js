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
const pluginName = 'I18nWebpackPlugin';
class I18nWebpackPlugin {
    constructor(props) {
        this.webpackConfig = {
            publicPath: '',
            mode: 'development',
            path: '',
        };
        const init = {
            root: '',
            action: '',
            configFile: '',
            type: [],
            customize: '',
            excel: '',
            ignoreEndSymbol: ['：', ':'],
            escapeSymbolReg: undefined,
        };
        const { configFile = '', action = '' } = props;
        // merge props
        Object.assign(init, Object.assign(Object.assign({}, utils_1.defaultOptions), { configFile, action }));
        this.options = init;
    }
    apply(compiler) {
        const self = this;
        const { mode, output: { publicPath, path: outPath } = {}, } = compiler.options;
        // 开发模式下禁止提取多语言
        if (mode === 'development' && this.options.action === 'collect') {
            utils_1.warn(`
        Don't collect chinese in development mode.
        Set action to empty or delete it！
      `);
        }
        // 未定义语言包目录，默认获取项目根目录下的语言配置
        !this.options.configFile &&
            (this.options.configFile = path_1.default.join(process.cwd(), 'i18n.config.js'));
        // 检测配置文件是否存在
        utils_1.configFileExists(this.options.configFile);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        Object.assign(this.options, require(this.options.configFile));
        // 生成过滤末尾符号的正则
        const escapeSymbol = this.options.ignoreEndSymbol
            .map((i) => (utils_1.needEscapeSymbol.has(i) ? `\\${i}` : i))
            .join('|');
        this.options.escapeSymbolReg = new RegExp(`(\\S*[\\p{Unified_Ideograph}|a-zA-Z0-9]+)\\s*[${escapeSymbol}]+$`, 'u');
        // 获取 webpack 配置
        Object.assign(this.webpackConfig, {
            publicPath: publicPath || '',
            mode,
            path: outPath || path_1.default.join(process.cwd(), 'dist'),
        });
        // 初始化文件目录
        utils_1.mkdirDirUnExists(this.options.root); // 根目录
        utils_1.mkdirDirUnExists(path_1.default.join(this.options.root, this.options.excel)); // excel 文件
        if (this.options.action === 'collect') {
            const callback = (compilation) => {
                collectChineseFromChunk(compilation, self)
                    .then((res) => void utils_1.log(res, 'blue'))
                    .catch(({ message }) => void utils_1.log(message, 'red'))
                    .finally(() => void process.exit(0));
            };
            compiler.hooks.emit.tap(pluginName, callback);
        }
        else {
            // modify devtool in development
            if (mode === 'development')
                compiler.options.devtool = undefined;
            const all = i18n_file_1.fromExistsExcel(self.options, 'all');
            const zh = all.zh;
            const len = zh.length;
            // 以中文字符的长度为准，判断所有的语言类型是否等长
            for (const lang of Object.values(all)) {
                if (lang.length !== len) {
                    utils_1.warn('Exists untranslated characters, please check!');
                    process.exit(0);
                }
            }
            // zh -> i18n00001
            const cacheMap = new Map();
            // index -> i18n00001
            const cacheIndex = new Map();
            let i = 1;
            for (const lang of zh) {
                const index = `i18n${String(i).padStart(5, '0')}`;
                cacheIndex.set(i, index);
                cacheMap.set(lang, index);
                i++;
            }
            let input, filename;
            // load i18n package
            compiler.hooks.compilation.tap(pluginName, (compilation) => {
                // This is set for html-webpack-plugin pre-v4.
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
                // load i18n package with html-webpack-plugin
                hook.tapAsync(pluginName, (htmlPluginData, cb) => __awaiter(this, void 0, void 0, function* () {
                    const result = yield i18n_file_1.i18nFile(self, all, cacheIndex);
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
                compilation.hooks.optimizeChunkAssets.tap(pluginName, (chunks) => {
                    const i18nTemplate = template_1.default.expression(`
                window.i18n[%%key%%]
              `);
                    const visitor = {
                        enter(path) {
                            if (types_1.isStringLiteral(path.node)) {
                                const value = path.node.value.trim();
                                if (utils_1.onlyChReg.test(value)) {
                                    const match = value.match(self.options.escapeSymbolReg);
                                    if (match && match[1]) {
                                        const original = match[1];
                                        if (cacheMap.has(original)) {
                                            const exists = value.replace(original, '');
                                            path.replaceWith(types_1.binaryExpression('+', i18nTemplate({
                                                key: types_1.stringLiteral(cacheMap.get(original)),
                                            }), types_1.stringLiteral(exists)));
                                        }
                                    }
                                    else {
                                        if (cacheMap.has(value)) {
                                            path.replaceWith(i18nTemplate({
                                                key: types_1.stringLiteral(cacheMap.get(value)),
                                            }));
                                        }
                                    }
                                    path.skip();
                                }
                            }
                        },
                    };
                    for (const chunk of chunks.values()) {
                        // 跳过仅包含第三方模块的chunk
                        if (utils_1.ignoreChunk(chunk))
                            continue;
                        for (const file of chunk.files.values()) {
                            if (!utils_1.jsFileReg.test(file))
                                continue;
                            const source = compilation.assets[file].source();
                            const ast = parser_1.parse(source, { sourceType: 'script' });
                            traverse_1.default(ast, visitor);
                            compilation.assets[file] = new webpack_sources_1.ConcatSource(generator_1.default(ast).code);
                        }
                    }
                });
            });
            // production mode load i18n by script
            if (self.webpackConfig.mode === 'production') {
                compiler.hooks.emit.tapAsync(pluginName, (compilation, cb) => {
                    compilation.assets[filename] = new webpack_sources_1.ConcatSource(input);
                    cb();
                });
            }
        }
    }
}
function collectChineseFromChunk(compilation, self) {
    return new Promise((resolve, reject) => {
        // 从历史 excel 文件中获取已存在的语言
        const exists = i18n_file_1.fromExistsExcel(self.options, 'zh');
        const cache = new Set((exists.zh || []).concat(exists.ignore || []));
        const { type, root, excel, escapeSymbolReg } = self.options;
        const set = new Set();
        const visitor = {
            enter(path) {
                if (types_1.isStringLiteral(path.node)) {
                    const value = path.node.value.trim();
                    if (utils_1.onlyChReg.test(value) && !cache.has(value)) {
                        const match = escapeSymbolReg && value.match(escapeSymbolReg);
                        if (match)
                            !cache.has(match[1]) && set.add(match[1]);
                        else
                            set.add(value);
                    }
                }
            },
        };
        for (const chunk of compilation.chunks.values()) {
            // 跳过仅包含第三方模块的chunk
            if (utils_1.ignoreChunk(chunk))
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
        if (set.size === 0) {
            return resolve('Scanning is complete, no new Chinese characters are detected!');
        }
        const data = [type];
        for (const ch of set) {
            data.push([ch]);
        }
        const name = `i18n-${Date.now()}.xlsx`;
        const buffer = node_xlsx_1.default.build([{ name, data }]);
        fs_1.default.writeFile(path_1.default.resolve(root, excel, name), new Uint8Array(buffer), { flag: 'w' }, (err) => {
            if (err)
                return reject(err);
            return resolve('Scan successfully!');
        });
    });
}
exports.default = I18nWebpackPlugin;
