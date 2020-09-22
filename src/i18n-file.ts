import SparkMD5 from 'spark-md5'
import { transform } from '@babel/core'
import fs from 'fs'
import path from 'path'
import { checkFileExists, log, isType } from './utils'
import plugin from './index'
import { minify } from 'terser'

const prefix = '%%function%%'
/**
 * 获取用户自定义的内容 主要是对自定义函数、方法的处理
 * @param langPath 文件夹
 * @param type 语言类型
 */
const getCustomizeContent = (
  langPath: string,
  type: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      import(path.join(langPath, `customize/${type}.js`)).then(
        ({ default: o }) => {
          for (const [key, value] of Object.entries(o)) {
            if (typeof value === 'function') {
              o[key] = prefix + value.toString()
            }
          }
          return resolve(JSON.stringify(o))
        }
      )
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
  if (isType(result, 'Null') || result?.code == undefined) return ''
  return result.code
}

interface II18nFile {
  input: string
  filename: string
}

export const i18nFile = async (
  I18nWebpackPlugin: plugin
): Promise<II18nFile> => {
  const { path: langPath, getLanguage, type } = I18nWebpackPlugin
  const i18n: { [key: string]: { [key: string]: string } } = {}

  function readFileAsync(env: string): Promise<{ [key: string]: string }> {
    return new Promise((resolve, reject) => {
      try {
        return resolve(
          JSON.parse(
            fs.readFileSync(path.join(langPath, `${env}.json`), 'utf8')
          )
        )
      } catch (error) {
        return reject(error)
      }
    })
  }

  for (const value of type.values()) {
    i18n[value] = await readFileAsync(value)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@babel/register')({
        presets: ['@babel/preset-env'],
      })

      i18n[value].c = await getCustomizeContent(langPath, value)
    } catch (error) {
      log(
        'Failed to read custom language pack, please follow the naming rules',
        'red'
      )
      continue
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

// 获取缓存的数据
export const getCache = (path: string, split: string): string[] => {
  let result: string[] = []

  const content = checkFileExists(path)

  if (content === '') return result

  try {
    result = content.split(split)
  } catch (error) {
    log(
      'Cache reading failed, check whether the cache file is maliciously damaged',
      'red'
    )
  }
  return result
}

// 写入缓存
export const writeCache = (
  path: string,
  list: Array<string>,
  split: string
): void => {
  const data = list.join(split)
  fs.appendFileSync(path, data, { encoding: 'utf8' })
}
