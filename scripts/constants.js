// format
const FORMAT_TEXT = "TEXT";
const FORMAT_HTML = "HTML";
const FORMAT_SRT = "SRT";

// action
ACTION_FETCH_PAGE_CONTENT = 'fetchPageContent';
ACTION_FETCH_TEXT_CONTENT = 'fetchTextContent';
ACTION_COPY_PAGE_CONTENT = 'copyPageContent';
ACTION_COPY_PURE_PAGE_CONTENT = 'copyPurePageContent';
ACTION_DOWNLOAD_SUBTITLES = 'downloadSubtitles';
ACTION_GET_PAGE_URL = 'getPageURL';

// default tips
DEFAULT_TIPS =  "<p>请先去设置 <b>Model</b> 和 <b>API KEY</b>.</p>" + 
"<p class=\"note\"><b>Note:</b> API KEY仅缓存在 Chrome 本地存储空间，不会上传服务器，以保证安全和隐私.</p>";

// shortcut function
SHORTCUT_SUMMAY = "摘要：";
SHORTCUT_DICTION = "查词：";
SHORTCUT_TRANSLATION = "翻译：";
SHORTCUT_POLISH = "润色：";
SHORTCUT_CODE_EXPLAIN = "代码解释：";
SHORTCUT_IMAGE2TEXT = "图像转文本：";


// 各个大模型 api
const OPENAI_BASE_URL = "https://api.openai.com";
const OPENAI_CHAT_API_PATH = "/v1/chat/completions";
const OPENAI_DALLE_API_PATH = "/v1/images/generations";

const AZURE_OPENAI_BASE_URL = "https://{YOUR_RESOURCE_NAME}.openai.azure.com";
const AZURE_OPENAI_CHAT_API_PATH = "/openai/deployments/{MODEL_NAME}/chat/completions?api-version=2024-04-01-preview";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";
const GEMINI_CHA_API_PAH = "/v1beta/models/{MODEL_NAME}:streamGenerateContent?alt=sse&key={API_KEY}";

const GROQ_BASE_URL = "https://api.groq.com";
const GROQ_CHAT_API_PATH = "/openai/v1/chat/completions";

const MISTRAL_BASE_URL = "https://api.mistral.ai";
const MISTRAL_CHAT_API_PATH = "/v1/chat/completions";

const ZHIPU_BASE_URL = "https://open.bigmodel.cn";
const ZHIPU_CHAT_API_PATH = "/api/paas/v4/chat/completions";

const MOONSHOT_BASE_URL = "https://api.moonshot.cn";
const MOONSHOT_CHAT_API_PATH = "/v1/chat/completions";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEEPSEEK_CHAT_API_PATH = "/chat/completions";

const YI_BASE_URL = "https://api.lingyiwanwu.com";
const YI_CHAT_API_PATH = "/v1/chat/completions";

const OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const OLLAMA_CHAT_API_PATH = "/api/chat";
const OLLAMA_LIST_MODEL_PATH = "/api/tags";


// 模型名称包含的关键字
const GPT_MODEL = "gpt";
const AZURE_MODEL = "azure";
const GEMINI_MODEL = 'gemini';
const GROQ_MODEL = "groq";
const GROQ_MODEL_POSTFIX = "-" + GROQ_MODEL;
const MISTRAL_MODEL = "open-mixtral";
const ZHIPU_MODEL = "glm";
const MOONSHOT_MODEL = "moonshot";
const DEEPSEEK_MODEL = 'deepseek';
const YI_MODEL = "yi";
const OLLAMA_MODEL = "ollama";
const OLLAMA_MODEL_POSTFIX = "-" + OLLAMA_MODEL;

// 默认模型
const GPT_DEFAULT_MODEL = "gpt-3.5-turbo";
const AZURE_GPT_DEFAULT_MODEL = "azure-gpt-35-turbo";
const GEMINI_DEFAULT_MODEL = "gemini-1.0-pro-latest";
const GROQ_DEFAULT_MODEL = "gemma-7b-it";
const MISTRA_DEFAULTL_MODEL = "open-mixtral-8x7b";
const ZHIPU_DEFAULT_MODEL = "glm-3-turbo";
const MOONSHOT_DEFAULT_MODEL = "moonshot-v1-8k";
const DEEPSEEK_DEFAULT_MODEL = 'deepseek-chat';
const YI_DEFAULT_MODEL = "yi-34b-chat-0205";


// 支持图像的模型
const IMAGE_SUPPORT_MODELS = ['gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini', 'azure-gpt-4-turbo', 'azure-gpt-4o', 'gemini-1.0-pro-vision-latest', 'gemini-1.5-pro-latest', 'gemini-1.5-flash-latest', 'glm-4v', 'chatgpt-4o-latest'];
const ANY_FILE_SUPPORT_MODELS = ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest'];
const DEFAULT_FILE_LOGO_PATH = "/images/file.png";



// 各模型默认的baseurl
const DEFAULT_LLM_URLS = [
  { key: AZURE_MODEL, baseUrl: AZURE_OPENAI_BASE_URL, apiPath: AZURE_OPENAI_CHAT_API_PATH, defaultModel: AZURE_GPT_DEFAULT_MODEL },
  { key: GPT_MODEL, baseUrl: OPENAI_BASE_URL, apiPath: OPENAI_CHAT_API_PATH, defaultModel: GPT_DEFAULT_MODEL },
  { key: GEMINI_MODEL, baseUrl: GEMINI_BASE_URL, apiPath: GEMINI_CHA_API_PAH, defaultModel: GEMINI_DEFAULT_MODEL },
  { key: GROQ_MODEL, baseUrl: GROQ_BASE_URL, apiPath: GROQ_CHAT_API_PATH, defaultModel: GROQ_DEFAULT_MODEL }, // groq 要放在 mistral 之前，因为 groq 部署的开源名称会和 mistral 等开源模型一样，区别在最后的后缀'-groq'，需要优先判断
  { key: OLLAMA_MODEL, baseUrl: OLLAMA_BASE_URL, apiPath: OLLAMA_CHAT_API_PATH, defaultModel: '' },
  { key: MISTRAL_MODEL, baseUrl: MISTRAL_BASE_URL, apiPath: MISTRAL_CHAT_API_PATH, defaultModel: MISTRA_DEFAULTL_MODEL },
  { key: ZHIPU_MODEL, baseUrl: ZHIPU_BASE_URL, apiPath: ZHIPU_CHAT_API_PATH, defaultModel: ZHIPU_DEFAULT_MODEL },
  { key: MOONSHOT_MODEL, baseUrl: MOONSHOT_BASE_URL, apiPath: MOONSHOT_CHAT_API_PATH, defaultModel: MOONSHOT_DEFAULT_MODEL },
  { key: DEEPSEEK_MODEL, baseUrl: DEEPSEEK_BASE_URL, apiPath: DEEPSEEK_CHAT_API_PATH, defaultModel: DEEPSEEK_DEFAULT_MODEL },
  { key: YI_MODEL, baseUrl: YI_BASE_URL, apiPath: YI_CHAT_API_PATH, defaultModel: YI_DEFAULT_MODEL }
];


// 任务类型
const CHAT_TYPE = "chat";
const AGENT_TYPE = "agent";
const HUACI_TRANS_TYPE = "huaci-translate";

// 一些常用prompt
const SYSTEM_PROMPT = `
你是一款 AI 智能助手，能回答用户提问的任何问题，并提供多种工具帮助解决问题（现在时间是{current_time}）。

具体要求如下：
# 回答格式
  - 请使用 Markdown 格式，以确保回答内容清晰易读。
  - 遇到公式时，请用 LaTeX 格式表示。例如，a/b 应表示为 $ \frac{a}{b} $。
# 语言要求
  - 所有回答必须用中文。
# 回答内容
  - 若用户提问有关时效性的话题时，请基于当前时间 {current_time} 进行回答。如’今天是几号‘, ’最近的有关Nvidia的新闻‘等

{tools-list}

最后，请记住，回答时一定要用中文回答。`;

const TOOL_PROMPT_PREFIX = `
# 工具箱
你可以选择以下工具来更好地回答问题：`;

const WEB_SEARCH_PROMTP = `
## search engine
You have the tool 'search engine'. Use 'search engine' in the following circumstances:
- User is asking about current events or something that requires real-time information (weather, sports scores, etc.)
- User is asking about some term you are totally unfamiliar with (it might be new)
- User explicitly asks you to search engine or provide links to references`;

const IMAGE_GEN_PROMTP = `
## dalle
// Whenever a description of an image is given, create a prompt that dalle can use to generate the image.`;


const SUMMARY_PROMPT = `
你这次的任务是提供一个简洁而全面的摘要，这个摘要需要捕捉给定文本的主要观点和关键细节，同时准确地传达作者的意图。
请确保摘要结构清晰、组织有序，便于阅读。使用清晰的标题和小标题来指导读者了解每一部分的内容。摘要的长度应该适中，既能覆盖文本的主要点和关键细节，又不包含不必要的信息或变得过长。

具体要求如下：
1. 使用“# 摘要”作为主标题。
2. 将摘要分为“## 主要观点”和“## 关键细节”两个部分，每部分都应有相应的小标题。
3. 在“主要观点”部分，简洁地概述文本的核心思想和论点。
4. 在“关键细节”部分，详细介绍支持主要观点的重要信息和数据。
5. 摘要应准确无误，忠实于原文的意图和语境。
6. 尽可能保持语言简洁明了，避免使用专业术语，以便于普通读者理解。
8  保留特定的英文术语、数字或名字，并在其前后加上空格，例如：“生成式 AI 产品”
9. 给出本次摘要后，后续的对话请忽略本次任务指令，遵循 system 指令即可。

你要摘要的内容如下：\n\n`;

const TRANSLATE2CHN_PROMPT = `
你是一位精通简体中文的专业翻译，你能将用户输入的任何内容翻译成中文。

具体要求如下：
# 如果输入的是一段文本
- 翻译时要准确传达原文的事实和背景，不要遗漏任何信息。
- 遵守原意的前提下让内容更通俗易懂、符合中文表达习惯，但一定要保留原有格式不变。
- 即使意译也要保留原始段落格式，以及保留术语，例如 FLAC，JPEG 等。保留公司缩写，例如 Microsoft, Amazon 等。
- 要保留引用的论文，例如 [20] 这样的引用。
- 对于 Figure 和 Table，翻译的同时保留原有格式，例如：“Figure 1: ”翻译为“图 1: ”，“Table 1: ”翻译为：“表 1: ”。
- 对于\citep格式的引用转为小括号的方式呈现，例如\citep{wu2016google}转为(wu2016google) +
# 如果输入的是一个单词或短语
- 如果是单词，则给出单词的词性以及对应的中文释义。
- 如果是短语，直接给出释义即可。
- 回答的开始一定不要把输入的单词或短语重复一次。
# 其他要求
- 全角括号换成半角括号，并在左括号前面加半角空格，右括号后面加半角空格。
- 你的回答必须使用 MARKDOWN 格式
- 保留特定的英文术语、数字或名字，并在其前后加上空格，例如：“生成式 AI 产品”
- 以下是常见的 AI 相关术语词汇对应表：
  * Transformer -> Transformer
  * LLM/Large Language Model -> 大语言模型
  * Generative AI -> 生成式 AI
  * token -> token
  * tokens -> tokens

你要翻译成中文的内容如下：\n\n`;


const SUBTITLE2CHN_PROMPT = `
你是一位精通简体中文的专业翻译，擅长将视频字幕翻译为中文。

请按照以下具体要求进行翻译：
1. 说话人标识：从输入的字幕内容中提取说话人。如果有多个说话人，请在每段内容前添加说话人标识。如果只有一个说话人，不需要添加说话人标识。
2. 错别字纠正：输入的字幕内容在语音识别时可能有错别字，请注意并纠正这些错误。
3. 内容合并：每行输入的字幕内容包含一个完整的时间戳，但对应的内容可能不完整。请结合全文进行翻译，将多个连续的不完整内容合并，输出每行一段完整的讲话内容。
4. 段落格式：每一句完整的讲话内容后添加回车，以方便阅读。
5. 专业术语：准确传达相关软件或领域的专业术语。
6. 准确传达信息：准确传达原文的事实和背景，不遗漏任何信息。
7. 通俗易懂：在遵守原意的前提下，使内容更通俗易懂，符合中文表达习惯。
8. 保留特定术语：保留特定的英文术语、数字或名字，并在其前后加上空格，例如：“生成式 AI 产品”。
9. 去掉语气词：在翻译过程中，请确保去掉所有语气词，例如“嗯”、“呃”等。
10. Markdown格式：请使用 Markdown 格式进行回答。
请记住，回答时一定要用中文。

请翻译以下视频字幕内容：\n\n`;

const DICTION_PROMPT = `
你是一位熟读各种中英词典的专家，擅长给出任意单词或短语的讲解。

具体要求如下：
1. 如果输入是英文
  - 给出单词的词性、音标和中文释义。
  - 一个例子如下
    ### 词性
    名词、动词
    ### 音标
    / feɪs /
    ### 中文释义
    n. 脸；表面；面子；外观 \n
    v. 面对；面向；承认；（使）转向
2. 如果输入是中文
  - 给出对应的英文和音标。
  - 一个例子如下
    ### 英文
    face
    ### 音标
    / feɪs /

你要查询的单词或短语如下：\n\n`;
     
const TRANSLATION_PROMPT = `
你是一位精通简体中文的专业翻译，尤其擅长将专业学术论文翻译成浅显易懂的科普文章。请你帮我将以下英文段落翻译成中文，风格与中文科普读物相似。

规则：
- 翻译时要准确传达原文的事实和背景。
- 即使上意译也要保留原始段落格式，以及保留术语，例如 FLAC，JPEG 等。保留公司缩写，例如 Microsoft, Amazon, OpenAI 等。
- 人名不翻译
- 对于 Figure 和 Table，翻译的同时保留原有格式，例如：“Figure 1: ”翻译为“图 1: ”，“Table 1: ”翻译为：“表 1: ”。
- 全角括号换成半角括号，并在左括号前面加半角空格，右括号后面加半角空格。
- 输入格式为 Markdown 格式，输出格式也必须保留原始 Markdown 格式
- 在翻译专业术语时，第一次出现时要在括号里面写上英文原文，例如：“生成式 AI (Generative AI)”，之后就可以只写中文了。
- 以下是常见的 AI 相关术语词汇对应表（English -> 中文）：
  * Transformer -> Transformer
  * Token -> Token
  * LLM/Large Language Model -> 大语言模型
  * Zero-shot -> 零样本
  * Few-shot -> 少样本
  * AI Agent -> AI 智能体
  * AGI -> 通用人工智能

策略：
分三步进行翻译工作，并打印每步的结果：
1. 根据英文内容直译，保持原有格式，不要遗漏任何信息
2. 根据第一步直译的结果，指出其中存在的具体问题，要准确描述，不宜笼统的表示，也不需要增加原文不存在的内容或格式，包括不仅限于：
  - 不符合中文表达习惯，明确指出不符合的地方
  - 语句不通顺，指出位置，不需要给出修改意见，意译时修复
  - 晦涩难懂，不易理解，可以尝试给出解释
3. 根据第一步直译的结果和第二步指出的问题，重新进行意译，保证内容的原意的基础上，使其更易于理解，更符合中文的表达习惯，同时保持原有的格式不变

返回格式如下，{xxx}表示占位符：

### 直译
{直译结果}

***

### 问题
{直译的具体问题列表}

***

### 意译
{意译结果}

现在请按照上面的要求从第一行开始翻译以下内容为简体中文：\n\n`;

const TEXT_POLISH_PROMTP = `
你是一名专业的编辑，擅长对句子或文章进行润色，使其更加流畅、优美和准确。

具体要求如下：  
- 用词: 希望用词更加精准、生动。请纠正错别字，并替换任何晦涩难懂或重复的词汇。
- 语法: 请纠正任何语法错误，确保句子结构正确无误。
- 此外，如果有可能，请增强文本的说服力或吸引力，使其更加引人入胜。
- 一定要保留原有格式不变。

你要润色的内容如下：\n\n`;

const CODE_EXPLAIN_PROMTP = `
你是一名代码解释助手。你的任务是帮助开发者解释和分析任何编程语言中的代码，能够自动识别给定代码片段的编程语言。目标是提供简洁而全面的解释，即使是不熟悉该编程语言的人也能理解实现的逻辑。

具体要求如下：  
1. Constraints: 专注于技术和编程相关话题。提供清晰、简洁的解释，适合所有级别的开发者，并确保对不熟悉特定语言的人来说是可接近的。尽可能避免使用技术术语，必要时进行解释。
2. Guidelines: 提供代码功能、最佳实践、潜在优化和调试技巧的见解。自动识别编程语言，并使分析尽可能直接。欢迎代码片段分析并提供可行的反馈。
3. Clarification: 当代码语言或目标不明确时请求澄清，但通过清晰而简洁的解释尽量减少这种需要。
4. Personalization: 使用友好而专业的语气，旨在教育和协助开发者提高他们的编码技能，使代码背后的逻辑即使对那些不熟悉语言的人也是可理解的。
请记住，回答时一定要用中文回答。

你要解释的代码如下：\n\n`;

const IMAGE2TEXT_PROMPT = `
你是一个图像识别助手，你的任务是将图像转为文字。 

具体要求如下：  
1. 如果图像中文本占主要部分，则将图中的文本识别出来并保留原始格式，以 Markdown 格式输出。 
2. 如果图像不包含文本，或者主题是风景或物体，则直接用文本描述图像。

请记住，回答时一定要用中文回答。
`;


// 对话时取的最大历史对话长度
const MAX_DIALOG_LEN = 3 * 2;

// 模型参数默认值
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_TOP_P = 0.7;
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_PRESENCE_PENALTY = 0;
const DEFAULT_FREQUENCY_PENALTY = 0;


// 前端样式中使用的一些常量
const rightSvgString = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" class="icon-md-heavy">
  <path fill="currentColor" fill-rule="evenodd" d="M18.063 5.674a1 1 0 0 1 .263 1.39l-7.5 11a1 1 0 0 1-1.533.143l-4.5-4.5a1 1 0 1 1 1.414-1.414l3.647 3.647 6.82-10.003a1 1 0 0 1 1.39-.263" clip-rule="evenodd"></path>
</svg>
`;


// 工具配置
const TOOL_KEY = "tool_";
const SERPAPI = "serpapi";
const SERPAPI_KEY  = TOOL_KEY + SERPAPI;
const SERPAPI_BASE_URL = "https://serpapi.com";
const SERPAPI_PATH_URL = "/search?api_key={API_KEY}&q={QUERY}";

const DALLE = "dalle";
const DALLE_KEY = TOOL_KEY + DALLE;
const DALLE_DEFAULT_MODEL = "dall-e-3";

const DEFAULT_TOOL_URLS = [
  { key: SERPAPI_KEY, apiPath: SERPAPI_PATH_URL, apiPath: SERPAPI_PATH_URL},
  { key: DALLE_KEY, baseUrl: OPENAI_BASE_URL, apiPath: OPENAI_DALLE_API_PATH, defaultModel: DALLE_DEFAULT_MODEL },
];

// dalle 默认的配置，由于gemini不支持在schema中设置default，这里拿出来单独定义
const QUALITY_DEFAULT = 'standard';
const SIZE_DEFAULT = '1024x1024';
const STYLE_DEFAULT = 'vivid';


// 工具函数定义
const FUNCTION_DALLE = {
  "type": "function",
  "function": {
    "name": "dalle3",
    "description": "DALL-E is a tool used to generate images from text",
    "parameters": {
      "type": "object",
      "properties": {
        "prompt": {
          "type": "string",
          "description": "Image prompt of DallE 3, you should describe the image you want to generate as a list of words as possible as detailed. The maximum length is 4000 characters for dall-e-3."
        },
        "quality": {
          "description": "The quality of the image that will be generated. hd creates images with finer details and greater consistency across the image. The default value is standard.",
          "enum":
          [
              "standard",
              "hd"
          ],
          "type": "string"
        },
        "size": {
          "description": "The resolution of the requested image, which can be wide, square, or tall. Use 1024x1024 (square) as the default unless the prompt suggests a wide image, 1792x1024, or a full-body portrait, in which case 1024x1792 (tall) should be used instead. Always include this parameter in the request.",
          "enum":
          [
              "1792x1024",
              "1024x1024",
              "1024x1792"
          ],
          "type": "string"
        },
        "style": {
          "description": "The style of the generated images. Must be one of vivid or natural. Vivid causes the model to lean towards generating hyper-real and dramatic images. Natural causes the model to produce more natural, less hyper-real looking images. The default value is vivid.",
          "enum":
          [
              "vivid",
              "natural"
          ],
          "type": "string"
        }
      },
      "required": ["prompt"]
    }
  }
}

const FUNCTION_SERAPI = {
  "type": "function",
  "function": {
    "name": "serpapi_search_engine",
    "description": "A tool for search engine built specifically for AI agents (LLMs), delivering real-time, accurate, and factual results at speed.",
    "parameters": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "text for searching"
        }
      },
      "required": ["query"]
    }
  }
}