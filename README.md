

### 参数

- ####**`path`: string**

  `require: true` 

  用于指定 i18n 的主目录，**绝对路径**

  当目标路径不存在时，会自动创建。



- ####**`type`:string[]**

  `require: false | default: ['zh', 'en']`

  包含语言类型的数组。



- #### **`getLanguage`: () => string**

  `require: true`

  项目运行时，可以获取当前的语言环境的函数



- #### **`action`: collect | ''**

  `require: false`

  如果指定的值为 `collect`,  运行后会自动提取项目中的中文字符，并以 *excel* 格式写入 `path` 参数指定的目录中，提取完毕后，会自动退出运行



- ####**`filter`: Regex | (v: string) => boolean**

  `require: false`

  自定义规则，用于过滤提取的字符



- #### **`cacheSplit`: string**

  `require: false | default: '^+-+^'`

  用于缓存文件中，字符的分隔符，第一次运行后，不建议再修改



### 中文提取完成

- 兼容多版本的 webpack
- 中文提取策略优化

### 开发环境中，语言自动替换 √

### 正式环境语言替换

### 根据提取的 Excel 文件自动生成语言包 √
