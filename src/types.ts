export type StringFn = () => string
export type VoidFn = () => void

export type FILTER = (str: string) => boolean

export interface IOptions {
  path: string
  getLanguage: StringFn
  action: string
  filter: RegExp | FILTER
  cacheSplit: string
  type: string[]
}

export type LogFn = (message: string, color?: 'red' | 'blue' | 'green') => void
