/**
 * 用 Readability.js 抽取文章正文F
 * @param {string} format 
 * @returns 
 */
function extractContent(format) {
    const article = new Readability(document.cloneNode(true)).parse();
    const title = article.title;
    var content = article.content;
    if(format === FORMAT_TEXT) {
        content = article.textContent;
    } else {
        // 创建临时 div 来解析 HTML 内容
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        
        // 获取 readability-page-1 div 的内部内容
        const readabilityDiv = tempDiv.querySelector('#readability-page-1');
        if (readabilityDiv && readabilityDiv.firstElementChild) {
            content = readabilityDiv.firstElementChild.innerHTML;
        }
    }
    const result = title + "\n\n" + content;
    return result;
}

/**
 * 提取字幕
 * @param {string} url 
 * @returns 
 */
async function extractSubtitles(url, format=FORMAT_SRT) {
    if(url.includes('youtube.com')) {
        return extractYoutubeSubtitles(url, format);
    } else if(url.includes('bilibili.com')) {
        return extractBilibiliSubtitles(url, format);
    }
}

/**
 * 用 Youtube-transcript.js 提取 youtube 视频字幕
 * @returns 
 */
async function extractYoutubeSubtitles(url, format) {
    try {
        const subtitles = await YoutubeTranscript.fetchTranscript(url, {lang: 'en'});
        const formattedSubtitles = youtubeSubtitlesJSONToFormat(subtitles, format);
        return formattedSubtitles;
    } catch (error) {
        console.error('Error fetching subtitles:', error);
        throw new Error('视频字幕获取失败，原因：字幕获取接口暂不可用！');
    }
}

/**
 * 获取bilibili 视频字幕
 * @param {string} paramURL 
 * @returns 
 */
async function extractBilibiliSubtitles(paramURL, format) {
    const url = new URL(paramURL);
    const pathSearchs = {}
    url.search.slice(1).replace(/([^=&]*)=([^=&]*)/g, (matchs, a, b, c) => pathSearchs[a] = b)

    // bvid or aid
    let aidOrBvid = pathSearchs.bvid; // Check watchlater list first
    if (!aidOrBvid) {
        let path = url.pathname;
        if (path.endsWith('/')) {
          path = path.slice(0, -1);
        }
        const paths = path.split('/');
        aidOrBvid = paths[paths.length - 1]; // Get from video path e.g. /video/BVxxxx
      }

    if (!aidOrBvid) {
        throw new Error('无法从URL中提取 BVID 或 AID');
    }

    let aid;
    let cid;
  
    try {
        if (aidOrBvid.toLowerCase().startsWith('bv')) {
            // If it's a bvid, get aid and cid from the view API
            const bvidResponse = await fetch(
                `https://api.bilibili.com/x/web-interface/view?bvid=${aidOrBvid}`,
                { credentials: 'include' } // Removed USER_AGENT
            );
            const bvidData = await bvidResponse.json();
            if (bvidData.code !== 0 || !bvidData.data) {
                throw new Error(`获取视频信息失败: ${bvidData.message || '未知错误'}`);
            }
            aid = bvidData.data.aid;
            // Get cid of the first page
            if (!bvidData.data.pages || bvidData.data.pages.length === 0) {
                 throw new Error('无法获取视频的分P信息');
            }
            cid = bvidData.data.pages[0].cid;

        } else if (aidOrBvid.toLowerCase().startsWith('av')) {
            // If it's an avid, use it directly and get cid from pagelist API
            aid = aidOrBvid.slice(2); // Remove "av" prefix
            const pageListResponse = await fetch(
                `https://api.bilibili.com/x/player/pagelist?aid=${aid}`,
                { credentials: 'include' } // Removed USER_AGENT
            );
            const pageListData = await pageListResponse.json();
            if (pageListData.code !== 0 || !pageListData.data || pageListData.data.length === 0) {
                throw new Error(`获取视频分P列表失败: ${pageListData.message || '未知错误'}`);
            }
            cid = pageListData.data[0].cid; // Get cid of the first page
        } else {
            throw new Error('无法识别的视频ID格式 (非BV或AV号)');
        }

        if (!aid || !cid) {
             throw new Error('未能成功获取视频的 AID 和 CID');
        }

        // Fetch subtitle information using the wbi endpoint
        const subtitleResponse = await fetch(
            `https://api.bilibili.com/x/player/wbi/v2?aid=${aid}&cid=${cid}`,
            { credentials: 'include' } // Removed USER_AGENT
        );
        const subtitleData = await subtitleResponse.json();
        console.log(subtitleData); // Keep for debugging? Or remove?

        if (subtitleData.code !== 0) {
            throw new Error(`视频字幕获取失败，原因： ${subtitleData.message || '接口返回错误'}`);
        }

        if (!subtitleData.data || !subtitleData.data.subtitle) {
             throw new Error('视频字幕获取失败，原因：接口未返回字幕数据');
        }

        // Handle cases where login might be required
        if (subtitleData.data.need_login_subtitle && (!subtitleData.data.subtitle.subtitles || subtitleData.data.subtitle.subtitles.length === 0)) {
            throw new Error('视频字幕获取失败，原因：需要登录才能获取字幕！');
        }

        let subtitleList = subtitleData.data.subtitle.subtitles || [];

        // Filter out subtitles without a valid URL
        subtitleList = subtitleList.filter(sub => sub.subtitle_url && sub.subtitle_url.trim() !== '');

        if (subtitleList.length === 0) {
            throw new Error('视频字幕获取失败，原因：该视频暂未提供有效字幕！');
        }

        let subtitleUrl = subtitleList[0].subtitle_url;
        // Ensure subtitle URL uses https
        if (subtitleUrl.startsWith('//')) {
            subtitleUrl = 'https:' + subtitleUrl;
        } else if (subtitleUrl.startsWith('http://')) {
            subtitleUrl = subtitleUrl.replace('http://', 'https://');
        }

        // Fetch the actual subtitle JSON
        const subtitleJSONResponse = await fetch(
            subtitleUrl // No headers needed for the subtitle content URL generally
        );
        const subtitleJSONData = await subtitleJSONResponse.json();

        if (!subtitleJSONData || !subtitleJSONData.body) {
             throw new Error('获取字幕内容失败，格式无效');
        }

        const formattedSubtitles = bilibiliSubtitlesJSONToFormat(subtitleJSONData, format);
        return formattedSubtitles;

    } catch (error) {
        console.error('extractBilibiliSubtitles error:', error);
        // Re-throw specific user-friendly errors, or a generic one
        if (error.message.startsWith('视频字幕获取失败') || error.message.startsWith('无法') || error.message.startsWith('未能')) {
             throw error;
        }
        throw new Error(`处理B站字幕时出错: ${error.message}`);
    }
}

/**
 * 将字幕文件生成一个srt文件并下载
 * @param {string} subtitles  
 */
function downloadSubtitles(subtitles) {
    const blob = new Blob([subtitles], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // 创建 shadow host
    const shadowHost = document.createElement('div');
    document.body.appendChild(shadowHost);
    
    // 将 shadow root 附加到 host
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

    // 在 Shadow DOM 中创建链接
    const link = document.createElement('a');
    link.href = url;
    link.download = generateTimestamp() + ".srt";
    shadowRoot.appendChild(link);

    // 执行下载
    link.click();

    // 清理
    setTimeout(() => {
        document.body.removeChild(shadowHost);
        URL.revokeObjectURL(url);
    }, 100);
}


/**
 * 将 youtube 视频字幕的 json 格式转成 srt 格式
 * @param {json} subtitles 
 * @returns 
 */
function youtubeSubtitlesJSONToFormat(subtitles, format) {
    return subtitles.map((sub, index) => {
        if(format == FORMAT_SRT) {
            const startTime = formatTime(sub.offset);
            const endTime = formatTime(sub.offset + sub.duration);
    
            return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n`;
        } else if(format == FORMAT_TEXT) {
            return `${sub.text}`;
        }
    }).join('\n');
}

/**
 * 将 bilibili 视频字幕的 json 格式 转为 srt 格式
 * @param {json} subtitles 
 * @returns 
 */
function bilibiliSubtitlesJSONToFormat(subtitles, format) {
    const subtitlesBody = subtitles.body;
    return subtitlesBody.map((sub, index) => {
        if(format == FORMAT_SRT) {
            const startTime = formatTime(sub.from);
            const endTime = formatTime(sub.to);

            return `${index + 1}\n${startTime} --> ${endTime}\n${sub.content}\n`;
        } else if(format == FORMAT_TEXT) {
            return `${sub.content}`;
        }
    }).join('\n');
}
  
function formatTime(seconds) {
    const date = new Date(seconds * 1000);
    const hh = pad(date.getUTCHours());
    const mm = pad(date.getUTCMinutes());
    const ss = pad(date.getUTCSeconds());
    const ms = date.getUTCMilliseconds();

    return `${hh}:${mm}:${ss},${ms.toString().padStart(3, '0')}`;
}
  
function pad(number) {
    return number.toString().padStart(2, '0');
}

function generateTimestamp() {
    const date = new Date();
    return date.getFullYear().toString() +
                      (date.getMonth() + 1).toString().padStart(2, '0') +
                      date.getDate().toString().padStart(2, '0') +
                      '_' +
                      date.getHours().toString().padStart(2, '0') +
                      date.getMinutes().toString().padStart(2, '0') +
                      date.getSeconds().toString().padStart(2, '0');
}


pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('/scripts/third/pdf.worker.min.js');

/**
 * 使用 pdf.js 抽取 PDF 正文
 * @param {string} pdfUrl 
 * @returns 
 */
async function extractPDFText(pdfUrl) {
    try {
        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        const totalPageCount = pdf.numPages;
        let texts = [];

        for (let currentPage = 1; currentPage <= totalPageCount; currentPage++) {
            const page = await pdf.getPage(currentPage);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join('');
            texts.push(pageText);
        }

        return texts.join('');
    } catch (error) {
        console.error("Error extracting text from PDF:", error);
        throw error;  // Optionally rethrow the error
    }
}

/**
 * 根据 url 判断是否访问的是 PDF 文件
 * @param {string} url 
 * @returns 
 */
function isPDFUrl(url) {
    url = url.toLowerCase();
    if(url.endsWith('.pdf')) {
        return true;
    }
    // arxiv 的特殊处理一下，它不是以.pdf后缀结束的
    const pattern = /^https?:\/\/arxiv\.org\/pdf\/\d+\.\d+(v\d+)?$/;
    return pattern.test(url);
}

/**
 * 解析 base64 以获取 mimeType 和 data
 * @param {string} base64String 
 * @returns 
 */
function parseBase64Image(base64String) {
  // 正则表达式用于匹配Base64字符串的格式
  const regex = /^data:(.+);base64,(.*)$/;
  const matches = base64String.match(regex);

  if (matches && matches.length === 3) {
      return {
          mimeType: matches[1],
          data: matches[2]
      };
  } else {
      throw new Error('Invalid Base64 string');
  }
}

// 创建AI回复div
function createAIMessageDiv() {
    const aiContentDiv = document.createElement('div');
    aiContentDiv.className = 'ai-message';
    const contentDiv = document.querySelector('.chat-content');
    contentDiv.appendChild(aiContentDiv);
}

// 展示 loading
function displayLoading(message = 'Thinking ...') {
    const loadingDiv = document.querySelector('.my-extension-loading');
    if (loadingDiv) {
        loadingDiv.textContent = message;
        loadingDiv.style.display = 'flex';
    }
}

// 隐藏 loading
function hiddenLoadding() {
    const loadingDiv = document.querySelector('.my-extension-loading');
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
        loadingDiv.textContent = 'Thinking ...'; // 恢复默认文本
    }
}

// 获取当前时间的函数
function getCurrentTime() {
    const now = new Date();

    // 获取日期
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');

    // 获取时间
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 生成唯一标识
function generateUniqueId() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 24; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}


function editUserMessage(messageDiv, originalText) {
    const textArea = document.createElement('textarea');
    textArea.value = originalText;
    textArea.className = 'edit-message-textarea';
    
    const saveButton = document.createElement('button');
    saveButton.className = 'save-message-btn';
    saveButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
    `;
    
    const cancelButton = document.createElement('button');
    cancelButton.className = 'cancel-message-btn';
    cancelButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    
    messageDiv.innerHTML = '';
    messageDiv.appendChild(textArea);
    messageDiv.appendChild(saveButton);
    messageDiv.appendChild(cancelButton);
    
    saveButton.onclick = () => saveEditedMessage(messageDiv, textArea.value);
    cancelButton.onclick = () => cancelEdit(messageDiv, originalText);
  }
  
  function saveEditedMessage(messageDiv, newText) {
    messageDiv.innerHTML = newText;
    
    // Add edit button back
    const editButton = document.createElement('button');
    editButton.className = 'edit-message-btn';
    editButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    `;
    editButton.onclick = () => editUserMessage(messageDiv, newText);
    messageDiv.appendChild(editButton);
    
    // Remove all subsequent messages
    let nextElement = messageDiv.nextElementSibling;
    while (nextElement) {
      const elementToRemove = nextElement;
      nextElement = nextElement.nextElementSibling;
      elementToRemove.remove();
    }
    
    // Trigger new AI response
    const modelSelection = document.getElementById('model-selection');
    chatLLMAndUIUpdate(modelSelection.value, newText, []);
  }
  
  function cancelEdit(messageDiv, originalText) {
    messageDiv.innerHTML = originalText;
    
    // Add edit button back
    const editButton = document.createElement('button');
    editButton.className = 'edit-message-btn';
    editButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    `;
    editButton.onclick = () => editUserMessage(messageDiv, originalText);
    messageDiv.appendChild(editButton);
}

/**
 * Generate FisherAI authentication headers
 * @param {string} apiKey - The FisherAI API key
 * @param {string} apiSecret - The FisherAI API secret
 * @param {object} body - The request body
 * @returns {object} - Headers object with authentication
 */
function generateFisherAIHeaders(apiKey, apiSecret, body) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const bodyStr = JSON.stringify(body);
    const messageToSign = `${apiKey}${timestamp}${bodyStr}`;
    
    // Generate HMAC SHA-256 signature
    const encoder = new TextEncoder();
    const key = encoder.encode(apiSecret);
    const message = encoder.encode(messageToSign);
    
    return crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    ).then(key => {
        return crypto.subtle.sign(
            'HMAC',
            key,
            message
        );
    }).then(signature => {
        const hashArray = Array.from(new Uint8Array(signature));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        return {
            'X-API-Key': apiKey,
            'X-Timestamp': timestamp,
            'X-Signature': hashHex,
            'Content-Type': 'application/json'
        };
    });
}


// 从存储中获取当前语言设置并返回格式化后的 SYSTEM_PROMPT
async function getTargetLanguage() {
    try {
      // 从 Chrome 存储中获取语言设置
      const result = await chrome.storage.local.get('language');
      return result.language || 'zh-CN'; // 默认使用中文
    } catch (error) {
      console.error('获取语言设置失败:', error);
      // 出错时使用默认的中文
      return 'zh-CN';
    }
}


async function getTranslatePrompt() {
    try {
      // 从 Chrome 存储中获取语言设置
      const result = await chrome.storage.local.get('language');
      const language = result.language || 'zh-CN'; // 默认使用中文
      
      // 返回替换了语言占位符的 prompt
      return DIRECT_TRANSLATE_PROMPT.replace(/{language}/g, language);
    } catch (error) {
      console.error('获取语言设置失败:', error);
      // 出错时使用默认的中文
      return DIRECT_TRANSLATE_PROMPT.replace(/{language}/g, '中文');
    }
}


async function getSubTitleTransPrompt() {
    try {
      // 从 Chrome 存储中获取语言设置
      const result = await chrome.storage.local.get('language');
      const language = result.language || 'zh-CN'; // 默认使用中文
      
      // 返回替换了语言占位符的 prompt
      return SUBTITLE_TRANSLATE_PROMPT.replace(/{language}/g, language);
    } catch (error) {
      console.error('获取语言设置失败:', error);
      // 出错时使用默认的中文
      return SUBTITLE_TRANSLATE_PROMPT.replace(/{language}/g, '中文');
    }
}

async function getDictionPrompt() {
    try {
      // 从 Chrome 存储中获取语言设置
      const result = await chrome.storage.local.get('language');
      const language = result.language || 'zh-CN'; // 默认使用中文
      
      // 返回替换了语言占位符的 prompt
      return DICTION_PROMPT.replace(/{language}/g, language);
    } catch (error) {
      console.error('获取语言设置失败:', error);
      // 出错时使用默认的中文
      return DICTION_PROMPT.replace(/{language}/g, '中文');
    }
}

async function getThreeStepsTransPrompt() {
    try {
      // 从 Chrome 存储中获取语言设置
      const result = await chrome.storage.local.get('language');
      const language = result.language || 'zh-CN'; // 默认使用中文
      
      // 返回替换了语言占位符的 prompt
      return THREE_STEPS_TRANSLATION_PROMPT.replace(/{language}/g, language);
    } catch (error) {
      console.error('获取语言设置失败:', error);
      // 出错时使用默认的中文
      return THREE_STEPS_TRANSLATION_PROMPT.replace(/{language}/g, '中文');
    }
}

/**
 * 获取启用的提供商列表和过滤后的模型列表
 * @param {Function} callback 在获取到启用的提供商列表后调用的回调函数
 */
async function getEnabledModels(callback) {
  // 获取所有提供商
  const providers = DEFAULT_LLM_URLS.map(provider => provider.key);
  const providerStates = {};
  const providerCustomModels = {};
  
  // 异步获取所有提供商的启用状态和自定义模型列表
  await Promise.all(providers.map(provider => {
    return new Promise(resolve => {
      chrome.storage.sync.get([`${provider}-enabled`, `${provider}-models`], (result) => {
        // 如果没有保存过状态，使用 DEFAULT_LLM_URLS 中的默认值
        if (result[`${provider}-enabled`] !== undefined) {
          providerStates[provider] = result[`${provider}-enabled`];
        } else {
          // 从 DEFAULT_LLM_URLS 中查找该提供商的默认启用状态
          const providerConfig = DEFAULT_LLM_URLS.find(p => p.key === provider);
          providerStates[provider] = providerConfig ? providerConfig.enabled : true;
        }
        
        // 保存该提供商的自定义模型列表（如果有）
        providerCustomModels[provider] = result[`${provider}-models`] || [];
        
        resolve();
      });
    });
  }));
  
  // 根据启用状态过滤免费模型和自定义配置模型
  const filteredFreeModels = MODEL_LIST.free_models.filter(model => {
    const provider = model.provider;
    // 对于 fisherai 提供商特殊处理
    const isEnabled = provider === PROVIDER_FISHERAI ? 
      (providerStates[provider] !== undefined ? providerStates[provider] : true) : 
      providerStates[provider];
    
    // 调试 - 打印模型过滤结果
    if (!isEnabled) {
      console.log(`Filtered out free model: ${model.display} (${model.provider})`);
    }
    
    return isEnabled;
  });
  
  // 构建自定义配置模型列表（包含默认模型和用户自定义模型）
  let customConfigModels = [];
  
  // 先处理默认的自定义配置模型
  const defaultCustomModels = MODEL_LIST.custom_config_models.filter(model => {
    return providerStates[model.provider];
  });
  
  // 然后处理用户自定义的模型
  const userCustomModels = [];
  providers.forEach(provider => {
    if (providerStates[provider] && providerCustomModels[provider].length > 0) {
      providerCustomModels[provider].forEach(modelName => {
        userCustomModels.push({
          value: modelName,
          display: modelName,
          provider: provider
        });
      });
    }
  });
  
  // 如果提供商有自定义模型，使用自定义模型；否则使用默认模型
  providers.forEach(provider => {
    if (providerStates[provider]) {
      if (providerCustomModels[provider].length > 0) {
        // 该提供商有自定义模型，使用自定义模型
        const providerModels = userCustomModels.filter(model => model.provider === provider);
        customConfigModels = customConfigModels.concat(providerModels);
      } else {
        // 该提供商没有自定义模型，使用默认模型
        const providerModels = defaultCustomModels.filter(model => model.provider === provider);
        customConfigModels = customConfigModels.concat(providerModels);
      }
    }
  });
  
  // 启用的提供商列表
  const enabledProviders = providers.filter(provider => providerStates[provider]);
  
  // 调用回调函数，传递所有相关数据
  if (typeof callback === 'function') {
    callback({
      enabledProviders,
      providerStates,
      providerCustomModels,
      filteredFreeModels,
      filteredCustomConfigModels: customConfigModels
    });
  }
}




