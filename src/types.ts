import { compilation } from 'webpack'
import { AsyncSeriesWaterfallHook } from 'tapable'

export type StringFn = () => string
export type VoidFn = () => void

export type FILTER = (str: string) => boolean

export interface IProps {
  configFile?: string
  action: string
}

export interface IOptions {
  root: string
  type: string[]
  customize: string
  excel: string
  getLanguage?: () => string
  action: string
  configFile: string
  ignoreEndSymbol: string[]
  escapeSymbolReg: RegExp | undefined
}

export type LogFn = (message: string, color?: 'red' | 'blue' | 'green') => void

export interface CompilationHooksWithHtml extends compilation.CompilationHooks {
  htmlWebpackPluginAlterAssetTags: AsyncSeriesWaterfallHook
}
