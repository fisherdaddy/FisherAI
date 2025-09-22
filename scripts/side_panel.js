/**
 * 初始化国际化支持
 */
async function initI18n() {
  // 初始化页面的国际化
  const currentLang = await window.i18n.init();
  
  // 更新动态文本（那些不是通过data-i18n属性设置的文本）
  updateDynamicTexts(currentLang);
}

/**
 * 应用保存的外观模式
 */
function applyAppearanceMode() {
  chrome.storage.sync.get('appearance', function(result) {
    const appearance = result.appearance || 'dark'; // 默认深色模式
    
    if (appearance === 'light') {
      document.querySelector('.my-extension-resultPage').classList.add('light-mode');
    } else {
      document.querySelector('.my-extension-resultPage').classList.remove('light-mode');
    }
  });
}

/**
 * 更新动态文本（那些不通过data-i18n属性设置的文本）
 */
async function updateDynamicTexts(lang) {
  // 获取常量文本的翻译
  const messages = await window.i18n.getMessages([
    'default_tips', 
    'shortcut_summary', 
    'shortcut_dict', 
    'shortcut_translation', 
    'shortcut_polish', 
    'shortcut_code_explain', 
    'shortcut_image2text',
    'free_models',
    'custom_config_models',
    'ollama_local_models',
    'model_parameters'
  ], lang);
  
  // 更新常量
  DEFAULT_TIPS = messages.default_tips;
  SHORTCUT_SUMMAY = messages.shortcut_summary;
  SHORTCUT_DICTION = messages.shortcut_dict;
  SHORTCUT_TRANSLATION = messages.shortcut_translation;
  SHORTCUT_POLISH = messages.shortcut_polish;
  SHORTCUT_CODE_EXPLAIN = messages.shortcut_code_explain;
  SHORTCUT_IMAGE2TEXT = messages.shortcut_image2text;
  
  // 为API KEY设置按钮添加点击事件（如果存在）
  document.addEventListener('DOMContentLoaded', function() {
    const setupKeyBtn = document.getElementById('goto-settings-btn');
    if (setupKeyBtn) {
      setupKeyBtn.addEventListener('click', function() {
        console.log('Settings button clicked');
        chrome.runtime.sendMessage({ action: "openSettings" });
      });
    }
  });
  
  // 更新模型选择下拉框的 optgroup 标签
  const modelSelect = document.getElementById('model-selection');
  if (modelSelect) {
    const optgroups = modelSelect.querySelectorAll('optgroup');
    for (const optgroup of optgroups) {
      const i18nKey = optgroup.getAttribute('data-i18n');
      if (i18nKey && messages[i18nKey]) {
        optgroup.label = messages[i18nKey];
      }
    }
  }
  
  // 更新模型参数标题
  const modelParamsTitle = document.querySelector('#params-label svg title');
  if (modelParamsTitle && messages.model_parameters) {
    modelParamsTitle.textContent = messages.model_parameters;
  }
  
  // 更新其他动态内容
  // ...
}

/**
 * 判断是否设置api key
 * @returns
 */
async function verifyApiKeyConfigured(provider) {
  const {baseUrl, apiKey} = await getBaseUrlAndApiKey(provider);

  if(provider.includes(PROVIDER_FISHERAI) || provider.includes(PROVIDER_OLLAMA)) {
    return true;
  }
  if(baseUrl == null || apiKey == null || apiKey === '') {
    // 隐藏初始推荐内容
    const sloganDiv = document.querySelector('.my-extension-slogan');
    sloganDiv.style.display = 'none';
    const featureDiv = document.querySelector('.feature-container');
    featureDiv.style.display = 'none';
    // 初始化对话内容 
    var contentDiv = document.querySelector('.chat-content');
    contentDiv.innerHTML = DEFAULT_TIPS;
    
    // 立即绑定设置按钮事件
    setTimeout(() => {
      const setupKeyBtn = document.getElementById('goto-settings-btn');
      if (setupKeyBtn) {
        setupKeyBtn.addEventListener('click', function() {
          console.log('Settings button clicked from verify function');
          chrome.runtime.sendMessage({ action: "openSettings" });
        });
      }
    }, 0);
    
    return false;
  }

  return true;
}

/**
 * 隐藏初始推荐内容
 */
function hideRecommandContent() {
  const sloganDiv = document.querySelector('.my-extension-slogan');
  sloganDiv.style.display = 'none';
  const featureDiv = document.querySelector('.feature-container');
  featureDiv.style.display = 'none';
}

/**
 * 展示初始推荐内容
 */
function showRecommandContent() {
  const sloganDiv = document.querySelector('.my-extension-slogan');
  sloganDiv.style.display = '';
  const featureDiv = document.querySelector('.feature-container');
  featureDiv.style.display = '';
}

const SMART_PROMPT_REGISTRY = new Map();
let currentContextType = null;
let currentPageMeta = { title: '', url: '', contentType: 'webpage' };
let lastRequestPayload = null;

const PROMPT_LANGUAGE_LABELS = {
  zh: { zh: '中文', en: 'Chinese' },
  en: { zh: '英语', en: 'English' },
  es: { zh: '西班牙语', en: 'Spanish' },
  fr: { zh: '法语', en: 'French' },
  de: { zh: '德语', en: 'German' },
  ja: { zh: '日语', en: 'Japanese' },
  ko: { zh: '韩语', en: 'Korean' },
  ru: { zh: '俄语', en: 'Russian' },
  pt: { zh: '葡萄牙语', en: 'Portuguese' },
  hi: { zh: '印地语', en: 'Hindi' }
};

const SMART_PROMPTS = {
  selection: [
    {
      id: 'selection_explain',
      labelKey: 'smart_prompt_selection_explain',
      descriptionKey: 'smart_prompt_selection_explain_desc',
      fallback: {
        zh: { label: '快速解释', description: '用通俗语言说明选中的内容。' },
        en: { label: 'Explain selection', description: 'Break the highlighted text into simple language.' }
      },
      buildPrompt: (promptLanguage, meta, targetLanguage) => {
        if (promptLanguage === 'zh') {
          return `请用简洁的表达解释选中的内容，列出3个关键要点，并给出一个应用建议。回复请使用${targetLanguage.label}。`;
        }
        return `Explain the highlighted text in clear language, provide three key takeaways, and finish with one practical recommendation. Respond in ${targetLanguage.label}.`;
      }
    },
    {
      id: 'selection_translate',
      labelKey: 'smart_prompt_selection_translate',
      descriptionKey: 'smart_prompt_selection_translate_desc',
      fallback: {
        zh: { label: '翻译选段', description: '将选中的文字翻译成目标语言。' },
        en: { label: 'Translate selection', description: 'Translate the highlighted text into your target language.' }
      },
      buildPrompt: (promptLanguage, meta, targetLanguage) => {
        if (promptLanguage === 'zh') {
          return `请将选中的内容精准翻译成${targetLanguage.label}，保留术语并在必要时补充括号内的说明。`;
        }
        return `Translate the highlighted text into ${targetLanguage.label}, preserve technical terms, and add brief clarifications in parentheses when they aid understanding.`;
      }
    },
    {
      id: 'selection_polish',
      labelKey: 'smart_prompt_selection_polish',
      descriptionKey: 'smart_prompt_selection_polish_desc',
      fallback: {
        zh: { label: '润色表达', description: '优化选中段落的逻辑与语气。' },
        en: { label: 'Improve writing', description: 'Rewrite the highlight with better clarity and tone.' }
      },
      buildPrompt: (promptLanguage, meta, targetLanguage) => {
        if (promptLanguage === 'zh') {
          return `请在不改变原意的前提下，用${targetLanguage.label}润色选中的内容，让语气更自然、逻辑更清晰，并指出可以强化的句子。`;
        }
        return `Rewrite the highlighted text in ${targetLanguage.label}, keep the intent, improve clarity and flow, and point out any phrasing that could be strengthened.`;
      }
    }
  ],
  webpage: [
    {
      id: 'page_summary',
      labelKey: 'smart_prompt_page_summary',
      descriptionKey: 'smart_prompt_page_summary_desc',
      fallback: {
        zh: { label: '页面要点', description: '用要点归纳页面的核心信息。' },
        en: { label: 'Key takeaways', description: 'Summarize the page into concise bullet points.' }
      },
      buildPrompt: (promptLanguage, meta, targetLanguage) => {
        const formattedTitle = formatTitleForPrompt(meta, promptLanguage);
        if (promptLanguage === 'zh') {
          return `请阅读${formattedTitle}的内容，提炼3-5条关键要点，并补充一句背景说明。输出请使用${targetLanguage.label}，并以有序列表呈现。`;
        }
        return `Review the content from ${formattedTitle} and provide 3-5 concise bullet takeaways plus a one-sentence context note. Respond in ${targetLanguage.label} using an ordered list.`;
      }
    },
    {
      id: 'page_outline',
      labelKey: 'smart_prompt_page_outline',
      descriptionKey: 'smart_prompt_page_outline_desc',
      fallback: {
        zh: { label: '结构化梳理', description: '按主题整理页面的段落结构。' },
        en: { label: 'Structured outline', description: 'Organize the page into sections with headings.' }
      },
      buildPrompt: (promptLanguage, meta, targetLanguage) => {
        const formattedTitle = formatTitleForPrompt(meta, promptLanguage);
        if (promptLanguage === 'zh') {
          return `请将${formattedTitle}的内容拆解为结构化提纲。每个小节包含一个标题和两条要点，输出请使用${targetLanguage.label}。`;
        }
        return `Break down ${formattedTitle} into a structured outline. For each section provide a heading and two supporting bullet points, responding in ${targetLanguage.label}.`;
      }
    },
    {
      id: 'page_questions',
      labelKey: 'smart_prompt_page_questions',
      descriptionKey: 'smart_prompt_page_questions_desc',
      fallback: {
        zh: { label: '复盘提问', description: '生成帮助你复盘的思考问题。' },
        en: { label: 'Review questions', description: 'Create questions that help you reflect on the page.' }
      },
      buildPrompt: (promptLanguage, meta, targetLanguage) => {
        const formattedTitle = formatTitleForPrompt(meta, promptLanguage);
        if (promptLanguage === 'zh') {
          return `请基于${formattedTitle}设计3个深入思考的问题，并为每个问题提供一句提示，输出请使用${targetLanguage.label}。`;
        }
        return `Create three thoughtful questions based on ${formattedTitle}. Add a one-sentence hint for each question and respond in ${targetLanguage.label}.`;
      }
    }
  ],
  video: [
    {
      id: 'video_timeline',
      labelKey: 'smart_prompt_video_timeline',
      descriptionKey: 'smart_prompt_video_timeline_desc',
      fallback: {
        zh: { label: '时间轴摘要', description: '生成带时间戳的章节概览。' },
        en: { label: 'Timeline summary', description: 'Produce chapter-style timeline with timestamps.' }
      },
      buildPrompt: (promptLanguage, meta, targetLanguage) => {
        const formattedTitle = formatTitleForPrompt(meta, promptLanguage);
        if (promptLanguage === 'zh') {
          return `请根据视频字幕整理${formattedTitle}的时间轴摘要，使用mm:ss格式列出关键时间节点与小节说明，并用${targetLanguage.label}输出。`;
        }
        return `Using the subtitles, create a timeline for ${formattedTitle}. List key moments with mm:ss timestamps and short section summaries, responding in ${targetLanguage.label}.`;
      }
    },
    {
      id: 'video_takeaways',
      labelKey: 'smart_prompt_video_takeaways',
      descriptionKey: 'smart_prompt_video_takeaways_desc',
      fallback: {
        zh: { label: '行动要点', description: '列出视频中的可执行重点。' },
        en: { label: 'Actionable insights', description: 'List the most practical learnings from the video.' }
      },
      buildPrompt: (promptLanguage, meta, targetLanguage) => {
        if (promptLanguage === 'zh') {
          return `请总结该视频的3-5条可执行行动要点，每条包含一句说明和一个建议的下一步动作。输出请使用${targetLanguage.label}。`;
        }
        return `Summarize 3-5 actionable insights from the video. For each insight include one sentence of context and a suggested next step. Respond in ${targetLanguage.label}.`;
      }
    },
    {
      id: 'video_discussion',
      labelKey: 'smart_prompt_video_discussion',
      descriptionKey: 'smart_prompt_video_discussion_desc',
      fallback: {
        zh: { label: '讨论话题', description: '给出围绕视频的讨论引导问题。' },
        en: { label: 'Discussion prompts', description: 'Create discussion questions about the video.' }
      },
      buildPrompt: (promptLanguage, meta, targetLanguage) => {
        if (promptLanguage === 'zh') {
          return `请围绕该视频给出3个讨论问题，并为每个问题补充一句引导提示。回复请使用${targetLanguage.label}。`;
        }
        return `Provide three discussion prompts about the video and add a guiding hint for each one. Respond in ${targetLanguage.label}.`;
      }
    }
  ],
  pdf: [
    {
      id: 'pdf_outline',
      labelKey: 'smart_prompt_pdf_outline',
      descriptionKey: 'smart_prompt_pdf_outline_desc',
      fallback: {
        zh: { label: '章节速览', description: '用2-3句话概括每个章节。' },
        en: { label: 'Section brief', description: 'Summarize each PDF section in two to three sentences.' }
      },
      buildPrompt: (promptLanguage, meta, targetLanguage) => {
        if (promptLanguage === 'zh') {
          return `请梳理这份PDF的主要章节，每个章节用${targetLanguage.label}写2-3句话概括核心观点与数据。`;
        }
        return `Outline the major sections of this PDF. For each section write two to three sentences in ${targetLanguage.label} capturing the core idea and evidence.`;
      }
    },
    {
      id: 'pdf_glossary',
      labelKey: 'smart_prompt_pdf_glossary',
      descriptionKey: 'smart_prompt_pdf_glossary_desc',
      fallback: {
        zh: { label: '术语表', description: '提取关键术语并给出简要释义。' },
        en: { label: 'Glossary builder', description: 'Extract key terms and provide brief definitions.' }
      },
      buildPrompt: (promptLanguage, meta, targetLanguage) => {
        if (promptLanguage === 'zh') {
          return `请从这份PDF中提取重要术语或公式，制作一个术语列表（术语 + 简要解释），使用${targetLanguage.label}输出。`;
        }
        return `Extract important terms or formulas from the PDF and produce a glossary (term + concise definition) written in ${targetLanguage.label}.`;
      }
    },
    {
      id: 'pdf_research',
      labelKey: 'smart_prompt_pdf_research',
      descriptionKey: 'smart_prompt_pdf_research_desc',
      fallback: {
        zh: { label: '研究亮点', description: '提炼研究的目的、方法与结论。' },
        en: { label: 'Research highlights', description: 'Capture objectives, methods, and conclusions from the PDF.' }
      },
      buildPrompt: (promptLanguage, meta, targetLanguage) => {
        if (promptLanguage === 'zh') {
          return `请总结这份PDF的研究重点，包括研究目的、方法、主要结论以及建议的后续工作。请用${targetLanguage.label}输出。`;
        }
        return `Summarize the research focus of this PDF, covering objectives, methodology, key findings, and suggested next steps. Respond in ${targetLanguage.label}.`;
      }
    }
  ]
};

function normalizePromptLanguage(lang) {
  if (!lang) {
    return 'zh';
  }
  const lower = lang.toLowerCase();
  if (lower.startsWith('zh')) {
    return 'zh';
  }
  return 'en';
}

function normalizeTargetLanguage(code) {
  if (!code) {
    return 'zh';
  }
  const lower = code.toLowerCase();
  if (lower.startsWith('zh')) return 'zh';
  if (lower.startsWith('en')) return 'en';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('ja')) return 'ja';
  if (lower.startsWith('ko')) return 'ko';
  if (lower.startsWith('ru')) return 'ru';
  if (lower.startsWith('pt')) return 'pt';
  if (lower.startsWith('hi')) return 'hi';
  return 'en';
}

function getTargetLanguageMeta(targetLanguageCode, promptLanguage) {
  const normalizedTarget = normalizeTargetLanguage(targetLanguageCode);
  const labels = PROMPT_LANGUAGE_LABELS[normalizedTarget] || PROMPT_LANGUAGE_LABELS.en;
  const label = labels[promptLanguage] || labels.en || labels.zh || (promptLanguage === 'zh' ? '目标语言' : 'the configured language');
  const englishLabel = labels.en || 'the configured language';
  return { code: normalizedTarget, label, englishLabel };
}

function normalizeContextType(type) {
  switch ((type || '').toLowerCase()) {
    case 'video':
      return 'video';
    case 'pdf':
      return 'pdf';
    default:
      return 'webpage';
  }
}

function formatTitleForPrompt(meta, promptLanguage) {
  if (!meta || !meta.title) {
    return promptLanguage === 'zh' ? '当前内容' : 'this content';
  }
  const trimmed = meta.title.trim();
  if (!trimmed) {
    return promptLanguage === 'zh' ? '当前内容' : 'this content';
  }
  const truncated = trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
  return promptLanguage === 'zh' ? `《${truncated}》` : `"${truncated}"`;
}

async function getUILanguage() {
  try {
    if (window.i18n && typeof window.i18n.getCurrentLanguage === 'function') {
      return await window.i18n.getCurrentLanguage();
    }
  } catch (error) {
    console.warn('[FisherAI] Failed to get UI language:', error);
  }
  return 'zh-CN';
}

async function updateSmartSuggestions() {
  const section = document.getElementById('smart-suggestion-section');
  const list = document.getElementById('smart-suggestion-list');
  if (!section || !list) {
    return;
  }

  const hasSelection = !!(selectedContent && selectedContent.trim && selectedContent.trim().length > 0);
  const hasPageContent = !!pageContent;
  const effectiveContext = hasSelection ? 'selection' : (hasPageContent ? (currentContextType || 'webpage') : null);

  if (!effectiveContext || !SMART_PROMPTS[effectiveContext] || SMART_PROMPTS[effectiveContext].length === 0) {
    section.style.display = 'none';
    list.innerHTML = '';
    SMART_PROMPT_REGISTRY.clear();
    return;
  }

  const uiLanguage = await getUILanguage();
  const promptLanguage = normalizePromptLanguage(uiLanguage);

  const keys = ['smart_suggestions_title'];
  SMART_PROMPTS[effectiveContext].forEach(cfg => {
    if (cfg.labelKey) {
      keys.push(cfg.labelKey);
    }
    if (cfg.descriptionKey) {
      keys.push(cfg.descriptionKey);
    }
  });

  let messages = {};
  try {
    if (window.i18n && typeof window.i18n.getMessages === 'function') {
      messages = await window.i18n.getMessages(keys, uiLanguage);
    }
  } catch (error) {
    console.warn('[FisherAI] Failed to resolve suggestion labels:', error);
  }

  const fallbackTitle = promptLanguage === 'zh' ? '智能推荐' : 'Smart suggestions';
  const titleElement = section.querySelector('.smart-suggestion-title');
  if (titleElement) {
    titleElement.textContent = messages.smart_suggestions_title || fallbackTitle;
  }

  SMART_PROMPT_REGISTRY.clear();
  list.innerHTML = '';

  SMART_PROMPTS[effectiveContext].forEach(cfg => {
    const fallback = cfg.fallback || {};
    const fallbackLabel = (fallback[promptLanguage] && fallback[promptLanguage].label) ||
      (fallback.en && fallback.en.label) ||
      (fallback.zh && fallback.zh.label) ||
      cfg.labelKey ||
      '';
    const fallbackDesc = (fallback[promptLanguage] && fallback[promptLanguage].description) ||
      (fallback.en && fallback.en.description) ||
      (fallback.zh && fallback.zh.description) ||
      '';
    const label = (cfg.labelKey && messages[cfg.labelKey]) ? messages[cfg.labelKey] : fallbackLabel;
    const desc = (cfg.descriptionKey && messages[cfg.descriptionKey]) ? messages[cfg.descriptionKey] : fallbackDesc;

    if (!label) {
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'smart-suggestion-btn';
    button.dataset.promptId = cfg.id;
    button.innerHTML = `
      <span class="smart-suggestion-label">${label}</span>
      ${desc ? `<span class="smart-suggestion-desc">${desc}</span>` : ''}
    `;
    list.appendChild(button);
    SMART_PROMPT_REGISTRY.set(cfg.id, cfg);
  });

  section.style.display = SMART_PROMPT_REGISTRY.size > 0 ? 'block' : 'none';
}

function initSmartSuggestionHandlers() {
  const list = document.getElementById('smart-suggestion-list');
  if (!list) {
    return;
  }

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('.smart-suggestion-btn');
    if (!button) {
      return;
    }
    const promptId = button.dataset.promptId;
    if (!promptId) {
      return;
    }

    try {
      await handleSmartPromptSelection(promptId, button);
    } catch (error) {
      console.error('[FisherAI] Failed to execute smart suggestion:', error);
    }
  });
}

async function handleSmartPromptSelection(promptId, triggerElement) {
  const config = SMART_PROMPT_REGISTRY.get(promptId);
  if (!config) {
    return;
  }

  const userInput = document.getElementById('my-extension-user-input');
  const submitButton = document.getElementById('my-extension-submit-btn');
  if (!userInput || !submitButton) {
    return;
  }

  const [targetLanguageCode, uiLanguage] = await Promise.all([
    getTargetLanguage().catch(() => 'zh-CN'),
    getUILanguage()
  ]);
  const promptLanguage = normalizePromptLanguage(uiLanguage);
  const targetLanguageMeta = getTargetLanguageMeta(targetLanguageCode, promptLanguage);
  const promptMeta = {
    ...currentPageMeta,
    selectedContent,
    pageContent
  };

  let promptText = '';
  try {
    promptText = config.buildPrompt(promptLanguage, promptMeta, targetLanguageMeta) || '';
  } catch (error) {
    console.error('[FisherAI] Error building smart suggestion prompt:', error);
  }

  if (!promptText) {
    return;
  }

  userInput.value = promptText;
  updateSubmitButton();

  if (triggerElement) {
    triggerElement.classList.add('active');
    setTimeout(() => triggerElement.classList.remove('active'), 220);
  }

  if (!submitButton.disabled) {
    submitButton.click();
  }
}

/**
 * 定义清空并加载内容的函数
 */
async function clearAndGenerate(model, provider, inputText, base64Images) {
  // 隐藏初始推荐内容
  hideRecommandContent();

  // clean
  const contentDiv = document.querySelector('.chat-content');
  contentDiv.innerHTML = '';

  // generate
  await chatLLMAndUIUpdate(model, provider, inputText, base64Images);
}

/**
 * 调用模型 & 更新ui
 * @param {string} model 
 * @param {string} provider 
 * @param {string} inputText 
 * @param {Array} base64Images 
 */
async function chatLLMAndUIUpdate(model, provider, inputText, base64Images) {
  // loading
  displayLoading();

  // submit & generating button
  hideSubmitBtnAndShowGenBtn();

  // 创建或获取AI回答div
  const contentDiv = document.querySelector('.chat-content');
  let aiMessageDiv = contentDiv.lastElementChild;
  if (!aiMessageDiv || !aiMessageDiv.classList.contains('ai-message')) {
    aiMessageDiv = document.createElement('div');
    aiMessageDiv.className = 'ai-message';
    contentDiv.appendChild(aiMessageDiv);
  } else {
    aiMessageDiv.innerHTML = ''; // Clear existing content if regenerating
  }

  lastRequestPayload = {
    model,
    provider,
    inputText,
    base64Images: Array.isArray(base64Images) ? [...base64Images] : []
  };

  try {
    const completeText = await chatWithLLM(model, provider, inputText, base64Images, CHAT_TYPE);
    createCopyButton(completeText);
    lastRequestPayload = null;
  } catch (error) {
    hiddenLoadding();
    await displayErrorMessage(error);
    console.error('请求异常:', error);
  } finally {
    // submit & generating button
    showSubmitBtnAndHideGenBtn();
  }
}

/**
 * 生成复制按钮
 * @param {string} completeText 
 */
function createCopyButton(completeText) {
  const copySvg = document.querySelector('.icon-copy').cloneNode(true);
  copySvg.style.display = 'block';

  copySvg.addEventListener('click', function() {
      navigator.clipboard.writeText(completeText).then(() => {
        // 复制成功，替换为对号 SVG
        const originalSvg = copySvg.innerHTML;
        copySvg.innerHTML = rightSvgString;
        // 在几秒后恢复为原始复制按钮
        setTimeout(() => {
          copySvg.innerHTML = originalSvg;
        }, 2000);
      }).catch(err => {
          console.error('复制失败:', err);
      });
  });

  const contentDiv = document.querySelector('.chat-content');
  let lastDiv = contentDiv.lastElementChild;
  lastDiv.appendChild(copySvg);
}


/**
 * 隐藏提交按钮 & 展示生成按钮
 */
function hideSubmitBtnAndShowGenBtn() {
  const submitBtn = document.querySelector('#my-extension-submit-btn');
  submitBtn.style.cssText = 'display: none !important';
  const generateBtn = document.querySelector('#my-extension-generate-btn');
  generateBtn.style.cssText = 'display: flex !important';
  const inputBtn = document.querySelector('#my-extension-user-input');
  inputBtn.disabled = true;
}

/**
 * 展示提交按钮 & 隐藏生成按钮
 */
function showSubmitBtnAndHideGenBtn() {
  const submitBtn = document.querySelector('#my-extension-submit-btn');
  submitBtn.style.cssText = 'display: flex !important';
  updateSubmitButton();
  const generateBtn = document.querySelector('#my-extension-generate-btn');
  generateBtn.style.cssText = 'display: none !important';
  const inputBtn = document.querySelector('#my-extension-user-input');
  inputBtn.disabled = false;
}

/**
 * 根据选择的模型判断是否支持上传图像或文件
 * @param {string} selectedModel 
 */
function toggleImageUpload(selectedModel) {
  const imageUploadDiv = document.getElementById('image-upload-div');
  const imageUpload = document.getElementById('image-upload');
  const imageUploadLabel = document.getElementById('image-upload-label');
  
  // 使用窗口全局变量（如果存在）或者回退到常量
  const imageSupportModels = window.IMAGE_SUPPORT_MODELS || IMAGE_SUPPORT_MODELS;
  const anyFileSupportModels = window.ANY_FILE_SUPPORT_MODELS || ANY_FILE_SUPPORT_MODELS;
  
  if (imageSupportModels.includes(selectedModel)) {
      // 如果模型支持图像，启用上传区域
      imageUploadDiv.style.opacity = '1';
      imageUpload.disabled = false;
      imageUploadLabel.style.pointerEvents = 'auto';
      imageUpload.setAttribute('accept', 'image/*');
      if(anyFileSupportModels.includes(selectedModel)) {
        imageUpload.removeAttribute('accept');
      }
  } else {
      // 如果模型不支持图像，禁用上传区域
      imageUploadDiv.style.opacity = '0.5';
      imageUpload.disabled = true;
      imageUploadLabel.style.pointerEvents = 'none';
  }
}

function loadImage(imgElement) {
  return new Promise((resolve, reject) => {
      if (imgElement.complete && imgElement.naturalHeight !== 0) {
          resolve();
      } else {
          imgElement.onload = () => resolve();
          imgElement.onerror = () => reject(new Error('Image failed to load: ' + imgElement.src));
      }
  });
}

async function loadAllImages(element) {
  const imgElements = element.querySelectorAll('img');
  const loadPromises = Array.from(imgElements).map(img => loadImage(img));
  return Promise.all(loadPromises);
}

/**
 * 更新提交按钮状态
 */
function updateSubmitButton() {
  const userInput = document.getElementById('my-extension-user-input');
  const submitButton = document.getElementById('my-extension-submit-btn');
  const previewArea = document.querySelector('.image-preview-area');
  const hasUploadedImages = previewArea.querySelectorAll('.uploaded-image-preview[data-uploaded-url]').length > 0;

  if (userInput.value.trim() !== '' || hasUploadedImages) {
    submitButton.disabled = false;
    submitButton.classList.remove('disabled');
  } else {
      submitButton.disabled = true;
      submitButton.classList.add('disabled');
  }
}

function toggleShortcutMenu(inputField, shortcutMenu) {
  if (inputField.value === '/') {
      shortcutMenu.style.display = 'block';
  } else {
      shortcutMenu.style.display = 'none';
  }
}

function handleUploadFiles(event) {
  var files = event.target.files;
  var previewArea = document.querySelector('.image-preview-area');
  const submitButton = document.getElementById('my-extension-submit-btn');

  // 禁用提交按钮
  submitButton.disabled = true;
  submitButton.classList.add('disabled');

  // 追踪未完成的上传数量
  let uploadCount = files.length;

  Array.from(files).forEach(file => {
    var imgContainer = document.createElement('div');
    imgContainer.classList.add('img-container');

    var img = document.createElement('img');
    img.classList.add('uploaded-image-preview');

    // 删除按钮
    var deleteBtn = document.getElementById('delete-icon-template').cloneNode(true);
    deleteBtn.style.display = 'block';
    deleteBtn.classList.add('delete-image-btn');
    deleteBtn.removeAttribute('id');
    deleteBtn.addEventListener('click', function() {
        previewArea.removeChild(imgContainer);
    });

    // 预览
    var reader = new FileReader();
    reader.onload = function(e) {
      if (file.type.startsWith('image/')) {
        img.src = e.target.result;
      } else {
        img.src = DEFAULT_FILE_LOGO_PATH;
      }
      img.setAttribute('data-base64', e.target.result);
      uploadCount--;
      if (uploadCount === 0) {
        updateSubmitButton();
      }
    };
    reader.readAsDataURL(file);

    imgContainer.appendChild(img);
    imgContainer.appendChild(deleteBtn);
    previewArea.appendChild(imgContainer);
  });

  // 清空文件输入
  var uploadInput = document.getElementById('image-upload');
  uploadInput.value = '';
  updateSubmitButton();
}


// 检测是否启用ollama，拉去ollama模型列表并追加到模型选择列表中
function loadOllamaModels(callback) {
  // 使用通用函数检查Ollama提供商是否启用
  getEnabledModels(({ providerStates }) => {
    const isEnabled = providerStates[PROVIDER_OLLAMA] !== undefined ? 
      providerStates[PROVIDER_OLLAMA] : true;
    
    // 如果提供商被禁用，直接返回空数组
    if (!isEnabled) {
      if (typeof callback === 'function') {
        callback([]);
      }
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
        // 如果传入了回调函数，直接将模型数据传给回调函数
        if (typeof callback === 'function') {
          callback(models);
        } else {
          // 兼容旧的直接操作DOM的方式
          const customModelsGroup = document.getElementById('ollama-models');
          if (customModelsGroup) {
            models.forEach(model => {
              const option = document.createElement('option');
              option.value = model.model;
              option.textContent = model.name;
              customModelsGroup.appendChild(option);
            });
          }
        }
      })
      .catch(error => {
        console.error('Error loading Ollama models:', error);
        if (typeof callback === 'function') {
          callback([]);
        }
      });
  });
}


/**
 * 初始化模型选择事件监听
 */
function initModelSelectionHandler() {
  const modelSelection = document.getElementById('model-selection');
  if (!modelSelection) return;
  
  modelSelection.addEventListener('change', function() {
    toggleImageUpload(this.value);
    
    // 获取所选选项的provider信息
    const selectedOption = modelSelection.options[modelSelection.selectedIndex];
    let provider = selectedOption.dataset.provider;
    
    // 保存所选模型和provider信息
    chrome.storage.sync.set({
      'selectedModel': this.value,
      'selectedModelProvider': provider
    });
  });
}


// 保存自定义模型参数
function saveModelParams() {
  const temperature = document.getElementById('temperature').value;
  const top_p = document.getElementById('top_p').value;
  const max_tokens = document.getElementById('max_tokens').value;
  const frequency_penalty = document.getElementById('frequency_penalty').value;
  const presence_penalty = document.getElementById('presence_penalty').value;

  chrome.storage.sync.set({
      temperature: temperature,
      top_p: top_p,
      max_tokens: max_tokens,
      frequency_penalty: frequency_penalty,
      presence_penalty: presence_penalty
  }, function() {
      // console.log('model params saved');
  });
}


// 从chrome storage 加载自定义的模型参数
function loadModelParams() {
  chrome.storage.sync.get(['temperature', 'top_p', 'max_tokens'], function(items) {
      if (items.temperature !== undefined) {
          document.getElementById('temperature').value = items.temperature;
      }
      if (items.top_p !== undefined) {
          document.getElementById('top_p').value = items.top_p;
      }
      if (items.max_tokens !== undefined) {
          document.getElementById('max_tokens').value = items.max_tokens;
      }
      if (items.frequency_penalty !== undefined) {
        document.getElementById('frequency_penalty').value = items.frequency_penalty;
      }
      if (items.max_tokens !== undefined) {
        document.getElementById('presence_penalty').value = items.presence_penalty;
      }
  });
}

function loadToolsSelectedStatus() {
  chrome.storage.sync.get([SERPAPI, DALLE], (result) => {
    if (result.serpapi !== undefined) {
        document.getElementById(SERPAPI).checked = result.serpapi;
    }
    if (result.dalle !== undefined) {
        document.getElementById(DALLE).checked = result.dalle;
    }
  });
}

/**
 * 获取当前页面标题
 * @returns {Promise<string>}
 */
function getPageTitle() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({action: "getPageTitle"}, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (response && response.title) {
        resolve(response.title);
      } else {
        reject(new Error("Unable to get page title"));
      }
    });
  });
}

/**
 * 初始化结果页面
 */
function initResultPage() {
  // 初始化国际化
  initI18n();
  
  // 应用外观模式
  applyAppearanceMode();

  // 添加全局事件委托，捕获设置按钮点击
  document.addEventListener('click', function(event) {
    if (event.target && event.target.id === 'goto-settings-btn') {
      console.log('Settings button clicked through delegation');
      chrome.runtime.sendMessage({ action: "openSettings" });
    }
  });

  // 加载模型选择
  populateModelSelections().then(async () => {
    // 初始化模型选择事件监听
    initModelSelectionHandler();
    
    // 加载模型参数
    loadModelParams();

    // 加载工具选择状态
    loadToolsSelectedStatus();

    // 初始化按钮状态
    updateSubmitButton();

    // 初始化智能推荐
    initSmartSuggestionHandlers();
    updateSmartSuggestions().catch(error => console.warn('[FisherAI] Failed to prepare smart suggestions:', error));

    // 检测输入框内容变化以更新提交按钮状态
    var userInput = document.getElementById('my-extension-user-input');
    userInput.addEventListener('input', updateSubmitButton);

    // 快捷输入
    const shortcutMenu = document.getElementById('shortcut-menu');
    userInput.addEventListener('input', function(e) {
      toggleShortcutMenu(userInput, shortcutMenu);
    });
    userInput.addEventListener('keydown', function(e) {
      if (e.key === '/' && userInput.value.length === 0) {
        toggleShortcutMenu(userInput, shortcutMenu);
      }
    });
    userInput.addEventListener('blur', function() {
      setTimeout(() => {
          shortcutMenu.style.display = 'none';
      }, 200); // delay to allow click event on menu items
    });
    const menuItems = shortcutMenu.querySelectorAll('div');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
          userInput.value = this.getAttribute('data-command');
          shortcutMenu.style.display = 'none';
          userInput.focus();
        });
    });

    // 模型参数设置
    const paramsBtn = document.getElementById('params-div');
    const modelParamsPopupDiv = document.getElementById('model-params');
    paramsBtn.addEventListener('click', function(event) {
      event.stopPropagation();
      modelParamsPopupDiv.style.display = 'block';
      toolStorePopupDiv.style.display = 'none';
    });
    modelParamsPopupDiv.addEventListener('click', function(event) {
      event.stopPropagation(); // Prevent this click from triggering the document click event
    });

    // 保存模型参数设置
    document.getElementById('temperature').addEventListener('change', saveModelParams);
    document.getElementById('top_p').addEventListener('change', saveModelParams);
    document.getElementById('max_tokens').addEventListener('change', saveModelParams);

    // 工具箱
    const toolsBtn = document.getElementById('tools-div');
    const toolStorePopupDiv = document.getElementById('tool-store');
    toolsBtn.addEventListener('click', function(event) {
      event.stopPropagation();
      toolStorePopupDiv.style.display = 'block';
      modelParamsPopupDiv.style.display = 'none';
    });

    // 保存工具选择状态
    const toolCheckboxes = document.querySelectorAll('#tool-store input[type="checkbox"]');
    toolCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (event) => {
          const toolId = event.target.id;
          const isChecked = event.target.checked;

          let storageObject = {};
          storageObject[toolId] = isChecked;
          chrome.storage.sync.set(storageObject, () => {
              // console.log(`Saved ${toolId} state: ${isChecked}`);
          });
      });
    });

    // 点击事件
    document.addEventListener('click', function(event) {
      if (!modelParamsPopupDiv.contains(event.target) && event.target !== paramsBtn) {
        modelParamsPopupDiv.style.display = 'none';
      }
      if(!toolStorePopupDiv.contains(event.target) && event.target !== toolsBtn) {
        toolStorePopupDiv.style.display = 'none';
      }
    });

    // 图片上传预览
    document.getElementById('image-upload').addEventListener('change', function(event) {
      handleUploadFiles(event);
    });

    // 粘贴
    document.addEventListener('paste', async (event) => {
      const modelSelection = document.getElementById('model-selection');
      const selectedModel = modelSelection.value;
      
      // 使用窗口全局变量（如果存在）或者回退到常量
      const imageSupportModels = window.IMAGE_SUPPORT_MODELS || IMAGE_SUPPORT_MODELS;
      
      if (!imageSupportModels.includes(selectedModel)) {
        return;
      }

      const items = event.clipboardData.items;
      let files = [];
      for (let item of items) {
          if (item.type.startsWith('image')) {
              const file = item.getAsFile();
              files.push(file);
          }
      }
      if (files.length > 0) {
        handleUploadFiles({ target: { files: files } });
      }
    });

    // 清空历史记录逻辑
    var label = document.getElementById('newchat-label');
    label.addEventListener('click', function() {
      // 清空聊天记录
      const contentDiv = document.querySelector('.chat-content');
      contentDiv.innerHTML = '';
      // 清空上传图片预览界面
      const previewArea = document.querySelector('.image-preview-area');
      previewArea.innerHTML = '';
      // 清空历史记录
      initChatHistory();
      // 展示推荐内容
      showRecommandContent();
    });

    // 摘要逻辑
    var summaryButton = document.querySelector('#my-extension-summary-btn');
    summaryButton.addEventListener('click', async function() {
      const modelSelection = document.getElementById('model-selection');
      const model = modelSelection.value;
      const selectedOption = modelSelection.options[modelSelection.selectedIndex];
      const provider = selectedOption.dataset.provider;
      const apiKeyValid = await verifyApiKeyConfigured(provider);
      if(!apiKeyValid) {
        return;
      }
      let inputText = '';
      const currentURL = await getCurrentURL();

      try {
        if(isVideoUrl(currentURL)) {
          // 视频摘要
          displayLoading('正在获取字幕...');
          inputText = await extractSubtitles(currentURL, FORMAT_TEXT);
        } else if(isPDFUrl(currentURL)) {
          // PDF摘要
          displayLoading('正在提取PDF内容...');
          inputText = await extractPDFText(currentURL);
        } else {
          // 网页摘要
          displayLoading('正在提取网页内容...');
          inputText = await fetchPageContent(FORMAT_TEXT);
        }
      } catch(error) {
        hiddenLoadding();
        console.error('智能摘要失败', error);
        await displayErrorMessage(error, { contextKey: 'error_context_summary', replaceContent: true });
        return;
      }

      await clearAndGenerate(model, provider, SUMMARY_PROMPT + inputText, null);
    });

    // 网页翻译
    var translateButton = document.querySelector('#my-extension-translate-btn');
    translateButton.addEventListener('click', async function() {
      const modelSelection = document.getElementById('model-selection');
      const model = modelSelection.value;
      const selectedOption = modelSelection.options[modelSelection.selectedIndex];
      const provider = selectedOption.dataset.provider;
      const apiKeyValid = await verifyApiKeyConfigured(provider);
      if(!apiKeyValid) {
        return;
      }
      let inputText = '';
      const currentURL = await getCurrentURL();

      try {
        if(isVideoUrl(currentURL)) {
          // 视频翻译
          displayLoading('正在获取字幕...');
          inputText = await extractSubtitles(currentURL, FORMAT_TEXT);
        } else if(isPDFUrl(currentURL)) {
          // PDF 翻译
          displayLoading('正在提取PDF内容...');
          inputText = await extractPDFText(currentURL);
        } else {
          // 网页翻译
          displayLoading('正在提取网页内容...');
          inputText = await fetchPageContent();
        }
      } catch(error) {
        hiddenLoadding();
        console.error('网页翻译失败', error);
        await displayErrorMessage(error, { contextKey: 'error_context_translate', replaceContent: true });
        return;
      }

      const translatePrompt = await getTranslatePrompt();

      await clearAndGenerate(model, provider, translatePrompt + inputText, null);
    });

    // 视频翻译
    var videoTranslateButton = document.querySelector('#my-extension-videotrans-btn');
    videoTranslateButton.addEventListener('click', async function() {
      const modelSelection = document.getElementById('model-selection');
      const model = modelSelection.value;
      const selectedOption = modelSelection.options[modelSelection.selectedIndex];
      const provider = selectedOption.dataset.provider;
      const apiKeyValid = await verifyApiKeyConfigured(provider);
      if(!apiKeyValid) {
        return;
      }
      const currentURL = await getCurrentURL();
      if(!isVideoUrl(currentURL)) {
        return;
      }

      let inputText = '';
      try {
        // 视频翻译
        displayLoading('正在获取字幕...');
        inputText = await extractSubtitles(currentURL, FORMAT_TEXT);
      } catch(error) {
        hiddenLoadding();
        console.error('视频翻译失败', error);
        await displayErrorMessage(error, { contextKey: 'error_context_video_translate', replaceContent: true });
        return;
      }

      const subTitleTransPrompt = await getSubTitleTransPrompt();
     
      await clearAndGenerate(model, provider, subTitleTransPrompt + inputText, null);
    });


    // 停止生成逻辑
    var cancelBtn = document.querySelector('#my-extension-generate-btn');
    cancelBtn.addEventListener('click', function() {
      cancelRequest();
      showSubmitBtnAndHideGenBtn();
    });

    // 设置逻辑
    var settingsButton = document.querySelector('.my-extension-settings-btn');
    if (settingsButton) {
      settingsButton.addEventListener('click', function() {
        // 发送消息到background script打开新标签页
        chrome.runtime.sendMessage({ action: "openSettings" });
      });
    }

    // 分享逻辑
    var shareButton = document.querySelector('.my-extension-share-btn');
    if(shareButton) {
      shareButton.addEventListener('click', async function() {
        const contentDiv = document.querySelector('.my-extension-content');

        // 等待所有图片加载完成
        try {
          const chatDiv = document.querySelector('.chat-content');
          await loadAllImages(chatDiv);
        } catch (error) {
          console.error('Some images failed to load:', error);
          return;
        }
         
        // 保存原始样式
        var originalStyle = {
            height: contentDiv.style.height,
            width: contentDiv.style.width
        };

        const pageTitle = await getPageTitle();

        // Create a new div element off-screen
        const newDiv = document.createElement('div');
        newDiv.innerHTML = contentDiv.innerHTML;
        newDiv.style.cssText = `
          position: absolute;
          left: -9999px;
          top: -9999px;
          width: ${contentDiv.offsetWidth}px;
          background-color: #FAF8F6;
          border-radius: 16px;
          padding: 15px 25px;
        `;

        // Remove the first h1 element (summary title)
        const firstH1 = newDiv.querySelector('h1');
        if (firstH1) {
          firstH1.remove();
        }
        // 添加标题
        const titleElement = document.createElement('h1');
        titleElement.textContent = pageTitle;
        titleElement.style.cssText = `
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 24px;
          font-weight: 600;
          color: #2c3e50;
          margin: 0 0 25px 0;
          padding: 20px 15px;
          text-align: center;
          letter-spacing: 0.5px;
          line-height: 1.4;
          max-width: 90%;
          margin-left: auto;
          margin-right: auto;
          border-bottom: 2px solid #ecf0f1;
          transition: all 0.3s ease;
        `;
        newDiv.insertBefore(titleElement, newDiv.firstChild);

        // 修改文本样式
        newDiv.querySelectorAll('p, li').forEach(element => {
          element.style.cssText = `
            font-family: 'Open Sans', Arial, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: #34495e;
            margin-bottom: 12px;
          `;
        });

        // 加载二维码图片
        const qrCode = new Image();
        qrCode.src = chrome.runtime.getURL('images/chromestore.png');
        qrCode.onload = function() {
          const footerDiv = document.createElement('div');
          footerDiv.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px 0;
            color: #333;
            font-size: 14px;
            margin-top: 20px;
            border-top: 1px solid #ddd;
          `;

          const explanationText = document.createElement('p');
          explanationText.textContent = 'FisherAI — Your Best Summary Copilot';
          explanationText.style.cssText = `
            margin: 0;
            color: #2c3e50;
            font-family: 'Roboto', sans-serif;
            font-size: 18px;
            font-weight: 500;
            letter-spacing: 0.7px;
            text-align: center;
          `;

          qrCode.style.width = '70px';
          qrCode.style.height = '70px';
          qrCode.style.marginLeft = '5px';

          const textQrWrapper = document.createElement('div');
          textQrWrapper.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
          `;

          textQrWrapper.appendChild(explanationText);
          textQrWrapper.appendChild(qrCode);
          footerDiv.appendChild(textQrWrapper);

          newDiv.appendChild(footerDiv);

          // Append the new div to body
          document.body.appendChild(newDiv);

          // Render the new div
          html2canvas(newDiv, {
            backgroundColor: '#1F2937',
            useCORS: true
          }).then(canvas => {
            canvas.toBlob(function(blob) {
              var url = URL.createObjectURL(blob);
              window.open(url, '_blank');
            }, 'image/png');
          }).catch(error => {
            console.error('Error rendering canvas:', error);
          }).finally(() => {
            // Remove the temporary div
            document.body.removeChild(newDiv);
          });
        };
      });
    }

    // 对话逻辑
    var userInput = document.getElementById('my-extension-user-input');
    var submitButton = document.getElementById('my-extension-submit-btn');
    if (submitButton) {
        submitButton.addEventListener('click', async function() {
          const modelSelection = document.getElementById('model-selection');
          const model = modelSelection.value;
          const selectedOption = modelSelection.options[modelSelection.selectedIndex];
          const provider = selectedOption.dataset.provider;
          const apiKeyValid = await verifyApiKeyConfigured(provider);
          if(!apiKeyValid) {
            return;
          }
          if (userInput.value.trim() !== '') {
            // 隐藏初始推荐内容
            hideRecommandContent();

            let inputText = userInput.value;
            
            // 获取当前上下文内容
            const contextContent = getCurrentContextContent();
            if (contextContent) {
              // 如果有上下文内容，则添加到输入前面
              inputText = `基于以下内容：\n\n${contextContent}\n\n---\n\n${inputText}`;
            }

            // 获取图像url
            var images = document.querySelectorAll('.uploaded-image-preview');
            var base64Images = [];
            images.forEach(img => {
                var imageBase64 = img.getAttribute('data-base64');
                if (imageBase64) {
                  base64Images.push(imageBase64);
                }
            });

            // 使用窗口全局变量（如果存在）或者回退到常量
            const imageSupportModels = window.IMAGE_SUPPORT_MODELS || IMAGE_SUPPORT_MODELS;

            // 如果有选中内容，先显示选中内容
            if (contextContent) {
              const contentDiv = document.querySelector('.chat-content');
              const selectedTextDiv = document.createElement('div');
              selectedTextDiv.className = 'user-message selected-text-message';
              
              // 获取国际化标签
              let labelText = '选中的内容:';
              try {
                const currentLang = await window.i18n.getCurrentLanguage();
                const messages = await window.i18n.getMessages(['selected_content_label'], currentLang);
                labelText = messages.selected_content_label || '选中的内容:';
              } catch (error) {
                // 使用默认文本
              }
              
              selectedTextDiv.innerHTML = `
                <div class="message-label">${labelText}</div>
                <div class="message-content">${contextContent}</div>
              `;
              contentDiv.appendChild(selectedTextDiv);
            }

            // 创建用户问题div
            const userQuestionDiv = document.createElement('div');
            userQuestionDiv.className = 'user-message';
            let userMessage = '';
            if(base64Images) {
              base64Images.forEach(url => {
                if(!url.includes('image')) {
                  url = DEFAULT_FILE_LOGO_PATH;
                }
                userMessage += "<img src='"+ url +"' />"
              });
            }
            // 只显示用户的原始输入，不包含上下文内容
            userMessage += userInput.value;
            userQuestionDiv.innerHTML = userMessage;

            // Add edit button
            const editButton = document.createElement('button');
            editButton.className = 'edit-message-btn';
            editButton.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            `;
            // 传递原始输入用于编辑
            editButton.onclick = () => editUserMessage(userQuestionDiv, userInput.value);
            userQuestionDiv.appendChild(editButton);

            const contentDiv = document.querySelector('.chat-content');
            contentDiv.appendChild(userQuestionDiv);

            // 构造content
            let newInputText = '';
            if(inputText.startsWith(SHORTCUT_SUMMAY)) {
              newInputText = SUMMARY_PROMPT + inputText.replace(SHORTCUT_SUMMAY, '') ;
            } else if(inputText.startsWith(SHORTCUT_DICTION)) {
              const dictionPrompt = await getDictionPrompt();
              newInputText = dictionPrompt + inputText.replace(SHORTCUT_DICTION, '') ;
            } else if(inputText.startsWith(SHORTCUT_TRANSLATION)) {
              const threeStepsTransPrompt = await getThreeStepsTransPrompt();
              newInputText = threeStepsTransPrompt + inputText.replace(SHORTCUT_TRANSLATION, '') ;
            } else if(inputText.startsWith(SHORTCUT_POLISH)) {
              newInputText = TEXT_POLISH_PROMTP + inputText.replace(SHORTCUT_POLISH, '');
            } else if(inputText.startsWith(SHORTCUT_CODE_EXPLAIN)) {
              newInputText = CODE_EXPLAIN_PROMTP + inputText.replace(SHORTCUT_CODE_EXPLAIN, '');
            } else if(inputText.startsWith(SHORTCUT_IMAGE2TEXT)) {
              newInputText = IMAGE2TEXT_PROMPT + inputText.replace(SHORTCUT_IMAGE2TEXT, '');
            } else {
              newInputText = inputText;
            }

            // 滚动到底部
            contentDiv.scrollTop = contentDiv.scrollHeight;

            // 清空输入框内容
            userInput.value = "";

            // 清空上传图片预览界面
            const previewArea = document.querySelector('.image-preview-area');
            previewArea.innerHTML = '';

            // 清除选中内容标签
            hideSelectedContent();

            // AI 回答
            chatLLMAndUIUpdate(model, provider, newInputText, base64Images);
          }
        });
    }

    // 使回车键触发提交按钮点击
    if (userInput) {
      userInput.addEventListener('keypress', function(event) {
          if (event.key === 'Enter') { 
            event.preventDefault(); // 阻止默认事件
            if (userInput.value.trim() !== '') {
              submitButton.click();
            }
          }
      });
    }
  });
}

// 使用常量中定义的模型列表填充模型选择下拉框
async function populateModelSelections() {
  const modelSelection = document.getElementById('model-selection');
  if (!modelSelection) return;
  
  // 清空现有的选项，保留optgroup结构
  const optgroups = modelSelection.querySelectorAll('optgroup');
  const freeModelsGroup = optgroups[0];
  const customModelsGroup = optgroups[1];
  const ollamaModelsGroup = optgroups[2] || null;
  
  // 清空现有选项
  while (freeModelsGroup.firstChild) {
    freeModelsGroup.removeChild(freeModelsGroup.firstChild);
  }
  
  while (customModelsGroup.firstChild) {
    customModelsGroup.removeChild(customModelsGroup.firstChild);
  }
  
  if (ollamaModelsGroup) {
    while (ollamaModelsGroup.firstChild) {
      ollamaModelsGroup.removeChild(ollamaModelsGroup.firstChild);
    }
  }
  
  // 使用通用函数获取启用的模型
  await getEnabledModels(({ filteredFreeModels }) => {
    // 添加免费模型
    filteredFreeModels.forEach(model => {
      const option = document.createElement('option');
      option.value = model.value;
      option.textContent = model.display;
      option.dataset.provider = model.provider;
      freeModelsGroup.appendChild(option);
    });
  });
  
  // 从设置页面加载自定义配置模型
  await loadCustomModelsFromSettings(customModelsGroup);
  
  // 如果有Ollama模型组，加载Ollama模型
  if (ollamaModelsGroup) {
    await new Promise(resolve => {
      loadOllamaModels((models) => {
        models.forEach(model => {
          const option = document.createElement('option');
          option.value = `${model.name}`;
          option.textContent = `${model.name}`;
          option.dataset.provider = 'ollama';
          ollamaModelsGroup.appendChild(option);
        });
        resolve();
      });
    });
  }
  
  // 恢复保存的模型选择
  restoreSavedModelSelection();
}

/**
 * 恢复保存的模型选择
 */
function restoreSavedModelSelection() {
  const modelSelection = document.getElementById('model-selection');
  if (!modelSelection) return;
  
  chrome.storage.sync.get(['selectedModel'], function(result) {
    if (result.selectedModel) {
      // 检查保存的模型是否在当前可用的选项中
      const modelExists = Array.from(modelSelection.options).some(option => option.value === result.selectedModel);
      if (modelExists) {
        modelSelection.value = result.selectedModel;
      } else {
        // 如果保存的模型不可用，使用默认模型
        modelSelection.value = MODEL_LIST.free_models[0].value;
      }
    } else {
      // 如果没有保存的模型，使用默认模型
      modelSelection.value = MODEL_LIST.free_models[0].value;
    }
    toggleImageUpload(modelSelection.value);
  });
}

/**
 * 从设置页面加载自定义配置模型
 * @param {HTMLElement} customModelsGroup - 自定义模型的optgroup元素
 */
async function loadCustomModelsFromSettings(customModelsGroup) {
  // 清空现有选项
  while (customModelsGroup.firstChild) {
    customModelsGroup.removeChild(customModelsGroup.firstChild);
  }
  
  // 使用通用函数直接获取所有启用的自定义模型
  await new Promise(resolve => {
    getEnabledModels(({ filteredCustomConfigModels }) => {
      // 添加所有过滤后的自定义模型
      filteredCustomConfigModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.display;
        option.dataset.provider = model.provider;
        customModelsGroup.appendChild(option);
      });
      resolve();
    });
  });
}


/**
 * 是否是视频页面
 * @returns 
 */
function isVideoUrl(url) {
  const patterns = [
    /^https?:\/\/(?:www\.)?youtube\.com\/watch/, // 匹配 YouTube 观看页面
    /^https?:\/\/(?:www\.)?bilibili\.com\/video\//, // 匹配 Bilibili 视频页面
    /^https?:\/\/(?:www\.)?bilibili\.com\/list\/watchlater/ // 匹配 Bilibili 稍后再看页
  ];
  
  return patterns.some(pattern => pattern.test(url));
}

/**
 * 显示错误信息
 * @param {string} message 
 */
const ERROR_TEMPLATES = {
  zh: {
    network: {
      title: '网络连接异常',
      description: '助手无法连接到模型服务，请检查网络或代理设置。',
      tips: [
        '确认当前网络可以访问模型或代理地址。',
        '如使用企业或系统代理，请允许 Chrome 访问对应域名。',
        '稍后再次尝试请求。'
      ]
    },
    timeout: {
      title: '请求超时',
      description: '模型在预期时间内没有返回结果。',
      tips: [
        '尝试缩短输入或减少附件体积。',
        '确认网络状态良好后再次发送。',
        '必要时更换其他模型或服务。'
      ]
    },
    auth: {
      title: '鉴权失败',
      description: '模型返回了无效凭证或权限不足的提示。',
      tips: [
        '检查 API Key 是否填写正确。',
        '在设置页重新保存密钥或刷新凭证。',
        '确认当前账号仍有调用额度。'
      ]
    },
    quota: {
      title: '触发频率限制',
      description: '当前模型已达到调用频率或配额限制。',
      tips: [
        '等待片刻后再尝试发送请求。',
        '降低请求频率或更换其他模型。',
        '在服务商控制台检查剩余额度。'
      ]
    },
    default: {
      title: '请求未完成',
      description: '助手暂时无法完成该请求。',
      tips: [
        '稍后再次尝试或重新整理问题描述。',
        '尝试切换不同的模型或供应商。',
        '检查设置中的网络与代理配置。'
      ]
    }
  },
  en: {
    network: {
      title: 'Connection issue',
      description: 'The assistant could not reach the model endpoint. Please verify your network or proxy settings.',
      tips: [
        'Make sure your network can reach the model or proxy host.',
        'If a corporate or system proxy is required, allow Chrome to access the domain.',
        'Try sending the request again in a moment.'
      ]
    },
    timeout: {
      title: 'Request timed out',
      description: 'The model did not return a result before the timeout limit.',
      tips: [
        'Try shortening the input or reducing attached content.',
        'Verify your connection speed and resend the request.',
        'Consider switching to another model or provider.'
      ]
    },
    auth: {
      title: 'Authentication failed',
      description: 'The model reported invalid credentials or insufficient permissions.',
      tips: [
        'Double-check that your API key is correct.',
        'Save the key again in the settings page.',
        'Confirm that your account still has available quota.'
      ]
    },
    quota: {
      title: 'Rate limit reached',
      description: 'The request hit a rate or quota limit imposed by the model provider.',
      tips: [
        'Wait a moment before sending another request.',
        'Reduce the request frequency or choose a different model.',
        'Check your provider dashboard for remaining quota.'
      ]
    },
    default: {
      title: 'Request could not be completed',
      description: 'The assistant was unable to finish this request.',
      tips: [
        'Try again with a revised prompt later.',
        'Switch to another model or provider.',
        'Verify your network or proxy configuration.'
      ]
    }
  }
};

function categorizeError(message) {
  if (!message) {
    return 'default';
  }
  const normalized = message.toLowerCase();
  if (normalized.includes('timeout') || normalized.includes('timed out') || normalized.includes('abort') || normalized.includes('aborted') || normalized.includes('exceeded')) {
    return 'timeout';
  }
  if (normalized.includes('failed to fetch') || normalized.includes('network') || normalized.includes('net::') || normalized.includes('dns') || normalized.includes('connection')) {
    return 'network';
  }
  if (normalized.includes('401') || normalized.includes('403') || normalized.includes('unauthorized') || normalized.includes('forbidden') || normalized.includes('invalid api key') || normalized.includes('incorrect api key') || normalized.includes('signature')) {
    return 'auth';
  }
  if (normalized.includes('429') || normalized.includes('too many requests') || normalized.includes('rate limit') || normalized.includes('quota')) {
    return 'quota';
  }
  return 'default';
}

function extractErrorDetails(error, fallback = 'Unknown error') {
  if (!error) {
    return fallback;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.stack || error.message || fallback;
  }
  try {
    return JSON.stringify(error);
  } catch (serializationError) {
    console.warn('[FisherAI] Unable to serialize error object:', serializationError);
    return fallback;
  }
}

async function retryLastRequest() {
  if (!lastRequestPayload) {
    return;
  }

  const { model, provider, inputText, base64Images } = lastRequestPayload;
  const contentDiv = document.querySelector('.chat-content');
  if (contentDiv) {
    const lastChild = contentDiv.lastElementChild;
    if (lastChild && lastChild.classList.contains('ai-message')) {
      lastChild.innerHTML = '';
    }
  }

  await chatLLMAndUIUpdate(model, provider, inputText, base64Images);
}

async function displayErrorMessage(error, options = {}) {
  hideRecommandContent();

  const contentDiv = document.querySelector('.chat-content');
  if (!contentDiv) {
    return;
  }

  const rawDetails = extractErrorDetails(error, '');
  const uiLanguage = await getUILanguage();
  const promptLanguage = normalizePromptLanguage(uiLanguage);
  const templates = ERROR_TEMPLATES[promptLanguage] || ERROR_TEMPLATES.zh;
  const scenario = categorizeError(rawDetails);
  const template = templates[scenario] || templates.default;

  let contextLabel = '';
  if (options.contextKey && window.i18n && typeof window.i18n.getMessages === 'function') {
    try {
      const contextMessages = await window.i18n.getMessages([options.contextKey], uiLanguage);
      contextLabel = contextMessages[options.contextKey] || '';
    } catch (contextError) {
      console.warn('[FisherAI] Failed to resolve error context message:', contextError);
    }
  }

  let extraMessages = {};
  try {
    if (window.i18n && typeof window.i18n.getMessages === 'function') {
      extraMessages = await window.i18n.getMessages(['error_retry', 'error_copy_details', 'error_copied'], uiLanguage);
    }
  } catch (labelError) {
    console.warn('[FisherAI] Failed to resolve error action labels:', labelError);
  }

  const retryLabel = extraMessages.error_retry || (promptLanguage === 'zh' ? '重试' : 'Retry');
  const copyLabel = extraMessages.error_copy_details || (promptLanguage === 'zh' ? '复制错误详情' : 'Copy details');
  const copiedLabel = extraMessages.error_copied || (promptLanguage === 'zh' ? '已复制！' : 'Copied!');

  const title = options.title || contextLabel || template.title;
  let description;
  if (options.description) {
    description = options.description;
  } else if (contextLabel) {
    const joiner = promptLanguage === 'zh' ? '：' : ': ';
    description = `${template.title}${joiner}${template.description}`;
  } else {
    description = template.description;
  }

  const tips = Array.isArray(options.tips) ? options.tips : (template.tips || []);
  const allowRetry = options.allowRetry !== undefined ? options.allowRetry : !!lastRequestPayload;

  let targetContainer = null;
  if (!options.replaceContent) {
    const lastChild = contentDiv.lastElementChild;
    if (lastChild && lastChild.classList.contains('ai-message')) {
      targetContainer = lastChild;
      targetContainer.innerHTML = '';
    }
  }

  if (!targetContainer) {
    if (options.replaceContent || contentDiv.children.length === 0) {
      contentDiv.innerHTML = '';
    }
    targetContainer = document.createElement('div');
    targetContainer.className = 'ai-message';
    contentDiv.appendChild(targetContainer);
  }

  const errorIcon = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 9v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
      <circle cx="12" cy="16" r="1" fill="currentColor"></circle>
      <path d="M12 3L2 21h20L12 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"></path>
    </svg>
  `;

  targetContainer.innerHTML = `
    <div class="error-state">
      <div class="error-state-icon">${errorIcon}</div>
      <div class="error-state-body">
        <h3 class="error-state-title">${title}</h3>
        <p class="error-state-desc">${description}</p>
        ${tips && tips.length > 0 ? `<ul class="error-state-tips">${tips.map(tip => `<li>${tip}</li>`).join('')}</ul>` : ''}
        <div class="error-state-actions">
          ${allowRetry ? `<button class="error-state-btn primary" data-error-action="retry">${retryLabel}</button>` : ''}
          <button class="error-state-btn ghost" data-error-action="copy">${copyLabel}</button>
        </div>
      </div>
    </div>
  `;

  const copyBtn = targetContainer.querySelector('[data-error-action="copy"]');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(rawDetails || extractErrorDetails(error, rawDetails) || '');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = copiedLabel;
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 1500);
      } catch (copyError) {
        console.error('[FisherAI] Failed to copy error details:', copyError);
      }
    });
  }

  const retryBtn = targetContainer.querySelector('[data-error-action="retry"]');
  if (retryBtn) {
    retryBtn.addEventListener('click', async () => {
      retryBtn.disabled = true;
      try {
        await retryLastRequest();
      } catch (retryError) {
        console.error('[FisherAI] Retry failed:', retryError);
        retryBtn.disabled = false;
      }
    });
  }
}
 

// 存储页面内容和选中内容
let pageContent = null;
let selectedContent = null;

/**
 * 显示选中内容区域
 */
async function showSelectedContent(text, isPageContent = false, contentType = null, meta = {}) {
  const safeText = typeof text === 'string' ? text : (text == null ? '' : String(text));
  const tag = document.getElementById('selected-content-tag');
  const preview = document.getElementById('selected-content-preview');
  const label = tag?.querySelector('.selected-content-label');
  const inputContainer = document.querySelector('.input-container');

  if (tag && preview) {
    if (!isPageContent) {
      // 真实的选中内容，优先使用选中内容
      selectedContent = safeText;
      currentContextType = 'selection';

      // 生成预览文本（显示前后几个字符，中间用省略号）
      let previewText;
      if (safeText.length > 12) {
        const startText = safeText.substring(0, 4);
        const endText = safeText.substring(safeText.length - 4);
        previewText = `${startText}...${endText}`;
      } else {
        previewText = safeText;
      }
      preview.textContent = previewText;

      // 获取国际化文本
      try {
        const currentLang = await window.i18n.getCurrentLanguage();
        const messages = await window.i18n.getMessages(['selected_text'], currentLang);
        if (label) label.textContent = messages.selected_text || 'Selected Text';
      } catch (error) {
        // 回退到默认文本
        if (label) label.textContent = 'Selected Text';
      }
      
      tag.style.display = 'flex';
      if (inputContainer) inputContainer.classList.add('has-selected-content');
      
      // 给主容器添加类，用于调整导航栏位置
      const mainContent = document.querySelector('.my-extension-content');
      if (mainContent) mainContent.classList.add('has-selected-content-active');
      
    } else {
      pageContent = safeText;
      const normalizedType = normalizeContextType(contentType);
      currentPageMeta = {
        title: meta.pageTitle || currentPageMeta.title || '',
        url: meta.url || currentPageMeta.url || '',
        contentType: normalizedType
      };
      if (!selectedContent) {
        currentContextType = normalizedType;

        // 生成页面内容的预览文本
        let previewText;
        // 提取页面文本的前几个有效字符（跳过HTML标签和空白）
        const cleanText = safeText.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        if (cleanText.length > 12) {
          const startText = cleanText.substring(0, 4);
          const endText = cleanText.substring(cleanText.length - 4);
          previewText = `${startText}...${endText}`;
        } else {
          previewText = cleanText;
        }
        preview.textContent = previewText;
        
        // 根据内容类型显示不同的标签
        try {
          const currentLang = await window.i18n.getCurrentLanguage();
          let labelKey = 'page_content_text';
          
          // 根据contentType确定标签
          if (contentType === 'video') {
            labelKey = 'video_subtitles';
          } else if (contentType === 'pdf') {
            labelKey = 'pdf_content';
          }
          
          const messages = await window.i18n.getMessages([labelKey], currentLang);
          let labelText = messages[labelKey];
          
          // 回退文本
          if (!labelText) {
            switch (contentType) {
              case 'video':
                labelText = currentLang === 'zh-CN' ? '视频字幕' : 'Video Subtitles';
                break;
              case 'pdf':
                labelText = currentLang === 'zh-CN' ? 'PDF内容' : 'PDF Content';
                break;
              default:
                labelText = currentLang === 'zh-CN' ? '页面内容' : 'Page Content';
            }
          }
          
          if (label) label.textContent = labelText;
        } catch (error) {
          // 回退到默认文本
          if (label) {
            switch (contentType) {
              case 'video':
                label.textContent = 'Video Subtitles';
                break;
              case 'pdf':
                label.textContent = 'PDF Content';
                break;
              default:
                label.textContent = 'Page Content';
            }
          }
        }
        
        tag.style.display = 'flex';
        if (inputContainer) inputContainer.classList.add('has-selected-content');
        
        // 给主容器添加类，用于调整导航栏位置
        const mainContent = document.querySelector('.my-extension-content');
        if (mainContent) mainContent.classList.add('has-selected-content-active');
      }
    }
  }

  try {
    await updateSmartSuggestions();
  } catch (error) {
    console.warn('[FisherAI] Failed to update smart suggestions:', error);
  }
}

/**
 * 隐藏选中内容区域
 */
function hideSelectedContent() {
  const tag = document.getElementById('selected-content-tag');
  const inputContainer = document.querySelector('.input-container');
  
  if (tag) {
    tag.style.display = 'none';
    if (inputContainer) inputContainer.classList.remove('has-selected-content');
    
    // 移除主容器的类
    const mainContent = document.querySelector('.my-extension-content');
    if (mainContent) mainContent.classList.remove('has-selected-content-active');
    

    // 清除所有内容：包括选中内容和页面内容
    selectedContent = null;
    pageContent = null;
    currentContextType = currentPageMeta.contentType || null;
    updateSmartSuggestions().catch(error => console.warn('[FisherAI] Failed to reset smart suggestions:', error));
  }
}

/**
 * 获取当前上下文内容（用于与AI对话）
 */
function getCurrentContextContent() {
  // 优先使用选中内容，其次使用页面内容
  return selectedContent || pageContent || '';
}

/**
 * 主动请求当前页面的选中内容状态
 */
async function requestCurrentPageState() {
  try {
    // 向当前活动tab发送消息，请求页面状态
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'getCurrentPageState'
      }).catch(err => {
        console.log('[FisherAI] 请求页面状态失败:', err);
      });
    }
  } catch (error) {
    console.log('[FisherAI] 请求页面状态异常:', error);
  }
}

/**
 * 主程序
 */ 
document.addEventListener('DOMContentLoaded', function() {
  initResultPage();
  
  // 添加清除按钮事件监听
  const clearBtn = document.getElementById('clear-selected-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', hideSelectedContent);
  }
  
  // 请求当前页面状态（选中内容或页面内容）
  setTimeout(() => {
    requestCurrentPageState();
  }, 500); // 稍微延迟以确保初始化完成
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'sendSelectedTextToSidePanel') {
    console.log('[FisherAI] 接收到选中文本:', message.selectedText);
    showSelectedContent(message.selectedText, false).catch(err => console.error('[FisherAI] Failed to show selected text:', err));
    sendResponse({received: true});
  } else if (message.action === 'sendPageContentToSidePanel') {
    console.log('[FisherAI] 接收到页面内容:', message.pageTitle, '内容类型:', message.contentType);
    showSelectedContent(message.pageContent, true, message.contentType, { pageTitle: message.pageTitle, url: message.url }).catch(err => console.error('[FisherAI] Failed to show page content:', err));
    sendResponse({received: true});
  } else if (message.action === 'clearSelectedTextFromSidePanel') {
    console.log('[FisherAI] 接收到清除选中内容请求');
    hideSelectedContent();
    sendResponse({received: true});
  }
  return true;
});

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
      populateModelSelections().catch(err => {
        console.error('Error updating model selections:', err);
      });
    }
  }
});

