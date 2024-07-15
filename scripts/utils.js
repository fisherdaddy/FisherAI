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
    }
    const result =  title + "\n" + content;
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
    }
}

/**
 * 获取bilibili 视频字幕
 * @param {string} paramURL 
 * @returns 
 */
async function extractBilibiliSubtitles(paramURL, format) {
    // 正常的视频地址（https://www.bilibili.com/video/BV11C41177HE/?xxx）
    // 处理稍后再看的url( https://www.bilibili.com/list/watchlater?bvid=xxx&oid=xxx )
    const url = new URL(paramURL);
    const pathSearchs = {}
    url.search.slice(1).replace(/([^=&]*)=([^=&]*)/g, (matchs, a, b, c) => pathSearchs[a] = b)

    // bvid
    let aidOrBvid = pathSearchs.bvid // 默认为稍后再看
    if (!aidOrBvid) {
        let path = url.pathname
        if (path.endsWith('/')) {
          path = path.slice(0, -1)
        }
        const paths = path.split('/')
        aidOrBvid = paths[paths.length - 1]
      }

    let aid = aidOrBvid;
    let cid;
  
    if (aidOrBvid.toLowerCase().startsWith('bv')) {
      // 如果是bv号，需要转换获取aid和cid
      const bvidResponse = await fetch(
        `https://api.bilibili.com/x/web-interface/view?bvid=${aidOrBvid}`,
        { headers: {'User-Agent': USER_AGENT}, credentials: 'include' }
        );
      const bvidData = await bvidResponse.json();
      aid = bvidData.data.aid;
      cid = bvidData.data.cid;
    } else if (aidOrBvid.toLowerCase().startsWith('av')) {
      // 如果是av号，直接使用
      aid = videoId.slice(2); // 去掉"av"
    }
  
    // 获取第一个视频分P的cid
    const pageListResponse = await fetch(
        `https://api.bilibili.com/x/player/pagelist?aid=${aid}`,
        { headers: {'User-Agent': USER_AGENT}, credentials: 'include' }
    );
    const pageListData = await pageListResponse.json();
    cid = pageListData.data[0].cid;
  
    // 获取字幕信息
    const subtitleResponse = await fetch(
        `https://api.bilibili.com/x/player/v2?aid=${aid}&cid=${cid}`,
        { headers: {'User-Agent': USER_AGENT}, credentials: 'include' }
    );
    const subtitleData = await subtitleResponse.json();
    const subtitleList = subtitleData.data.subtitle.subtitles;
    let subtitleUrl = subtitleList[0].subtitle_url;
    if (subtitleUrl.startsWith('//')) {
        subtitleUrl = 'https:' + subtitleUrl; 
    }

    // 获取字幕json
    const subtitleJSONResponse = await fetch(
        subtitleUrl,
        { headers: {'User-Agent': USER_AGENT} }
    );
    const subtitleJSONData = await subtitleJSONResponse.json();
    const formattedSubtitles = bilibiliSubtitlesJSONToFormat(subtitleJSONData, format);
    return formattedSubtitles;
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
function displayLoading() {
    const loadingDiv = document.querySelector('.my-extension-loading');
    loadingDiv.style.display = 'flex';
}

// 隐藏 loading
function hiddenLoadding() {
    const loadingDiv = document.querySelector('.my-extension-loading');
    loadingDiv.style.display = 'none';
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
