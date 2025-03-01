// 多语言支持
const i18n = {
    // 语言配置
    'zh-CN': {
        // 通用
        'settings': '设置',
        'share': '分享',
        'copy': '复制',
        'save': '保存',
        'cancel': '取消',
        'confirm': '确认',
        'apply': '应用',
        'delete': '删除',
        'loading': '加载中...',
        'success': '成功',
        'error': '错误',
        'warning': '警告',
        'info': '提示',
        'general': '通用',
        'language_settings': '语言设置',
        'included_features': '功能',
        'check_api': '连通行性测试',
        'check_api_success': '检查通过',
        'edit': '编辑',
        'add': '添加',
        'available_models': '可用模型',
        'edit_models': '编辑模型',
        'current_models': '当前模型',
        'add_model': '添加模型',
        'model_name': '模型名称',
        'save_changes': '保存更改',
        'usage_instructions': '使用说明',
        'ollama_explanation': 'Ollama模型直接从本地服务加载，无需编辑',
        'network_tools': '联网工具',
        'image_tools': '画图工具',


        // ollama 说明
        'ollama_step1': '插件已支持使用 Ollama 来启动本地模型，启动服务时需要开启插件使用时的跨域。具体命令：OLLAMA_ORIGINS=* ollama serve',
        'ollama_step2': '在插件设置中的 Ollama 模型配置项中，输入你的 Ollama 服务地址，默认为：http://127.0.0.1:11434',
        'ollama_step3': '确认连通性测试通过后，点击保存。',
        'ollama_step4': '返回首页并刷新，在模型选择中，会显示本地模型支持的模型列表(以-ollama结尾)。选择所需模型后即可使用。',
        'ollama_note': '注意：如果还是有问题，请检查 ollama 是否正常启动，可以通过以下地址来访问本地 ollama 是否在正常启动：http://127.0.0.1:11434/api/tags',

        // 设置页面功能列表
        'feature_smart_summary': '网页摘要',
        'feature_full_translation': '网页翻译',
        'feature_chat_qa': '对话问答',
        'feature_quick_translation': '划词翻译',
        'feature_copy_content': '网页正文复制（右键）',
        'feature_download_subtitle': '视频字幕下载（Youtube、Bilibili）',
        
        
        // 侧边栏
        'slogan': 'FisherAI - Your Best Summary Copilot',
        'feature_recommend': '功能推荐：',
        'smart_summary': '智能摘要',
        'summary_desc': '支持多种格式，包括网页、PDF 文件、Bilibili 和 YouTube 视频。',
        'web_trans': '网页翻译',
        'web_trans_desc': '支持多种格式，包括网页、PDF 文件，保持原有布局和格式。',
        'video_trans': '视频翻译',
        'video_trans_desc': '支持 Bilibili 和 YouTube 视频。',
        
        // 设置页面
        'fisherai_settings': 'FisherAI 设置',
        'feature_intro': '功能介绍',
        'model_providers': '模型供应商',
        'quick_trans': '划词翻译',
        'about': '关于',
        
        // 提示文本
        'default_tips': '<p>请先去设置 <b>Model</b> 和 <b>API KEY</b>.</p><p class="note"><b>Note:</b> API KEY仅缓存在 Chrome 本地存储空间，不会上传服务器，以保证安全和隐私.</p>',
        
        // 快捷功能
        'shortcut_summary': '摘要',
        'shortcut_dict': '查词',
        'shortcut_translate': '翻译',
        'shortcut_polish': '润色',
        'shortcut_code_explain': '代码解释',
        'shortcut_image2text': '图像转文本',
        
        // 语言选择
        'language': '语言',
        'language_zh': '中文',
        'language_en': '英文',

        // 模型下拉选择
        'free_models': '免费模型',
        'custom_config_models': '自定义配置模型',
        'ollama_local_models': 'Ollama 本地模型',
        'model_parameters': '模型参数',
        
        // 工具箱
        'toolbox': '工具箱',
        'tool_serpapi': 'SerpApi 搜索',
        'tool_dalle': 'DALL·E 图像生成',
        'upload_file': '上传文件',
        'new_chat': '新聊天',
        
        // 模型参数配置
        'temperature': '温度',
        'max_tokens': 'max tokens',
        'top_p': 'Top P',
        'top_k': 'Top K',
        'presence_penalty': '存在惩罚',
        'frequency_penalty': '频率惩罚',
        
        // 划词翻译设置
        'quick_trans_settings': '划词翻译设置',
        'enable_shortcut': '启用快捷键',
        'model_select': '选择模型',
        
        // 模型供应商详情页
        'api_key': 'API Key',
        'base_url': 'Base URL',
        'apply_for_api_key': '申请 API Key 官方地址',
        'model_list': '模型列表',
        
        // 其他
        'preview_area': '预览区域',

        // 模型供应商页面
        'model_providers_title': '模型供应商',
        'model_providers_mainstream': '支持主流模型供应商',
        'model_providers_custom_api': '支持自定义 API Key 和 API 代理地址',
        'model_providers_local_storage': '所有自定义配置仅存储在本地',
        
        // 关于页面
        'about_slogan': 'FisherAI —— Your Best Summary Copilot',
        'about_copyright': '© 2025 FisherAI',
    },
    'en-US': {
        // General
        'settings': 'Settings',
        'share': 'Share',
        'copy': 'Copy',
        'save': 'Save',
        'cancel': 'Cancel',
        'confirm': 'Confirm',
        'apply': 'Apply',
        'delete': 'Delete',
        'loading': 'Loading...',
        'success': 'Success',
        'error': 'Error',
        'warning': 'Warning',
        'info': 'Info',
        'general': 'General',
        'language_settings': 'Language Settings',
        'included_features': 'Features',
        'check_api': 'Check API',
        'check_api_success': 'Check Success',
        'edit': 'Edit',
        'add': 'Add',
        'available_models': 'Available Models',
        'edit_models': 'Edit Models',
        'current_models': 'Current Models',
        'add_model': 'Add Model',
        'model_name': 'Model Name',
        'save_changes': 'Save Changes',
        'usage_instructions': 'Usage Instructions',
        'ollama_explanation': 'Ollama models are loaded directly from the local service and do not need to be edited',
        'network_tools': 'Network Tools',
        'image_tools': 'Image Tools',
        
        // ollama 说明
        'ollama_step1': 'The plugin now supports using Ollama to start local models. When starting the service, you need to enable cross-domain when using the plugin. Specific command: OLLAMA_ORIGINS=* ollama serve',
        'ollama_step2': 'In the Ollama model configuration item in the plugin settings, input your Ollama service address, the default is: http://127.0.0.1:11434',
        'ollama_step3': 'After confirming the connection test is successful, click Save.',
        'ollama_step4': 'Return to the homepage and refresh. In the model selection, the local model supported model list (ending with -ollama) will be displayed. Select the required model to use.',
        'ollama_note': 'Note: If there are still issues, please check if the ollama is running normally. You can access the local ollama by the following address: http://127.0.0.1:11434/api/tags',

        // Settings page feature list
        'feature_smart_summary': 'Web Summary',
        'feature_full_translation': 'Web Translation',
        'feature_chat_qa': 'Chat',
        'feature_quick_translation': 'Quick Translation',
        'feature_copy_content': 'Right-click to copy webpage content',
        'feature_download_subtitle': 'download video subtitle ( Supports Youtube & Bilibili)',
        
        // Sidebar
        'slogan': 'FisherAI - Your Best Summary Copilot',
        'feature_recommend': 'Featured Functions:',
        'smart_summary': 'Smart Summary',
        'summary_desc': 'Supports multiple formats, including web pages, PDF files, Bilibili and YouTube videos.',
        'web_trans': 'Web Translation',
        'web_trans_desc': 'Supports multiple formats, including web pages and PDF files, maintaining the original layout and format.',
        'video_trans': 'Video Translation',
        'video_trans_desc': 'Supports Bilibili and YouTube videos.',
        
        // Settings page
        'fisherai_settings': 'FisherAI Settings',
        'feature_intro': 'Feature Introduction',
        'model_providers': 'Model Providers',
        'quick_trans': 'Quick Translation',
        'about': 'About',
        
        // Tips
        'default_tips': '<p>Please first set up your <b>Model</b> and <b>API KEY</b>.</p><p class="note"><b>Note:</b> API KEY is only cached in Chrome local storage and will not be uploaded to the server to ensure security and privacy.</p>',
        
        // Shortcuts
        'shortcut_summary': 'Summary',
        'shortcut_dict': 'Dictionary',
        'shortcut_translate': 'Translation',
        'shortcut_polish': 'Polish',
        'shortcut_code_explain': 'Code Explanation',
        'shortcut_image2text': 'Image to Text',
        
        // Language selection
        'language': 'Language',
        'language_zh': 'Chinese',
        'language_en': 'English',
        
        // Model dropdown selection
        'free_models': 'Free Models',
        'custom_config_models': 'Custom Configuration Models',
        'ollama_local_models': 'Ollama Local Models',
        'model_parameters': 'Model Parameters',
        
        // Toolbox
        'toolbox': 'Toolbox',
        'tool_serpapi': 'SerpApi',
        'tool_dalle': 'DALL·E',
        'upload_file': 'Upload File',
        'new_chat': 'New Chat',
        
        // Model parameter configuration
        'temperature': 'Temperature',
        'max_tokens': 'Max Tokens',
        'top_p': 'Top P',
        'top_k': 'Top K',
        'presence_penalty': 'Presence Penalty',
        'frequency_penalty': 'Frequency Penalty',
        
        // Quick translation settings
        'quick_trans_settings': 'Quick Translation Settings',
        'enable_shortcut': 'Enable Shortcut',
        'model_select': 'Select Model',
        
        // Model provider details page
        'api_key': 'API Key',
        'base_url': 'Base URL',
        'apply_for_api_key': 'Apply for API Key Official Address',
        'model_list': 'Model List',
        
        // Others
        'preview_area': 'Preview Area',

        // Model providers page
        'model_providers_title': 'Model Providers',
        'model_providers_mainstream': 'Supports mainstream model providers',
        'model_providers_custom_api': 'Supports custom API Keys and API proxy addresses',
        'model_providers_local_storage': 'All custom configurations are stored locally only',
        
        // About page
        'about_slogan': 'FisherAI —— Your Best Summary Copilot',
        'about_copyright': '© 2025 FisherAI',
    }
};

// 获取用户语言设置，默认为中文
function getUserLanguage() {
    return chrome.storage.local.get('language')
        .then(result => result.language || 'zh-CN');
}

// 根据语言和键值获取对应的文本
function getI18nMessage(key, lang) {
    // 如果未提供语言，获取当前语言
    if (!lang) {
        return getUserLanguage().then(language => {
            return i18n[language][key] || key;
        });
    }
    return Promise.resolve(i18n[lang][key] || key);
}

// 一次性获取多个翻译，用于初始化页面
function getI18nMessages(keys, lang) {
    return getUserLanguage().then(language => {
        const currentLang = lang || language;
        const result = {};
        keys.forEach(key => {
            result[key] = i18n[currentLang][key] || key;
        });
        return result;
    });
}

// 设置用户语言
function setUserLanguage(lang) {
    return chrome.storage.local.set({ 'language': lang })
        .then(() => {
            return true;
        });
}

// 初始化页面的国际化
function initI18n() {
    return getUserLanguage().then(language => {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const text = i18n[language][key] || key;
            if (element.tagName === 'INPUT' && element.type === 'placeholder') {
                element.placeholder = text;
            } else {
                element.textContent = text;
            }
        });
        return language;
    });
}

// 导出函数
window.i18n = {
    getMessage: getI18nMessage,
    getMessages: getI18nMessages,
    setLanguage: setUserLanguage,
    init: initI18n,
    getUserLanguage: getUserLanguage
}; 