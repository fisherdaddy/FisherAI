// 监听获取正文请求
chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
    if (request.action === ACTION_FETCH_PAGE_CONTENT) {
      // 获取网页html
      sendResponse({content: extractContent() || "No content"});
    } else if (request.action === ACTION_FETCH_TEXT_CONTENT) {
      // 获取网页文本
      sendResponse({content: extractContent(FORMAT_TEXT) || "No content"});
    } else if(request.action === ACTION_COPY_PAGE_CONTENT) {
      // 网页html到剪切板
      const content = extractContent();
      navigator.clipboard.writeText(content).then(() => {
        sendResponse({success: true});
      }).catch(err => {
        sendResponse({success: false, error: err});
      });
    } else if(request.action === ACTION_COPY_PURE_PAGE_CONTENT) {
       // 网页文本到剪切板
      const content = extractContent(FORMAT_TEXT);
      navigator.clipboard.writeText(content).then(() => {
        sendResponse({success: true});
      }).catch(err => {
        sendResponse({success: false, error: err});
      });
    } else if(request.action === ACTION_DOWNLOAD_SUBTITLES) {
      // 下载字幕文件
      const subtitles = await extractSubtitles(window.location.href);
      downloadSubtitles(subtitles);
    } else if(request.action === ACTION_GET_PAGE_URL) {
      // 获取当前网页地址
      sendResponse({url: window.location.href});
    }
});

const QUICK_TRANS = "quick-trans";

// 是否开启快捷翻译
chrome.storage.sync.get(QUICK_TRANS, function(config) {
  const enabled = config[QUICK_TRANS].enabled;
  if(enabled == false) {
    return;
  }
  // 创建按钮元素
  const button = document.createElement('button');
  if(button) {
    button.id = 'fisherai-button-id';
    button.style.display = 'none';
    button.style.position = 'absolute';
    button.style.zIndex = '999999';
    button.style.border = 'none';
    button.style.background = 'none';
  }

  // 创建一个图像元素，并设置为按钮的内容
  const image = document.createElement('img');
  if(image) {
    image.src = chrome.runtime.getURL('images/logo_48.png');
    image.style.width = '20px'; 
    image.style.height = '20px';
  }

  // 创建翻译结果浮窗元素
  const translationPopup = document.createElement('div');
  if(translationPopup) {
    translationPopup.id = 'fisherai-transpop-id';
    translationPopup.style.display = 'none';
    translationPopup.style.position = 'absolute';
    translationPopup.style.zIndex = '9999';
    translationPopup.style.backgroundColor = '#111827';
    translationPopup.style.color = 'white';
    translationPopup.style.padding = '10px';
    translationPopup.style.borderRadius = '8px';
    translationPopup.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    translationPopup.style.maxWidth = '300px';
    translationPopup.style.maxHeight = '300px';
    translationPopup.style.overflowY = 'auto';
    document.body.appendChild(translationPopup);
  }

  if(button) {
    button.appendChild(image);
    document.body.appendChild(button);
    // 监听按钮点击事件
    button.addEventListener('click', function () {
      chrome.storage.sync.get([QUICK_TRANS], async function(config) {
        translationPopup.innerHTML = '';
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const rects = range.getClientRects();
        let minX = Infinity;
        let maxX = -Infinity;

        // 遍历每一个矩形，更新最左和最右的边界
        for (const rect of rects) {
          minX = Math.min(minX, rect.left);
          maxX = Math.max(maxX, rect.right);
        }

        // 计算X坐标的中间位置
        const middleX = (minX + maxX) / 2;

        // 使用最后一个矩形（即最后一行）的bottom属性作为Y坐标
        const lastRect = rects[rects.length - 1];
        const topY = lastRect.bottom + window.scrollY;

        // 设置翻译结果弹出框的位置和显示状态
        translationPopup.style.top = `${topY}px`;
        translationPopup.style.left = `${middleX + window.scrollX}px`;

        translationPopup.style.display = 'block';
        button.style.display = 'none';

        const selectedText = window.getSelection().toString().trim();
        if (selectedText == '') {
          return;
        }

        try {
          let model = config[QUICK_TRANS].selectedModel;
          if (!model) {
            return;
          }
          const {baseUrl, apiKey} = await getBaseUrlAndApiKey(model);
          if(baseUrl && apiKey) {
            chatWithLLM(model, TRANSLATE2CHN_PROMPT + selectedText, null, HUACI_TRANS_TYPE); 
          } else {
            translationPopup.innerHTML = DEFAULT_TIPS;
          }
        } catch (error) {
          console.error('Error retrieving model or API information:', error);
          translationPopup.innerHTML = DEFAULT_TIPS;
        }

        translationPopup.style.display = 'block';
        button.style.display = 'none';
      });

    }); 
  }

  // 监听选中事件
  document.addEventListener('mouseup', function (event) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    // 当用户选中了文本
    if (selectedText) {
      const rects = selection.getRangeAt(0).getClientRects();
      if (rects.length > 0) {
        const rect = rects[0];
        button.style.top = `${rect.bottom + window.scrollY + 10}px`;
        button.style.left = `${rect.left + window.scrollX + 10}px`;
        button.style.display = 'block';
      }
    } else {
      // 没有选中文本，隐藏按钮和弹窗
      button.style.display = 'none';
      translationPopup.style.display = 'none';
    }
  });

  document.addEventListener('mousedown', function (event) {
    // 获取选中文本
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // 如果点击的是编辑器的按钮或选中了文本，则不清除选区
    if (event.target.tagName !== 'BUTTON' && selectedText === '') { 
      if (event.target !== button && !button.contains(event.target) &&
          event.target !== translationPopup && !translationPopup.contains(event.target)) {
        if (selection) {
          selection.removeAllRanges(); // 清除选中区域
        }
        button.style.display = 'none';
        translationPopup.style.display = 'none';
      }
    }
  });
});

