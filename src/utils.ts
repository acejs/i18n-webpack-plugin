import fs from 'fs'
import chalk from 'chalk'
import { LogFn } from './types'
import path from 'path'

// eslint-disable-next-line no-control-regex
export const chReg = /[^\x00-\xff]+/
// 精准匹配中文的正则
export const onlyChReg = /\p{Unified_Ideograph}+/u
// 正则中需要转义的符号
export const needEscapeSymbol = new Set([
  '*',
  '.',
  '?',
  '+',
  '$',
  '^',
  '[',
  ']',
  '(',
  ')',
  '{',
  '}',
  '|',
  '/',
  '\\',
])

export const thirdModulsReg = /\/node_modules\//

// // eslint-disable-next-line no-control-regex
// export const chReg2 = /([^\x00-\xff]+[*&]{1}[^\x00-\xff]+)|[^\x00-\xff]+/

export const jsFileReg = /\.js$/

export const defaultOptions = {
  type: ['zh', 'en'],
  customize: 'customize',
  excel: 'excel',
  filter: (value: string) => value.trim() !== '',
}

export const isType = (target: unknown, type: string): boolean => {
  return Object.prototype.toString.call(target) === `[object ${type}]`
}

export const isAbsolute = (target: string): boolean => {
  return path.isAbsolute(target)
}

// export const isHtmlTag = (str: string): boolean => {
//   return str.includes('<') && str.includes('</')
// }

export const dealWithOriginalStr = (str: string): string => {
  return str.trim()
}

export const configFileExists = (file: string): void => {
  if (!fs.existsSync(file)) warn('Can not read i18n.config.js')
}

/**
 * 检测目标文件是否存在
 * 若存在返回对应的内容
 * 若不存在，创建该文件并返回空字符串
 * @param path 目标文件
 */
export const checkFileExists = (path: string): string => {
  let result = ''
  try {
    result = fs.readFileSync(path, 'utf8')
  } catch (error) {
    fs.writeFileSync(path, '')
  }
  return result
}

/**
 * 检测目标目录是否存在
 * @param path 目录
 */
export const checkDirExists = (path: string): boolean => {
  let result: boolean
  try {
    fs.accessSync(path)
    result = true
  } catch {
    result = false
  }
  return result
}

/**
 * 检测目标目录是否存在，不存在则创建
 * @param path 目录
 */
export const mkdirDirUnExists = (path: string): void => {
  if (!checkDirExists(path)) fs.mkdirSync(path)
}

/**
 * 跳过的 chunk
 * @param chunk
 * 是否仅仅包含第三发模块，临时的解决方案、需要更确切的方案
 * 无需翻译的模块
 */
// onlyThirdChunk
export const ignoreChunk = (chunk: any): boolean => {
  if (chunk.chunkReason !== undefined && chunk.chunkReason.includes('name:')) {
    return true
  } else {
    for (const modules of chunk.modulesIterable) {
      if (
        modules.rootModule &&
        modules.rootModule.resource &&
        modules.rootModule.resource.includes('withouti18n=true')
      ) {
        return true
      }
    }
  }
  return false
}

export const log: LogFn = (message, color = 'blue') => {
  console.log(
    chalk[color](`
	
    ******************************** I18nWebpackPlugin ********************************

    ${message}
	
	`)
  )
}

export const warn: LogFn = (message, color = 'red'): void => {
  log(message, color)
  process.exit(0)
}
