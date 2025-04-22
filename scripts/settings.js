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

function storeParams(tabName, param1, param2, saveMessage, showTips = true, provider = '') {
  let modelInfo = {};
  if(tabName == 'quick-trans') {
    modelInfo[tabName] = {
      enabled: param1,
      selectedModel: param2,
      provider: provider
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
      if(showTips) {
        // 清除可能存在的计时器，防止动画重叠
        if (globalSaveMessage._entryTimer) clearTimeout(globalSaveMessage._entryTimer);
        if (globalSaveMessage._exitTimer) clearTimeout(globalSaveMessage._exitTimer);
        if (globalSaveMessage._hideTimer) clearTimeout(globalSaveMessage._hideTimer);
        
        globalSaveMessage.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>SUCCESS</span>';
        globalSaveMessage.style.display = 'flex';
        globalSaveMessage.style.alignItems = 'center';
        globalSaveMessage.style.gap = '8px';
        globalSaveMessage.style.backgroundColor = '#4CAF50';
        globalSaveMessage.style.color = '#ffffff';
        globalSaveMessage.style.fontWeight = '600';
        globalSaveMessage.style.fontSize = '14px';
        globalSaveMessage.style.padding = '10px 16px';
        globalSaveMessage.style.borderRadius = '6px';
        globalSaveMessage.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        globalSaveMessage.style.transform = 'translateY(20px)';
        globalSaveMessage.style.opacity = '0';
        globalSaveMessage.style.transition = 'all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
        
        // 触发入场动画
        globalSaveMessage._entryTimer = setTimeout(() => {
          globalSaveMessage.style.transform = 'translateY(0)';
          globalSaveMessage.style.opacity = '1';
        }, 10);
        
        // 设置退场动画
        globalSaveMessage._exitTimer = setTimeout(() => {
          globalSaveMessage.style.transform = 'translateY(-20px)';
          globalSaveMessage.style.opacity = '0';
          
          // 等待动画完成后再隐藏元素
          globalSaveMessage._hideTimer = setTimeout(() => {
            globalSaveMessage.style.display = 'none';
          }, 300);
        }, 2000);
      }
    } else if (saveMessage) {
      // 使用CSS动画显示保存成功消息
      // 先重置动画
      saveMessage.style.animation = 'none';
      saveMessage.offsetHeight; // 触发重排
      saveMessage.style.display = 'block';
      saveMessage.style.animation = 'fadeInOut 2s ease-in-out';
      
      // 动画结束后隐藏元素
      setTimeout(() => {
        saveMessage.style.display = 'none';
      }, 2000);
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
 * @param {string} tabId
 * @param {string} apiKey 
 * @returns 
 */
function getModelBaseParamForCheck(baseUrl, tabId, apiKey) {
  return new Promise((resolve) => {
    let body = '';
    for (const { key, defaultBaseUrl, apiPath } of DEFAULT_LLM_URLS) {
      if (tabId.includes(key)) {
        // 从Chrome存储中获取用户保存的模型列表
        chrome.storage.sync.get(`${tabId}-models`, (result) => {
          const userModels = result[`${tabId}-models`];
          let testModel = '';
          
          // 首先尝试使用用户编辑的模型列表中的第一个模型
          if (userModels && Array.isArray(userModels) && userModels.length > 0) {
            testModel = userModels[0];
            console.log(`使用用户编辑的测试模型: ${testModel} (来自 ${tabId})`);
          } else {
            // 如果没有用户编辑的模型，则回退到默认模型
            const providerModels = getDefaultModels(tabId);
            if (providerModels && providerModels.length > 0) {
              testModel = providerModels[0];
              console.log(`使用默认测试模型: ${testModel} (来自 ${tabId})`);
            } else {
              console.log(`未找到 ${tabId} 的模型列表，无法获取测试模型`);
            }
          }
          
          let apiUrl = baseUrl || defaultBaseUrl;
          apiUrl += apiPath;

          if(tabId.includes(PROVIDER_GOOGLE)) {
            apiUrl = apiUrl.replace('{MODEL_NAME}', testModel).replace('{API_KEY}', apiKey);
            
            body = JSON.stringify({
              contents: [{
                "role": "user",
                "parts": [{
                  "text": "hi"
                }]
              }]
            });
          } else if(tabId.includes(PROVIDER_OLLAMA)) {
            apiUrl = baseUrl || defaultBaseUrl;
            apiUrl += OLLAMA_LIST_MODEL_PATH;
          } else {
            body = JSON.stringify({
              model: testModel,
              stream: true,
              messages: [
                {
                  "role": "user",
                  "content": "hi"
                }
              ]
            });
          }

          resolve({apiUrl, body});
        });
        
        return; // 确保在回调中处理
      }
    }
    
    // 如果没有匹配的提供商，返回空结果
    resolve({});
  });
}

function getToolsParamForCheck(baseUrl, tabId, apiKey) {
  let body = '';
  for (const { key, defaultBaseUrl, apiPath, defaultModel } of DEFAULT_TOOL_URLS) {
    if(tabId.includes(key)) {
      let apiUrl = baseUrl || defaultBaseUrl;
      apiUrl += apiPath;

      if(tabId.includes(SERPAPI_KEY)) {
        apiUrl = apiUrl.replace('{API_KEY}', apiKey).replace('{QUERY}', 'apple');
      } else if(tabId.includes(DALLE_KEY)) {
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
 * @param {string} tabId
 * @param {object} resultElement 
 */
function checkAPIAvailable(baseUrl, apiKey, tabId, resultElement) {
  // Check if a check is already in progress for this element
  if (resultElement._isChecking) {
    console.log('Check already in progress for:', tabId);
    return;
  }
  resultElement._isChecking = true; // Set flag

  // Clear any previous hide timeout
  if (resultElement._hideTimeoutId) {
    clearTimeout(resultElement._hideTimeoutId);
    resultElement._hideTimeoutId = null;
  }

  // Reset animation and show loading status
  resultElement.style.animation = 'none';
  resultElement.offsetHeight; // Trigger reflow
  resultElement.textContent = '检查中...';
  resultElement.style.display = "block"; // Make sure it's visible

  const checkAPI = async () => {
    let apiUrl, body;

    // 为了复用该函数，这里做一些trick
    if (tabId.includes(TOOL_KEY)) {
      ({ apiUrl, body } = getToolsParamForCheck(baseUrl, tabId, apiKey));
    } else {
      // 处理Promise
      ({ apiUrl, body } = await getModelBaseParamForCheck(baseUrl, tabId, apiKey));
    }

    if (!apiUrl) {
      // Reset animation before showing error
      resultElement.style.animation = 'none';
      resultElement.offsetHeight; // Trigger reflow
      resultElement.textContent = '检查未通过：无效的API URL';
      // Set timeout to hide and clear flag
      resultElement._hideTimeoutId = setTimeout(() => {
        resultElement.style.display = 'none';
        resultElement._isChecking = false; // Reset flag
        resultElement._hideTimeoutId = null;
      }, 2000);
      return;
    }

    const headers = {
      'Content-Type': 'application/json'
    };

    if(!tabId.includes(PROVIDER_GOOGLE)) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    let params = {
      method: "POST",
      headers: headers,
      body: body
    };

    if(tabId.includes(PROVIDER_OLLAMA) || tabId.includes(SERPAPI_KEY)) {
      params = {
        method: "GET"
      }
    }

    try {
      const response = await fetch(apiUrl, params);
      if (response.ok) {
        // Reset animation before showing success
        resultElement.style.animation = 'none';
        resultElement.offsetHeight; // Trigger reflow
        resultElement.textContent = '检查通过';
        // Set timeout to hide and clear flag
        resultElement._hideTimeoutId = setTimeout(() => {
          resultElement.style.display = 'none';
          resultElement._isChecking = false; // Reset flag
          resultElement._hideTimeoutId = null;
        }, 2000);
      } else {
        // Use status text if available, otherwise default message
        const errorText = response.statusText || `状态码：${response.status}`;
        throw new Error('API 请求失败: ' + errorText);
      }
    } catch (error) {
       // Reset animation before showing error
       resultElement.style.animation = 'none';
       resultElement.offsetHeight; // Trigger reflow
       // Display a more user-friendly error message
       const errorMessage = error instanceof Error ? error.message : String(error);
       resultElement.textContent = '检查未通过：' + errorMessage;
       console.error('API Check Error:', error); // Log the full error for debugging
       // Set timeout to hide and clear flag
       resultElement._hideTimeoutId = setTimeout(() => {
         resultElement.style.display = 'none';
         resultElement._isChecking = false; // Reset flag
         resultElement._hideTimeoutId = null;
       }, 3000); // Give slightly longer time for error messages
    }
  };

  // 执行检查
  checkAPI();
}

/**
 * 加载Ollama模型到快捷翻译的选项中
 */
function loadOllamaModelsForQuickTrans() {
  
  // 使用通用函数检查Ollama提供商是否启用
  getEnabledModels(({ providerStates }) => {
    const isEnabled = providerStates[PROVIDER_OLLAMA] !== undefined ? 
      providerStates[PROVIDER_OLLAMA] : true;
    
    // 如果提供商被禁用，直接返回
    if (!isEnabled) {
      console.log("Ollama provider is disabled, not loading models");
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
            option.value = model.model;
            option.textContent = model.name;
            customModelsGroup.appendChild(option);
          });
          
        } else {
          console.log("Could not find ollama-models-quicktrans element");
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
  initI18n().then(async () => {
    // 为所有模型供应商创建编辑界面
    createModelEditorForProviders();
    
    // 使用异步方式填充模型选择下拉框
    await populateModelSelections();
    
    // 在模型填充完成后加载Ollama模型
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
    
    // 设置外观模式
    setupAppearanceMode();
    
    // 设置提示词设置
    setupPromptSettings();
    
    // 加载设置并初始化自定义选择框
    loadSettings();
  });
});

// 使用常量中定义的模型列表填充模型选择下拉框
async function populateModelSelections() {
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
  
  // 使用通用函数获取启用的模型，等待所有数据加载完成
  return new Promise(resolve => {
    getEnabledModels(({ filteredFreeModels, filteredCustomConfigModels }) => {
      // 添加免费模型
      filteredFreeModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.display;
        option.dataset.provider = model.provider; // 添加提供商信息
        freeModelsGroup.appendChild(option);
      });
      
      // 添加自定义配置模型
      filteredCustomConfigModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.display;
        option.dataset.provider = model.provider; // 添加提供商信息
        customModelsGroup.appendChild(option);
      });
      
      resolve();
    });
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
      if (tabId === PROVIDER_OLLAMA) {
        chrome.storage.sync.set({
          [PROVIDER_OLLAMA]: {
            baseUrl: baseUrl
          }
        }, function() {
          // 显示保存成功消息
          const saveMessage = tabContent.querySelector('.save-message');
          // 使用CSS动画显示保存成功消息
          // 先重置动画
          saveMessage.style.animation = 'none';
          saveMessage.offsetHeight; // 触发重排
          saveMessage.style.display = 'block';
          saveMessage.style.animation = 'fadeInOut 2s ease-in-out';
          
          // 动画结束后隐藏元素
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

      // 获取保存消息元素
      const saveMessage = tabContent.querySelector('.save-message');
      
      // 保存KV & 显示保存成功
      storeParams(tabId, baseUrl, apiKey, saveMessage);
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
      const selectedOption = modelSelection.options[modelSelection.selectedIndex];
      let provider = selectedOption.dataset.provider;

      // 自动保存设置
      storeParams('quick-trans', enabled, selectedModel, null, false, provider);
    });
  }
  
  if (modelSelection) {
    modelSelection.addEventListener('change', function() {
      // 获取开关状态和模型选择
      const enabled = toggleSwitch.checked;
      const selectedModel = modelSelection.value;
      const selectedOption = modelSelection.options[modelSelection.selectedIndex];
      let provider = selectedOption.dataset.provider;
      
      // 自动保存设置
      storeParams('quick-trans', enabled, selectedModel, null, true, provider);
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
        if (!optionExists && quickTransInfo.selectedModel.includes(PROVIDER_OLLAMA)) {
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
  // 从DEFAULT_LLM_URLS获取所有供应商的key
  const modelTabs = DEFAULT_LLM_URLS.map(provider => provider.key);
  
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
  // 获取该提供商的默认模型列表
  const defaultModelsForProvider = MODEL_LIST.custom_config_models
    .filter(model => model.provider === tabId)
    .map(model => model.value);

  chrome.storage.sync.get(`${tabId}-models`, (result) => {
    const savedModels = result[`${tabId}-models`];
    // 清空当前列表
    modelListElement.innerHTML = '';

    let modelsToDisplay = [];
    if (savedModels && Array.isArray(savedModels) && savedModels.length > 0) {
      // 如果有保存的模型，使用它们
      modelsToDisplay = [...savedModels];
      
      // 查找新增的默认模型（用户自定义列表中不存在的）
      const newDefaultModels = defaultModelsForProvider.filter(
        modelValue => !savedModels.includes(modelValue)
      );
      
      // 添加新增的默认模型
      modelsToDisplay = modelsToDisplay.concat(newDefaultModels);
    } else {
      // 否则，使用默认模型
      modelsToDisplay = getDefaultModels(tabId);
    }

    // 添加模型到列表
    if (modelsToDisplay.length > 0) {
      modelsToDisplay.forEach(model => {
        const modelItem = document.createElement('div');
        modelItem.className = 'model-item';
        modelItem.textContent = model;
        modelListElement.appendChild(modelItem);
      });
    } else {
      // 如果既没有保存的模型，也没有默认模型（例如 Ollama）
      // 可以选择显示一条消息或保持为空
      // modelListElement.textContent = 'No models configured.'; // 示例消息
    }
  });
}

// 获取默认模型列表
function getDefaultModels(tabId) {
  // Extract models from MODEL_LIST.custom_config_models based on provider
  const models = MODEL_LIST.custom_config_models
    .filter(model => model.provider === tabId)
    .map(model => {
      return model.value;
    });

  // Handle special case for Ollama models
  if (tabId === 'ollama') {
    return []; // Ollama models are loaded dynamically from local service
  }
  
  return models;
}

// 填充模型编辑列表
function populateModelEditList(tabId, modelEditListElement) {
  // 清空编辑列表
  modelEditListElement.innerHTML = '';
  
  // 获取该提供商的默认模型列表
  const defaultModelsForProvider = MODEL_LIST.custom_config_models
    .filter(model => model.provider === tabId)
    .map(model => model.value);
  
  // 获取当前模型
  chrome.storage.sync.get(`${tabId}-models`, (result) => {
    const savedModels = result[`${tabId}-models`];
    
    // 如果有保存的模型，使用它们并添加新增的默认模型
    if (savedModels && Array.isArray(savedModels) && savedModels.length > 0) {
      // 添加已保存的自定义模型
      savedModels.forEach(model => {
        addModelToEditList(tabId, modelEditListElement, model);
      });
      
      // 查找新增的默认模型（用户自定义列表中不存在的）
      const newDefaultModels = defaultModelsForProvider.filter(
        modelValue => !savedModels.includes(modelValue)
      );
      
      // 添加新增的默认模型
      newDefaultModels.forEach(model => {
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
  const customModels = Array.from(modelItems).map(item => item.textContent);
  
  // 获取该提供商的默认模型列表
  const defaultModelsForProvider = MODEL_LIST.custom_config_models
    .filter(model => model.provider === tabId)
    .map(model => model.value);
  
  // 先获取现有的映射，然后更新它
  chrome.storage.sync.get(['model-provider-mapping', `${tabId}-models`], (result) => {
    // 获取现有映射或创建新的
    const existingMapping = result['model-provider-mapping'] || {};
    
    // 创建新的映射，保留其他提供商的映射
    const newMapping = {...existingMapping};
    
    // 更新当前提供商的模型映射
    customModels.forEach(model => {
      newMapping[model] = tabId;
    });
    
    // 保存模型列表和更新后的映射
    chrome.storage.sync.set({ 
      [`${tabId}-models`]: customModels,
      'model-provider-mapping': newMapping
    }, async () => {
      // 更新UI显示
      modelListElement.innerHTML = '';
      customModels.forEach(model => {
        const modelItem = document.createElement('div');
        modelItem.className = 'model-item';
        modelItem.textContent = model;
        modelListElement.appendChild(modelItem);
      });
      
      // 重新加载模型选择下拉框
      console.log("模型列表已保存，正在刷新下拉列表...");
      await populateModelSelections();
      
      // 显示保存成功提示
      const tabContent = document.getElementById(tabId);
      const saveMessage = tabContent.querySelector('.save-message');
      if (saveMessage) {
        // 使用CSS动画显示保存成功消息
        // 先重置动画
        saveMessage.style.animation = 'none';
        saveMessage.offsetHeight; // 触发重排
        saveMessage.style.display = 'block';
        saveMessage.style.animation = 'fadeInOut 2s ease-in-out';
        
        // 动画结束后隐藏元素
        setTimeout(() => {
          saveMessage.style.display = 'none';
        }, 2000);
      }
    });
  });
}

// 为未实现编辑功能的模型供应商创建编辑界面
function createModelEditorForProviders() {
  // 从DEFAULT_LLM_URLS获取所有供应商的key
  const modelTabs = DEFAULT_LLM_URLS.map(provider => provider.key);
  
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
  // 从MODEL_LIST中尝试获取一个模型作为示例
  const modelsForProvider = MODEL_LIST.custom_config_models.filter(model => model.provider === tabId);
  
  if (modelsForProvider.length > 0) {
    // 返回第一个匹配的模型值
    return modelsForProvider[0].value;
  }
  
  return 'model-name';
}

// 初始化供应商开关状态
function initProviderToggles() {
  const providerToggles = document.querySelectorAll('.provider-toggle');
  
  providerToggles.forEach(toggle => {
    const provider = toggle.dataset.provider;
    
    // 从存储中加载状态
    chrome.storage.sync.get(`${provider}-enabled`, (result) => {
      // 获取该供应商的默认状态，如未设置则默认为 true
      let defaultEnabled = true;
      
      // 尝试从 DEFAULT_LLM_URLS 中获取默认状态
      if (typeof DEFAULT_LLM_URLS !== 'undefined') {
        const providerConfig = DEFAULT_LLM_URLS.find(p => p.key === provider);
        if (providerConfig) {
          defaultEnabled = providerConfig.enabled;
        }
      }
      
      // 如果没有保存过状态，使用默认值
      const isEnabled = result[`${provider}-enabled`] !== undefined ? result[`${provider}-enabled`] : defaultEnabled;
      toggle.checked = isEnabled;
    });
    
    // 添加变更事件监听
    toggle.addEventListener('change', async (event) => {
      console.log(`Provider ${provider} toggle changed to: ${event.target.checked}`);
      
      const isEnabled = event.target.checked;
      const storageObj = {};
      storageObj[`${provider}-enabled`] = isEnabled;
      
      chrome.storage.sync.set(storageObj, async () => {
        console.log(`Provider ${provider} state saved, refreshing model lists`);
        
        // 保存设置后刷新模型列表
        await populateModelSelections();
        
        // 如果是Ollama提供商，还需要重新加载Ollama模型
        if (provider === 'ollama') {
          loadOllamaModelsForQuickTrans();
        }
      });
    });
  });
}

// 监听存储变化，当模型列表或提供商启用状态更新时刷新模型选择
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'sync') {
    // 检查是否有模型列表变化
    const modelChanges = Object.keys(changes).filter(key => key.endsWith('-models'));
    // 检查是否有提供商启用状态变化
    const providerEnabledChanges = Object.keys(changes).filter(key => key.endsWith('-enabled'));
    // 检查是否有模型提供商映射变化
    const mappingChange = changes['model-provider-mapping'];
    
    if (modelChanges.length > 0 || providerEnabledChanges.length > 0 || mappingChange) {
      // 如果有模型列表或提供商启用状态变化，重新加载模型选择
      console.log("检测到模型列表或提供商状态变化，重新加载模型选择");
      populateModelSelections().catch(err => {
        console.error('Error updating model selections:', err);
      });
    }
  }
});

/**
 * 设置和应用外观模式 (深色/浅色)
 */
function setupAppearanceMode() {
  // 获取当前主题设置
  chrome.storage.sync.get('appearance', function(result) {
    const appearance = result.appearance || 'dark'; // 默认深色模式
    
    // 设置对应的单选按钮
    const radioBtn = document.getElementById(`${appearance}-mode`);
    if (radioBtn) {
      radioBtn.checked = true;
    }
    
    // 应用到当前页面
    applyAppearanceMode(appearance);
    
    // 监听单选按钮变化
    const appearanceOptions = document.querySelectorAll('input[name="appearance"]');
    appearanceOptions.forEach(option => {
      option.addEventListener('change', function() {
        if (this.checked) {
          const newAppearance = this.value;
          
          // 存储设置
          chrome.storage.sync.set({ appearance: newAppearance }, function() {
            // 应用到当前页面
            applyAppearanceMode(newAppearance);
          });
        }
      });
    });
  });
}

/**
 * 应用外观模式到界面
 * @param {string} mode - 'dark' 或 'light'
 */
function applyAppearanceMode(mode) {
  if (mode === 'light') {
    document.body.classList.add('light-mode');
  } else {
    document.body.classList.remove('light-mode');
  }
}

/**
 * 获取当前活跃的标签页ID
 * @returns {string} 活跃标签页的ID
 */
function getTabName() {
  // 获取当前显示的标签内容
  const activeTab = document.querySelector('.tab-content[style*="display: block"]');
  if (activeTab) {
    return activeTab.id;
  }
  
  // 如果没有找到显示的标签内容，则尝试从激活的标签链接获取
  const activeTabLink = document.querySelector('.tab-link.active');
  if (activeTabLink) {
    return activeTabLink.getAttribute('data-tab');
  }
  
  // 默认返回general标签
  return 'general';
}

// 在初始化结束后，加载当前设置，然后初始化自定义选择框
function loadSettings() {
  const provider = getTabName();
  chrome.storage.sync.get(provider, function(result) {
    const modelInfo = result[provider];
    if (modelInfo) {
      const activeTabContent = document.querySelector('.tab-content[style*="display: block"]');
      
      const apiKey = modelInfo.apiKey;
      if(apiKey && activeTabContent) {
        const apiKeyInput = activeTabContent.querySelector('.api-key-input');
        if (apiKeyInput) apiKeyInput.value = apiKey;
      }
      
      const baseUrl = modelInfo.baseUrl;
      if(baseUrl && activeTabContent) {
        const baseUrlInput = activeTabContent.querySelector('.baseurl-input');
        if (baseUrlInput) baseUrlInput.value = baseUrl;
      }
      
      const enabled = modelInfo.enabled;
      if(enabled !== undefined) {
        const toggleSwitch = document.getElementById('quickTransToggle');
        if (toggleSwitch) toggleSwitch.checked = enabled;
      }
      
      const selectedModel = modelInfo.selectedModel;
      if(selectedModel) {
        const modelSelection = document.querySelector('#model-select');
        if (modelSelection) modelSelection.value = selectedModel;
      }
    }
    
    // 加载设置后初始化自定义选择框
    initializeCustomSelects();
  });
}

// 自定义选择框组件的实现
function initializeCustomSelects() {
  // 初始化语言选择器
  initializeCustomSelect('language-select-container', 'language-selector');
  
  // 将来可以在这里初始化其他选择框
  // initializeCustomSelect('other-select-container', 'other-selector');
}

// 确保DOM加载完成后初始化自定义选择框
document.addEventListener('DOMContentLoaded', function() {
  // 再次确保选择框初始化
  initializeCustomSelects();
});

function initializeCustomSelect(containerID, originalSelectID) {
  const container = document.getElementById(containerID);
  if (!container) return;
  
  const originalSelect = document.getElementById(originalSelectID);
  if (!originalSelect) return;
  
  const selectedValue = container.querySelector('.custom-select-selected');
  const options = container.querySelector('.custom-select-options');
  const optionItems = container.querySelectorAll('.custom-select-option');
  
  // 初始化选中值显示
  updateSelectedDisplay(container, originalSelect.value);
  
  // 清除可能存在的旧事件监听器
  const newSelectedValue = selectedValue.cloneNode(true);
  selectedValue.parentNode.replaceChild(newSelectedValue, selectedValue);
  
  // 点击选择框显示/隐藏选项
  newSelectedValue.addEventListener('click', function(e) {
    e.stopPropagation();
    container.classList.toggle('open');
    
    // 关闭其他打开的选择框
    document.querySelectorAll('.custom-select-container.open').forEach(openContainer => {
      if (openContainer !== container) {
        openContainer.classList.remove('open');
      }
    });
  });
  
  // 点击选项更新选中值
  optionItems.forEach(option => {
    // 清除旧事件监听器
    const newOption = option.cloneNode(true);
    option.parentNode.replaceChild(newOption, option);
    
    newOption.addEventListener('click', function() {
      const value = this.getAttribute('data-value');
      
      // 更新原始选择框的值并触发change事件
      originalSelect.value = value;
      
      // 手动触发原始选择框的change事件
      const event = new Event('change', { bubbles: true });
      originalSelect.dispatchEvent(event);
      
      // 更新选中显示
      updateSelectedDisplay(container, value);
      
      // 关闭选项列表
      container.classList.remove('open');
    });
  });
  
  // 点击页面其他地方关闭选项列表
  document.addEventListener('click', function(e) {
    if (!container.contains(e.target)) {
      container.classList.remove('open');
    }
  });
}

function updateSelectedDisplay(container, value) {
  const selectedDisplay = container.querySelector('.custom-select-selected span');
  const options = container.querySelectorAll('.custom-select-option');
  
  options.forEach(option => {
    if (option.getAttribute('data-value') === value) {
      selectedDisplay.textContent = option.textContent;
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
}

// Handle prompt settings functionality
function setupPromptSettings() {
  // Get all prompt textareas and reset buttons
  const summaryPrompt = document.getElementById('summary-prompt');
  const directTranslatePrompt = document.getElementById('direct-translate-prompt');
  const subtitleTranslatePrompt = document.getElementById('subtitle-translate-prompt');
  const dictionPrompt = document.getElementById('diction-prompt');
  const threeStepsTranslationPrompt = document.getElementById('three-steps-translation-prompt');
  const textPolishPrompt = document.getElementById('text-polish-prompt');
  const codeExplainPrompt = document.getElementById('code-explain-prompt');
  const image2textPrompt = document.getElementById('image2text-prompt');
  
  const resetButtons = document.querySelectorAll('.reset-prompt-btn');
  const savePromptButtons = document.querySelectorAll('.save-prompt-btn');
  
  // Load saved prompt values or defaults
  function loadPromptValues() {
    chrome.storage.sync.get([
      'summary_prompt',
      'direct_translate_prompt',
      'subtitle_translate_prompt',
      'diction_prompt',
      'three_steps_translation_prompt',
      'text_polish_prompt',
      'code_explain_prompt',
      'image2text_prompt'
    ], function(result) {
      summaryPrompt.value = result.summary_prompt || DEFAULT_PROMPTS.SUMMARY_PROMPT;
      directTranslatePrompt.value = result.direct_translate_prompt || DEFAULT_PROMPTS.DIRECT_TRANSLATE_PROMPT;
      subtitleTranslatePrompt.value = result.subtitle_translate_prompt || DEFAULT_PROMPTS.SUBTITLE_TRANSLATE_PROMPT;
      dictionPrompt.value = result.diction_prompt || DEFAULT_PROMPTS.DICTION_PROMPT;
      threeStepsTranslationPrompt.value = result.three_steps_translation_prompt || DEFAULT_PROMPTS.THREE_STEPS_TRANSLATION_PROMPT;
      textPolishPrompt.value = result.text_polish_prompt || DEFAULT_PROMPTS.TEXT_POLISH_PROMPT;
      codeExplainPrompt.value = result.code_explain_prompt || DEFAULT_PROMPTS.CODE_EXPLAIN_PROMPT;
      image2textPrompt.value = result.image2text_prompt || DEFAULT_PROMPTS.IMAGE2TEXT_PROMPT;
    });
  }
  
  // Reset a prompt to its default value
  function resetPrompt(promptType) {
    switch(promptType) {
      case 'summary':
        summaryPrompt.value = DEFAULT_PROMPTS.SUMMARY_PROMPT;
        break;
      case 'direct-translate':
        directTranslatePrompt.value = DEFAULT_PROMPTS.DIRECT_TRANSLATE_PROMPT;
        break;
      case 'subtitle-translate':
        subtitleTranslatePrompt.value = DEFAULT_PROMPTS.SUBTITLE_TRANSLATE_PROMPT;
        break;
      case 'diction':
        dictionPrompt.value = DEFAULT_PROMPTS.DICTION_PROMPT;
        break;
      case 'three-steps-translation':
        threeStepsTranslationPrompt.value = DEFAULT_PROMPTS.THREE_STEPS_TRANSLATION_PROMPT;
        break;
      case 'text-polish':
        textPolishPrompt.value = DEFAULT_PROMPTS.TEXT_POLISH_PROMPT;
        break;
      case 'code-explain':
        codeExplainPrompt.value = DEFAULT_PROMPTS.CODE_EXPLAIN_PROMPT;
        break;
      case 'image2text':
        image2textPrompt.value = DEFAULT_PROMPTS.IMAGE2TEXT_PROMPT;
        break;
    }
  }
  
  // Save a single prompt
  function savePrompt(promptType) {
    let promptValue = {};
    
    switch(promptType) {
      case 'summary':
        promptValue = { summary_prompt: summaryPrompt.value };
        break;
      case 'direct-translate':
        promptValue = { direct_translate_prompt: directTranslatePrompt.value };
        break;
      case 'subtitle-translate':
        promptValue = { subtitle_translate_prompt: subtitleTranslatePrompt.value };
        break;
      case 'diction':
        promptValue = { diction_prompt: dictionPrompt.value };
        break;
      case 'three-steps-translation':
        promptValue = { three_steps_translation_prompt: threeStepsTranslationPrompt.value };
        break;
      case 'text-polish':
        promptValue = { text_polish_prompt: textPolishPrompt.value };
        break;
      case 'code-explain':
        promptValue = { code_explain_prompt: codeExplainPrompt.value };
        break;
      case 'image2text':
        promptValue = { image2text_prompt: image2textPrompt.value };
        break;
    }
    
    chrome.storage.sync.set(promptValue);
  }
  
  // Add event listeners to reset buttons
  resetButtons.forEach(button => {
    button.addEventListener('click', function() {
      const promptType = this.getAttribute('data-prompt-type');
      resetPrompt(promptType);
      // Auto save after resetting to default
      savePrompt(promptType);
      
      // Show save success message
      const globalSaveMessage = document.querySelector('.auto-save-message');
      if (globalSaveMessage) {
        // Clear existing timers
        if (globalSaveMessage._entryTimer) clearTimeout(globalSaveMessage._entryTimer);
        if (globalSaveMessage._exitTimer) clearTimeout(globalSaveMessage._exitTimer);
        if (globalSaveMessage._hideTimer) clearTimeout(globalSaveMessage._hideTimer);
        
        // Set content and styling
        globalSaveMessage.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>SUCCESS</span>';
        globalSaveMessage.style.display = 'flex';
        globalSaveMessage.style.alignItems = 'center';
        globalSaveMessage.style.gap = '8px';
        globalSaveMessage.style.backgroundColor = '#4CAF50';
        globalSaveMessage.style.color = '#ffffff';
        globalSaveMessage.style.fontWeight = '600';
        globalSaveMessage.style.fontSize = '14px';
        globalSaveMessage.style.padding = '10px 16px';
        globalSaveMessage.style.borderRadius = '6px';
        globalSaveMessage.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        globalSaveMessage.style.transform = 'translateY(20px)';
        globalSaveMessage.style.opacity = '0';
        globalSaveMessage.style.transition = 'all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
        
        // Trigger entrance animation
        globalSaveMessage._entryTimer = setTimeout(() => {
          globalSaveMessage.style.transform = 'translateY(0)';
          globalSaveMessage.style.opacity = '1';
        }, 10);
        
        // Set exit animation
        globalSaveMessage._exitTimer = setTimeout(() => {
          globalSaveMessage.style.transform = 'translateY(-20px)';
          globalSaveMessage.style.opacity = '0';
          
          // Hide element after animation completes
          globalSaveMessage._hideTimer = setTimeout(() => {
            globalSaveMessage.style.display = 'none';
          }, 300);
        }, 2000);
      }
    });
  });
  
  // Add event listeners to save buttons
  savePromptButtons.forEach(button => {
    button.addEventListener('click', function() {
      const promptType = this.getAttribute('data-prompt-type');
      savePrompt(promptType);
      
      // Show save success message using the global auto-save-message
      const globalSaveMessage = document.querySelector('.auto-save-message');
      if (globalSaveMessage) {
        // Clear existing timers
        if (globalSaveMessage._entryTimer) clearTimeout(globalSaveMessage._entryTimer);
        if (globalSaveMessage._exitTimer) clearTimeout(globalSaveMessage._exitTimer);
        if (globalSaveMessage._hideTimer) clearTimeout(globalSaveMessage._hideTimer);
        
        // Set content and styling
        globalSaveMessage.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>SUCCESS</span>';
        globalSaveMessage.style.display = 'flex';
        globalSaveMessage.style.alignItems = 'center';
        globalSaveMessage.style.gap = '8px';
        globalSaveMessage.style.backgroundColor = '#4CAF50';
        globalSaveMessage.style.color = '#ffffff';
        globalSaveMessage.style.fontWeight = '600';
        globalSaveMessage.style.fontSize = '14px';
        globalSaveMessage.style.padding = '10px 16px';
        globalSaveMessage.style.borderRadius = '6px';
        globalSaveMessage.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        globalSaveMessage.style.transform = 'translateY(20px)';
        globalSaveMessage.style.opacity = '0';
        globalSaveMessage.style.transition = 'all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
        
        // Trigger entrance animation
        globalSaveMessage._entryTimer = setTimeout(() => {
          globalSaveMessage.style.transform = 'translateY(0)';
          globalSaveMessage.style.opacity = '1';
        }, 10);
        
        // Set exit animation
        globalSaveMessage._exitTimer = setTimeout(() => {
          globalSaveMessage.style.transform = 'translateY(-20px)';
          globalSaveMessage.style.opacity = '0';
          
          // Hide element after animation completes
          globalSaveMessage._hideTimer = setTimeout(() => {
            globalSaveMessage.style.display = 'none';
          }, 300);
        }, 2000);
      }
    });
  });
  
  // Load prompt values when the page is loaded
  loadPromptValues();
}

// Load settings when the page is ready
document.addEventListener('DOMContentLoaded', loadSettings);

