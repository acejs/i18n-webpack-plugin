import fs from 'fs'
import chalk from 'chalk'
import { LogFn } from './types'
import path from 'path'

// eslint-disable-next-line no-control-regex
export const chReg = /[^\x00-\xff]+/
export const chRegAll = new RegExp(chReg, 'g')
export const thirdModulsReg = /\/node_modules\//

// // eslint-disable-next-line no-control-regex
// export const chReg2 = /([^\x00-\xff]+[*&]{1}[^\x00-\xff]+)|[^\x00-\xff]+/

export const jsFileReg = /\.js$/

export const isType = (target: unknown, type: string): boolean => {
  return Object.prototype.toString.call(target) === `[object ${type}]`
}

export const isAbsolute = (target: string): boolean => {
  return path.isAbsolute(target)
}

export const isHtmlTag = (str: string): boolean => {
  return str.includes('<') && str.includes('</')
}

export const dealWithOriginalStr = (str: string): string => {
  return str.trim()
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
 * 检测目标目录是否存在，不存在则创建
 * @param path 目录
 */
export const checkDirExists = (path: string): void => {
  try {
    fs.accessSync(path)
  } catch (error) {
    fs.mkdirSync(path)
  }
}

/**
 * 是否仅仅包含第三发模块
 * @param chunk
 * 临时的解决方案、需要更确切的方案
 */
export const onlyThirdChunk = (chunk: any): boolean => {
  return chunk.chunkReason !== undefined && chunk.chunkReason.includes('name:')
  // let only = false
  // for (const module of chunk.modulesIterable) {
  //   if (thirdModulsReg.test(module.resource)) {
  //     only = true
  //   }
  // }
  // return only
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
