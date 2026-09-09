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
 * 获取 B站 视频的 bvid/cid/时长
 * @param {string} url 
 * @returns {Promise<{bvid: string, cid: number, duration: number}>}
 */
async function getBilibiliVideoInfo(url) {
    const urlObj = new URL(url);
    const pathSearchs = {};
    urlObj.search.slice(1).replace(/([^=&]*)=([^=&]*)/g, (matchs, a, b) => { pathSearchs[a] = b; });

    let bvid = pathSearchs.bvid;
    if (!bvid) {
        let path = urlObj.pathname;
        if (path.endsWith('/')) {
            path = path.slice(0, -1);
        }
        const parts = path.split('/');
        bvid = parts[parts.length - 1];
    }
    if (!bvid || !bvid.toLowerCase().startsWith('bv')) {
        throw new Error('无法从 URL 中提取 BVID');
    }

    const viewResponse = await fetch(
        `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`,
        { credentials: 'include' }
    );
    const viewData = await viewResponse.json();
    if (viewData.code !== 0 || !viewData.data || !viewData.data.pages || viewData.data.pages.length === 0) {
        throw new Error(`获取视频信息失败: ${viewData.message || '未知错误'}`);
    }
    return {
        bvid: bvid,
        cid: viewData.data.pages[0].cid,
        duration: viewData.data.duration || 0
    };
}

/**
 * 加载 storyboard 宫格图为 ImageBitmap
 */
async function loadStoryboardBitmap(imgUrl) {
    const full = imgUrl.startsWith('http') ? imgUrl : 'https:' + imgUrl;
    const blob = await fetch(full).then(res => res.blob());
    return await createImageBitmap(blob);
}

/**
 * 计算宫格图单个格位的 8x8 灰度均值哈希
 */
function hashStoryboardCell(bitmap, cell, xLen, frameWidth, frameHeight) {
    return new Promise((resolve) => {
        try {
            const col = cell % xLen;
            const row = Math.floor(cell / xLen);
            const canvas = document.createElement('canvas');
            canvas.width = 8;
            canvas.height = 8;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, col * frameWidth, row * frameHeight, frameWidth, frameHeight, 0, 0, 8, 8);
            const data = ctx.getImageData(0, 0, 8, 8).data;
            const gray = new Array(64);
            let sum = 0;
            for (let i = 0; i < 64; i++) {
                gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
                sum += gray[i];
            }
            const avg = sum / 64;
            resolve(gray.map(v => (v >= avg ? 1 : 0)));
        } catch (error) {
            resolve(null);
        }
    });
}

function hashHammingDistance(a, b) {
    if (!a || !b || a.length !== b.length) {
        return 64;
    }
    let distance = 0;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            distance++;
        }
    }
    return distance;
}

/**
 * 通过 B站 videoshot 接口获取整片的预览宫格图并切分为单帧
 * 实测发现 B站 用最后一帧填充宫格尾部（57s 视频仅 12 帧真实画面、213s 视频仅 43 帧），
 * 因此先检测尾部重复格，按真实帧数重算时间间隔；候选帧池上限 120
 * @param {string} url 
 */
async function fetchBilibiliStoryboardFrames(url) {
    const info = await getBilibiliVideoInfo(url);
    const shotResponse = await fetch(
        `https://api.bilibili.com/x/player/videoshot?bvid=${info.bvid}&cid=${info.cid}`,
        { credentials: 'include' }
    );
    const shotData = await shotResponse.json();
    if (shotData.code !== 0 || !shotData.data || !Array.isArray(shotData.data.image) || shotData.data.image.length === 0) {
        throw new Error('B站视频预览图获取失败');
    }
    const d = shotData.data;
    const xLen = d.img_x_len || 10;
    const yLen = d.img_y_len || 10;
    const frameWidth = d.img_x_size || 480;
    const frameHeight = d.img_y_size || 270;
    const cellsPerImage = xLen * yLen;

    // 优先用 B站 播放器的权威时间轴（pvdata.bin）：大端 u16，每帧一个时间（秒）
    let frameTimes = null;
    try {
        if (d.pvdata) {
            const pvUrl = d.pvdata.startsWith('http') ? d.pvdata : 'https:' + d.pvdata;
            const bin = new Uint8Array(await fetch(pvUrl).then(r => r.arrayBuffer()));
            const raw = [];
            for (let i = 0; i + 1 < bin.length; i += 2) {
                raw.push((bin[i] << 8) | bin[i + 1]);
            }
            if (raw.length > 0) {
                frameTimes = raw;
            }
        }
    } catch (error) {
        console.warn('pvdata 时间轴解析失败，回退哈希去重估算:', error);
    }

    let realFrames;
    if (frameTimes) {
        realFrames = frameTimes.length;
    } else {
        // 回退：检测最后一张宫格图的尾部填充（用末帧重复填充的格位）
        realFrames = d.image.length * cellsPerImage;
        const lastImgIdx = d.image.length - 1;
        const lastBitmap = await loadStoryboardBitmap(d.image[lastImgIdx]);
        try {
            const lastHashes = [];
            for (let cell = 0; cell < cellsPerImage; cell++) {
                lastHashes.push(await hashStoryboardCell(lastBitmap, cell, xLen, frameWidth, frameHeight));
            }
            let suffixRun = 0;
            for (let cell = cellsPerImage - 1; cell >= 1; cell--) {
                if (hashHammingDistance(lastHashes[cell], lastHashes[cell - 1]) <= 2) {
                    suffixRun++;
                } else {
                    break;
                }
            }
            if (suffixRun >= 3) {
                realFrames = (d.image.length - 1) * cellsPerImage + (cellsPerImage - suffixRun);
            }
        } catch (error) {
            console.warn('预览图填充检测失败，按全量格位处理:', error);
        } finally {
            lastBitmap.close();
        }
    }
    const interval = realFrames > 0 && info.duration > 0 ? info.duration / realFrames : 1;

    // 候选帧池上限 120：只在真实帧上均匀抽样，避免裁剪填充格
    const maxPool = 120;
    const ordinals = [];
    if (realFrames <= maxPool) {
        for (let k = 0; k < realFrames; k++) {
            ordinals.push(k);
        }
    } else {
        for (let i = 0; i < maxPool; i++) {
            ordinals.push(Math.round((i * (realFrames - 1)) / (maxPool - 1)));
        }
    }

    const frames = [];
    const bitmapCache = new Map();
    for (const ordinal of ordinals) {
        const imgIdx = Math.floor(ordinal / cellsPerImage);
        const cell = ordinal % cellsPerImage;
        let bitmap = bitmapCache.get(imgIdx);
        if (!bitmap) {
            bitmap = await loadStoryboardBitmap(d.image[imgIdx]);
            bitmapCache.set(imgIdx, bitmap);
        }
        const col = cell % xLen;
        const row = Math.floor(cell / xLen);
        const canvas = document.createElement('canvas');
        canvas.width = frameWidth;
        canvas.height = frameHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, col * frameWidth, row * frameHeight, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
        // 有权威时间轴就用它；否则按真实帧数估算
        let frameTime = Math.round(ordinal * interval);
        if (frameTimes && ordinal < frameTimes.length) {
            frameTime = frameTimes[ordinal];
        }
        frames.push({
            dataURL: canvas.toDataURL('image/jpeg', 0.8),
            t: frameTime
        });
    }
    for (const bitmap of bitmapCache.values()) {
        bitmap.close();
    }
    return frames;
}

/**
 * 用 Youtube-transcript.js 提取 youtube 视频字幕
 * @returns 
 */
async function extractYoutubeSubtitles(url, format) {
    try {
        // 不指定语言，优先取视频自带的第一条字幕轨（很多中文视频只有 zh 自动字幕，
        // 硬指定 'en' 会因 languageCode 不匹配而失败）
        let subtitles;
        try {
            subtitles = await YoutubeTranscript.fetchTranscript(url);
        } catch (firstError) {
            // 兜底：再尝试英文轨道
            subtitles = await YoutubeTranscript.fetchTranscript(url, {lang: 'en'});
        }
        const formattedSubtitles = youtubeSubtitlesJSONToFormat(subtitles, format);
        return formattedSubtitles;
    } catch (error) {
        console.error('Error fetching subtitles:', error);
        throw new Error('视频字幕获取失败：该视频可能没有字幕（含自动字幕），或 YouTube 字幕接口暂时不可用（需代理/登录）。');
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

// 当前 UI 语言，默认中文
let currentUILanguage = 'zh-CN';

// 工具调用的本地化文案
const TOOL_LOCALE_MAP = {
    'zh': {
        tool_common_preparing: '等待调用…',
        tool_common_running: '执行中…',
        tool_common_success: '完成',
        tool_common_failed: '调用失败',
        tool_common_error_prefix: '错误：',
        tool_serpapi_title: '联网搜索',
        tool_serpapi_running: '正在联网搜索…',
        tool_serpapi_success: '搜索完成',
        tool_serpapi_no_results: '未找到可靠的公开数据。',
        tool_serpapi_sources: '引用来源',
        tool_serpapi_answer: '直接答案',
        tool_serpapi_open: '打开链接',
        tool_serpapi_read_label: '阅读',
        tool_serpapi_and_more: '等 {count} 个来源',
        tool_serpapi_search_label: '搜索的网页',
        tool_serpapi_more: '更多',
        tool_serpapi_show_less: '收起',
        tool_dalle_title: '图像生成',
        tool_dalle_running: '正在生成图像…',
        tool_dalle_success: '生成完成',
        tool_dalle_error: '图像生成失败',
        tool_dalle_prompt: '提示词',
        tool_dalle_view: '查看原图',
        tool_dalle_download: '下载图片',
        tool_nano_banana_title: 'Nano Banana 图像',
        tool_nano_banana_running: '正在通过 nano-banana 生成图像…',
        tool_nano_banana_success: '生成完成',
        tool_nano_banana_error: 'nano-banana 图像生成失败',
        tool_nano_banana_prompt: '提示词',
        tool_nano_banana_view: '查看原图',
        tool_nano_banana_download: '下载图片',
        tool_image_gallery_fallback: '图片生成完成，请查看下方结果。'
    },
    'en': {
        tool_common_preparing: 'Queued…',
        tool_common_running: 'In progress…',
        tool_common_success: 'Completed',
        tool_common_failed: 'Failed',
        tool_common_error_prefix: 'Error: ',
        tool_serpapi_title: 'Web Search',
        tool_serpapi_running: 'Searching the web…',
        tool_serpapi_success: 'Search ready',
        tool_serpapi_no_results: 'No reliable public sources found.',
        tool_serpapi_sources: 'Sources',
        tool_serpapi_answer: 'Direct answer',
        tool_serpapi_open: 'Open link',
        tool_serpapi_read_label: 'Read',
        tool_serpapi_and_more: 'and {count} more',
        tool_serpapi_search_label: 'Searched the web',
        tool_serpapi_more: 'more',
        tool_serpapi_show_less: 'Show less',
        tool_dalle_title: 'Image Generation',
        tool_dalle_running: 'Generating images…',
        tool_dalle_success: 'Images ready',
        tool_dalle_error: 'Image generation failed',
        tool_dalle_prompt: 'Prompt',
        tool_dalle_view: 'Open original',
        tool_dalle_download: 'Download',
        tool_nano_banana_title: 'Nano Banana Images',
        tool_nano_banana_running: 'Generating images via nano-banana…',
        tool_nano_banana_success: 'Images ready',
        tool_nano_banana_error: 'nano-banana image generation failed',
        tool_nano_banana_prompt: 'Prompt',
        tool_nano_banana_view: 'Open original',
        tool_nano_banana_download: 'Download',
        tool_image_gallery_fallback: 'Images ready. See below.'
    }
};

function setUILanguage(lang) {
    if (typeof lang === 'string' && lang.trim().length > 0) {
        currentUILanguage = lang;
    }
}

function resolveUILanguageBucket() {
    if (!currentUILanguage) {
        return 'zh';
    }
    const lowered = currentUILanguage.toLowerCase();
    if (lowered.startsWith('zh')) {
        return 'zh';
    }
    return 'en';
}

function getToolLocaleText(key) {
    const bucket = resolveUILanguageBucket();
    const locale = TOOL_LOCALE_MAP[bucket] || TOOL_LOCALE_MAP.en;
    if (locale && locale[key]) {
        return locale[key];
    }
    if (bucket !== 'en' && TOOL_LOCALE_MAP.en[key]) {
        return TOOL_LOCALE_MAP.en[key];
    }
    return key;
}

function createToolCallCard(options) {
    const { type, titleText, statusText, collapsible = false, startCollapsed = false } = options;
    const card = document.createElement('div');
    card.className = `tool-card tool-card-${type}`;
    if (collapsible) {
        card.dataset.collapsible = 'true';
    }

    const header = document.createElement('div');
    header.className = 'tool-card__header';

    const title = document.createElement('span');
    title.className = 'tool-card__title';
    title.textContent = titleText;

    const headerMeta = document.createElement('div');
    headerMeta.className = 'tool-card__meta';

    const status = document.createElement('span');
    status.className = 'tool-card__status';
    status.textContent = statusText;
    headerMeta.appendChild(status);

    if (collapsible) {
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'tool-card__toggle';
        toggle.setAttribute('aria-expanded', 'true');
        toggle.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        `;
        toggle.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleToolCardCollapsed(card);
        });
        headerMeta.appendChild(toggle);
    }

    header.appendChild(title);
    header.appendChild(headerMeta);

    const body = document.createElement('div');
    body.className = 'tool-card__body';

    card.appendChild(header);
    card.appendChild(body);

    if (collapsible && startCollapsed) {
        setToolCardCollapsed(card, true);
    }

    return { card, statusEl: status, bodyEl: body };
}

function isToolCardCollapsed(card) {
    if (!card) {
        return false;
    }
    return card.classList.contains('is-collapsed');
}

function setToolCardCollapsed(card, collapsed) {
    if (!card) {
        return;
    }
    card.classList.toggle('is-collapsed', collapsed);
    card.dataset.collapsed = collapsed ? 'true' : 'false';
    const toggle = card.querySelector('.tool-card__toggle');
    if (toggle) {
        toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }
}

function toggleToolCardCollapsed(card) {
    if (!card) {
        return;
    }
    const nextState = !isToolCardCollapsed(card);
    setToolCardCollapsed(card, nextState);
}

function updateToolCardStatus(statusEl, text, stateClass) {
    if (!statusEl) {
        return;
    }
    statusEl.textContent = text;
    statusEl.classList.remove('is-running', 'is-success', 'is-error');
    if (stateClass) {
        statusEl.classList.add(stateClass);
    }
}

function renderToolCardError(bodyEl, message) {
    if (!bodyEl) {
        return;
    }
    bodyEl.innerHTML = '';
    const errorBlock = document.createElement('div');
    errorBlock.className = 'tool-card__error';
    errorBlock.textContent = `${getToolLocaleText('tool_common_error_prefix')}${message}`;
    bodyEl.appendChild(errorBlock);
}

function sanitizeAssistantVisibleText(text, options = {}) {
    if (!text || typeof text !== 'string') {
        return text || '';
    }

    const { trimLeading = true } = options;

    let sanitized = text;

    sanitized = sanitized.replace(/<\|tool_calls_section_begin\|>[\s\S]*?<\|tool_calls_section_end\|>/g, '');

    sanitized = sanitized.replace(/<\|tool_call_(?:argument|result)_begin\|>[\s\S]*?<\|tool_call_(?:argument|result)_end\|>/g, '');

    sanitized = sanitized.replace(/<\|(tool_call_begin|tool_call_end|assistant|observation|reflection)\|>/g, '');

    sanitized = sanitized.replace(/<\|\/?(?:response|assistant|message)_annotations?\|>/g, '');

    sanitized = sanitized.replace(/<\|\/?(?:thought|thinking)\|>/g, '');

    if (trimLeading) {
        sanitized = sanitized.replace(/^\s+/, '');
    }

    return sanitized;
}

function extractHostname(url) {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./, '');
    } catch (error) {
        return '';
    }
}

function renderSerpApiResults(bodyEl, result, query) {
    if (!bodyEl) {
        return;
    }
    bodyEl.innerHTML = '';

    const answerBox = result?.answerBox || null;
    const organicResults = Array.isArray(result?.organicResults) ? result.organicResults : [];
    const hasResults = organicResults.length > 0;

    if (!hasResults && !answerBox) {
        const emptyState = document.createElement('div');
        emptyState.className = 'tool-card__empty';
        emptyState.textContent = getToolLocaleText('tool_serpapi_no_results');
        bodyEl.appendChild(emptyState);
        return;
    }

    const hostCandidates = organicResults
        .map(item => item.source || extractHostname(item.link))
        .filter(Boolean);
    const uniqueHosts = Array.from(new Set(hostCandidates));

    if (uniqueHosts.length > 0) {
        const summaryRow = document.createElement('div');
        summaryRow.className = 'serp-card__summary';

        const summaryText = document.createElement('span');
        summaryText.className = 'serp-card__summary-text';
        const readPrefix = getToolLocaleText('tool_serpapi_read_label');
        const andMoreTemplate = getToolLocaleText('tool_serpapi_and_more');
        const primaryHosts = uniqueHosts.slice(0, 2);
        let summarySentence = `${readPrefix} ${primaryHosts.join(', ')}`;
        const remaining = uniqueHosts.length - primaryHosts.length;
        if (remaining > 0) {
            summarySentence += ` ${andMoreTemplate.replace('{count}', remaining)}`;
        }
        summaryText.textContent = summarySentence;
        summaryRow.title = uniqueHosts.join(', ');

        const caret = document.createElement('span');
        caret.className = 'serp-card__caret';
        caret.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        `;

        summaryRow.appendChild(summaryText);
        summaryRow.appendChild(caret);
        bodyEl.appendChild(summaryRow);
    }

    if (hasResults) {
        const label = document.createElement('div');
        label.className = 'serp-card__label';
        label.textContent = getToolLocaleText('tool_serpapi_search_label');
        bodyEl.appendChild(label);

        const list = document.createElement('div');
        list.className = 'serp-card__results';

        const MAX_VISIBLE = 4;
        const hiddenNodes = [];

        organicResults.forEach((item, index) => {
            const pill = document.createElement('a');
            pill.className = 'serp-card__pill';
            pill.href = item.link;
            pill.target = '_blank';
            pill.rel = 'noopener noreferrer';
            pill.title = item.title || item.link;

            if (index >= MAX_VISIBLE) {
                pill.classList.add('is-hidden');
                hiddenNodes.push(pill);
            }

            const iconWrap = document.createElement('span');
            iconWrap.className = 'serp-card__pill-icon';
            const favicon = item.favicon || '';
            if (favicon) {
                const icon = document.createElement('img');
                icon.src = favicon;
                icon.alt = '';
                iconWrap.appendChild(icon);
            } else {
                iconWrap.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.6" />
                        <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                    </svg>
                `;
            }

            const textWrap = document.createElement('span');
            textWrap.className = 'serp-card__pill-text';
            textWrap.textContent = item.title || item.link;

            pill.appendChild(iconWrap);
            pill.appendChild(textWrap);

            list.appendChild(pill);
        });

        if (hiddenNodes.length > 0) {
            let expanded = false;
            const hiddenCount = hiddenNodes.length;
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'serp-card__pill serp-card__pill--more';
            const collapsedText = `+ ${hiddenCount} ${getToolLocaleText('tool_serpapi_more')}`;
            toggle.textContent = collapsedText;
            toggle.addEventListener('click', () => {
                expanded = !expanded;
                hiddenNodes.forEach(node => {
                    node.classList.toggle('is-hidden', !expanded);
                });
                toggle.textContent = expanded
                    ? getToolLocaleText('tool_serpapi_show_less')
                    : collapsedText;
                toggle.classList.toggle('is-expanded', expanded);
            });
            list.appendChild(toggle);
        }

        bodyEl.appendChild(list);
    }

    const directAnswer = answerBox?.answer || answerBox?.snippet || answerBox?.result;
    if (directAnswer) {
        const insight = document.createElement('div');
        insight.className = 'serp-card__insight';

        const insightLabel = document.createElement('div');
        insightLabel.className = 'serp-card__insight-label';
        insightLabel.textContent = getToolLocaleText('tool_serpapi_answer');

        const insightText = document.createElement('div');
        insightText.className = 'serp-card__insight-text';
        insightText.textContent = directAnswer;

        insight.appendChild(insightLabel);
        insight.appendChild(insightText);
        bodyEl.appendChild(insight);
    }

    if (query) {
        const queryBox = document.createElement('div');
        queryBox.className = 'serp-card__query';
        queryBox.textContent = query;
        bodyEl.appendChild(queryBox);
    }
}

function renderImageToolGallery(bodyEl, data, prompt, localePrefix, filenamePrefix) {
    if (!bodyEl) {
        return;
    }
    bodyEl.innerHTML = '';

    const promptKey = `${localePrefix}_prompt`;
    const errorKey = `${localePrefix}_error`;
    const viewKey = `${localePrefix}_view`;
    const downloadKey = `${localePrefix}_download`;
    const titleKey = `${localePrefix}_title`;

    if (prompt) {
        const promptLabel = document.createElement('div');
        promptLabel.className = 'tool-card__section-title';
        promptLabel.textContent = getToolLocaleText(promptKey);

        const promptContent = document.createElement('div');
        promptContent.className = 'tool-card__prompt';
        promptContent.textContent = prompt;

        bodyEl.appendChild(promptLabel);
        bodyEl.appendChild(promptContent);
    }

    const normalizedData = Array.isArray(data) ? data : [];
    if (normalizedData.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'tool-card__empty';
        emptyState.textContent = getToolLocaleText(errorKey);
        bodyEl.appendChild(emptyState);
        return;
    }

    const gallery = document.createElement('div');
    gallery.className = 'tool-card__gallery';

    normalizedData.forEach((item, index) => {
        const figure = document.createElement('div');
        figure.className = 'tool-card__figure';

        const image = document.createElement('img');
        image.className = 'tool-card__image';
        image.alt = item.revised_prompt || `${getToolLocaleText(titleKey)} ${index + 1}`;

        let imageUrl = '';
        if (item.url) {
            imageUrl = item.url;
        } else if (item.b64_json) {
            imageUrl = `data:image/png;base64,${item.b64_json}`;
        }

        if (imageUrl) {
            image.src = imageUrl;
        }

        const actionBar = document.createElement('div');
        actionBar.className = 'tool-card__actions';

        if (imageUrl) {
            const downloadLink = document.createElement('a');
            downloadLink.className = 'tool-card__button';
            downloadLink.href = imageUrl;
            const downloadId = item.id ? item.id.replace(/[^a-z0-9_-]+/gi, '') : `${Date.now()}-${index + 1}`;
            downloadLink.download = `fisherai-${filenamePrefix}-${downloadId}.png`;
            downloadLink.textContent = getToolLocaleText(downloadKey);

            actionBar.appendChild(downloadLink);
        }

        figure.appendChild(image);

        if (item.revised_prompt) {
            const caption = document.createElement('div');
            caption.className = 'tool-card__caption';
            caption.textContent = item.revised_prompt;
            figure.appendChild(caption);
        }

        figure.appendChild(actionBar);
        gallery.appendChild(figure);
    });

    bodyEl.appendChild(gallery);
}

function renderDalleImages(bodyEl, dalleResult, prompt) {
    const data = Array.isArray(dalleResult?.data) ? dalleResult.data : [];
    renderImageToolGallery(bodyEl, data, prompt, 'tool_dalle', 'dalle');
}

function renderNanoBananaImages(bodyEl, nanoBananaResult, prompt) {
    const assets = Array.isArray(nanoBananaResult?.assets) ? nanoBananaResult.assets : [];
    renderImageToolGallery(bodyEl, assets, prompt, 'tool_nano_banana', 'nano-banana');
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


async function editUserMessage(messageDiv, originalText) {
    const defaults = {
        title: '编辑消息',
        hint: '在重新发送前微调你的提问。',
        placeholder: '在这里修改你的消息...',
        shortcuts: 'Ctrl+Enter 发送 / Esc 取消',
        charCount: '当前字数 {count}',
        save: '保存',
        cancel: '取消'
    };

    const locale = { ...defaults };

    try {
        if (typeof window !== 'undefined' && window.i18n && typeof window.i18n.getMessages === 'function') {
            const keys = [
                'edit_message_title',
                'edit_message_hint',
                'edit_message_placeholder',
                'edit_message_shortcuts',
                'edit_message_char_count',
                'save',
                'cancel'
            ];
            const messages = await window.i18n.getMessages(keys);

            const applyLocale = (key, fallback) => {
                const value = messages[key];
                return value && value !== key ? value : fallback;
            };

            locale.title = applyLocale('edit_message_title', defaults.title);
            locale.hint = applyLocale('edit_message_hint', defaults.hint);
            locale.placeholder = applyLocale('edit_message_placeholder', defaults.placeholder);
            locale.shortcuts = applyLocale('edit_message_shortcuts', defaults.shortcuts);
            locale.charCount = applyLocale('edit_message_char_count', defaults.charCount);
            locale.save = applyLocale('save', defaults.save);
            locale.cancel = applyLocale('cancel', defaults.cancel);
        }
    } catch (error) {
        console.warn('Edit message translation fallback in use:', error);
    }

    const editContainer = document.createElement('div');
    editContainer.className = 'edit-message-container';

    const header = document.createElement('div');
    header.className = 'edit-message-header';

    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'edit-message-icon';
    iconWrapper.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    `;

    const headerText = document.createElement('div');
    headerText.className = 'edit-message-text';

    const titleEl = document.createElement('div');
    titleEl.className = 'edit-message-title';
    titleEl.textContent = locale.title;

    const hintEl = document.createElement('div');
    hintEl.className = 'edit-message-hint';
    hintEl.textContent = locale.hint;

    headerText.appendChild(titleEl);
    headerText.appendChild(hintEl);

    header.appendChild(iconWrapper);
    header.appendChild(headerText);

    const textArea = document.createElement('textarea');
    textArea.value = originalText;
    textArea.placeholder = locale.placeholder;
    textArea.setAttribute('aria-label', locale.title);
    textArea.className = 'edit-message-textarea';

    const footer = document.createElement('div');
    footer.className = 'edit-message-footer';

    const meta = document.createElement('div');
    meta.className = 'edit-message-meta';

    const countLabel = document.createElement('span');
    countLabel.className = 'edit-message-count';

    const shortcutsLabel = document.createElement('span');
    shortcutsLabel.className = 'edit-message-shortcuts';
    shortcutsLabel.textContent = locale.shortcuts;

    meta.appendChild(countLabel);
    meta.appendChild(shortcutsLabel);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'edit-message-buttons';

    const cancelButton = document.createElement('button');
    cancelButton.className = 'cancel-message-btn';
    cancelButton.type = 'button';
    cancelButton.setAttribute('aria-label', locale.cancel);

    const cancelIcon = document.createElement('span');
    cancelIcon.className = 'edit-message-button-icon';
    cancelIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;

    const cancelText = document.createElement('span');
    cancelText.textContent = locale.cancel;

    cancelButton.appendChild(cancelIcon);
    cancelButton.appendChild(cancelText);

    const saveButton = document.createElement('button');
    saveButton.className = 'save-message-btn';
    saveButton.type = 'button';
    saveButton.setAttribute('aria-label', locale.save);

    const saveIcon = document.createElement('span');
    saveIcon.className = 'edit-message-button-icon';
    saveIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
    `;

    const saveText = document.createElement('span');
    saveText.textContent = locale.save;

    saveButton.appendChild(saveIcon);
    saveButton.appendChild(saveText);

    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(saveButton);

    footer.appendChild(meta);
    footer.appendChild(buttonContainer);

    editContainer.appendChild(header);
    editContainer.appendChild(textArea);
    editContainer.appendChild(footer);

    messageDiv.innerHTML = '';
    messageDiv.appendChild(editContainer);

    const updateCharCount = (value) => {
        const count = value.length;
        if (locale.charCount.includes('{count}')) {
            countLabel.textContent = locale.charCount.replace('{count}', count);
        } else {
            countLabel.textContent = `${count}`;
        }
    };

    const autoResize = (element) => {
        element.style.height = 'auto';
        element.style.height = Math.max(element.scrollHeight, 80) + 'px';
    };

    autoResize(textArea);
    updateCharCount(originalText || '');

    // Focus and select all text for quick editing
    textArea.focus();
    textArea.select();

    textArea.addEventListener('input', function () {
        autoResize(this);
        updateCharCount(this.value);
    });

    textArea.addEventListener('keydown', function (e) {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            saveEditedMessage(messageDiv, textArea.value);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit(messageDiv, originalText);
        }
    });

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
    const model = modelSelection.value;
    const selectedOption = modelSelection.options[modelSelection.selectedIndex];
    const provider = selectedOption.dataset.provider;
    chatLLMAndUIUpdate(model, provider, newText, []);
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
  
  // 将新的默认模型与用户自定义模型合并
  providers.forEach(provider => {
    if (providerStates[provider]) {
      if (providerCustomModels[provider].length > 0) {
        // 该提供商有自定义模型
        const customModelsList = providerCustomModels[provider];
        
        // 获取该提供商的默认模型
        const defaultModelsForProvider = MODEL_LIST.custom_config_models
          .filter(model => model.provider === provider)
          .map(model => model.value);
        
        // 找出新增的默认模型（用户自定义列表中不存在的）
        const newDefaultModels = defaultModelsForProvider.filter(
          modelValue => !customModelsList.includes(modelValue)
        );
        
        // 将新增的默认模型添加到用户自定义模型列表中
        const newDefaultModelObjects = MODEL_LIST.custom_config_models
          .filter(model => model.provider === provider && newDefaultModels.includes(model.value));
        
        // 添加用户已有的自定义模型
        const existingCustomModels = userCustomModels.filter(model => model.provider === provider);
        
        // 合并两个列表
        customConfigModels = customConfigModels.concat(existingCustomModels, newDefaultModelObjects);
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
