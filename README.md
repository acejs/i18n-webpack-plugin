## I18n-webpack-plugin

### 概述

提供一种侵入性较小的国际化解决方案，对 **旧项目** 和 **简单项目** 的国家化支持提供更便捷的服务。

### 安装

```shell
yarn add @cdjs/i18n-webpack-plugin -D
// or
npm install @cdjs/i18n-webpack-plugin --save-dev
```

### 项目配置

```javascript
// webpack.config.js
const I18nWebpackPlugin = require('@cdjs/i18n-webpack-plugin')

plugins: [
  ...
  new I18nWebpackPlugin({
    path: path.resolve(__dirname, 'src/i18n'),
    getLanguage: () => {
      ...
    },  // 同步函数，测试或生产环境用于获取当前的语言环境
  })
]
```

#### 具体参数

- #### **` path`: string**

  `require: true`

  用于指定 i18n 的主目录，**绝对路径**

  当目标路径不存在时，会自动创建。

- #### **`type`: string[]**

  `require: false | default: ['zh', 'en']`

  包含语言类型的数组。

- #### **`getLanguage`: () => string**

  `require: true`

  项目运行时，可以获取当前的语言环境的同步函数

- #### **`action`: collect | ''**

  `require: false`

  如果指定的值为 `collect`, 运行后会自动提取项目中的中文字符，并以 _excel_ 格式写入 `path` 参数指定的目录中，提取完毕后，会自动退出运行

- #### **`filter`: Regex | (v: string) => boolean**

  `require: false`

  自定义规则，用于过滤提取的字符

- #### **`cacheSplit`: string**

  `require: false | default: '^+-+^'`

  用于缓存文件中，字符的分隔符，第一次运行后，不建议再修改

#### 提取中文

将 `collect` 参数配置成 _collect_, 并直接执行打包流程

> collect 参数仅用于提取中文字符，提取后，请将该参数置空或删除。

### 命令行指令

将翻译好的语言包 Excel，自动转成 json 格式语言包，用于打包时加载。

#### 脚本配置

```javascript
"script": {
  ...
  "i18n": "i18n" // 如果 输出目录 和 语言类型 固定可以此处直接指定
}
```

```shell
yarn/npm i18n --xlsx/-x xxxx --out/-o xxxxx [--type/-t]

参数如下：
xlsx: [string / required]    			    指向 Excel 文件的路径
out: [string / required]  			      生成文件和读取现有语言文件的路径
type: [string / default: 'zh'|'en']	  国际化语言类型，"|" 分隔的字符串
```

### 复杂场景配置

对于项目中的特殊场景（如下场景 1），插件支持自定义语言设置。在设置的国际化主目录中，添加 `customize` 目录，添加以语言类型命名多个 `.js` 文件，以英文文件内容为例

```javascript
// en.js
// 支持 方法、箭头函数、普通函数 定义
// 如果需要兼容低版本的浏览器，函数内的内容暂不支持高级语法
export default {
  uploadExceed(limit, length, total) {
    return (
      'The current limit is' +
      limit +
      ' files，and ' +
      length +
      ' files are selected this time，' +
      total +
      ' files are selected in total'
    )
  },
  get: () => {},
  done: function () {},
  name: 'i18n',
}
```

### 补充

#### 特殊场景示例

##### 场景 1

```javascript
handleExceed (files, fileList) {
	const message = `当前限制选择 ${this.limit} 个文件，本次选择了 ${files.length} 个文件，共选择了 ${files.length + fileList.length} 个文件 `
	...
}
```

此场景提取的中文: '当前限制选择', '个文件', '本次选择了', '共选择了'。翻译后将不再是连贯的语句，因此建议做如下改造:

```javascript
handleExceed (files, fileList) {
    const message = window.i18n.c.uploadExceed(this.limit, files.length, files.length + fileList.length)
	...
}
```

##### 场景 2

```javascript
let html = `
    <el-row><el-col align="center"><h2>是否确认依据以下信息回收资源</h2></el-col></el-row>
    <el-row><el-col align="center"><h3>工单号: ${orderCode}</h3></el-col></el-row>
`
```

ES6 模板语法定义的 HTML 文本，由于加载变量实现比较复杂，暂未支持，建议改造如下：

```javascript
const warn = '是否确认依据以下信息回收资源'
const order = '工单号'
let html = `
    <el-row><el-col align="center"><h2>${warn}</h2></el-col></el-row>
    <el-row><el-col align="center"><h3>${order}: ${orderCode}</h3></el-col></el-row>
`
```

### 总结

插件采用 ts 开发，虽未实现 **完全非侵入** ，不过对旧项目的快速改造或者对一些简单项目的国际化支持，提供了较大的便利。关于该方式的国际化，做了如下总结：

**优势：**

- 较小的倾入性
  - 保持项目中文开发
  - 使老项目支持国际化改造更加友好
- 较好的操作支持，一键提取差量中文字符，打包时自动替换
- 可以在不修改第三方包的前提下，使第三方包支持国际化（需要提供特殊的配置）

**劣势：**

- 正如标题一样，基于 Webpack 的插件，非 Webpack 打包的项目无法支持
- 每次打包发布都需要全量替换一次，对于大型项目打包会增加一定的耗时
- 语言包是挂载在 `window` 对象上，无法支持服务端渲染的应用（关于这一问题，后续会优化）

**待完善：**

- 低版本的 Webpack 支持，目前的开发和测试的环境为： Webpack4+、babel7+
- 对 node_modules 下的模块打包出来的 chunk 的判断不足
- 部分内容要求支持国际化的项目，暂未提供支持。不过以模块化方式开发的项目，是不是能得到较好的支持，还有待探究
