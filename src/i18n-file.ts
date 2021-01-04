import SparkMD5 from 'spark-md5'
import { transform } from '@babel/core'
import fs from 'fs'
import path from 'path'
import { log, checkDirExists } from './utils'
import plugin from './index'
import xlsx from 'node-xlsx'
import { minify } from 'terser'
import { IOptions } from './types'

const prefix = '%%function%%'
/**
 * 获取用户自定义的内容 主要是对自定义函数、方法的处理
 * @param customize 文件夹
 */
const getCustomizeContent = (customize: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      import(customize).then(({ default: o }) => {
        for (const [key, value] of Object.entries(o)) {
          if (typeof value === 'function') {
            o[key] = prefix + value.toString()
          }
        }
        return resolve(JSON.stringify(o))
      })
    } catch (error) {
      return reject(error)
    }
  })
}

// parser code
function babelCode(str: string): string {
  const result = transform(str, {
    configFile: false, // 不读取项目中的babel配置
    presets: ['@babel/preset-env'],
  })
  if (result === null || result?.code == undefined) return ''
  return result.code
}

interface II18nFile {
  input: string
  filename: string
}

export const i18nFile = async (
  plugin: plugin,
  all: { [props: string]: string[] },
  index: Map<number, string>
): Promise<II18nFile> => {
  const { root, customize, getLanguage, type } = plugin.options
  const i18n: { [key: string]: { [key: string]: string } } = {}

  const hasCust = checkDirExists(path.join(root, customize))

  for (const t of type) {
    const list = all[t]!

    const cur: { [key: string]: string } = {}
    let i = 1
    for (const lang of list) {
      cur[index.get(i++)!] = lang
    }

    i18n[t] = cur

    try {
      const cus = path.join(root, customize, `${t}.js`)

      if (hasCust && checkDirExists(cus)) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('@babel/register')({
          presets: ['@babel/preset-env'],
        })

        i18n[t].c = await getCustomizeContent(cus)
      }
    } catch (error) {
      log(
        'Failed to read custom language pack, please follow the naming rules',
        'red'
      )
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
  `

  const { code } = await minify(babelCode(str))

  const input = code || ''

  const spark = new SparkMD5()
  spark.append(input)
  const hash = spark.end().slice(0, 6)
  const filename = `i18n-${hash}.js`

  return {
    input,
    filename,
  }
}

// 获取 excel 文件夹下的所有 excel 文件
export function getAllExcel(dir: string, all = false): string[] {
  return fs
    .readdirSync(dir)
    .filter((name) => name !== '.DS_Store' && (all || name.startsWith('i18n')))
}

// 获取缓存的数据
export const fromExistsExcel = (
  options: IOptions,
  range: 'all' | 'zh'
): { [props: string]: string[] } => {
  // 当前所有语言类型存储
  const map: { [props: string]: string[] } = {}
  const { root, type, excel } = options

  const files = getAllExcel(path.join(root, excel), range === 'zh')
  if (files.length === 0) return map

  const cur = range === 'all' ? type : ['zh']

  for (const t of cur) {
    map[t] = []
  }

  // 遍历读取文件
  for (const file of files) {
    const data: string[][] = xlsx.parse(path.join(root, excel, file))[0].data
    if (file === '.ignore.xlsx') {
      // 忽略文件的处理
      map.ignore = []
      for (let i = 1; i < data.length; i++) {
        if (!data[i][0]) continue
        map.ignore.push(data[i][0])
      }
      continue
    }
    // 获取指定 index => lang
    const keyMap = new Map<number, string>()
    data[0].forEach(
      (lang, index) => cur.includes(lang) && keyMap.set(index, lang)
    )

    for (let i = 1; i < data.length; i++) {
      data[i].forEach((item, index) => {
        keyMap.has(index) && map[keyMap.get(index)!].push(item)
      })
    }
  }

  return map
}
