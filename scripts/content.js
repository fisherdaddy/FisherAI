// 存储从页面拦截器获取的pot参数
const pageInterceptedPots = new Map();

// 注入页面脚本到页面上下文中
function injectPageScript() {
    // 检查是否已经注入过
    if (window.document.documentElement.getAttribute('data-fisherai-injected') === 'true') {
        return;
    }
    
    // 标记已注入
    window.document.documentElement.setAttribute('data-fisherai-injected', 'true');
    
    const script = document.createElement('script');
    try {
        script.src = chrome.runtime.getURL('scripts/page-interceptor.js');
    } catch (error) {
        console.warn('[FisherAI] Failed to get page interceptor script URL:', error);
        return;
    }
    script.onload = function() {
        this.remove();
        
        // 验证注入是否成功
        setTimeout(() => {
            if (typeof window.FisherAI_getPotParameter !== 'function') {
                console.warn('[FisherAI] 页面拦截脚本可能注入失败，尝试备用方案');
                // 可以在这里添加备用注入方案
            }
        }, 100);
    };
    script.onerror = function() {
        console.error('[FisherAI] 页面拦截脚本加载失败');
        this.remove();
        // 移除标记以便重试
        window.document.documentElement.removeAttribute('data-fisherai-injected');
    };
    
    try {
        (document.head || document.documentElement).appendChild(script);
    } catch (err) {
        console.error('[FisherAI] 页面脚本注入失败:', err);
        // 移除标记以便重试
        window.document.documentElement.removeAttribute('data-fisherai-injected');
    }
}

// 监听来自页面脚本的消息
window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    
    if (event.data.type === 'FISHERAI_POT_INTERCEPTED' && event.data.source === 'page-interceptor') {
        const { videoId, pot, url } = event.data.data;
        if (videoId && pot) {
            pageInterceptedPots.set(videoId, pot);            
            // 同时发送给background script保持兼容性
            chrome.runtime.sendMessage({
                action: 'storePotParameter',
                videoId: videoId,
                pot: pot
            }).catch(err => console.log('[FisherAI] 发送pot到background失败:', err));
        }
    }
});

// 提供获取pot参数的函数
function getPotParameterFromPage(videoId) {
    // 首先尝试从页面拦截获取
    const interceptedPot = pageInterceptedPots.get(videoId);
    if (interceptedPot) {
        return interceptedPot;
    }
    
    // 尝试调用页面上的全局函数
    if (typeof window.FisherAI_getPotParameter === 'function') {
        return window.FisherAI_getPotParameter(videoId);
    }
    
    return null;
}

// 将函数暴露给window对象，供其他脚本调用
window.getPotParameterFromPage = getPotParameterFromPage;

// 在YouTube页面上注入拦截脚本
if (window.location.hostname.includes('youtube.com')) {
    // 立即注入，确保尽早执行
    injectPageScript();
    
    // 监听页面导航变化（YouTube是SPA）
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;            
            // 页面导航后确保拦截脚本仍然有效
            setTimeout(() => {
                if (typeof window.FisherAI_getPotParameter !== 'function') {
                    window.document.documentElement.removeAttribute('data-fisherai-injected');
                    injectPageScript();
                }
            }, 1000);
        }
    }).observe(document, { subtree: true, childList: true });
}

/**
 * 从页面视频元素按时间均匀抓帧
 * - 选择与期望时长最接近的 video（避免抓到推荐位的小预览视频）
 * - 抓帧期间静音并保证视频处于播放状态，让渲染管线持续出帧
 * - 优先直接 drawImage（MSE blob 源不跨域污染），被污染时回退 VideoFrame
 * - seek 后做帧变化校验，防止渲染滞后抓到上一帧
 * 采样间隔按时长分级：<=2分钟 2s，<=10分钟 5s，更长 10s；上限 80 帧
 * @param {number} expectedDuration 期望的视频时长（秒），用于挑选正确的 video 元素
 */
async function captureVideoFrames(expectedDuration) {
  const videos = Array.from(document.querySelectorAll('video'));
  if (!videos.length) {
    throw new Error('页面中未找到视频元素');
  }

  // 等待视频加载出有效时长（元数据），时长未就绪的视频直接过滤会导致误判
  const waitForDuration = (v, timeoutMs) => new Promise((resolve) => {
    if (v.duration && isFinite(v.duration) && v.duration > 0) {
      resolve(true);
      return;
    }
    let done = false;
    const finish = (ok) => {
      if (done) {
        return;
      }
      done = true;
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('durationchange', onMeta);
      resolve(ok);
    };
    const onMeta = () => {
      if (v.duration && isFinite(v.duration) && v.duration > 0) {
        finish(true);
      }
    };
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('durationchange', onMeta);
    setTimeout(() => finish(v.duration && isFinite(v.duration) && v.duration > 0), timeoutMs);
  });

  const readyVideos = [];
  for (const v of videos) {
    if (await waitForDuration(v, 4000)) {
      readyVideos.push(v);
    }
  }
  if (!readyVideos.length) {
    throw new Error('视频时长尚未加载，请刷新页面稍后重试');
  }

  // 选择：优先与期望时长最接近；没有匹配则选播放器区域最大的（主播放器一般最大）
  let video = readyVideos[0];
  if (expectedDuration && expectedDuration > 0) {
    let best = null;
    let bestDiff = Infinity;
    for (const v of readyVideos) {
      const diff = Math.abs(v.duration - expectedDuration);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = v;
      }
    }
    if (best && bestDiff < Math.max(5, expectedDuration * 0.15)) {
      video = best;
    } else {
      video = readyVideos.reduce((a, b) => {
        const areaA = (a.videoWidth || 0) * (a.videoHeight || 0);
        const areaB = (b.videoWidth || 0) * (b.videoHeight || 0);
        return areaB > areaA ? b : a;
      });
    }
  }
  const duration = video.duration;
  let intervalSec = 10;
  if (duration <= 120) {
    intervalSec = 2;
  } else if (duration <= 600) {
    intervalSec = 5;
  }
  const maxFrames = 80;
  const frameCount = Math.min(maxFrames, Math.max(1, Math.floor(duration / intervalSec)));

  let stream = null;
  let track = null;
  try {
    stream = video.captureStream();
    track = stream.getVideoTracks()[0];
  } catch (error) {
    console.warn('[FisherAI] captureStream 不可用:', error);
  }

  const originalTime = video.currentTime;
  const wasPaused = video.paused;
  const wasMuted = video.muted;
  // 抓帧期间静音，避免 seek 快进时声音乱窜
  try { video.muted = true; } catch (e) { /* 忽略 */ }
  const frames = [];

  const seekTo = (targetTime) => new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(finish, 3000);
    const onSeeked = finish;
    function finish() {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      video.removeEventListener('seeked', onSeeked);
      resolve();
    }
    video.addEventListener('seeked', onSeeked);
    try {
      video.currentTime = targetTime;
    } catch (error) {
      finish();
    }
  });

  const waitPaint = () => new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    } else {
      setTimeout(resolve, 32);
    }
  });

  const hashDataURL = (dataURL) => new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = 8;
          c.height = 8;
          const cx = c.getContext('2d');
          cx.drawImage(img, 0, 0, 8, 8);
          const d = cx.getImageData(0, 0, 8, 8).data;
          const gray = new Array(64);
          let sum = 0;
          for (let i = 0; i < 64; i++) {
            gray[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
            sum += gray[i];
          }
          const avg = sum / 64;
          resolve(gray.map(v => (v >= avg ? 1 : 0)));
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = dataURL;
    } catch (e) { resolve(null); }
  });

  const hammingBits = (a, b) => {
    if (!a || !b || a.length !== b.length) {
      return 64;
    }
    let d = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        d++;
      }
    }
    return d;
  };

  const drawFrame = () => {
    const canvas = document.createElement('canvas');
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const scale = Math.min(1, 800 / Math.max(vw, vh));
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);
    const ctx = canvas.getContext('2d');
    // 优先 captureStream 的 VideoFrame：跨域视频也不污染画布；不可用再直接绘制
    if (track && typeof VideoFrame !== 'undefined') {
      const vf = new VideoFrame(track);
      ctx.drawImage(vf, 0, 0, canvas.width, canvas.height);
      vf.close();
      return canvas.toDataURL('image/jpeg', 0.72);
    }
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.72);
    } catch (error) {
      throw new Error('视频截图失败（画布安全限制）：' + (error && error.message || error));
    }
  };

  try {
    // 暂停中的视频临时播放（已静音），保证渲染管线持续出帧；结束恢复
    if (video.paused) {
      try {
        await video.play();
      } catch (e) {
        console.warn('[FisherAI] 自动播放被拒绝，将直接抓取当前渲染帧');
      }
    }
    let prevHash = null;
    for (let i = 0; i < frameCount; i++) {
      const t = Math.min(duration - 0.1, ((i + 0.5) / frameCount) * duration);
      let dataURL = null;
      for (let attempt = 0; attempt < 4 && !dataURL; attempt++) {
        await seekTo(t);
        await new Promise(r => setTimeout(r, 120 + attempt * 120));
        await waitPaint();
        dataURL = drawFrame();
      }
      // 帧未变化则等待重试，防止 seek 后渲染滞后抓到上一帧
      for (let attempt = 0; attempt < 3; attempt++) {
        if (!prevHash) {
          break;
        }
        const curHash = await hashDataURL(dataURL);
        if (curHash && hammingBits(curHash, prevHash) === 0) {
          await new Promise(r => setTimeout(r, 250));
          await waitPaint();
          dataURL = drawFrame();
        } else {
          break;
        }
      }
      const curHash = await hashDataURL(dataURL);
      prevHash = curHash;
      frames.push({ dataURL: dataURL, t: Math.round(video.currentTime) });
    }
  } finally {
    if (wasPaused) {
      try { video.pause(); } catch (e) { /* 忽略 */ }
    }
    if (track) {
      try { track.stop(); } catch (e) { /* 忽略 */ }
    }
    try { video.currentTime = originalTime; } catch (e) { /* 忽略 */ }
    try { video.muted = wasMuted; } catch (e) { /* 忽略 */ }
  }

  // 压缩回传体积：在页面内先做变化去重 + 限制帧数，避免图片过大超出消息通道上限
  let resultFrames = [];
  let lastKeptHash = null;
  for (const f of frames) {
    const h = await hashDataURL(f.dataURL);
    if (!lastKeptHash || (h && hammingBits(h, lastKeptHash) >= 8)) {
      resultFrames.push(f);
      lastKeptHash = h;
    }
  }
  const MAX_RETURN = 24;
  if (resultFrames.length > MAX_RETURN) {
    const sampled = [];
    for (let i = 0; i < MAX_RETURN; i++) {
      const idx = Math.round((i * (resultFrames.length - 1)) / (MAX_RETURN - 1));
      sampled.push(resultFrames[idx]);
    }
    resultFrames = sampled;
  }
  return resultFrames;
}

// 监听获取正文请求
try {
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
    // 确保文档有焦点
    try {
      window.focus();
      await navigator.clipboard.writeText(content);
      sendResponse({success: true});
    } catch(err) {
      console.error("[FisherAI Content Script] Error copying content to clipboard:", err);
      // 使用备用方法复制到剪贴板
      copyTextWithExecCommand(content);
      sendResponse({success: true});
    }
    return true;
  } else if(request.action === ACTION_COPY_PURE_PAGE_CONTENT) {
     // 网页文本到剪切板
    const content = extractContent(FORMAT_TEXT);
    // 确保文档有焦点
    try {
      window.focus();
      await navigator.clipboard.writeText(content);
      sendResponse({success: true});
    } catch(err) {
      console.error("[FisherAI Content Script] Error copying content to clipboard:", err);
      // 使用备用方法复制到剪贴板
      copyTextWithExecCommand(content);
      sendResponse({success: true});
    }
    return true;
  } else if(request.action === ACTION_DOWNLOAD_SUBTITLES) {
    // 下载字幕文件
    const subtitles = await extractSubtitles(window.location.href);
    downloadSubtitles(subtitles);
  } else if(request.action === ACTION_GET_PAGE_URL) {
    // 获取当前网页地址
    sendResponse({url: window.location.href});
  } else if(request.action === ACTION_CAPTURE_VIDEO_FRAMES) {
    // 抓取当前页面视频的定时画面（画面总结的兜底路径）
    captureVideoFrames(request.expectedDuration || 0).then(frames => {
      sendResponse({frames: frames});
    }).catch(error => {
      sendResponse({success: false, error: error.message});
    });
    return true;
  } else if(request.action === 'getCurrentPageState') {
    // 响应侧边栏请求当前页面状态
    try {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (selectedText) {
        // 有选中内容，发送选中内容
        chrome.runtime.sendMessage({
          action: 'sendSelectedTextToSidePanel',
          selectedText: selectedText,
          url: window.location.href
        }).catch(err => {
          console.log('[FisherAI] 发送选中内容到侧边栏失败:', err);
        });
      } else {
        // 没有选中内容，根据页面类型获取相应内容
        let pageContent = "No content";
        let contentType = "webpage"; // 默认为普通网页
        const pageTitle = document.title || "Untitled";
        const pageUrl = window.location.href;
        
        try {
          if (isVideoUrl(pageUrl)) {
            // 视频页面：获取字幕内容
            pageContent = await extractSubtitles(pageUrl, FORMAT_TEXT);
            contentType = "video";
          } else if (isPDFUrl(pageUrl)) {
            // PDF页面：获取PDF内容
            pageContent = await extractPDFText(pageUrl);
            contentType = "pdf";
          } else {
            // 普通网页：获取HTML内容
            pageContent = extractContent() || "No content";
            contentType = "webpage";
          }
        } catch (error) {
          console.log('[FisherAI] 提取页面内容失败，使用默认HTML内容:', error);
          pageContent = extractContent() || "No content";
          contentType = "webpage";
        }
        
        chrome.runtime.sendMessage({
          action: 'sendPageContentToSidePanel',
          pageContent: pageContent,
          pageTitle: pageTitle,
          url: pageUrl,
          contentType: contentType
        }).catch(err => {
          console.log('[FisherAI] 发送页面内容到侧边栏失败:', err);
        });
      }
      sendResponse({success: true});
    } catch (error) {
      console.log('[FisherAI] 获取页面状态异常:', error);
      sendResponse({success: false, error: error.message});
    }
    return true;
  }
  });
} catch (error) {
  // 处理扩展上下文失效错误
  if (error.message && error.message.includes('Extension context invalidated')) {
    console.warn('[FisherAI] Extension context invalidated during message listener setup');
  } else {
    console.error('[FisherAI] Chrome API error during message listener setup:', error);
  }
}

// 判断是否是视频页面
function isVideoUrl(url) {
  const patterns = [
    /^https?:\/\/(?:www\.)?youtube\.com\/watch/, // 匹配 YouTube 观看页面
    /^https?:\/\/(?:www\.)?bilibili\.com\/video\//, // 匹配 Bilibili 视频页面
    /^https?:\/\/(?:www\.)?bilibili\.com\/list\/watchlater/ // 匹配 Bilibili 稍后再看页
  ];
  
  return patterns.some(pattern => pattern.test(url));
}

// 判断是否是PDF页面
function isPDFUrl(url) {
  url = url.toLowerCase();
  if(url.endsWith('.pdf')) {
      return true;
  }
  // arxiv 的特殊处理一下，它不是以.pdf后缀结束的
  const pattern = /^https?:\/\/arxiv\.org\/pdf\/\d+\.\d+(v\d+)?$/;
  return pattern.test(url);
}

// 备用复制方法，使用document.execCommand
function copyTextWithExecCommand(text) {
const textarea = document.createElement('textarea');
textarea.value = text;
textarea.style.position = 'fixed';
textarea.style.opacity = '0';
document.body.appendChild(textarea);
textarea.select();
document.execCommand('copy');
document.body.removeChild(textarea);
}

const QUICK_TRANS = "quick-trans";

// Scope for popup and container elements, created once if enabled
let translationPopup = null;
let contentContainer = null;
let quickTransButton = null; // Variable for the button as well

function hideQuickTransButton() {
  if (quickTransButton) {
    quickTransButton.style.display = 'none';
  }
}

// 确保DOM准备就绪后再初始化快捷翻译
function initQuickTranslate() {
  // 划词翻译功能已移除（用户不需要）：清理可能残留的按钮/弹窗并整体禁用
  const staleButton = document.getElementById('fisherai-button-id');
  if (staleButton) staleButton.remove();
  const stalePopup = document.getElementById('fisherai-transpop-id');
  if (stalePopup) stalePopup.remove();
  return;
  
  // 是否开启快捷翻译
  try {
    chrome.storage.sync.get(QUICK_TRANS, function(config) {
const quickTransConfig = config[QUICK_TRANS] || {};
const enabled = quickTransConfig.enabled !== false; // 默认启用，除非明确设置为false

if(enabled === false) {
  // Clean up any existing elements if the setting was changed to disabled
  const existingButton = document.getElementById('fisherai-button-id');
  if (existingButton) existingButton.remove();
  const existingPopup = document.getElementById('fisherai-transpop-id');
  if (existingPopup) existingPopup.remove();
  return;
}

// --- Create elements only if they don't exist ---

// Create translation popup if it doesn't exist
if (!document.getElementById('fisherai-transpop-id')) {
    translationPopup = document.createElement('div');
    translationPopup.id = 'fisherai-transpop-id';
    translationPopup.style.display = 'none';
    translationPopup.style.position = 'absolute';
    translationPopup.style.zIndex = '9999';
    translationPopup.style.padding = '16px';
    translationPopup.style.borderRadius = '12px';
    translationPopup.style.width = '320px';
    translationPopup.style.minHeight = '80px';
    translationPopup.style.maxHeight = '400px';
    translationPopup.style.overflowY = 'auto';
    translationPopup.style.fontSize = '14px';
    translationPopup.style.lineHeight = '1.6';
    translationPopup.style.backdropFilter = 'blur(8px)';
    translationPopup.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    translationPopup.style.boxSizing = 'border-box';
    translationPopup.style.transform = 'translateY(8px)';
    translationPopup.style.opacity = '0';
    document.body.appendChild(translationPopup);

    // Create drag handle
    const dragHandle = document.createElement('div');
    dragHandle.style.position = 'absolute';
    dragHandle.style.top = '8px';
    dragHandle.style.left = '8px';
    dragHandle.style.width = '24px';
    dragHandle.style.height = '24px';
    dragHandle.style.cursor = 'move';
    dragHandle.style.borderRadius = '4px';
    dragHandle.style.display = 'flex';
    dragHandle.style.alignItems = 'center';
    dragHandle.style.justifyContent = 'center';
    dragHandle.style.fontSize = '14px';
    dragHandle.style.opacity = '0.5';
    dragHandle.style.transition = 'all 0.2s';
    dragHandle.style.userSelect = 'none';
    dragHandle.style.fontWeight = 'bold';
    dragHandle.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="5" cy="5" r="2"/>
        <circle cx="12" cy="5" r="2"/>
        <circle cx="19" cy="5" r="2"/>
        <circle cx="5" cy="12" r="2"/>
        <circle cx="12" cy="12" r="2"/>
        <circle cx="19" cy="12" r="2"/>
        <circle cx="5" cy="19" r="2"/>
        <circle cx="12" cy="19" r="2"/>
        <circle cx="19" cy="19" r="2"/>
      </svg>
    `; // 9点网格拖拽图标
    dragHandle.title = '拖拽移动窗口'; // 添加提示
    
    // 添加拖拽悬停效果
    dragHandle.addEventListener('mouseover', function() {
      dragHandle.style.opacity = '1';
      dragHandle.style.backgroundColor = 'rgba(100, 116, 139, 0.15)';
      dragHandle.style.transform = 'scale(1.1)';
    });
    
    dragHandle.addEventListener('mouseout', function() {
      dragHandle.style.opacity = '0.5';
      dragHandle.style.backgroundColor = 'transparent';
      dragHandle.style.transform = 'scale(1)';
    });
    
    // 拖拽变量
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let popupStartX = 0;
    let popupStartY = 0;
    
    // 开始拖拽
    dragHandle.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return; // 只响应左键
      
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      
      // 获取弹窗当前位置
      const rect = translationPopup.getBoundingClientRect();
      popupStartX = rect.left + window.scrollX;
      popupStartY = rect.top + window.scrollY;
      
      // 禁用文本选择和过渡效果
      document.body.style.userSelect = 'none';
      translationPopup.style.transition = 'none';
      
      e.preventDefault();
      e.stopPropagation();
    });
    
    // 拖拽过程
    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      
      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;
      
      let newX = popupStartX + deltaX;
      let newY = popupStartY + deltaY;
      
      // 限制弹窗不要超出视口边界
      const rect = translationPopup.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      
      newX = Math.max(0, Math.min(newX, maxX + window.scrollX));
      newY = Math.max(0, Math.min(newY, maxY + window.scrollY));
      
      translationPopup.style.left = `${newX}px`;
      translationPopup.style.top = `${newY}px`;
      
      e.preventDefault();
    });
    
    // 结束拖拽
    document.addEventListener('mouseup', function(e) {
      if (!isDragging) return;
      
      isDragging = false;
      
      // 恢复文本选择和过渡效果
      document.body.style.userSelect = '';
      translationPopup.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      
      e.preventDefault();
    });
    
    translationPopup.appendChild(dragHandle);

    // Create close button
    const closeButton = document.createElement('div');
    closeButton.style.position = 'absolute';
    closeButton.style.top = '8px';
    closeButton.style.right = '8px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.width = '24px';
    closeButton.style.height = '24px';
    closeButton.style.display = 'flex';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
    closeButton.style.borderRadius = '4px';
    closeButton.style.fontSize = '14px';
    closeButton.style.color = 'rgba(66, 153, 225, 0.8)';
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.transition = 'background-color 0.2s';
    closeButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    
    // 添加悬停效果
    closeButton.addEventListener('mouseover', function() {
      closeButton.style.backgroundColor = 'rgba(66, 153, 225, 0.1)';
    });
    
    closeButton.addEventListener('mouseout', function() {
      closeButton.style.backgroundColor = 'transparent';
    });
    
    closeButton.addEventListener('click', function() {
      if (translationPopup) {
        translationPopup.style.opacity = '0';
        translationPopup.style.transform = 'translateY(8px)';
        setTimeout(() => {
          translationPopup.style.display = 'none';
        }, 300); // 与transition时间匹配
      }
    });
    translationPopup.appendChild(closeButton);

    // Create content container
    contentContainer = document.createElement('div');
    contentContainer.id = 'fisherai-transpop-content'; // Keep ID for potential external use/styling
    contentContainer.style.marginTop = '5px'; // 为拖拽手柄留出空间
    contentContainer.style.paddingTop = '8px';

    // Apply theme based on stored appearance setting
    applyThemeToTranslationPopup();

    translationPopup.appendChild(contentContainer);

} else {
    // If popup exists, re-assign variables
    translationPopup = document.getElementById('fisherai-transpop-id');
    contentContainer = translationPopup.querySelector('#fisherai-transpop-content'); // Find existing container
    if (!contentContainer) {
        console.error("[FisherAI] Could not find content container in existing popup.");
        // Optionally recreate it if missing
        contentContainer = document.createElement('div');
        contentContainer.id = 'fisherai-transpop-content';
        contentContainer.style.marginTop = '32px'; // 为拖拽手柄留出空间
        contentContainer.style.paddingTop = '8px';
        
        // Apply theme based on stored appearance setting
        applyThemeToTranslationPopup();
        
        // Make sure it's appended correctly, e.g., after the close button if it exists
        const closeBtn = translationPopup.querySelector('div[style*="position: absolute"]');
        if (closeBtn) {
          translationPopup.insertBefore(contentContainer, closeBtn.nextSibling);
        } else {
          translationPopup.appendChild(contentContainer);
        }
    } else {
        // Apply theme to existing container
        applyThemeToTranslationPopup();
    }
}


// Create button element if it doesn't exist
if (!document.getElementById('fisherai-button-id')) {
    quickTransButton = document.createElement('button');
    quickTransButton.id = 'fisherai-button-id';
    quickTransButton.style.position = 'absolute';
    quickTransButton.style.zIndex = '999999';
    quickTransButton.style.border = 'none';
    quickTransButton.style.borderRadius = '50%';
    quickTransButton.style.width = '32px';
    quickTransButton.style.height = '32px';
    quickTransButton.style.display = 'none'; // Initially hidden
    quickTransButton.style.alignItems = 'center';
    quickTransButton.style.justifyContent = 'center';
    quickTransButton.style.cursor = 'pointer';
    quickTransButton.style.transition = 'transform 0.2s ease';
    quickTransButton.style.backgroundColor = '#4A90E2';
    quickTransButton.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';

    // Add hover effects
    quickTransButton.addEventListener('mouseover', function() {
      quickTransButton.style.transform = 'scale(1.1)';
    });
    quickTransButton.addEventListener('mouseout', function() {
      quickTransButton.style.transform = 'scale(1)';
    });

    // Create and add image to button
    const image = document.createElement('img');
    try {
        image.src = chrome.runtime.getURL('images/logo_48.png');
    } catch (error) {
        console.warn('[FisherAI] Failed to get button image URL:', error);
        // 使用默认图片或文本
        image.style.display = 'none';
    }
    image.style.width = '20px';
    image.style.height = '20px';
    image.style.filter = 'drop-shadow(0 0 1px rgba(0, 0, 0, 0.5))';
    quickTransButton.appendChild(image);

    // Add button to body
    document.body.appendChild(quickTransButton);

    // --- Add button click listener ---
    quickTransButton.addEventListener('click', function () {
      try {
        chrome.storage.sync.get([QUICK_TRANS], async function(config) {
        // Use the persistent variables
        if (!translationPopup || !contentContainer) {
          console.error("[FisherAI] Translation popup or content container not ready.");
          // Attempt to find them again
          translationPopup = document.getElementById('fisherai-transpop-id');
          if (translationPopup) {
              contentContainer = translationPopup.querySelector('#fisherai-transpop-content');
          }
          if (!translationPopup || !contentContainer) {
              console.error("[FisherAI] Failed to re-acquire popup/container. Aborting translate.");
              return; // Can't proceed
          }
        }

        // --- Get selected text early ---
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return; // No selection
        const selectedText = selection.toString().trim();
        if (selectedText === '') {
          return;
        }

        // --- FIRST: Set the loading spinner content immediately ---
        contentContainer.innerHTML = '<div style="display: flex; justify-content: center; padding: 20px;"><div style="width: 24px; height: 24px; border: 3px solid rgba(0, 0, 0, 0.1); border-top: 3px solid #3498db; border-radius: 50%; animation: fisherai-spin 1s linear infinite;"></div></div>';

        // Add loading animation style if needed
        if (!document.getElementById('fisherai-animation-style')) {
          const style = document.createElement('style');
          style.id = 'fisherai-animation-style';
          style.textContent = '@keyframes fisherai-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
          document.head.appendChild(style);
        }

        // --- Position calculations ---
        const range = selection.getRangeAt(0);
        const rects = range.getClientRects();
        if (rects.length === 0) return; // No layout for selection

        let minX = Infinity;
        let maxX = -Infinity;
        for (const rect of rects) {
          minX = Math.min(minX, rect.left);
          maxX = Math.max(maxX, rect.right);
        }
        const firstRect = rects[0];
        const lastRect = rects[rects.length - 1];
        const middleX = (minX + maxX) / 2 + window.scrollX;

        // Prepare popup for positioning
        translationPopup.style.display = 'block';
        translationPopup.style.visibility = 'hidden';

        const popupWidth = translationPopup.offsetWidth || 320;
        const popupHeight = translationPopup.offsetHeight || 180;
        const viewportTop = window.scrollY;
        const viewportBottom = window.scrollY + window.innerHeight;

        const desiredTopAbove = firstRect.top + window.scrollY - popupHeight - 15;
        const desiredTopBelow = lastRect.bottom + window.scrollY + 15;

        let topPosition = desiredTopAbove;
        if (topPosition < viewportTop + 10) {
          // Not enough room above, fall back below selection
          topPosition = Math.min(desiredTopBelow, viewportBottom - popupHeight - 10);
        }

        const minLeft = window.scrollX + 10;
        const maxLeft = window.scrollX + document.documentElement.clientWidth - popupWidth - 10;
        let leftPosition = middleX - popupWidth / 2;
        leftPosition = Math.max(minLeft, Math.min(leftPosition, maxLeft));

        translationPopup.style.top = `${Math.max(viewportTop + 10, topPosition)}px`;
        translationPopup.style.left = `${leftPosition}px`;
        translationPopup.style.opacity = '0';
        translationPopup.style.transform = 'translateY(8px)';
        translationPopup.style.visibility = 'visible';
        
        // --- THEN: Show popup immediately with loading state ---
        
        // Small delay for fade and slide-in effect
        setTimeout(() => {
          if (translationPopup) {
            translationPopup.style.opacity = '1';
            translationPopup.style.transform = 'translateY(0)';
          }
        }, 10);

        // Hide the button itself
        hideQuickTransButton();

        // --- Call LLM ---
        try {
          const quickTransConfig = config[QUICK_TRANS] || {};
          const model = quickTransConfig.selectedModel || DEFAULT_QUICK_TRANS_MODEL;
          const provider = quickTransConfig.provider || DEFAULT_QUICK_TRANS_PROVIDER;
          if (!model || !provider) {
               contentContainer.innerHTML = DEFAULT_TIPS;
               return;
          }

          const {baseUrl, apiKey} = await getBaseUrlAndApiKey(provider);
          const translatePrompt = await getTranslatePrompt();

          if(provider.includes('fisherai') || provider.includes('ollama')) {
            chatWithLLM(model, provider, translatePrompt + selectedText, null, HUACI_TRANS_TYPE);
          } else {
            if(baseUrl && apiKey) {
              chatWithLLM(model, provider, translatePrompt + selectedText, null, HUACI_TRANS_TYPE);
            } else {
              contentContainer.innerHTML = DEFAULT_TIPS; // Update persistent container
            }
          }
        } catch (error) {
          console.error('Error retrieving model/API info or translating:', error);
          contentContainer.innerHTML = DEFAULT_TIPS; // Update persistent container
        }
        });
      } catch (error) {
        // 处理扩展上下文失效错误
        if (error.message && error.message.includes('Extension context invalidated')) {
          console.warn('[FisherAI] Extension context invalidated, please refresh the page');
          if (contentContainer) {
            contentContainer.innerHTML = '<div style="color: #f59e0b; padding: 10px; text-align: center;">扩展已更新，请刷新页面后重试</div>';
          }
        } else {
          console.error('[FisherAI] Chrome API error:', error);
          if (contentContainer) {
            contentContainer.innerHTML = '<div style="color: #ef4444; padding: 10px; text-align: center;">翻译功能暂时不可用</div>';
          }
        }
      }
    }); // End of button click listener

} else {
    // Button exists, re-assign variable
    quickTransButton = document.getElementById('fisherai-button-id');
}


// --- Setup mouse listeners ---

// Listen for text selection release
document.addEventListener('mouseup', function (event) {
  // Prevent interfering with popup interactions
  if (translationPopup && translationPopup.contains(event.target)) {
      return;
  }
  // Prevent interfering with button clicks
  if (quickTransButton && quickTransButton.contains(event.target)) {
      return;
  }

  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (selectedText && quickTransButton) {
    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    if (rects.length > 0) {
      // 使用第一个矩形，代表选中文本的第一行
      const firstRect = rects[0];
      
      // 计算选中文本的水平中心点
      let minX = Infinity;
      let maxX = -Infinity;
      for (const rect of rects) {
        minX = Math.min(minX, rect.left);
        maxX = Math.max(maxX, rect.right);
      }
      const middleX = (minX + maxX) / 2;
      
      // 计算按钮应放置的位置
      // 水平位置：放在文本的水平中心
      const buttonLeft = Math.max(0, middleX + window.scrollX - (quickTransButton.offsetWidth / 2));
      
      // 垂直位置：放在第一行的上方，确保不遮挡文本
      const buttonTop = Math.max(0, firstRect.top + window.scrollY - quickTransButton.offsetHeight - 40); // 10px间距
      
      // 设置按钮位置
      quickTransButton.style.top = `${buttonTop}px`; 
      quickTransButton.style.left = `${buttonLeft}px`;
      quickTransButton.style.display = 'flex';

      // Animation
      quickTransButton.style.transform = 'scale(0.8)';
      setTimeout(() => {
        quickTransButton.style.transform = 'scale(1)';
      }, 50);

      // 发送选中内容到侧边栏
      try {
        chrome.runtime.sendMessage({
          action: 'sendSelectedTextToSidePanel',
          selectedText: selectedText,
          url: window.location.href
        }).catch(err => {
          console.log('[FisherAI] 发送选中内容到侧边栏失败:', err);
        });
      } catch (error) {
        console.log('[FisherAI] 发送选中内容异常:', error);
      }
    }
  } else {
    // No text selected or button doesn't exist, hide button
    hideQuickTransButton();
    // Do NOT hide the popup here, only hide button. Popup hides on close click or mousedown outside.
  }
});

// 监听选中状态变化
function checkSelectionChange() {
  const selection = window.getSelection();
  const selectedText = selection ? selection.toString().trim() : '';

  if (!selectedText) {
    hideQuickTransButton();
    // 选中内容被清除，通知侧边栏
    try {
      chrome.runtime.sendMessage({
        action: 'clearSelectedTextFromSidePanel',
        url: window.location.href
      }).catch(err => {
        console.log('[FisherAI] 发送清除选中内容消息失败:', err);
      });
    } catch (error) {
      console.log('[FisherAI] 发送清除选中内容异常:', error);
    }
  }
}

// 监听选中状态变化事件
document.addEventListener('selectionchange', function() {
  // 使用节流，避免频繁触发
  clearTimeout(window.selectionChangeTimeout);
  window.selectionChangeTimeout = setTimeout(checkSelectionChange, 300);
});

// Listen for clicks outside the selection/button/popup
document.addEventListener('mousedown', function (event) {
  const clickedButton = quickTransButton && quickTransButton.contains(event.target);
  const clickedPopup = translationPopup && translationPopup.contains(event.target);
  
  // 检查是否点击在拖拽手柄上
  const clickedDragHandle = translationPopup && 
    translationPopup.querySelector('div[style*="cursor: move"]') && 
    translationPopup.querySelector('div[style*="cursor: move"]').contains(event.target);

  if (!clickedButton && !clickedPopup) {
      // Clicked outside, hide button and popup, clear selection
      hideQuickTransButton();
      if (translationPopup) {
        translationPopup.style.opacity = '0';
        translationPopup.style.transform = 'translateY(8px)';
        setTimeout(() => {
          translationPopup.style.display = 'none';
        }, 300); // 与transition时间匹配
      }

      // Clear selection only if text wasn't just selected
      const selection = window.getSelection();
      if (selection && selection.toString().trim() === '') {
        // Don't clear if user might be starting a new selection
      } else if (selection) {
        // Allow a frame for potential double-click or drag start
        setTimeout(() => {
          const currentSelection = window.getSelection();
          // If selection still exists and wasn't changed by user action, clear it
          if (currentSelection && currentSelection.toString().trim() !== '' && !document.getSelection().isCollapsed) {
            // Check again if the click was part of starting a new selection - this is tricky
            // A simpler approach might be to just always hide, and let user re-select if needed.
            // For now, let's unconditionally hide button/popup and clear selection on outside click.
            // window.getSelection().removeAllRanges(); // This might interfere with normal page interaction. Reconsider.
          }
        }, 50);
      }
    }
  // If click was ON the button, the button's own click handler manages the popup visibility.
  // If click was IN the popup, do nothing (allow interaction).
});

    }); // End of chrome.storage.sync.get
  } catch (error) {
    // 处理扩展上下文失效错误
    if (error.message && error.message.includes('Extension context invalidated')) {
      console.warn('[FisherAI] Extension context invalidated during quick translate initialization');
    } else {
      console.error('[FisherAI] Chrome API error during initialization:', error);
    }
  }
} // End of initQuickTranslate function

// 初始化快捷翻译功能
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuickTranslate);
} else {
    // DOM已经加载完成，直接初始化
    initQuickTranslate();
}

// 页面加载完成后发送页面内容到侧边栏
function sendPageContentToSidePanel() {
  // 等待页面完全加载
  setTimeout(async () => {
    try {
      // 首先检查是否有选中的内容
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (selectedText) {
        // 如果有选中内容，发送选中内容
        chrome.runtime.sendMessage({
          action: 'sendSelectedTextToSidePanel',
          selectedText: selectedText,
          url: window.location.href
        }).catch(err => {
          console.log('[FisherAI] 发送选中内容到侧边栏失败:', err);
        });
      } else {
        // 如果没有选中内容，根据页面类型获取相应内容
        let pageContent = "No content";
        let contentType = "webpage"; // 默认为普通网页
        const pageTitle = document.title || "Untitled";
        const pageUrl = window.location.href;
        
        try {
          if (isVideoUrl(pageUrl)) {
            // 视频页面：获取字幕内容
            pageContent = await extractSubtitles(pageUrl, FORMAT_TEXT);
            contentType = "video";
          } else if (isPDFUrl(pageUrl)) {
            // PDF页面：获取PDF内容
            pageContent = await extractPDFText(pageUrl);
            contentType = "pdf";
          } else {
            // 普通网页：获取HTML内容
            pageContent = extractContent() || "No content";
            contentType = "webpage";
          }
        } catch (error) {
          console.log('[FisherAI] 提取页面内容失败，使用默认HTML内容:', error);
          pageContent = extractContent() || "No content";
          contentType = "webpage";
        }
        
        chrome.runtime.sendMessage({
          action: 'sendPageContentToSidePanel',
          pageContent: pageContent,
          pageTitle: pageTitle,
          url: pageUrl,
          contentType: contentType
        }).catch(err => {
          console.log('[FisherAI] 发送页面内容到侧边栏失败:', err);
        });
      }
    } catch (error) {
      console.log('[FisherAI] 发送页面内容异常:', error);
    }
  }, 3000); // 增加延迟到3秒，确保视频页面和PDF页面有足够时间加载
}

// 在页面加载时发送内容
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', sendPageContentToSidePanel);
} else {
  sendPageContentToSidePanel();
}

// 监听页面导航变化
let lastPageUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastPageUrl) {
    lastPageUrl = currentUrl;
    sendPageContentToSidePanel(); // 重新发送页面内容
  }
}).observe(document, { subtree: true, childList: true });

// IMPORTANT: Ensure the code that receives the translation result (likely via chrome.runtime.onMessage)
// uses the 'contentContainer' variable or reliably finds '#fisherai-transpop-content'
// to update the innerHTML, e.g.:
// chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
//   if (request.action === "displayTranslation") {
//     if (contentContainer) { // Use the variable if available
//       contentContainer.innerHTML = request.translationHtml;
//     } else { // Fallback if script reloaded or variable lost
//       const container = document.getElementById('fisherai-transpop-content');
//       if (container) container.innerHTML = request.translationHtml;
//     }
//   }
// });

// Function to apply theme to the translation popup based on user settings
function applyThemeToTranslationPopup() {
    try {
        chrome.storage.sync.get('appearance', function(result) {
        const appearance = result.appearance || 'dark'; // Default to dark mode
        
        if (contentContainer) {
            if (appearance === 'light') {
                contentContainer.classList.add('light-mode');
                contentContainer.style.backgroundColor = '#FFFFFF';
                contentContainer.style.color = '#1A202C';
            } else {
                contentContainer.classList.remove('light-mode');
                contentContainer.style.backgroundColor = '#1E293B';
                contentContainer.style.color = '#E2E8F0';
            }
        }
        
        if (translationPopup) {
            const dragHandle = translationPopup.querySelector('div[style*="cursor: move"]');
            
            if (appearance === 'light') {
                translationPopup.classList.add('light-mode');
                translationPopup.style.backgroundColor = '#FFFFFF';
                translationPopup.style.color = '#1A202C';
                translationPopup.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
                translationPopup.style.border = '1px solid #E2E8F0';
                
                // 更新拖拽手柄颜色
                if (dragHandle) {
                    dragHandle.style.color = '#64748B';
                }
            } else {
                translationPopup.classList.remove('light-mode');
                translationPopup.style.backgroundColor = '#1E293B';
                translationPopup.style.color = '#E2E8F0';
                translationPopup.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
                translationPopup.style.border = '1px solid #4A5568';
                
                // 更新拖拽手柄颜色
                if (dragHandle) {
                    dragHandle.style.color = '#94A3B8';
                }
            }
        }
        });
    } catch (error) {
        // 处理扩展上下文失效错误
        if (error.message && error.message.includes('Extension context invalidated')) {
            console.warn('[FisherAI] Extension context invalidated during theme application');
        } else {
            console.error('[FisherAI] Chrome API error during theme application:', error);
        }
        // 使用默认暗色主题
        if (translationPopup) {
            translationPopup.style.backgroundColor = '#1E293B';
            translationPopup.style.color = '#E2E8F0';
        }
        if (contentContainer) {
            contentContainer.style.backgroundColor = '#1E293B';
            contentContainer.style.color = '#E2E8F0';
        }
    }
}

// Listen for changes to appearance setting
try {
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        if (namespace === 'sync' && changes.appearance) {
            applyThemeToTranslationPopup();
        }
    });
} catch (error) {
    console.warn('[FisherAI] Failed to add storage change listener:', error);
}
