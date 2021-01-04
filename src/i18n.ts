#!/usr/bin/env ts-node
import yargs from 'yargs'
import { log } from './utils'
import find from './script/find'
import merge from './script/merge'

const argv = yargs
  .options({
    find: {
      alias: 'f',
      description: '查找指定文字所在的 excel 文件及行数',
      type: 'array',
    },
    merge: {
      alias: 'm',
      description: '合并 excel 文件',
      type: 'array',
    },
  })
  .help().argv

if (argv.find) {
  if (!argv.find.length) log('Please enter the words to search!')
  find(argv.find as string[])
} else if (argv.merge) {
  const list = argv.merge.length === 0 ? 'all' : argv.merge
  merge(list as string[])
}
