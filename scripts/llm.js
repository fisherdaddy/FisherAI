// 对话历史（OpenAI兼容格式）
let dialogueHistory = [];

// 对话历史数组（gemini）
let geminiDialogueHistory = [];

// gemini system prompt
let geminiSystemPrompt = {
    "role": "model",
    "parts": [
      {
        "text": SYSTEM_PROMPT
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
    "content": SYSTEM_PROMPT
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

  let completeText = '';
  if(model.includes(GEMINI_MODEL)) {
    baseUrl = baseUrl.replace('{MODEL_NAME}', model).replace('{API_KEY}', apiKey);
    completeText = await chatWithGemini(baseUrl, model, type);
  } else {
    completeText = await chatWithOpenAIFormat(baseUrl, apiKey, model, type);
  }

  // 将 AI 回答更新到对话历史
  updateChatHistory(completeText);

  return completeText;
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
  const tool_serpapi = await getValueFromChromeStorage(SERPAPI_KEY);
  const tool_dalle = await getValueFromChromeStorage(DALLE_KEY);
  let tools_list_prompt = "";
  if(tool_serpapi != null && tool_serpapi) {
    tools_list_prompt += WEB_SEARCH_PROMTP;
    body.tools.push(FUNCTION_SERAPI);
  }
  if(tool_dalle != null && tool_dalle) {
    tools_list_prompt += IMAGE_GEN_PROMTP;
    body.tools.push(FUNCTION_DALLE);
  }

  // 根据选择的工具状态来更新 system prompt
  dialogueHistory[0].content = SYSTEM_PROMPT.replace('{tools-list}', tools_list_prompt);

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
    }
  };

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
  let completeText = '';
  try {
    const response = await fetch(baseUrl, params);
    console.log(response);
    if (!response.ok) throw new Error('Network response was not ok.');
    
    completeText = await parseAndUpdateChatContent(response, modelName, type);
    return completeText;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Fetch aborted...', completeText, '<<');
      return completeText;
    } else {
      console.error('Fetch error:', error);
      throw error;
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
              content = jsonData.candidates[0].content.parts[0].text;
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
                    console.log('tool_call:', tool_call);
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

        // 判断是否为 AGENT 模式
        if(tools.length > 0) {
          type = AGENT_TYPE;
          completeText = JSON.stringify(tools);
        }

        // generate
        if(completeText.length > 0) {
          updateChatContent(completeText, type);
        }
      }
    } catch(error) {
      throw error;
    } finally {
      return completeText;
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

  } else if(type == AGENT_TYPE) {
    // loading
    const loadingDiv = document.querySelector('.my-extension-loading');
    loadingDiv.style.display = 'none'; 

    const contentDiv = document.querySelector('.chat-content');
    const isAtBottom = (contentDiv.scrollHeight - contentDiv.clientHeight) <= contentDiv.scrollTop;

    // 解析function
    console.log('completeText:', completeText);
    let newCompleteText = '';
    const tools = JSON.parse(completeText);
    if(tools.length == 0) {
      return;
    }
    tools.forEach(tool => {
      const id = tool['id'];
      const name = tool['name'];
      const arguments = tool['arguments'];
      if(name.includes('serpapi')) {
        // 搜索引擎
        newCompleteText = '';

      } else if(name.includes('dalle')) {
        // dalle
        newCompleteText = '';
      }
    });

    // update content
    const lastDiv = contentDiv.lastElementChild;
    lastDiv.innerHTML = marked.parse(completeText);

    if (isAtBottom) {
      contentDiv.scrollTop = contentDiv.scrollHeight; // 滚动到底部
    }
  }
  
}