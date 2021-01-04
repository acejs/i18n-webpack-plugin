import xlsx from 'node-xlsx'
import path from 'path'
import { configFileExists, defaultOptions } from '../utils'
import { getAllExcel } from '../i18n-file'

function find(words: string[]): void {
  const configPath = path.join(process.cwd(), 'i18n.config.js')
  configFileExists(configPath)

  const map = new Map<string, string[]>(words.map((w) => [w, []]))

  const {
    root,
    excel = defaultOptions.excel,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require(configPath)

  const existsExcel = getAllExcel(path.join(root, excel), true)

  for (const file of existsExcel) {
    const data: string[][] = xlsx.parse(path.join(root, excel, file))[0].data
    const index = data[0].indexOf('zh')
    for (let i = 1; i < data.length; i++) {
      if (map.has(data[i][index])) {
        map.get(data[i][index])!.push(file)
      }
    }
  }

  const ans: { [props: string]: { [props: string]: string } } = {}
  for (const [word, files] of map) {
    ans[word] = {}
    files.forEach((file, index) => (ans[word][`excel${index + 1}`] = file))
  }
  console.table(ans)
  process.exit(0)
}

export default find
