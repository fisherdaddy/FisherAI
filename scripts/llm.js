// 对话历史（OpenAI兼容格式）
let dialogueHistory = [];

// 对话历史数组（gemini）
let geminiDialogueHistory = [];

// 获取当前时间
const currentTime = getCurrentTime();
const systemPrompt =  SYSTEM_PROMPT.replace(/{current_time}/g, currentTime);

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
 * @param {string} model 
 * @returns 
 */
async function getBaseUrlAndApiKey(model) {
  for (const { key, baseUrl, apiPath } of DEFAULT_LLM_URLS) {
    if (model.includes(key)) {
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
  return { baseUrl: null, apiKey: null };;
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

  console.log('body>>>', body);

  return {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: controller.signal 
  };
}

/**
 * call llm
 * @param {string} model 
 * @param {string} inputText 
 * @param {Array} base64Images 
 * @param {string} type 
 * @returns 
 */
async function chatWithLLM(model, inputText, base64Images, type) {
  var {baseUrl, apiKey} = await getBaseUrlAndApiKey(model);

  if(!baseUrl) {
    throw new Error('模型 ' + model + ' 的 API 代理地址为空，请检查！');
  }

  if(!apiKey) {
    throw new Error('模型 ' + model + ' 的 API Key 为空，请检查！');
  }

  // 如果是划词或划句场景，把system prompt置空
  if(type == HUACI_TRANS_TYPE) {
    dialogueHistory[0].content = '';
  }

  const openaiDialogueEntry = createDialogueEntry('user', 'content', inputText, base64Images, model);
  const geminiDialogueEntry = createDialogueEntry('user', 'parts', inputText, base64Images, model);

  // 将用户提问更新到对话历史
  dialogueHistory.push(openaiDialogueEntry);
  geminiDialogueHistory.push(geminiDialogueEntry);

  // 取最近的 X 条对话记录
  if(dialogueHistory.length > MAX_DIALOG_LEN) {
    dialogueHistory = dialogueHistory.slice(-MAX_DIALOG_LEN);
  }

  let result = { completeText: '', tools: [] };
  if(model.includes(GEMINI_MODEL)) {
    baseUrl = baseUrl.replace('{MODEL_NAME}', model).replace('{API_KEY}', apiKey);
    result = await chatWithGemini(baseUrl, model, type);
  } else {
    result = await chatWithOpenAIFormat(baseUrl, apiKey, model, type);
  }

  while(result.tools.length > 0) {
    result = await parseFunctionCalling(result, baseUrl, apiKey, model, type);
  }

  return result.completeText;
}


async function parseFunctionCalling(result, baseUrl, apiKey, model, type) {

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
    if(model.includes(GEMINI_MODEL)) {
      newResult = await chatWithGemini(baseUrl, model, type);
    } else {
      newResult = await chatWithOpenAIFormat(baseUrl, apiKey, model, type);
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
async function chatWithOpenAIFormat(baseUrl, apiKey, modelName, type) {
  let realModelName = modelName.replace(new RegExp(GROQ_MODEL_POSTFIX, 'g'), "")
                                .replace(new RegExp(OLLAMA_MODEL_POSTFIX, 'g'), "");
  
  const { temperature, topP, maxTokens, frequencyPenalty, presencePenalty } = await getModelParameters();

  const body = {
    model: realModelName,
    temperature: temperature,
    top_p: topP,
    max_tokens: maxTokens,
    stream: true,
    messages: dialogueHistory,
    tools: []
  };

  // mistral 的模型传以下两个参数会报错，这里过滤掉
  if(!modelName.includes(MISTRAL_MODEL)) {
    body.frequency_penalty = frequencyPenalty;
    body.presence_penalty = presencePenalty;
  }

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

  let additionalHeaders = { 'Authorization': 'Bearer ' + apiKey };

  if (modelName.includes(AZURE_MODEL)) {
    baseUrl = baseUrl.replace('{MODEL_NAME}', realModelName);
    additionalHeaders = { 'api-key': apiKey };
  }

  const params = createRequestParams(additionalHeaders, body);
  console.log(baseUrl);
  console.log(params);

  return await fetchAndHandleResponse(baseUrl, params, modelName, type);
}

/**
 * 处理 gemini 接口数据格式
 * @param {string} baseUrl 
 * @param {string} modelName 
 * @param {string} type 
 * @returns 
 */
async function chatWithGemini(baseUrl, modelName, type) {
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

  return await fetchAndHandleResponse(baseUrl, params, modelName, type);
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
 * @param {string} modelName 
 * @param {string} type 
 * @returns 
 */
async function fetchAndHandleResponse(baseUrl, params, modelName, type) {
  let result = { resultString: '', resultArray: [] };
  try {
    const response = await fetch(baseUrl, params);
    // console.log(response);
    if (!response.ok) {
      // 错误响应
      const errorJson = await response.json();
      console.error('Error response JSON:', errorJson);
      throw new Error("错误信息：" + errorJson.error.message);
    } 
    
    const result = await parseAndUpdateChatContent(response, modelName, type);
    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Fetch aborted...', completeText, '<<');
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
 * @returns 
 */
function createDialogueEntry(role, partsKey, text, images, model) {
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
        if(model.includes(ZHIPU_MODEL)) {
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
 * @param {string} modelName 
 * @param {string} type
 * @returns 
 */
async function parseAndUpdateChatContent(response, modelName, type) {
    // 使用长轮询，服务器会持续发送数据
    const reader = response.body.getReader();
    let completeText = '';
    let tools = [];
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        // console.log('done..', done);
        if (done) break;
  
        // 处理接收到的数据
        buffer += new TextDecoder().decode(value);
        // console.log('buffer...', buffer);
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
            // console.log('jsonText...', jsonText);
            const jsonData = JSON.parse(jsonText);
            let content = '';
            if(modelName.includes(GEMINI_MODEL)) {
              jsonData.candidates[0].content.parts.forEach(part => {
                // 检查 content 字段
                if(part.text !== undefined &&  part.text != null) {
                  content += part.text;
                }

                // 检查 functionCall 字段
                if(part.functionCall !== undefined) {
                  const func = part.functionCall;
                  tools.push({
                    'id': generateUniqueId(),
                    'name': func.name,
                    'arguments': JSON.stringify(func.args)
                  });
                }
              });
            } else if(modelName.includes(OLLAMA_MODEL)) {
              content = jsonData.message.content;
            } else {
              jsonData.choices.forEach(choice => {
                const delta = choice.delta;

                // 检查 content 字段
                if (delta.content !== undefined && delta.content !== null) {
                  content += delta.content;
                }

                // 检查 tool_calls 字段
                if (delta.tool_calls !== undefined && Array.isArray(delta.tool_calls)) {
                  delta.tool_calls.forEach(tool_call => {
                    // console.log('tool_call:', tool_call);
                    const func = tool_call.function;
                    if (func) {
                      const index = tool_call.index;
                      if(tools.length < index+1) {
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
              })
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
      throw error;
    } finally {
      return {
        completeText: completeText,
        tools: tools
      };
    }
}

/**
 * 更新内容界面
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
    lastDiv.innerHTML = marked.parse(completeText);

    if (isAtBottom) {
      contentDiv.scrollTop = contentDiv.scrollHeight; // 滚动到底部
    }

  } else if(type == HUACI_TRANS_TYPE) {
    // popup
    const translationPopup = document.querySelector('#fisherai-transpop-id');
    translationPopup.style.display = 'block';  
    const button = document.querySelector('#fisherai-button-id');
    button.style.display = 'none';

    // shown
    translationPopup.innerHTML = marked.parse(completeText);

  }

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