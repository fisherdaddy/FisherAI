// 对话历史（OpenAI兼容格式）
let dialogueHistory = [{
  "role": "system",
  "content": SYSTEM_PROMPT
}];

// 对话历史数组（gemini）
let geminiDialogueHistory = []

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


// 用于控制主动关闭请求
let currentController = null;  // 用于保存当前活跃的 AbortController

function cancelRequest() {
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
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
 * AI 对话逻辑
 * @param {string} model 
 * @param {object} contentObj 
 * @param {string} type 
 */
async function chatWithLLM(model, contentObj, type) {
  var {baseUrl, apiKey} = await getBaseUrlAndApiKey(model);

  // 如果是划词或划句场景，把system prompt置空
  if(type == TRANS_TYPE) {
    dialogueHistory[0].content = '';
  }

  let completeText = '';
  if(model.includes(GEMINI_MODEL)) {
    completeText = await chatWithGemini(baseUrl, apiKey, model, contentObj, type);
  } else {
    completeText = await chatWithOpenAIFormat(baseUrl, apiKey, model, contentObj, type);
  }
  return completeText;
}

/**
 * 和OpenAI 入参和返回格式兼容的模型接口处理，包括OpenAI、moonshot、groq
 * @param {string} baseUrl 
 * @param {string} apiKey 
 * @param {string} modelName 
 * @param {string} content 
 * @param {string} type
 */ 
async function chatWithOpenAIFormat(baseUrl, apiKey, modelName, contentObj, type) {
  // 将用户提问更新到对话历史
  dialogueHistory.push({
    "role": "user",
    "content": contentObj.contentForOpenAI
  });
  geminiDialogueHistory.push({
    "role": "user",
    "parts": contentObj.contentForGemini
  });

  // 取最近的 X 条对话记录
  if(dialogueHistory.length > MAX_DIALOG_LEN) {
    dialogueHistory = dialogueHistory.slice(-MAX_DIALOG_LEN);
  }

  let realModelName = modelName.replace(new RegExp(GROQ_MODEL_POSTFIX, 'g'), "");
  realModelName = realModelName.replace(new RegExp(OLLAMA_MODEL_POSTFIX, 'g'), "");
  
  // 模型参数
  const body = {
    model: realModelName,
    temperature: 0.7,
    stream: true,
    messages: dialogueHistory
  }
  let additionalHeaders = {
    'Authorization': 'Bearer ' + apiKey,
  };

  // 特殊处理一下 azure OpenAI的参数
  if(modelName.includes(AZURE_MODEL)) {
    baseUrl = baseUrl.replace('{MODEL_NAME}', realModelName);
    additionalHeaders = {
      'api-key': apiKey,
    };
  }

  const params = createRequestParams(additionalHeaders, body);

  console.log(baseUrl);
  console.log(params);

  let completeText = '';
  try {
    const response = await fetch(baseUrl, params);
    console.log(response);
    if (!response.ok) throw new Error('Network response was not ok.');

    // 解析并显示
    completeText = await parseAndUpdateChatContent(response, modelName, type);

    // 将 AI 回答更新到对话历史
    dialogueHistory.push({
      "role": "assistant",
      "content": completeText
    });
    geminiDialogueHistory.push({
      "role": "model",
      "parts": [{
        "text": completeText
      }]
    });

    return completeText;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Fetch aborted...', completeText, "<<<");
      return completeText;
    } else {
      console.error('Fetch error:', error);
      throw error;
    }
  } finally {
    // do nothing
  }
}

/**
 * 处理gemini api接口请求
 * @param {string} baseUrl 
 * @param {string} apiKey 
 * @param {string} modelName 
 * @param {string} content 
 * @param {string} type
 */
async function chatWithGemini(baseUrl, apiKey, modelName, contentObj, type) {
  baseUrl = baseUrl.replace('{MODEL_NAME}', modelName);
  baseUrl = baseUrl.replace('{API_KEY}', apiKey);

  // 将用户提问更新到对话历史
  geminiDialogueHistory.push({
    "role": "user",
    "parts": contentObj.contentForGemini
  });
  dialogueHistory.push({
    "role": "user",
    "content": contentObj.contentForOpenAI
  });

  // 取最近的 X 条对话记录
  if(geminiDialogueHistory.length > MAX_DIALOG_LEN) {
    geminiDialogueHistory = geminiDialogueHistory.slice(-MAX_DIALOG_LEN);
    console.log("geminiDialogueHistory...", geminiDialogueHistory);
  }
  // 模型参数
  const body = {
    contents: geminiDialogueHistory
  }
  const additionalHeaders = {};
  const params = createRequestParams(additionalHeaders, body);
  console.log(baseUrl);
  console.log(params);

  let completeText = '';
  try {
    const response = await fetch(baseUrl, params);
    console.log(response);
    if (!response.ok) throw new Error('Network response was not ok.');
    
    // 解析并显示
    completeText = await parseAndUpdateChatContent(response, modelName, type);

    // 将 AI 回答更新到对话历史
    geminiDialogueHistory.push({
      "role": "model",
      "parts": [{
        "text": completeText
      }]
    });
    dialogueHistory.push({
      "role": "assistant",
      "content": completeText
    });
    
    return completeText;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Fetch aborted...', completeText, '<<');
      return completeText;
    } else {
      console.error('Fetch error:', error);
      throw error;
    }
  } finally {
    // do nothing
  }
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
    let buffer = '';
    try {
      while (true) {
        const { value, done } = await reader.read();
        // console.log('done..', done);
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
            // console.log('jsonText...', jsonText);
            const jsonData = JSON.parse(jsonText);
            let content = '';
            if(modelName.includes(GEMINI_MODEL)) {
              content = jsonData.candidates[0].content.parts[0].text;
            } else if(modelName.includes(OLLAMA_MODEL)) {
              content = jsonData.message.content;
            } else {
              content = jsonData.choices.map(choice => choice.delta.content).join('');
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

  } else if(type == TRANS_TYPE) {
    // popup
    const translationPopup = document.querySelector('#fisherai-transpop-id');
    translationPopup.style.display = 'block';  
    const button = document.querySelector('#fisherai-button-id');
    button.style.display = 'none';

    // shown
    translationPopup.innerHTML = marked.parse(completeText);
  }
  
}