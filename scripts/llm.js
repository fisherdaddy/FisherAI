// 对话历史（OpenAI兼容格式）
let dialogueHistory = [];

// 对话历史数组（gemini）
let geminiDialogueHistory = [];

// 初始化变量
let systemPrompt;
let currentTime;

// 使用立即执行的异步函数初始化
(async function initializeVariables() {
  // 获取当前时间
  currentTime = getCurrentTime();
  const targetLanguage = await getTargetLanguage();
  systemPrompt = SYSTEM_PROMPT.replace(/{current_time}/g, currentTime).replace(/{language}/g, targetLanguage);
})();

// 配置 marked.js 使用 KaTeX 渲染 LaTeX
marked.setOptions({
  renderer: new marked.Renderer(),
  highlight: function(code, lang) {
    return code;
  },
  pedantic: false,
  gfm: true,
  breaks: true,
  sanitize: false,
  smartypants: false,
  xhtml: false
});

// 扩展 marked.js 以支持 LaTeX
const renderer = new marked.Renderer();
const originalParagraph = renderer.paragraph.bind(renderer);

renderer.paragraph = (text) => {
  const mathRegex = /\$\$([\s\S]+?)\$\$|\$((?!\$)[\s\S]+?(?!\$))\$/g;
  text = text.replace(mathRegex, (match, displayMode, inlineMode) => {
    try {
      const tex = displayMode || inlineMode;
      const isDisplayMode = !!displayMode;
      return katex.renderToString(tex, {
        displayMode: isDisplayMode,
        throwOnError: false
      });
    } catch (err) {
      console.error('KaTeX error:', err);
      return match;
    }
  });
  return originalParagraph(text);
};

marked.setOptions({ renderer });

// gemini system prompt
let geminiSystemPrompt = {
    "role": "model",
    "parts": [
      {
        "text": systemPrompt
      }
    ]
  };

// 用于控制主动关闭请求
let currentController = null;

// 初始化system prompt
initChatHistory();

function cancelRequest() {
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
}

function initChatHistory() {
  dialogueHistory = [{
    "role": "system",
    "content": systemPrompt
  }];
  geminiDialogueHistory = []
}


/**
 * 根据不同的模型，选择对应的接口地址
 * @param {string} provider 
 * @returns 
 */
async function getBaseUrlAndApiKey(provider) {
  for (const { key, baseUrl, apiPath } of DEFAULT_LLM_URLS) {
    if (key === provider) {
      const modelInfo = await getModelInfoFromChromeStorage(key);
      let domain = baseUrl;
      let apiKey = '';
      if (modelInfo) {
        if(modelInfo.baseUrl) {
          domain  = modelInfo.baseUrl;
        }
        if(modelInfo.apiKey) {
          apiKey = modelInfo.apiKey;
        }
      }
      return { baseUrl: `${domain}${apiPath}`, apiKey: apiKey};
    }
  }
  
  return { baseUrl: null, apiKey: null };
}

async function getModelInfoFromChromeStorage(modelKey) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(modelKey, function(result) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        const modelInfo = result[modelKey];
        if (modelInfo && modelInfo.baseUrl && modelInfo.apiKey) {
          resolve({ baseUrl: modelInfo.baseUrl, apiKey: modelInfo.apiKey });
        } else if (modelInfo && modelInfo.baseUrl) {
          resolve({ baseUrl: modelInfo.baseUrl });
        } else if (modelInfo && modelInfo.apiKey) {
          resolve({ apiKey: modelInfo.apiKey });
        } else {
          resolve(null);
        }
      }
    });
  });
}

async function getValueFromChromeStorage(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(key, function(result) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        const value = result[key];
        if (value) {
          resolve(value);
        } else {
          resolve(null);
        }
      }
    });
  });
}

/**
 * 动态构建请求头部和请求体的函数
 * @param {object} additionalHeaders 
 * @param {object} body 
 * @returns 
 */
function createRequestParams(additionalHeaders, body) {
  let headers = {
    'Content-Type': 'application/json'
  };

  // 为每个请求创建一个新的 AbortController
  const controller = new AbortController();
  currentController = controller;
  headers = {...headers, ...additionalHeaders};

  // 设置80秒超时
  const timeoutId = setTimeout(() => controller.abort(), 180000);

  return {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: controller.signal,
    timeoutId // 保存 timeoutId 以便后续清除
  };
}

/**
 * call llm
 * @param {string} model 
 * @param {string} provider 
 * @param {string} inputText 
 * @param {Array} base64Images 
 * @param {string} type 
 * @returns 
 */
async function chatWithLLM(model, provider, inputText, base64Images, type) {
  // 处理URL和API密钥
  var {baseUrl, apiKey} = await getBaseUrlAndApiKey(provider);

  console.log('baseUrl>>>', baseUrl);

  if(provider !== PROVIDER_FISHERAI && provider !== PROVIDER_OLLAMA) {
    if(!baseUrl) {
      throw new Error('模型 ' + model + ' 的 API 代理地址为空，请检查！');
    }

    if(!apiKey) {
      throw new Error('模型 ' + model + ' 的 API Key 为空，请检查！');
    }
  }

  // 如果是划词或划句场景，把system prompt 和 历史记录置空
  if(type == HUACI_TRANS_TYPE) {
    dialogueHistory = [];
    geminiDialogueHistory = [];
  }

  const openaiDialogueEntry = createDialogueEntry('user', 'content', inputText, base64Images, model, provider);
  const geminiDialogueEntry = createDialogueEntry('user', 'parts', inputText, base64Images, model, provider);

  // 将用户提问更新到对话历史
  dialogueHistory.push(openaiDialogueEntry);
  geminiDialogueHistory.push(geminiDialogueEntry);

  // 取最近的 X 条对话记录
  if(dialogueHistory.length > MAX_DIALOG_LEN) {
    dialogueHistory = dialogueHistory.slice(-MAX_DIALOG_LEN);
  }

  let result = { completeText: '', tools: [] };
  if(provider === PROVIDER_GOOGLE) {
    baseUrl = baseUrl.replace('{MODEL_NAME}', model).replace('{API_KEY}', apiKey);
    result = await chatWithGemini(baseUrl, type, provider);
  } else {
    result = await chatWithOpenAIFormat(baseUrl, apiKey, model, type, provider);
  }

  if(result.tools.length > 0) {
    while(result.tools.length > 0) {
      result = await parseFunctionCalling(result, baseUrl, apiKey, model, type, provider);
    }
  } else {
    if(result.completeText.length > 0) {
      // 将 AI 回答更新到对话历史
      updateChatHistory(result.completeText);
    }
  }

  return result.completeText;
}


async function parseFunctionCalling(result, baseUrl, apiKey, model, type, provider) {

  if(result.completeText.length > 0) {
    // 将 AI 回答更新到对话历史
    updateChatHistory(result.completeText);
  }

  if(result.tools.length > 0) {
    // 若触发function call
    const tools  = [];
    for(const tool of result.tools) {
      tools.push(
        {
          id: tool.id,
          type: 'function',
          function: {
            name: tool.name,
            arguments: tool.arguments
          }
        }
      );
    }
    // 更新 AI tool 结果到对话记录
    updateToolChatHistory(tools);

    for(const tool of result.tools) {
        const toolId = tool['id'];
        const toolName = tool['name'];
        let toolArgs = tool['arguments'];

        // Parse the JSON string into an object
        if(typeof toolArgs == 'string') {
          try {
            toolArgs = JSON.parse(toolArgs);
          } catch (error) {
              console.error('Error parsing arguments:', error);
          }
        }
        
        const contentDiv = document.querySelector('.chat-content');
        let lastDiv = contentDiv.lastElementChild;
        if(lastDiv.innerHTML.length > 0) {
          createAIMessageDiv();
          lastDiv = contentDiv.lastElementChild;
        }

        if(toolName.includes('serpapi')) {
          // SerpAPI 搜索工具
          const resultHtml = '正在调用 SerpAPI 联网工具...';
          lastDiv.innerHTML = marked.parse(resultHtml);

          // 调用接口
          const searchResult = await callSerpAPI(toolArgs['query']);
          let htmlContent = '<p>Sources:</p><ul>';
          for (const element of searchResult.organicResults) {
            if(element.position > 5) {
              // 仅取 TOP5 的搜索结果
              break;
            }
            htmlContent += '<li><a class="search-source" href="' + element.link + '">' + element.title + '</a></li>';
          }
          htmlContent += '</ul>';
          lastDiv.innerHTML = marked.parse(htmlContent);

          // 将搜索结果更新至对话历史
          updateToolCallChatHistory(tool, JSON.stringify(searchResult));

        } else if(toolName.includes('dalle')) {
          // DALLE 图像生成
          lastDiv.innerHTML = marked.parse('正在调用 DALLE 图像生成工具..');

          console.log('tool>>>', tool);

          // 调用 DALLE API & 展示结果
          const dalleResult = await callDALLE(toolArgs['prompt'], toolArgs['quality'], toolArgs['size'], toolArgs['style']);
          let htmlContent = '';
          for(element of dalleResult.data) {
            htmlContent += '<p>Prompt:</p><p>' + element.revised_prompt + "</p>";
          }

          lastDiv.innerHTML = marked.parse(htmlContent);

          // 隐藏加载按钮
          hiddenLoadding();

          // 将dalle结果更新至对话历史
          updateToolCallChatHistory(tool, JSON.stringify(dalleResult));
        }
    }

    // 生成AI回答
    const contentDiv = document.querySelector('.chat-content');
    let lastDiv = contentDiv.lastElementChild;
    if(lastDiv.innerHTML.length > 0) {
      createAIMessageDiv();
    }

    let newResult = { completeText: '', tools: [] };
    if(provider === PROVIDER_GOOGLE) {
      newResult = await chatWithGemini(baseUrl, type, provider);
    } else {
      newResult = await chatWithOpenAIFormat(baseUrl, apiKey, model, type, provider);
    }

    return newResult;
  }
}



/**
 * 处理 OpenAI 兼容数据格式
 * @param {string} baseUrl 
 * @param {string} apiKey 
 * @param {string} modelName 
 * @param {string} type 
 * @returns 
 */
async function chatWithOpenAIFormat(baseUrl, apiKey, modelName, type, provider) {
  let isFisherAI = false;

  if(provider.includes(PROVIDER_FISHERAI)) {
    isFisherAI = true;
  }
  
  const { temperature, topP, maxTokens, frequencyPenalty, presencePenalty } = await getModelParameters();

  const body = {
    model: modelName,
    max_tokens: maxTokens,
    stream: true,
    messages: dialogueHistory,
    tools: []
  };

  if(!provider.includes(PROVIDER_DEEPSEEK)) {
    body.temperature = temperature;
    body.top_p = topP;
  }
   
  // mistral 和 deepseek-reasoner 的模型传以下两个参数会报错，这里过滤掉
  if(!provider.includes(PROVIDER_MISTRAL) && !provider.includes(PROVIDER_DEEPSEEK)) {
    body.frequency_penalty = frequencyPenalty;
    body.presence_penalty = presencePenalty;
  }
  
  if(!type.includes(HUACI_TRANS_TYPE)) {
    // 获取工具选择情况
    const serpapi_checked = await getValueFromChromeStorage(SERPAPI);
    const dalle_checked = await getValueFromChromeStorage(DALLE);
    let tools_list_prompt = TOOL_PROMPT_PREFIX;
    if(serpapi_checked != null && serpapi_checked) {
      tools_list_prompt += WEB_SEARCH_PROMTP;
      body.tools.push(FUNCTION_SERAPI);
    }
    if(dalle_checked != null && dalle_checked) {
      tools_list_prompt += IMAGE_GEN_PROMTP;
      body.tools.push(FUNCTION_DALLE);
    }
    // 如果tools数组为空，则删除tools属性
    if (body.tools.length === 0) {
      delete body.tools;
    }

    // 根据选择的工具状态来更新 system prompt
    dialogueHistory[0].content = systemPrompt.replace('{tools-list}', tools_list_prompt);
  }

  let additionalHeaders = { 'Authorization': 'Bearer ' + apiKey };

  // FisherAI 模型需要特殊的认证头
  if(isFisherAI) {
    additionalHeaders = await generateFisherAIHeaders(FISHERAI_API_KEY, FISHERAI_API_SECRET, body);
  }

  const params = createRequestParams(additionalHeaders, body);
  console.log(baseUrl);
  console.log(params);

  return await fetchAndHandleResponse(baseUrl, params, type, provider);
}

/**
 * 处理 gemini 接口数据格式
 * @param {string} baseUrl 
 * @param {string} type 
 * @param {string} provider
 * @returns 
 */
async function chatWithGemini(baseUrl, type, provider) {
  const { temperature, topP, maxTokens } = await getModelParameters();

  const body = {
    contents: geminiDialogueHistory,
    systemInstruction: geminiSystemPrompt,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: temperature,
      topP: topP
    },
    tools: [
      {
        functionDeclarations:[]
      }
    ]
  };

  // 获取工具选择情况
  const serpapi_checked = await getValueFromChromeStorage(SERPAPI);
  const dalle_checked = await getValueFromChromeStorage(DALLE);
  let tools_list_prompt = TOOL_PROMPT_PREFIX;
  if(serpapi_checked != null && serpapi_checked) {
    tools_list_prompt += WEB_SEARCH_PROMTP;
    body.tools[0].functionDeclarations.push(FUNCTION_SERAPI.function);
  }
  if(dalle_checked != null && dalle_checked) {
    tools_list_prompt += IMAGE_GEN_PROMTP;
    body.tools[0].functionDeclarations.push(FUNCTION_DALLE.function);
  }
  // 如果tools数组为空，则删除tools属性
  if (body.tools[0].functionDeclarations.length === 0) {
    delete body.tools;
  }

  // 根据选择的工具状态来更新 system prompt
  geminiSystemPrompt.parts[0].text = systemPrompt.replace('{tools-list}', tools_list_prompt);

  const additionalHeaders = {};
  const params = createRequestParams(additionalHeaders, body);
  console.log(baseUrl);
  console.log(params);

  return await fetchAndHandleResponse(baseUrl, params, type, provider);
}

/**
 * 从 chrome storage 中获取模型参数
 * @returns 
 */
async function getModelParameters() {
  return {
    temperature: Number(await getValueFromChromeStorage('temperature') || DEFAULT_TEMPERATURE),
    topP: Number(await getValueFromChromeStorage('top_p') || DEFAULT_TOP_P),
    maxTokens: Number(await getValueFromChromeStorage('max_tokens') || DEFAULT_MAX_TOKENS),
    frequencyPenalty: Number(await getValueFromChromeStorage('frequency_penalty') || DEFAULT_FREQUENCY_PENALTY),
    presencePenalty: Number(await getValueFromChromeStorage('presence_penalty') || DEFAULT_PRESENCE_PENALTY)
  };
}

/**
 * LLM 接口请求 & 解析
 * @param {string} baseUrl 
 * @param {string} params 
 * @param {string} type 
 * @param {string} provider
 * @returns 
 */
async function fetchAndHandleResponse(baseUrl, params, type, provider) {
  let result = { resultString: '', resultArray: [] };
  try {
    const response = await fetch(baseUrl, params);

    // 清除超时定时器
    clearTimeout(params.timeoutId);

    console.log(response);
    if (!response.ok) {
      // 错误响应
      const errorJson = await response.json();
      console.error('Error response JSON:', errorJson);
      throw new Error("错误信息：" + errorJson.error.message);
    } 
    
    const result = await parseAndUpdateChatContent(response, type, provider);
    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Fetch aborted...');
      return result;
    } else {
      console.error(error.message);
      throw new Error(error.message);
    }
  }
}

/**
 * 将输入转为适合 LLM 接口需要的数据需格式
 * @param {string} role 
 * @param {string} partsKey 
 * @param {string} text 
 * @param {string} images 
 * @param {string} provider
 * @returns 
 */
function createDialogueEntry(role, partsKey, text, images, provider) {
  const entry = { "role": role };
  
  // geimini
  if (partsKey === 'parts') {
    entry[partsKey] = [];
    if (text) {
      entry[partsKey].push({ "text": text });
    }
    if (images) {
      images.forEach(imageBase64 => {
        const parsedImage = parseBase64Image(imageBase64);
        entry[partsKey].push({
          "inline_data": {
            "mime_type": parsedImage.mimeType,
            "data": parsedImage.data
          }
        });
      });
    }
  } else {
    // OpenAI 兼容格式
    if (!images || images.length === 0) {
      entry[partsKey] = text ? text : '';
    } else {
      entry[partsKey] = [];
      if (text) {
        entry[partsKey].push({ 
          "type": "text",
          "text": text 
        });
      }
      images.forEach(imageBase64 => {
        // 智谱的兼容OpenAI格式没做太好，这里的base64不能带前缀，特殊处理一下
        if(provider.includes(PROVIDER_ZHIPU)) {
          imageBase64 = imageBase64.split(',')[1];
        }
        entry[partsKey].push({
          "type": "image_url",
          "image_url": { "url": imageBase64 }
        });
      });
    }
  }
  
  return entry;
}


/**
 * 更新对话历史
 * @param {string} text 
 */
function updateChatHistory(text) {
  dialogueHistory.push({
    "role": "assistant",
    "content": text
  });
  geminiDialogueHistory.push({
    "role": "model",
    "parts": [{
      "text": text
    }]
  });
}

function updateToolChatHistory(tools) {
  // openai
  dialogueHistory.push({
    "role": "assistant",
    "content": '',
    "tool_calls": tools
  });

  // gemini
  const parts = []
  for(const tool of tools) {
    parts.push({
      "functionCall":
      {
          "name": tool.function.name,
          "args": JSON.parse(tool.function.arguments)
      }
    });
  }
  geminiDialogueHistory.push({
    "role": "model",
    "parts": parts
  });
}

function updateToolCallChatHistory(tool, content) {
  // openai
  dialogueHistory.push({
    "role": "tool",
    "tool_call_id": tool.id,
    "content": content
  });

  // gemini
  geminiDialogueHistory.push({
    "role": "function",
    "parts": [
      {
        "functionResponse": {
          "name": tool.name,
          "response": {
            "name": tool.name,
            "content": content
          }
        }
      }
    ]
  });
}


/**
 * 获取正文
 * @returns 
 */
async function fetchPageContent(format = FORMAT_HTML) {
    try {
      const queryOptions = { active: true, currentWindow: true };
      const [tab] = await chrome.tabs.query(queryOptions);
      if (tab) {
        return new Promise((resolve, reject) => {
          let actionName = ACTION_FETCH_PAGE_CONTENT;
          if(format == FORMAT_TEXT) {
            actionName = ACTION_FETCH_TEXT_CONTENT;
          }
          chrome.tabs.sendMessage(tab.id, { action: actionName }, function(response) {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError.message);
            } else if (response && response.content) {
              resolve(response.content);
            } else {
              reject("No content returned");
            }
          });
        });
      } else {
        throw new Error("No active tab found");
      }
    } catch (error) {
      console.error("Error fetching page content:", error);
      throw error;
    }
}


/**
 * 获取当前打开的页面 URL
 * @returns 
 */
async function getCurrentURL() {
  try {
    const queryOptions = { active: true, currentWindow: true };
    const [tab] = await chrome.tabs.query(queryOptions);
    if (tab) {
      return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, { action: ACTION_GET_PAGE_URL }, function(response) {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError.message);
          } else if (response && response.url) {
            resolve(response.url);
          } else {
            reject("No url returned");
          }
        });
      });
    } else {
      throw new Error("No active tab found");
    }
  } catch (error) {
    console.error("Error url:", error);
    throw error;
  }
}

/**
 * 解析模型返回结果，并更新到对话界面中
 * @param {object} response 
 * @param {string} type
 * @param {string} provider
 * @returns 
 */
async function parseAndUpdateChatContent(response, type, provider) {
    // 使用长轮询，服务器会持续发送数据
    const reader = response.body.getReader();
    let completeText = '';
    let tools = [];
    let buffer = '';
    let isInThinkingMode = false;
    let thinkingContent = '';
    let thinkingBlockCreated = false;
    
    try {
      while (true) {
        const { value, done } = await reader.read();
        console.log('done..', done);
        if (done) break;
  
        // 处理接收到的数据
        buffer += new TextDecoder().decode(value);
        console.log('buffer...', buffer);
        let position = 0;
        while (position < buffer.length) {
          let start = buffer.indexOf('{', position);
          let end = buffer.indexOf('}\n', start);
          if(end == -1) {
            end = buffer.indexOf('}\r\n', start); // 这个主要用于处理gemini的返回
          }
      
          if (start === -1 || end === -1) {
            break;
          }
          
          // 尝试解析找到的JSON对象
          let jsonText = buffer.substring(start, end + 1);
          try {
            console.log('jsonText...', jsonText);
            const jsonData = JSON.parse(jsonText);
            let content = '';
            let reasoningContent = ''; // 用于存储 reasoning/reason 字段内容
            
            // 根据提供商确定如何解析响应
            if (provider === PROVIDER_GOOGLE) {
              jsonData.candidates[0].content.parts.forEach(part => {
                // 检查 content 字段
                if (part.text !== undefined && part.text != null) {
                  content += part.text;
                }

                // 检查 functionCall 字段
                if (part.functionCall !== undefined) {
                  const func = part.functionCall;
                  tools.push({
                    'id': generateUniqueId(),
                    'name': func.name,
                    'arguments': JSON.stringify(func.args)
                  });
                }
              });
            } else if (provider === PROVIDER_OLLAMA) {
              content = jsonData.message.content;
            } else {
              jsonData.choices.forEach(choice => {
                const delta = choice.delta;

                // 检查 content 字段
                if (delta.content !== undefined && delta.content !== null) {
                  content += delta.content;
                }
                
                // 检查 reasoning/reason 字段 (新增)
                if (delta.reasoning !== undefined && delta.reasoning !== null) {
                  reasoningContent += delta.reasoning;
                } else if (delta.reason !== undefined && delta.reason !== null) {
                  reasoningContent += delta.reason;
                } else if (delta.reasoning_content !== undefined && delta.reasoning_content !== null) {
                  reasoningContent += delta.reasoning_content;
                }

                // 检查 tool_calls 字段
                if (delta.tool_calls !== undefined && Array.isArray(delta.tool_calls)) {
                  delta.tool_calls.forEach(tool_call => {
                    // console.log('tool_call:', tool_call);
                    const func = tool_call.function;
                    if (func) {
                      const index = tool_call.index;
                      if (tools.length < index+1) {
                        tools.push({});
                        tools[index]['id'] = tool_call.id;
                        tools[index]['name'] = func.name;
                        tools[index]['arguments'] = func.arguments;
                      } else {
                        tools[index]['arguments'] += func.arguments;
                      }
                    }
                  });
                }
              });
            }
            
            // 处理 reasoning/reason 字段 (新增)
            if (reasoningContent && reasoningContent.trim().length > 0) {
              // 如果是第一次有思考内容，创建思考区块
              if (!thinkingBlockCreated) {
                thinkingBlockCreated = true;
                // 创建思考区块的HTML，添加折叠/展开功能
                const thinkingBlockHTML = `
                  <div class="thinking-block">
                    <div class="thinking-header" onclick="this.parentNode.classList.toggle('collapsed')">
                      <div class="thinking-header-left">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="thinking-icon">
                          <path d="M2 12c0-3.5 2.5-6 6.5-6 4 0 6 2.5 9 2.5 2.5 0 4.5-2.5 4.5-2.5v10c0 0-2 2.5-4.5 2.5-3 0-5-2.5-9-2.5-4 0-6.5 2.5-6.5 6"></path>
                          <path d="M2 6v12"></path>
                        </svg>
                        <span class="thinking-title">思考过程</span>
                      </div>
                      <div class="thinking-toggle">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="toggle-icon">
                          <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                      </div>
                    </div>
                    <div class="thinking-content"></div>
                  </div>
                `;
                
                // 将思考区块添加到界面
                if (type == CHAT_TYPE) {
                  const contentDiv = document.querySelector('.chat-content');
                  const lastDiv = contentDiv.lastElementChild;
                  // 使用 insertAdjacentHTML 而不是 innerHTML += 以避免覆盖现有内容
                  lastDiv.insertAdjacentHTML('beforeend', thinkingBlockHTML);
                  
                  // 添加点击事件处理
                  setupThinkingBlockToggle();
                } else if (type == HUACI_TRANS_TYPE) {
                  const translationPopup = document.querySelector('#fisherai-transpop-id');
                  translationPopup.insertAdjacentHTML('beforeend', thinkingBlockHTML);
                  
                  // 添加点击事件处理
                  setupThinkingBlockToggle();
                }
              }
              
              // 更新思考内容
              thinkingContent += reasoningContent;
              updateThinkingContent(thinkingContent, type);
            }
            
            // 处理思考模式的标签
            if (content.includes('<think>') && !isInThinkingMode) {
              isInThinkingMode = true;
              // 如果是第一次出现<think>标签，创建思考区块
              if (!thinkingBlockCreated) {
                thinkingBlockCreated = true;
                // 创建思考区块的HTML，添加折叠/展开功能
                const thinkingBlockHTML = `
                  <div class="thinking-block">
                    <div class="thinking-header" onclick="this.parentNode.classList.toggle('collapsed')">
                      <div class="thinking-header-left">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="thinking-icon">
                          <path d="M2 12c0-3.5 2.5-6 6.5-6 4 0 6 2.5 9 2.5 2.5 0 4.5-2.5 4.5-2.5v10c0 0-2 2.5-4.5 2.5-3 0-5-2.5-9-2.5-4 0-6.5 2.5-6.5 6"></path>
                          <path d="M2 6v12"></path>
                        </svg>
                        <span class="thinking-title">思考过程</span>
                      </div>
                      <div class="thinking-toggle">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="toggle-icon">
                          <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                      </div>
                    </div>
                    <div class="thinking-content"></div>
                  </div>
                `;
                
                // 将思考区块添加到界面
                if (type == CHAT_TYPE) {
                  const contentDiv = document.querySelector('.chat-content');
                  const lastDiv = contentDiv.lastElementChild;
                  // 使用 insertAdjacentHTML 而不是 innerHTML += 以避免覆盖现有内容
                  lastDiv.insertAdjacentHTML('beforeend', thinkingBlockHTML);
                  
                  // 添加点击事件处理
                  setupThinkingBlockToggle();
                } else if (type == HUACI_TRANS_TYPE) {
                  const translationPopup = document.querySelector('#fisherai-transpop-id');
                  translationPopup.insertAdjacentHTML('beforeend', thinkingBlockHTML);
                  
                  // 添加点击事件处理
                  setupThinkingBlockToggle();
                }
              }
              
              // 提取<think>标签后的内容
              const thinkStartIndex = content.indexOf('<think>') + 7;
              thinkingContent += content.substring(thinkStartIndex);
              
              // 更新思考区块内容
              updateThinkingContent(thinkingContent, type);
              
              // 从completeText中移除<think>标签及其内容
              content = content.substring(0, content.indexOf('<think>'));
            } 
            // 如果已经在思考模式中，继续累积思考内容
            else if (isInThinkingMode) {
              // 检查是否有</think>结束标签
              if (content.includes('</think>')) {
                const thinkEndIndex = content.indexOf('</think>');
                // 添加结束标签前的内容到思考内容
                thinkingContent += content.substring(0, thinkEndIndex);
                // 更新思考区块的最终内容，但保持思考区块可见
                updateThinkingContent(thinkingContent, type);
                
                // 只保留</think>后的内容添加到completeText
                content = content.substring(thinkEndIndex + 8);
                
                // 设置为非思考模式，以便后续内容正常显示
                isInThinkingMode = false;
                
                // 如果有常规内容，则显示在思考内容下方
                if (content.trim().length > 0) {
                  completeText += content;
                }
              } else {
                // 如果没有结束标签，所有内容都是思考内容
                thinkingContent += content;
                updateThinkingContent(thinkingContent, type);
                content = ''; // 不添加到completeText
              }
            }
            
            completeText += content;
            position = end + 1; // 更新位置，准备解析下一个对象
          } catch (error) {
            console.error('Failed to parse JSON:', error);
            position = end + 1; // 解析失败，跳过这部分
          }
        }
        // 移除已经解析的部分
        buffer = buffer.substring(position);

        // generate
        if(completeText.length > 0) {
          updateChatContent(completeText, type);
        }
      }
    } catch(error) {
      console.error('parseAndUpdateChatContent error...', error);
      throw error;
    } finally {
      return {
        completeText: completeText,
        tools: tools
      };
    }
}

/**
 * 更新思考区块的内容
 * @param {string} content 思考内容
 * @param {string} type 类型（聊天或划词翻译）
 */
function updateThinkingContent(content, type) {
  let thinkingContentElement;
  
  if (type == CHAT_TYPE) {
    const contentDiv = document.querySelector('.chat-content');
    thinkingContentElement = contentDiv.querySelector('.thinking-content');
  } else if (type == HUACI_TRANS_TYPE) {
    const translationPopup = document.querySelector('#fisherai-transpop-id');
    thinkingContentElement = translationPopup.querySelector('.thinking-content');
  }
  
  if (thinkingContentElement) {
    // 使用marked解析markdown内容
    thinkingContentElement.innerHTML = marked.parse(content);
    
    // 确保思考区块在内容出现后依然可见
    const thinkingBlock = thinkingContentElement.closest('.thinking-block');
    if (thinkingBlock) {
      thinkingBlock.style.display = 'block';
    }
    
    // 渲染数学公式
    renderMathInElement(thinkingContentElement, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false}
      ],
      throwOnError: false
    });
  }
}

/**
 * 更新聊天内容
 * @param {string} completeText 
 * @param {string} type 
 */
function updateChatContent(completeText, type) {
  if(type == CHAT_TYPE) {
    // loading
    const loadingDiv = document.querySelector('.my-extension-loading');
    loadingDiv.style.display = 'none'; 

    const contentDiv = document.querySelector('.chat-content');
    const isAtBottom = (contentDiv.scrollHeight - contentDiv.clientHeight) <= contentDiv.scrollTop;

    // update content
    const lastDiv = contentDiv.lastElementChild;
    
    // 检查是否存在思考区块
    const thinkingBlock = lastDiv.querySelector('.thinking-block');
    
    if (thinkingBlock) {
      // 如果存在思考区块，在思考区块后面添加内容，而不是替换整个lastDiv的内容
      // 创建一个新的元素来容纳常规内容
      let regularContentDiv = lastDiv.querySelector('.regular-content');
      if (!regularContentDiv) {
        regularContentDiv = document.createElement('div');
        regularContentDiv.className = 'regular-content';
        lastDiv.appendChild(regularContentDiv);
      }
      regularContentDiv.innerHTML = marked.parse(completeText);
      
      // 渲染数学公式
      renderMathInElement(regularContentDiv, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false}
        ],
        throwOnError: false
      });
    } else {
      // 如果没有思考区块，直接更新整个内容
      lastDiv.innerHTML = marked.parse(completeText);
      
      // 渲染数学公式
      renderMathInElement(lastDiv, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false}
        ],
        throwOnError: false
      });
    }

    if (isAtBottom) {
      contentDiv.scrollTop = contentDiv.scrollHeight; // 滚动到底部
    }
  } else if (type == HUACI_TRANS_TYPE) {
    // popup
    const translationPopup = document.querySelector('#fisherai-transpop-id');
    translationPopup.style.display = 'block';  
    const button = document.querySelector('#fisherai-button-id');
    button.style.display = 'none';

    // 找到内容容器
    const contentContainer = translationPopup.querySelector('#fisherai-transpop-content');
    
    // 检查是否存在思考区块
    const thinkingBlock = translationPopup.querySelector('.thinking-block');
    
    if (thinkingBlock) {
      // 如果存在思考区块，在思考区块后面添加内容，而不是替换整个内容
      // 创建一个新的元素来容纳常规内容
      let regularContentDiv = translationPopup.querySelector('.regular-content');
      if (!regularContentDiv) {
        regularContentDiv = document.createElement('div');
        regularContentDiv.className = 'regular-content';
        translationPopup.appendChild(regularContentDiv);
      }
      regularContentDiv.innerHTML = marked.parse(completeText);
      
      // 渲染数学公式
      renderMathInElement(regularContentDiv, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false}
        ],
        throwOnError: false
      });
      
      // 添加复制按钮到regularContentDiv
      addCopyButtonToTranslation(regularContentDiv, completeText);
    } else {
      // 如果没有思考区块，直接更新内容容器
      if (contentContainer) {
        contentContainer.innerHTML = marked.parse(completeText);
        
        // 添加复制按钮到contentContainer
        addCopyButtonToTranslation(contentContainer, completeText);
      } else {
        // 如果找不到容器，则更新整个弹窗（应该不会走到这个分支）
        translationPopup.innerHTML = marked.parse(completeText);
        
        // 添加复制按钮到translationPopup
        addCopyButtonToTranslation(translationPopup, completeText);
      }
      
      // 渲染数学公式
      renderMathInElement(contentContainer || translationPopup, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false}
        ],
        throwOnError: false
      });
    }
  }
}

/**
 * 为翻译弹窗添加复制按钮
 * @param {HTMLElement} container 内容容器
 * @param {string} textToCopy 要复制的文本
 */
function addCopyButtonToTranslation(container, textToCopy) {
  // 创建复制按钮容器，使用绝对定位放在右下角
  const copyButtonContainer = document.createElement('div');
  copyButtonContainer.style.position = 'relative';
  copyButtonContainer.style.width = '100%';
  copyButtonContainer.style.height = '24px';
  copyButtonContainer.style.marginTop = '10px';
  
  // 创建复制按钮
  const copyButton = document.createElement('div');
  copyButton.style.position = 'absolute';
  copyButton.style.right = '5px';
  copyButton.style.bottom = '0';
  copyButton.style.cursor = 'pointer';
  copyButton.style.color = 'rgba(66, 153, 225, 0.8)';
  copyButton.style.padding = '4px';
  copyButton.style.borderRadius = '4px';
  copyButton.style.fontSize = '12px';
  copyButton.style.display = 'flex';
  copyButton.style.alignItems = 'center';
  copyButton.style.transition = 'background-color 0.2s';
  copyButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1"></path>
    </svg>
    <span>复制</span>
  `;
  
  // 添加悬停效果
  copyButton.addEventListener('mouseover', function() {
    copyButton.style.backgroundColor = 'rgba(66, 153, 225, 0.1)';
  });
  
  copyButton.addEventListener('mouseout', function() {
    copyButton.style.backgroundColor = 'transparent';
  });
  
  // 添加点击事件
  copyButton.addEventListener('click', function() {
    navigator.clipboard.writeText(textToCopy).then(() => {
      // 复制成功，更改按钮样式和文本
      const originalHtml = copyButton.innerHTML;
      copyButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" style="margin-right: 4px;">
          <path fill="currentColor" fill-rule="evenodd" d="M18.063 5.674a1 1 0 0 1 .263 1.39l-7.5 11a1 1 0 0 1-1.533.143l-4.5-4.5a1 1 0 1 1 1.414-1.414l3.647 3.647 6.82-10.003a1 1 0 0 1 1.39-.263" clip-rule="evenodd"></path>
        </svg>
        <span>已复制</span>
      `;
      copyButton.style.color = '#48BB78'; // 成功绿色
      
      // 在几秒后恢复为原始状态
      setTimeout(() => {
        copyButton.innerHTML = originalHtml;
        copyButton.style.color = 'rgba(66, 153, 225, 0.8)';
      }, 2000);
    }).catch(err => {
      console.error('复制失败:', err);
      copyButton.textContent = '复制失败';
      copyButton.style.color = '#F56565'; // 错误红色
      
      // 在几秒后恢复为原始状态
      setTimeout(() => {
        copyButton.innerHTML = originalHtml;
        copyButton.style.color = 'rgba(66, 153, 225, 0.8)';
      }, 2000);
    });
  });
  
  // 添加按钮到容器
  copyButtonContainer.appendChild(copyButton);
  container.appendChild(copyButtonContainer);
}

async function callSerpAPI(query) {
  const keyStorage = await getValueFromChromeStorage(SERPAPI_KEY);
  let url = SERPAPI_BASE_URL + SERPAPI_PATH_URL;
  url = url.replace('{QUERY}', query);

  if(!keyStorage || !keyStorage.apiKey) {
    throw new Error(' SerAPI 工具的 API Key 未配置，请检查！');
  }

  url = url.replace('{API_KEY}', keyStorage.apiKey);

  const response = await fetch(url);
  // console.log(response);
  if (!response.ok) {
    // 错误响应
    const errorJson = await response.json();
    console.error('Error response JSON:', errorJson);
    throw new Error('Network response was not ok.');
  } 

  const data = await response.json(); 
  
  // Extract answer_box and organic_results
  const answerBox = data.answer_box || {};
  const organicResults = data.organic_results || [];

   return {
    answerBox: answerBox, 
    organicResults: organicResults 
  };
}


async function callDALLE(prompt, quality, size, style) {
  quality = quality!=undefined ? quality : QUALITY_DEFAULT;
  size = size!=undefined ? size : SIZE_DEFAULT;
  style = style!=undefined ? style : STYLE_DEFAULT;
  const keyStorage = await getValueFromChromeStorage(DALLE_KEY);
  const url = OPENAI_BASE_URL + OPENAI_DALLE_API_PATH;
  const body = {
    model: DALLE_DEFAULT_MODEL,
    prompt: prompt,
    quality: quality,
    size: size,
    style: style
  };

  if(!keyStorage || !keyStorage.apiKey) {
    throw new Error(' DALLE 工具的 API Key 未配置，请检查！');
  }

  const additionalHeaders = { 'Authorization': 'Bearer ' + keyStorage.apiKey };
  const params = createRequestParams(additionalHeaders, body);
  const response = await fetch(url, params);

  // console.log('url>>', url);
  // console.log('params>>', params);
  // console.log(response);
  if (!response.ok) {
    // 错误响应
    const errorJson = await response.json();
    console.error('Error response JSON:', errorJson);
    throw new Error('Network response was not ok.');
  } 

  const data = await response.json();
  return data;
}

/**
 * 设置思考区块的折叠/展开功能
 */
function setupThinkingBlockToggle() {
  // 为所有思考区块的标题添加点击事件
  document.querySelectorAll('.thinking-header').forEach(header => {
    if (!header.hasAttribute('data-toggle-initialized')) {
      header.setAttribute('data-toggle-initialized', 'true');
      header.addEventListener('click', function() {
        const block = this.closest('.thinking-block');
        block.classList.toggle('collapsed');
        
        // 更新折叠图标方向
        const toggleIcon = this.querySelector('.toggle-icon');
        if (block.classList.contains('collapsed')) {
          toggleIcon.innerHTML = '<polyline points="6 9 12 15 18 9"></polyline>';
        } else {
          toggleIcon.innerHTML = '<polyline points="18 15 12 9 6 15"></polyline>';
        }
      });
    }
  });
}
