#!/usr/bin/env ts-node --script-mode --transpile-only
import xlsx from 'node-xlsx'
import yargs from 'yargs'
import fs from 'fs'
import path from 'path'
import { log, checkFileExists, warn } from './utils'

const argv = yargs
  .options({
    xlsx: {
      alias: 'x',
      describe: '包含语言包的 Excel 文件',
      type: 'string',
      demandOption: true,
    },
    out: {
      alias: 'o',
      describe: '文件输出目录',
      type: 'string',
      demandOption: true,
    },
    type: {
      alias: 't',
      describe: "语言种类， '|' 分隔",
      type: 'string',
      default: 'zh|en',
    },
  })
  .help().argv

// 生成语言包 key 值
const prefix = 'i18n'
const genKey = (index: number): string => {
  if (!index) throw new Error('KEY Error')
  return `${prefix}${String(index).padStart(5, '0')}`
}

// 读取 excel 内容
let data: string[][]
try {
  const file = fs.readFileSync(argv.xlsx)
  data = xlsx.parse(file)[0].data
} catch ({ message }) {
  warn(message)
  process.exit(0)
}

// 获取 语言类型 数组
const range = argv.type.split('|').map((item) => item.trim())

const exists: Record<string, Record<string, string>> = {}
let start = 0
// 遍历获取已存在的语言类型
for (const r of range) {
  const content = checkFileExists(path.join(argv.out, `${r}.json`))
  if (content === '') {
    exists[r] = {}
    continue
  }

  exists[r] = JSON.parse(content)
  if (r === 'zh' && typeof exists[r] === 'object') {
    start = Object.keys(exists[r]).length
  }
}

// 缓存已已存在的中文
const cacheMap = new Set<string>()
for (const val of Object.values(exists.zh)) {
  cacheMap.add(val)
}

let gap = 0
// 记录语言对应的索引
const target: { [key: string]: number } = {}

for (const [index, value] of data.entries()) {
  if (index === 0) {
    value.forEach((item, index) => void (target[item] = index))
    continue
  }
  // 检测是否已经存在
  if (cacheMap.has(value[target.zh]) || value.length !== range.length) {
    ++gap
    continue
  }

  const key = genKey(index + start - gap)

  for (const l of range) {
    exists[l][key] = value[target[l]]
  }
}

if (Object.keys(exists.zh).length === start) {
  warn('未检测到新的中文字符！', 'blue')
}

for (const [key, value] of Object.entries(exists)) {
  fs.writeFileSync(
    path.join(argv.out, `${key}.json`),
    JSON.stringify(value),
    'utf8'
  )
}

log('语言文件写入成功！', 'green')
