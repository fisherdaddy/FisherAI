/**
 * 初始化国际化支持
 */
async function initI18n() {
  // 初始化页面的国际化
  const currentLang = await window.i18n.init();
  
  // 更新动态文本（那些不是通过data-i18n属性设置的文本）
  updateDynamicTexts(currentLang);
  
  // 设置语言选择器的当前值
  const languageSelector = document.getElementById('language-selector');
  if (languageSelector) {
    languageSelector.value = currentLang;
    
    // 添加语言切换事件监听
    languageSelector.addEventListener('change', async function() {
      const newLang = this.value;
      await window.i18n.setLanguage(newLang);
      await window.i18n.init(); // 重新初始化页面文本
      updateDynamicTexts(newLang);
      
      // 刷新页面 - 可选，如果需要完全重新加载
      // location.reload();
    });
  }
}

/**
 * 更新动态文本（那些不通过data-i18n属性设置的文本）
 */
async function updateDynamicTexts(lang) {
  // 获取常量文本的翻译
  const messages = await window.i18n.getMessages([
    'free_models',
    'custom_config_models',
    'ollama_local_models'
  ], lang);
  
  // 更新模型选择下拉框的 optgroup 标签
  const modelSelect = document.getElementById('model-select');
  if (modelSelect) {
    const optgroups = modelSelect.querySelectorAll('optgroup');
    if (optgroups.length >= 3) {
      // 按索引更新不同类型的模型组标签
      optgroups[0].label = messages.free_models || '免费模型';
      optgroups[1].label = messages.custom_config_models || '自定义配置模型';
      optgroups[2].label = messages.ollama_local_models || 'Ollama本地模型';
    }
  }
}

function storeParams(tabName, param1, param2, saveMessage) {
  let modelInfo = {};
  if(tabName == 'quick-trans') {
    modelInfo[tabName] = {
      enabled: param1,
      selectedModel: param2
    };
  } else {
    modelInfo[tabName] = {
      baseUrl: param1,
      apiKey: param2
    };
  }

  chrome.storage.sync.set(modelInfo, function() {
    // 获取全局浮动通知元素
    const globalSaveMessage = document.querySelector('.auto-save-message');
    
    // 检查是否是自动保存消息（划词翻译模块）
    if (tabName == 'quick-trans' && globalSaveMessage) {
      // 为自动保存显示提供平滑的淡入淡出动画
      globalSaveMessage.style.display = 'block';
      // 给浏览器一点时间来应用display变化
      setTimeout(() => {
        globalSaveMessage.style.opacity = '1';
        // 显示2秒后开始淡出
        setTimeout(() => {
          // 淡出并向下移动
          globalSaveMessage.style.opacity = '0';
          globalSaveMessage.style.transform = 'translateX(-50%)';
          // 等待淡出动画完成后隐藏
          setTimeout(() => {
            globalSaveMessage.style.display = 'none';
          }, 300); // 等待淡出动画完成
        }, 2000); // 显示2秒
      }, 10); // 短暂延迟以确保CSS过渡生效
    } else if (saveMessage) {
      // 原有的显示方式，针对非自动保存的消息
      setTimeout(() => {
        saveMessage.style.display = 'block';
        setTimeout(() => {
          saveMessage.style.display = 'none';
        }, 1000);
      }, 1000);
    }
  });
}

function openTab(evt, tabName) {
  // 隐藏所有tab content
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(function(content) {
      content.style.display = 'none';
  });

  // 激活当前tab content
  const tablinks = document.getElementsByClassName("tab-link");
  for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  const activeTabContent = document.getElementById(tabName);
  activeTabContent.style.display = "block";
  evt.currentTarget.className += " active";

  // 从Chrome存储获取API key
  chrome.storage.sync.get(tabName, function(result) {
    const modelInfo = result[tabName];
    if (modelInfo) {
      const apiKey = modelInfo.apiKey;
      if(apiKey) {
        const apiKeyInput = activeTabContent.querySelector('.api-key-input');
        apiKeyInput.value = apiKey; 
      }
      const baseUrl = modelInfo.baseUrl;
      if(baseUrl) {
        const baseUrlInput = activeTabContent.querySelector('.baseurl-input');
        baseUrlInput.value = baseUrl;
      }
      const enabled = modelInfo.enabled;
      if(enabled) {
        const toggleSwitch = document.getElementById('quickTransToggle');
        toggleSwitch.checked = enabled;
      }
      const selectedModel = modelInfo.selectedModel;
      if(selectedModel) {
        const modelSelection = document.querySelector('#model-select');
        modelSelection.value = selectedModel;
      }
    }
  });

}

function togglePasswordVisibility(button) {
  var input = button.previousElementSibling;
  var eye = button.querySelector('.bi-eye');
  var eyeSlash = button.querySelector('.bi-eye-slash');

  if (input.type === 'password') {
      input.type = 'text';
      eye.style.display = 'block';
      eyeSlash.style.display = 'none';
  } else {
      input.type = 'password';
      eye.style.display = 'none';
      eyeSlash.style.display = 'block';
  }
}


/**
 * 获取模型基础信息，以便于检查模型接口配置的可用性
 * @param {string} baseUrl 
 * @param {string} model 
 * @param {string} apiKey 
 * @returns 
 */
function getModelBaseParamForCheck(baseUrl, model, apiKey) {
  let body = '';
  for (const { key, defaultBaseUrl, apiPath, defaultModel } of DEFAULT_LLM_URLS) {
    if (model.includes(key)) {
      let apiUrl = baseUrl || defaultBaseUrl;
      apiUrl += apiPath;

      if(model.includes(GEMINI_MODEL)) {
        apiUrl = apiUrl.replace('{MODEL_NAME}', defaultModel).replace('{API_KEY}', apiKey);
        
        body = JSON.stringify({
          contents: [{
            "role": "user",
            "parts": [{
              "text": "hi"
            }]
          }]
        });
      } else if(model.includes(AZURE_MODEL)) {
        apiUrl = apiUrl.replace('{MODEL_NAME}', defaultModel);
        body = JSON.stringify({
          stream: true,
          messages: [
            {
              "role": "user",
              "content": "hi"
            }
          ]
        });
      } else if(model.includes(OLLAMA_MODEL)) {
        apiUrl = baseUrl || defaultBaseUrl;
        apiUrl += OLLAMA_LIST_MODEL_PATH;
      } else {
        body = JSON.stringify({
          model: defaultModel,
          stream: true,
          messages: [
            {
              "role": "user",
              "content": "hi"
            }
          ]
        });
      }

      return {apiUrl, body};
    }
  }
}

function getToolsParamForCheck(baseUrl, model, apiKey) {
  let body = '';
  for (const { key, defaultBaseUrl, apiPath, defaultModel } of DEFAULT_TOOL_URLS) {
    if(model.includes(key)) {
      let apiUrl = baseUrl || defaultBaseUrl;
      apiUrl += apiPath;

      if(model.includes(SERPAPI_KEY)) {
        apiUrl = apiUrl.replace('{API_KEY}', apiKey).replace('{QUERY}', 'apple');
      } else if(model.includes(DALLE_KEY)) {
        body = JSON.stringify({
          model: defaultModel,
          prompt: "A cute baby sea otter",
          n: 1,
          size: "1024x1024"
        });
      }

      return {apiUrl, body};
    }
  }
}

/**
 * 用于连通性测试
 * @param {string} baseUrl 
 * @param {string} apiKey 
 * @param {string} model 
 * @param {object} resultElement 
 */
function checkAPIAvailable(baseUrl, apiKey, model, resultElement) {

  var apiUrl, body;

  // 为了复用该函数，这里做一些trick
  if (model.includes(TOOL_KEY)) {
    ({ apiUrl, body } = getToolsParamForCheck(baseUrl, model, apiKey));
  } else {
    ({ apiUrl, body } = getModelBaseParamForCheck(baseUrl, model, apiKey));
  }
  
  
  const headers = {
    'Content-Type': 'application/json'
  };

  if (model.includes(AZURE_MODEL)) {
    headers['api-key'] = apiKey;
  } else if(!model.includes(GEMINI_MODEL)) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  let params = {
    method: "POST",
    headers: headers,
    body: body
  };

  if(model.includes(OLLAMA_MODEL) || model.includes(SERPAPI_KEY)) {
    params = {
      method: "GET"
    }
  }

  fetch(apiUrl, params)
  .then(response => {
      if (response.ok) {
        resultElement.textContent = '检查通过';
        setTimeout(() => {
          resultElement.style.display = "block";
          setTimeout(() => {
            resultElement.style.display = 'none';
          }, 1000);
        }, 1000);
      } else {
          throw new Error('API 请求失败，状态码：' + response.status);
      }
  })
  .catch(error => {
      resultElement.textContent = '检查未通过';
      setTimeout(() => {
        resultElement.style.display = "block";
        setTimeout(() => {
          resultElement.style.display = 'none';
        }, 1000);
      }, 1000);
  });
}

/**
 * 加载Ollama模型到快捷翻译的选项中
 */
function loadOllamaModelsForQuickTrans() {
  // 首先检查 Ollama 提供商是否启用
  chrome.storage.sync.get('ollama-enabled', (enabledResult) => {
    // 如果没有保存过状态，默认为启用
    const isEnabled = enabledResult['ollama-enabled'] !== undefined ? enabledResult['ollama-enabled'] : true;
    
    // 如果提供商被禁用，直接返回
    if (!isEnabled) {
      return;
    }
    
    // 使用默认的 OLLAMA_BASE_URL
    const baseUrl = OLLAMA_BASE_URL;
    const apiUrl = baseUrl + OLLAMA_LIST_MODEL_PATH;
    
    fetch(apiUrl)
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error('Network response was not ok.');
        }
      })
      .then(data => {
        const models = data.models;
        const customModelsGroup = document.getElementById('ollama-models-quicktrans');
        if (customModelsGroup) {
          // 清空现有选项，避免重复添加
          while (customModelsGroup.firstChild) {
            customModelsGroup.removeChild(customModelsGroup.firstChild);
          }
          
          // 添加新选项
          models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.model + OLLAMA_MODEL_POSTFIX;
            option.textContent = model.name;
            customModelsGroup.appendChild(option);
          });
        }
      })
      .catch(error => {
        console.error('Failed to load Ollama models:', error);
      });
  });
}

/**
 * 主程序
 */
document.addEventListener('DOMContentLoaded', function() {
  // 初始化国际化
  initI18n().then(() => {
    // 为所有模型供应商创建编辑界面
    createModelEditorForProviders();
    
    // 填充模型选择下拉框
    populateModelSelections();
    
    // 加载Ollama模型
    loadOllamaModelsForQuickTrans();
    
    // 加载划词翻译设置
    loadQuickTransSettings();
    
    // 设置标签切换事件
    setupTabNavigation();
    
    // 设置密码显示/隐藏切换
    setupPasswordToggles();
    
    // 设置保存按钮事件
    setupSaveButtons();
    
    // 设置API检查按钮事件
    setupCheckApiButtons();
    
    // 设置折叠菜单事件
    setupCollapsibleMenus();
    
    // 设置模型列表自定义功能
    setupModelCustomization();
    
    // 初始化供应商开关状态
    initProviderToggles();
  });
});

// 使用常量中定义的模型列表填充模型选择下拉框
function populateModelSelections() {
  const modelSelect = document.getElementById('model-select');
  if (!modelSelect) return;
  
  // 清空现有的选项，保留optgroup结构
  const optgroups = modelSelect.querySelectorAll('optgroup');
  const freeModelsGroup = optgroups[0];
  const customModelsGroup = optgroups[1];
  
  // 清空现有选项
  while (freeModelsGroup.firstChild) {
    freeModelsGroup.removeChild(freeModelsGroup.firstChild);
  }
  
  while (customModelsGroup.firstChild) {
    customModelsGroup.removeChild(customModelsGroup.firstChild);
  }
  
  // 添加免费模型
  MODEL_LIST.free_models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.value;
    option.textContent = model.display;
    freeModelsGroup.appendChild(option);
  });
  
  // 添加自定义配置模型
  MODEL_LIST.custom_config_models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.value;
    option.textContent = model.display;
    customModelsGroup.appendChild(option);
  });
}

// 设置标签切换事件
function setupTabNavigation() {
  var tabLinks = document.querySelectorAll('.tab-link');
  tabLinks.forEach(function(link) {
    link.addEventListener('click', function(event) {
      var tabName = this.getAttribute('data-tab');
      openTab(event, tabName);
    });
  });
}

// 设置密码显示/隐藏切换
function setupPasswordToggles() {
  var toggleButtons = document.querySelectorAll('.toggle-password');
  toggleButtons.forEach(function(button) {
    button.addEventListener('click', function() {
      togglePasswordVisibility(this);
    });
  });
}

// 设置保存按钮事件
function setupSaveButtons() {
  const saveButtons = document.querySelectorAll('.save-button');
  saveButtons.forEach(button => {
    button.addEventListener('click', function() {
      const tabContent = this.closest('.tab-content');
      const tabId = tabContent.id;
      const baseUrlInput = tabContent.querySelector('.baseurl-input');
      const baseUrl = baseUrlInput.value.trim();
      
      // 如果是 Ollama 提供商，只保存 base URL
      if (tabId === 'ollama') {
        chrome.storage.sync.set({
          [OLLAMA_MODEL]: {
            baseUrl: baseUrl
          }
        }, function() {
          // 显示保存成功消息
          const saveMessage = tabContent.querySelector('.save-message');
          saveMessage.style.display = 'block';
          setTimeout(() => {
            saveMessage.style.display = 'none';
          }, 2000);
        });
        return;
      }
      
      // 其他提供商的保存逻辑保持不变
      // 获取api key
      var input = tabContent.querySelector('.api-key-input');
      var apiKey = ''; 
      if(input) {
        apiKey = input.value;
      }

      // 保存KV & 显示保存成功
      storeParams(tabId, baseUrl, apiKey, null);
    });
  });
  
  // 设置划词翻译的自动保存功能
  const toggleSwitch = document.getElementById('quickTransToggle');
  const modelSelection = document.querySelector('#model-select');
  
  if (toggleSwitch) {
    toggleSwitch.addEventListener('change', function() {
      // 获取开关状态和模型选择
      const enabled = toggleSwitch.checked;
      const selectedModel = modelSelection.value;
      
      // 自动保存设置
      storeParams('quick-trans', enabled, selectedModel, null);
    });
  }
  
  if (modelSelection) {
    modelSelection.addEventListener('change', function() {
      // 获取开关状态和模型选择
      const enabled = toggleSwitch.checked;
      const selectedModel = modelSelection.value;
      
      // 自动保存设置
      storeParams('quick-trans', enabled, selectedModel, null);
    });
  }
}

// 设置API检查按钮事件
function setupCheckApiButtons() {
  let checkApiBtn = document.querySelectorAll('.checkapi-button');
  checkApiBtn.forEach(function(button) {
    button.addEventListener('click', function() {
      // 获取外层div的ID
      var tabContent = this.closest('.tab-content');
      var tabId = tabContent.id;

      const resultElement = tabContent.querySelector('.checkapi-message');
      
      // 获取api key
      var input = tabContent.querySelector('.api-key-input');
      var apiKey = '';
      if(input) {
        apiKey = input.value;
      }

      // api 代理地址
      var baseUrlInput = tabContent.querySelector('.baseurl-input');
      var baseUrl = baseUrlInput.value || baseUrlInput.getAttribute("placeholder");

      checkAPIAvailable(baseUrl, apiKey, tabId, resultElement);
    });
  });
}

// 设置折叠菜单事件
function setupCollapsibleMenus() {
  document.querySelectorAll('.collapsible').forEach(button => {
    button.addEventListener('click', () => {
      button.classList.toggle('active');
      const content = button.nextElementSibling;
      content.style.display = content.style.display === 'flex' ? 'none' : 'flex';
    });
  });
}

// 加载划词翻译设置
function loadQuickTransSettings() {
  chrome.storage.sync.get('quick-trans', function(result) {
    const quickTransInfo = result['quick-trans'];
    if (quickTransInfo) {
      // 设置开关状态
      const toggleSwitch = document.getElementById('quickTransToggle');
      if (toggleSwitch && quickTransInfo.enabled !== undefined) {
        toggleSwitch.checked = quickTransInfo.enabled;
      }
      
      // 设置选中的模型
      const modelSelection = document.querySelector('#model-select');
      if (modelSelection && quickTransInfo.selectedModel) {
        // 检查是否有这个选项
        let optionExists = false;
        for (let i = 0; i < modelSelection.options.length; i++) {
          if (modelSelection.options[i].value === quickTransInfo.selectedModel) {
            optionExists = true;
            modelSelection.selectedIndex = i;
            break;
          }
        }
        
        // 如果没有找到匹配的选项，可能是Ollama模型还没加载
        // 设置一个定时器，稍后再尝试设置
        if (!optionExists && quickTransInfo.selectedModel.includes('ollama')) {
          setTimeout(() => {
            for (let i = 0; i < modelSelection.options.length; i++) {
              if (modelSelection.options[i].value === quickTransInfo.selectedModel) {
                modelSelection.selectedIndex = i;
                break;
              }
            }
          }, 1000); // 1秒后再次尝试
        }
      }
    }
  });
}

// 处理模型列表自定义功能的代码
function setupModelCustomization() {
  // 支持多个模型供应商标签
  const modelTabs = ['gpt', 'gemini', 'deepseek', 'moonshot', 'yi', 'glm', 'groq', 'open-mixtral', 'ollama', 'azure'];
  
  modelTabs.forEach(tabId => {
    // 检查是否存在编辑按钮和模态框
    const editBtn = document.getElementById(`${tabId}-edit-models`);
    if (!editBtn) return; // 如果该模型供应商尚未实现编辑功能，跳过
    
    const modal = document.getElementById(`${tabId}-model-modal`);
    if (!modal) return;
    
    const closeBtn = modal.querySelector('.close-modal');
    const modelList = document.getElementById(`${tabId}-model-list`);
    const modelEditList = document.getElementById(`${tabId}-model-edit-list`);
    const addModelBtn = document.getElementById(`${tabId}-add-model`);
    const saveModelsBtn = document.getElementById(`${tabId}-save-models`);
    const newModelInput = document.getElementById(`${tabId}-new-model-name`);
    
    if (!modelList || !modelEditList) return;
    
    // 加载保存的模型列表
    loadModelList(tabId, modelList);
    
    // 打开模态框
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        populateModelEditList(tabId, modelEditList);
        modal.classList.add('active');
      });
    }
    
    // 关闭模态框
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }
    
    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
    
    // 添加新模型
    if (addModelBtn && newModelInput) {
      addModelBtn.addEventListener('click', () => {
        const modelName = newModelInput.value.trim();
        if (modelName) {
          addModelToEditList(tabId, modelEditList, modelName);
          newModelInput.value = '';
        }
      });
      
      // 按回车添加
      newModelInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          const modelName = newModelInput.value.trim();
          if (modelName) {
            addModelToEditList(tabId, modelEditList, modelName);
            newModelInput.value = '';
          }
        }
      });
    }
    
    // 保存模型列表
    if (saveModelsBtn) {
      saveModelsBtn.addEventListener('click', () => {
        saveModelList(tabId, modelList, modelEditList);
        modal.classList.remove('active');
      });
    }
  });
}

// 加载保存的模型列表
function loadModelList(tabId, modelListElement) {
  chrome.storage.sync.get(`${tabId}-models`, (result) => {
    const models = result[`${tabId}-models`];
    if (models && Array.isArray(models) && models.length > 0) {
      // 清空默认模型
      modelListElement.innerHTML = '';
      
      // 添加保存的模型
      models.forEach(model => {
        const modelItem = document.createElement('div');
        modelItem.className = 'model-item';
        modelItem.textContent = model;
        modelListElement.appendChild(modelItem);
      });
    }
  });
}

// 获取默认模型列表
function getDefaultModels(tabId) {
  // 这里可以根据不同的模型供应商返回不同的默认模型
  const defaultModels = {
    'gpt': ['gpt-4o-mini', 'gpt-4o', 'chatgpt-4o-latest'],
    'gemini': ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest', 'gemini-2.0-flash-exp', 'gemini-2.0-flash-thinking-exp', 'gemini-exp-1206'],
    'deepseek': ['deepseek-chat-v3', 'deepseek-resonser'],
    'moonshot': ['moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-32k-vision-preview'],
    'yi': ['yi-lightning', 'yi-vision-v2'],
    'glm': ['GLM-4', 'GLM-4V', 'GLM-3-Turbo'],
    'groq': ['llama3-70b-8192'],
    'open-mixtral': ['open-mixtral-8x22b'],
    'azure': ['azure-gpt-35-turbo', 'azure-gpt-4-turbo', 'azure-gpt-4o']
    // Ollama模型是从本地服务加载的，不需要默认模型
  };
  
  return defaultModels[tabId] || [];
}

// 填充模型编辑列表
function populateModelEditList(tabId, modelEditListElement) {
  // 清空编辑列表
  modelEditListElement.innerHTML = '';
  
  // 获取当前模型
  chrome.storage.sync.get(`${tabId}-models`, (result) => {
    const models = result[`${tabId}-models`];
    
    // 如果有保存的模型，使用它们
    if (models && Array.isArray(models) && models.length > 0) {
      models.forEach(model => {
        addModelToEditList(tabId, modelEditListElement, model);
      });
    } else {
      // 否则，使用默认模型
      const defaultModels = getDefaultModels(tabId);
      
      // 如果默认模型仍为空，尝试从显示列表中获取
      if (defaultModels.length === 0) {
        const modelListElement = document.getElementById(`${tabId}-model-list`);
        if (modelListElement) {
          const displayedModels = Array.from(modelListElement.querySelectorAll('.model-item'))
            .map(item => item.textContent.trim())
            .filter(text => text.length > 0);
          
          if (displayedModels.length > 0) {
            displayedModels.forEach(model => {
              addModelToEditList(tabId, modelEditListElement, model);
            });
            return;
          }
        }
      }
      
      defaultModels.forEach(model => {
        addModelToEditList(tabId, modelEditListElement, model);
      });
    }
  });
}

// 添加模型到编辑列表
function addModelToEditList(tabId, modelEditListElement, modelName) {
  const modelEditItem = document.createElement('div');
  modelEditItem.className = 'model-edit-item';
  modelEditItem.draggable = true; // 添加拖拽功能
  
  // 添加拖拽图标
  const dragHandle = document.createElement('div');
  dragHandle.className = 'drag-handle';
  dragHandle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="12" x2="16" y2="12"></line><line x1="8" y1="18" x2="16" y2="18"></line></svg>';
  
  const modelNameSpan = document.createElement('span');
  modelNameSpan.className = 'model-edit-item-name';
  modelNameSpan.textContent = modelName;
  
  const actionContainer = document.createElement('div');
  actionContainer.className = 'model-edit-actions';
  
  // 删除按钮
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-model-btn';
  deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
  deleteBtn.title = '删除';
  deleteBtn.addEventListener('click', () => {
    modelEditItem.remove();
  });
  
  // 添加拖拽事件监听
  modelEditItem.addEventListener('dragstart', handleDragStart);
  modelEditItem.addEventListener('dragover', handleDragOver);
  modelEditItem.addEventListener('dragenter', handleDragEnter);
  modelEditItem.addEventListener('dragleave', handleDragLeave);
  modelEditItem.addEventListener('drop', handleDrop);
  modelEditItem.addEventListener('dragend', handleDragEnd);
  
  // 添加按钮到动作容器
  actionContainer.appendChild(deleteBtn);
  
  // 组装元素
  modelEditItem.appendChild(dragHandle);
  modelEditItem.appendChild(modelNameSpan);
  modelEditItem.appendChild(actionContainer);
  modelEditListElement.appendChild(modelEditItem);
}

// 拖拽相关的事件处理函数
let dragSrcEl = null;

function handleDragStart(e) {
  this.style.opacity = '0.4';
  this.classList.add('dragging');
  
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter() {
  this.classList.add('drag-over');
}

function handleDragLeave() {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  
  if (dragSrcEl !== this) {
    // 获取拖拽的源元素和目标元素的父元素
    const list = this.parentNode;
    const srcIndex = Array.from(list.children).indexOf(dragSrcEl);
    const destIndex = Array.from(list.children).indexOf(this);
    
    // 如果目标在源之前，则在目标之前插入源
    // 如果目标在源之后，则在目标之后插入源
    if (srcIndex < destIndex) {
      list.insertBefore(dragSrcEl, this.nextSibling);
    } else {
      list.insertBefore(dragSrcEl, this);
    }
  }
  
  this.classList.remove('drag-over');
  return false;
}

function handleDragEnd() {
  // 清除所有项的样式
  const items = document.querySelectorAll('.model-edit-item');
  items.forEach(item => {
    item.classList.remove('dragging');
    item.classList.remove('drag-over');
    item.style.opacity = '1';
  });
}

// 保存模型列表
function saveModelList(tabId, modelListElement, modelEditListElement) {
  const modelItems = modelEditListElement.querySelectorAll('.model-edit-item-name');
  const models = Array.from(modelItems).map(item => item.textContent);
  
  chrome.storage.sync.set({ [`${tabId}-models`]: models }, () => {
    // 更新UI显示
    modelListElement.innerHTML = '';
    models.forEach(model => {
      const modelItem = document.createElement('div');
      modelItem.className = 'model-item';
      modelItem.textContent = model;
      modelListElement.appendChild(modelItem);
    });
    
    // 显示保存成功提示
    const tabContent = document.getElementById(tabId);
    const saveMessage = tabContent.querySelector('.save-message');
    if (saveMessage) {
      saveMessage.style.display = 'block';
      setTimeout(() => {
        saveMessage.style.display = 'none';
      }, 2000);
    }
  });
}

// 为未实现编辑功能的模型供应商创建编辑界面
function createModelEditorForProviders() {
  // 支持所有模型供应商标签
  const modelTabs = ['deepseek', 'moonshot', 'yi', 'glm', 'groq', 'open-mixtral', 'ollama', 'azure'];
  
  modelTabs.forEach(tabId => {
    const tabContent = document.getElementById(tabId);
    if (!tabContent) return;
    
    // 检查是否已存在编辑功能
    if (document.getElementById(`${tabId}-edit-models`)) return;
    
    // 查找模型列表容器，如果是旧式的ul列表，需要先替换
    let modelListContainer = document.getElementById(`${tabId}-model-list`);
    const oldListParent = tabContent.querySelector('h2 + ul'); // 查找标题下的无序列表
    
    if (oldListParent && !modelListContainer) {
      // 找到标题元素
      const titleElement = oldListParent.previousElementSibling;
      if (titleElement && titleElement.tagName === 'H2') {
        // 创建新容器
        const headerDiv = document.createElement('div');
        headerDiv.className = 'model-list-header';
        headerDiv.innerHTML = `
          <div class="model-list-title" data-i18n="available_models">可用模型</div>
          <button class="edit-models-btn" id="${tabId}-edit-models">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
            <span data-i18n="edit">编辑</span>
          </button>
        `;
        
        modelListContainer = document.createElement('div');
        modelListContainer.className = 'model-list-container';
        modelListContainer.id = `${tabId}-model-list`;
        
        // 转换旧列表为新格式
        const listItems = oldListParent.querySelectorAll('li');
        listItems.forEach(item => {
          const modelItem = document.createElement('div');
          modelItem.className = 'model-item';
          modelItem.textContent = item.textContent.trim();
          modelListContainer.appendChild(modelItem);
        });
        
        // 替换旧列表
        titleElement.parentNode.insertBefore(headerDiv, oldListParent);
        titleElement.parentNode.insertBefore(modelListContainer, oldListParent);
        oldListParent.remove();
        
        // 给标题添加样式
        titleElement.className = 'gradient-heading';
        if (!titleElement.hasAttribute('data-i18n')) {
          titleElement.setAttribute('data-i18n', 'model_list');
        }
      }
    }
    
    // 如果仍然没有找到模型列表容器，跳过
    if (!modelListContainer) return;
    
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = `${tabId}-model-modal`;
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 data-i18n="edit_models">编辑模型</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="current-models">
            <h4 data-i18n="current_models">当前模型</h4>
            <div class="model-edit-list" id="${tabId}-model-edit-list">
              <!-- 动态填充现有模型 -->
            </div>
            <div class="drag-hint">提示：拖拽模型项可调整顺序</div>
          </div>
          <div class="add-model-form">
            <h4 data-i18n="add_model">添加新模型</h4>
            <div class="form-group">
              <label for="${tabId}-new-model-name" data-i18n="model_name">模型名称:</label>
              <input type="text" id="${tabId}-new-model-name" placeholder="例如: ${getModelExample(tabId)}">
            </div>
            <button class="add-model-btn" id="${tabId}-add-model" data-i18n="add">添加</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="save-models-btn" id="${tabId}-save-models" data-i18n="save_changes">保存更改</button>
        </div>
      </div>
    `;
    
    // 将模态框添加到页面
    modelListContainer.parentNode.insertBefore(modal, modelListContainer.nextSibling);
  });
}

// 获取模型名称示例
function getModelExample(tabId) {
  const examples = {
    'deepseek': 'deepseek-chat',
    'moonshot': 'moonshot-v1',
    'yi': 'yi-large',
    'glm': 'glm-4',
    'groq': 'llama-3',
    'open-mixtral': 'mixtral-8x22b',
    'ollama': 'llama3',
    'azure': 'gpt-4'
  };
  
  return examples[tabId] || 'model-name';
}

// 初始化供应商开关状态
function initProviderToggles() {
  const providerToggles = document.querySelectorAll('.provider-toggle');
  
  providerToggles.forEach(toggle => {
    const provider = toggle.dataset.provider;
    
    // 从存储中加载状态
    chrome.storage.sync.get(`${provider}-enabled`, (result) => {
      // 如果没有保存过状态，默认为启用
      const isEnabled = result[`${provider}-enabled`] !== undefined ? result[`${provider}-enabled`] : true;
      toggle.checked = isEnabled;
    });
    
    // 添加变更事件监听
    toggle.addEventListener('change', (event) => {
      const isEnabled = event.target.checked;
      const storageObj = {};
      storageObj[`${provider}-enabled`] = isEnabled;
      
      chrome.storage.sync.set(storageObj, () => {
        // 显示自动保存消息
        const globalSaveMessage = document.querySelector('.auto-save-message');
        if (globalSaveMessage) {
          globalSaveMessage.style.display = 'block';
          setTimeout(() => {
            globalSaveMessage.style.opacity = '1';
            setTimeout(() => {
              globalSaveMessage.style.opacity = '0';
              globalSaveMessage.style.transform = 'translateX(-50%)';
              setTimeout(() => {
                globalSaveMessage.style.display = 'none';
              }, 300);
            }, 2000);
          }, 10);
        }
      });
    });
  });
}

