# FisherAI - Chrome 插件

## 项目简介
 [FisherAI](https://chromewebstore.google.com/detail/fisherai-your-best-summar/ipfiijaobcenaibdpaacbbpbjefgekbj) 是一款为提高学习效率而设计的Chrome插件，通过一键操作，支持自动摘要、网页及视频翻译、多轮对话、工具箱等功能。此外，FisherAI 支持多种大语言模型，包括但不限于gpt/azure/gemini/deepseek/mistral/groq/yi/moonshot等等，为用户提供灵活且强大的AI工具。

## 功能支持
- [x] 一键自动摘要
- [x] 一键网页翻译
- [x] 一键视频翻译
- [x] 自定义模型/API密钥/API代理地址
- [x] 支持常见LLM系列模型
- [x] 支持多轮对话
- [x] 支持图片分享
- [x] 支持划词翻译
- [x] 支持输'/'触发快捷功能，快捷功能包括翻译、摘要、润色、图像转文本、代码解释
- [x] 支持工具箱：联网工具 SerpApi、画图工具 DALLE 3

<a target="_blank" href="https://chromewebstore.google.com/detail/fisherai-your-best-summar/ipfiijaobcenaibdpaacbbpbjefgekbj">
<img src="public/home.png" alt="" style="max-width: 80%;">
</a>

<a target="_blank" href="https://chromewebstore.google.com/detail/fisherai-your-best-summar/ipfiijaobcenaibdpaacbbpbjefgekbj">
<img src="public/settings.png" alt="" style="max-width: 80%;">
</a>

## 安装指南
安装 FisherAI 插件非常简单：
1. 访问已上架 Chrome应用商店的 [FisherAI](https://chromewebstore.google.com/detail/fisherai-your-best-summar/ipfiijaobcenaibdpaacbbpbjefgekbj)，并点击安装。
2. 或者，下载源代码，然后在Chrome扩展程序页面 (`chrome://extensions/`) 中加载已解压的扩展程序。

## 使用说明
安装插件后，您可以通过点击浏览器右上角的 FisherAI 图标，访问所有功能。具体功能使用如下：
- **自动摘要**
- **网页翻译**
- **视频翻译**
- 其他功能请参阅以下更新记录。

### 配合 Ollama 使用
1. 插件已支持使用 Ollma 来启动本地模型，启动服务时需要[开启插件使用时的跨域](https://github.com/ollama/ollama/issues/2308)，具体命令如下:
```
OLLAMA_ORIGINS=* ollama serve
```
2. 在插件设置中的 Ollama 模型配置项中，输入你的 Ollama 服务地址，默认为：http://127.0.0.1:11434
3. 确认连通性测试通过后，点击保存。
4. 返回首页并刷新，在模型选择中，会显示本地模型支持的模型列表(以-ollma结尾)。选择所需模型后即可使用。

如果还是有问题，请检查 ollama 是否正常启动，可以通过这个地址（http://127.0.0.1:11434/api/tags）来访问本地 ollama 是否在正常启动

## 更新记录
### 2024-07-17
新增功能和改进包括：
- 工具箱
- 自定义模型参数
- Ollama

### 2024-05-19
新增功能和改进包括：
- 网页翻译
- 视频翻译
- 支持常见模型
- 划词翻译
- 上传图片和文件
- 输入/触发快捷功能
- 设置页改版与优化

### 2024-04-17
新增功能和改进包括：
- 一键自动摘要
- 自定义OpenAI API密钥
- 多轮对话功能
- 分享功能
