import { parse } from '@babel/parser'
import traverse, { NodePath } from '@babel/traverse'
import { isStringLiteral, stringLiteral, binaryExpression } from '@babel/types'
import template from '@babel/template'
import generate from '@babel/generator'
import path from 'path'
import xlsx from 'node-xlsx'
import fs from 'fs'
import { i18nFile, fromExistsExcel } from './i18n-file'
import {
  onlyChReg,
  needEscapeSymbol,
  jsFileReg,
  ignoreChunk,
  mkdirDirUnExists,
  log,
  warn,
  defaultOptions,
  configFileExists,
} from './utils'
import { IProps, IOptions, VoidFn, CompilationHooksWithHtml } from './types'
import { HtmlTagObject } from 'html-webpack-plugin'
import { ConcatSource } from 'webpack-sources'
import { Compiler, compilation } from 'webpack'

const pluginName = 'I18nWebpackPlugin'

class I18nWebpackPlugin {
  webpackConfig = {
    publicPath: '',
    mode: 'development',
    path: '',
  }
  options: IOptions

  constructor(props: IProps) {
    const init = {
      root: '',
      action: '',
      configFile: '',
      type: [],
      customize: '',
      excel: '',
      ignoreEndSymbol: ['：', ':'],
      escapeSymbolReg: undefined,
    }
    const { configFile = '', action = '' } = props
    // merge props
    Object.assign(init, { ...defaultOptions, configFile, action })

    this.options = init
  }

  apply(compiler: Compiler): void {
    const self = this
    const {
      mode,
      output: { publicPath, path: outPath } = {},
    } = compiler.options

    // 开发模式下禁止提取多语言
    if (mode === 'development' && this.options.action === 'collect') {
      warn(`
        Don't collect chinese in development mode.
        Set action to empty or delete it！
      `)
    }

    // 未定义语言包目录，默认获取项目根目录下的语言配置
    !this.options.configFile &&
      (this.options.configFile = path.join(process.cwd(), 'i18n.config.js'))
    // 检测配置文件是否存在
    configFileExists(this.options.configFile)

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Object.assign(this.options, require(this.options.configFile))

    // 生成过滤末尾符号的正则
    const escapeSymbol = this.options.ignoreEndSymbol
      .map((i) => (needEscapeSymbol.has(i) ? `\\${i}` : i))
      .join('|')

    this.options.escapeSymbolReg = new RegExp(
      `(\\S*[\\p{Unified_Ideograph}|a-zA-Z0-9]+)\\s*[${escapeSymbol}]+$`,
      'u'
    )

    // 获取 webpack 配置
    Object.assign(this.webpackConfig, {
      publicPath: publicPath || '',
      mode,
      path: outPath || path.join(process.cwd(), 'dist'),
    })

    // 初始化文件目录
    mkdirDirUnExists(this.options.root) // 根目录
    mkdirDirUnExists(path.join(this.options.root, this.options.excel)) // excel 文件

    if (this.options.action === 'collect') {
      const callback = (compilation: compilation.Compilation): void => {
        collectChineseFromChunk(compilation, self)
          .then((res) => void log(res, 'blue'))
          .catch(({ message }) => void log(message, 'red'))
          .finally(() => void process.exit(0))
      }
      compiler.hooks.emit.tap(pluginName, callback)
    } else {
      // modify devtool in development
      if (mode === 'development') compiler.options.devtool = undefined

      const all = fromExistsExcel(self.options, 'all')
      const zh = all.zh
      const len = zh.length
      // 以中文字符的长度为准，判断所有的语言类型是否等长
      for (const lang of Object.values(all)) {
        if (lang.length !== len) {
          warn('Exists untranslated characters, please check!')
          process.exit(0)
        }
      }
      // zh -> i18n00001
      const cacheMap = new Map<string, string>()
      // index -> i18n00001
      const cacheIndex = new Map<number, string>()
      let i = 1
      for (const lang of zh) {
        const index = `i18n${String(i).padStart(5, '0')}`
        cacheIndex.set(i, index)
        cacheMap.set(lang, index)
        i++
      }

      let input: string, filename: string

      // load i18n package
      compiler.hooks.compilation.tap(
        pluginName,
        (compilation: compilation.Compilation) => {
          // This is set for html-webpack-plugin pre-v4.
          let hook = (compilation.hooks as CompilationHooksWithHtml)
            .htmlWebpackPluginAlterAssetTags

          if (!hook) {
            if (!Array.isArray(compiler.options.plugins)) {
              warn(`No plugin has registered.`)
              process.exit(0)
            }

            const [htmlPlugin] = compiler.options.plugins.filter(
              (plugin) => plugin.constructor.name === 'HtmlWebpackPlugin'
            )

            // temp
            hook = (htmlPlugin.constructor as any).getHooks(compilation)
              .alterAssetTagGroups
          }
          // load i18n package with html-webpack-plugin
          hook.tapAsync(pluginName, async (htmlPluginData: any, cb: VoidFn) => {
            const result = await i18nFile(self, all, cacheIndex)
            input = result.input
            filename = result.filename

            const o: HtmlTagObject = {
              tagName: 'script',
              voidTag: false,
              attributes: {
                type: 'text/javascript',
              },
            }

            if (self.webpackConfig.mode === 'development') {
              o.innerHTML = input
            } else {
              o.attributes = {
                type: 'text/javascript',
                src: `${self.webpackConfig.publicPath}${filename}`,
              }
            }

            htmlPluginData.plugin.version >= 4
              ? htmlPluginData.headTags.unshift(o)
              : htmlPluginData.head.unshift(o)

            cb()
          })

          compilation.hooks.optimizeChunkAssets.tap(pluginName, (chunks) => {
            const i18nTemplate = template.expression(`
                window.i18n[%%key%%]
              `)

            const visitor = {
              enter(path: NodePath) {
                if (isStringLiteral(path.node)) {
                  const value = path.node.value.trim()

                  if (onlyChReg.test(value)) {
                    const match = value.match(self.options.escapeSymbolReg!)

                    if (match && match[1]) {
                      const original = match[1]

                      if (cacheMap.has(original)) {
                        const exists = value.replace(original, '')
                        path.replaceWith(
                          binaryExpression(
                            '+',
                            i18nTemplate({
                              key: stringLiteral(cacheMap.get(original)!),
                            }),
                            stringLiteral(exists)
                          )
                        )
                      }
                    } else {
                      if (cacheMap.has(value)) {
                        path.replaceWith(
                          i18nTemplate({
                            key: stringLiteral(cacheMap.get(value)!),
                          })
                        )
                      }
                    }

                    path.skip()
                  }
                }
              },
            }

            for (const chunk of chunks.values()) {
              // 跳过仅包含第三方模块的chunk
              if (ignoreChunk(chunk)) continue

              for (const file of chunk.files.values()) {
                if (!jsFileReg.test(file)) continue
                const source = compilation.assets[file].source()
                const ast = parse(source, { sourceType: 'script' })

                traverse(ast, visitor)

                compilation.assets[file] = new ConcatSource(generate(ast).code)
              }
            }
          })
        }
      )

      // production mode load i18n by script
      if (self.webpackConfig.mode === 'production') {
        compiler.hooks.emit.tapAsync(pluginName, (compilation, cb) => {
          compilation.assets[filename] = new ConcatSource(input)
          cb()
        })
      }
    }
  }
}

function collectChineseFromChunk(
  compilation: compilation.Compilation,
  self: I18nWebpackPlugin
): Promise<string> {
  return new Promise((resolve, reject) => {
    // 从历史 excel 文件中获取已存在的语言
    const exists = fromExistsExcel(self.options, 'zh')

    const cache = new Set((exists.zh || []).concat(exists.ignore || []))

    const { type, root, excel, escapeSymbolReg } = self.options

    const set = new Set<string>()

    const visitor = {
      enter(path: NodePath) {
        if (isStringLiteral(path.node)) {
          const value = path.node.value.trim()

          if (onlyChReg.test(value) && !cache.has(value)) {
            const match = escapeSymbolReg && value.match(escapeSymbolReg)

            if (match) !cache.has(match[1]) && set.add(match[1])
            else set.add(value)
          }
        }
      },
    }

    for (const chunk of compilation.chunks.values()) {
      // 跳过仅包含第三方模块的chunk
      if (ignoreChunk(chunk)) continue

      const { files } = chunk

      if (!Array.isArray(files) || files.length === 0) continue

      for (const filename of files.values()) {
        if (jsFileReg.test(filename)) {
          const source = compilation.assets[filename].source()
          const ast = parse(source, { sourceType: 'script' })

          traverse(ast, visitor)
        }
      }
    }

    if (set.size === 0) {
      return resolve(
        'Scanning is complete, no new Chinese characters are detected!'
      )
    }

    const data = [type]

    for (const ch of set) {
      data.push([ch])
    }

    const name = `i18n-${Date.now()}.xlsx`
    const buffer = xlsx.build([{ name, data }])

    fs.writeFile(
      path.resolve(root, excel, name),
      new Uint8Array(buffer),
      { flag: 'w' },
      (err) => {
        if (err) return reject(err)
        return resolve('Scan successfully!')
      }
    )
  })
}

export default I18nWebpackPlugin
