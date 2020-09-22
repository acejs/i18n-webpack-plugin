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
 */
export const onlyThirdChunk = (chunk: any): boolean => {
  let only = true
  for (const module of chunk.modulesIterable) {
    if (module.resource === undefined || thirdModulsReg.test(module.resource))
      continue

    only = false
  }
  return only
}

export const log: LogFn = (message, color) => {
  console.log(
    chalk[color](`
	
		--------  ${message}！  --------
	
	`)
  )
}

export const warn: LogFn = (...args): void => {
  log(...args)
  process.exit(0)
}
