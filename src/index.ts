import { parse } from '@babel/parser'
import traverse, { NodePath } from '@babel/traverse'
import { isStringLiteral, stringLiteral } from '@babel/types'
import template from '@babel/template'
import generate from '@babel/generator'
import path from 'path'
import xlsx from 'node-xlsx'
import fs from 'fs'
import { i18nFile, getCache } from './i18n-file'
import {
  isType,
  chReg,
  jsFileReg,
  isHtmlTag,
  onlyThirdChunk,
  mkdirDirUnExists,
  log,
  warn,
  isAbsolute,
  dealWithOriginalStr,
} from './utils'
import { StringFn, FILTER, IOptions, VoidFn } from './types'
import { HtmlTagObject } from 'html-webpack-plugin'
import { ConcatSource } from 'webpack-sources'
import { Compiler, compilation } from 'webpack'

class I18nWebpackPlugin {
  path: string

  getLanguage: StringFn

  action: string

  filter: FILTER = (value) => value.trim() !== ''

  cacheSplit = '^+-+^'

  type = ['zh', 'en']

  webpackConfig = {
    publicPath: '',
    mode: 'development',
    outputPath: '',
  }

  constructor(options: IOptions) {
    const { path, action, getLanguage, filter, cacheSplit, type } = options

    if (!path || !isAbsolute(path))
      warn(`options path is required and must be absolute`)

    if (typeof getLanguage !== 'function')
      warn(`options getLanguage must be a function`)

    this.path = path
    this.getLanguage = getLanguage
    this.action = action

    cacheSplit && (this.cacheSplit = cacheSplit)

    Array.isArray(type) && (this.type = type)

    if (typeof filter === 'function') {
      this.filter = filter
    } else if (isType(filter, 'RegExp')) {
      this.filter = (value) => value.replace(filter, '') !== ''
    }
  }

  apply(compiler: Compiler): void {
    const self = this
    const { mode, output } = compiler.options

    // 获取 webpack 配置
    Object.assign(this.webpackConfig, {
      publicPath: output?.publicPath || '/',
      mode,
      outputPath: output?.path || path.join(process.cwd(), 'dist'),
    })

    mkdirDirUnExists(self.path)

    if (mode === 'development' && this.action === 'collect') {
      warn(`
        Don't collect chinese in development mode.
        Set action to empty or delete it！
      `)
    }

    if (this.action === 'collect') {
      const callback = (compilation: compilation.Compilation): void => {
        collectChineseFromChunk(compilation, self)
          .then((res) => void log(res, 'blue'))
          .catch(({ message }) => void log(message, 'red'))
          .finally(() => void process.exit(0))
      }
      compiler.hooks.emit.tap(self.constructor.name, callback)
    } else {
      let input: string, filename: string

      if (mode === 'development') compiler.options.devtool = undefined

      try {
        addCache(self)
      } catch (error) {
        warn(
          `No valid Chinese language pack detected, 
           Please check the legality of the Chinese language pack naming!`
        )
      }

      // load i18n package
      compiler.hooks.compilation.tap(
        self.constructor.name,
        (compilation: compilation.Compilation) => {
          let alterAssetTags

          for (const [key, value] of Object.entries(compilation.hooks)) {
            if (key === 'htmlWebpackPluginAlterAssetTags')
              alterAssetTags = value
          }

          if (!alterAssetTags) {
            warn(
              `Unable to find an instance of HtmlWebpackPlugin in the current compilation`
            )
          }

          alterAssetTags.tapAsync(
            this.constructor.name,
            async (htmlPluginData: any, cb: VoidFn) => {
              const result = await i18nFile(self)
              input = result.input
              filename = result.filename

              const { head } = htmlPluginData

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
                  src: `/${path.join(self.webpackConfig.publicPath, filename)}`,
                }
              }

              head.unshift(o)
              cb()
            }
          )

          compilation.hooks.optimizeChunkAssets.tap(
            self.constructor.name,
            (chunks) => {
              const i18nTemplate = template.expression(`
                window.i18n[%%key%%]
              `)

              const visitor = {
                enter(path: NodePath) {
                  if (isStringLiteral(path.node)) {
                    let { value } = path.node

                    if (chReg.test(value) && !isHtmlTag(value)) {
                      value = dealWithOriginalStr(value)

                      if (cacheMap.has(value)) {
                        const key = cacheMap.get(value)

                        const tAst = i18nTemplate({
                          key: stringLiteral(key),
                        })

                        path.replaceWith(tAst)
                      }
                    }
                  }
                },
              }

              for (const chunk of chunks.values()) {
                // 跳过仅包含第三方模块的chunk
                if (onlyThirdChunk(chunk)) continue

                for (const filename of chunk.files.values()) {
                  if (!jsFileReg.test(filename)) continue
                  const source = compilation.assets[filename].source()
                  const ast = parse(source, { sourceType: 'script' })

                  traverse(ast, visitor)

                  compilation.assets[filename] = new ConcatSource(
                    generate(ast).code
                  )
                }
              }
            }
          )
        }
      )

      // production load by script
      if (self.webpackConfig.mode === 'production') {
        compiler.hooks.done.tapAsync(
          this.constructor.name,
          (compilation, cb: VoidFn) => {
            fs.writeFile(
              path.resolve(self.webpackConfig.outputPath, filename),
              input,
              { encoding: 'utf8' },
              (err) => {
                if (err) throw err
                cb()
              }
            )
          }
        )
      }
    }
  }
}

function collectChineseFromChunk(
  compilation: compilation.Compilation,
  self: I18nWebpackPlugin
): Promise<string> {
  return new Promise((resolve, reject) => {
    const cacheList = getCache(
      path.resolve(self.path, '.cache'),
      self.cacheSplit
    )

    const arr: string[] = []

    const visitor = {
      enter(path: NodePath) {
        if (isStringLiteral(path.node)) {
          let { value } = path.node
          if (chReg.test(value) && !isHtmlTag(value)) {
            value = dealWithOriginalStr(value)

            if (
              self.filter(value) &&
              !arr.includes(value) &&
              !cacheList.includes(value)
            ) {
              arr.push(value)
            }
          }
        }
      },
    }

    for (const chunk of compilation.chunks.values()) {
      // 跳过仅包含第三方模块的chunk
      if (onlyThirdChunk(chunk)) continue

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

    if (arr.length === 0) {
      return resolve(
        'Scanning is complete, no new Chinese characters are detected!'
      )
    }

    const data = [self.type]

    arr.forEach((ch) => {
      data.push([ch])
    })

    const buffer = xlsx.build([{ name: 'i18n', data }])
    const now = Date.now()

    // 检测目录是否存在
    mkdirDirUnExists(path.join(self.path, 'excel'))

    fs.writeFile(
      path.resolve(self.path, 'excel', `i18n-${now}.xlsx`),
      new Uint8Array(buffer),
      { flag: 'w' },
      (err) => {
        if (err) return reject(err)
        // 写入缓存
        const cache =
          cacheList.length > 0
            ? self.cacheSplit + arr.join(self.cacheSplit)
            : arr.join(self.cacheSplit)

        fs.appendFileSync(path.resolve(self.path, '.cache'), cache, {
          encoding: 'utf8',
        })
        return resolve('Scan successfully!')
      }
    )
  })
}

/**
 * cache
 */
const cacheMap = new Map()
function addCache(plugin: I18nWebpackPlugin): void {
  const { path: cachePath, type } = plugin
  const zhJson = fs.readFileSync(
    path.join(cachePath, `${type[0]}.json`),
    'utf8'
  )
  const zh = JSON.parse(zhJson)
  for (const [key, value] of Object.entries(zh)) {
    cacheMap.set(value, key)
  }
}

export default I18nWebpackPlugin
