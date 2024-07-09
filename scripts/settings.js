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
    setTimeout(() => {
      saveMessage.style.display = 'block';
      setTimeout(() => {
          saveMessage.style.display = 'none';
      }, 1000);
    }, 1000);
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
 * 主程序
 */
document.addEventListener('DOMContentLoaded', function() {
  // 点击tab签
  var tabLinks = document.querySelectorAll('.tab-link');
  tabLinks.forEach(function(link) {
      link.addEventListener('click', function(event) {
          var tabName = this.getAttribute('data-tab');
          openTab(event, tabName);
      });
  });

  // 点击扩展
  document.querySelectorAll('.collapsible').forEach(button => {
    button.addEventListener('click', () => {
        button.classList.toggle('active');
        const content = button.nextElementSibling;
        content.style.display = content.style.display === 'flex' ? 'none' : 'flex';
    });
  });

  // 点击保存按钮
  var saveButtons = document.querySelectorAll('.save-button');
  saveButtons.forEach(function(button) {
      button.addEventListener('click', function() {
        // 获取外层div的ID
        var tabContent = this.closest('.tab-content');
        var tabId = tabContent.id;

        // 获取api key
        var input = tabContent.querySelector('.api-key-input');
        var apiKey = ''; 
        if(input) {
          apiKey = input.value;
        }

        // api 代理地址
        var baseUrlInput = tabContent.querySelector('.baseurl-input');
        var baseUrl = baseUrlInput.value;

        // 保存KV & 显示保存成功
        var saveMessage = tabContent.querySelector('.save-message');
        storeParams(tabId, baseUrl, apiKey, saveMessage);
      });
  });

  // 点击检查接口可用性按钮
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


  // 点击明文/密文展示秘钥
  var toggleButtons = document.querySelectorAll('.toggle-password');
  toggleButtons.forEach(function(button) {
      button.addEventListener('click', function() {
          togglePasswordVisibility(this);
      });
  });

  // 保存快捷翻译配置
  const quickTransBtn = document.querySelector('.quicktrans-save-btn');
  quickTransBtn.addEventListener('click', function() {
    // 获取外层div的ID
    var tabContent = this.closest('.tab-content');
    var tabId = tabContent.id;

    // 是否开启快捷翻译
    const toggleSwitch = document.getElementById('quickTransToggle');
    const enabled = toggleSwitch.checked;

    // 模型选择
    const modelSelection = document.querySelector('#model-select');
    const selectedModel = modelSelection.value;

    // 保存KV & 显示保存成功
    var quickTransDiv = document.querySelector('#quick-trans');
    var saveMessage = quickTransDiv.querySelector('.save-message');
    storeParams(tabId, enabled, selectedModel, saveMessage);
  });

});

