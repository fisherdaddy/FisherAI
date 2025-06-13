const RE_YOUTUBE =
  /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)';
const RE_XML_TRANSCRIPT =
  /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;

// 存储截取到的字幕数据
const transcriptCache = new Map();

// 拦截fetch请求来直接获取字幕响应
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const [resource] = args;
  const url = typeof resource === 'string' ? resource : resource.url;
  
  if (url.includes('youtube.com/api/timedtext')) {
    return originalFetch.apply(this, args).then(response => {
      // 克隆响应以便我们可以读取它而不影响原始请求
      const clonedResponse = response.clone();
      
      // 从URL中提取视频ID
      try {
        const urlObj = new URL(url);
        const videoId = urlObj.searchParams.get('v');
        
        if (videoId) {
          // 异步存储响应内容
          clonedResponse.text().then(text => {
            transcriptCache.set(videoId, {
              text: text,
              url: url,
              timestamp: Date.now()
            });
            console.log(`Intercepted transcript for video: ${videoId}`);
          }).catch(err => {
            console.error('Error reading transcript response:', err);
          });
        }
      } catch (err) {
        console.error('Error parsing timedtext URL:', err);
      }
      
      return response;
    });
  }
  
  return originalFetch.apply(this, args);
};

// 从缓存获取字幕数据的辅助函数
function getCachedTranscript(videoId) {
  const cached = transcriptCache.get(videoId);
  if (cached) {
    // 检查缓存是否过期（5分钟）
    const isExpired = Date.now() - cached.timestamp > 5 * 60 * 1000;
    if (!isExpired) {
      return cached.text;
    } else {
      transcriptCache.delete(videoId);
    }
  }
  return null;
}

// 从多个来源获取pot参数的辅助函数
async function getPotParameter(videoId) {
  return new Promise((resolve) => {
    // 首先尝试从content script的页面拦截器获取
    if (typeof window !== 'undefined' && typeof window.getPotParameterFromPage === 'function') {
      const pagePot = window.getPotParameterFromPage(videoId);
      if (pagePot) {
        console.log(`[FisherAI] 从页面拦截器获取到pot参数: ${pagePot}`);
        resolve(pagePot);
        return;
      }
    }
    
    // 备用方案：从background script获取
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        { action: "getPotParameter", videoId: videoId }, 
        (response) => {
          const bgPot = response?.pot;
          if (bgPot) {
            console.log(`[FisherAI] 从background获取到pot参数: ${bgPot}`);
          } else {
            console.log(`[FisherAI] 未找到视频 ${videoId} 的pot参数`);
          }
          resolve(bgPot);
        }
      );
    } else {
      resolve(null);
    }
  });
}

class YoutubeTranscriptError extends Error {
  constructor(message) {
    super(`[YoutubeTranscript] 🚨 ${message}`);
  }
}

class YoutubeTranscriptTooManyRequestError extends YoutubeTranscriptError {
  constructor() {
    super(
      'YouTube is receiving too many requests from this IP and now requires solving a captcha to continue'
    );
  }
}

class YoutubeTranscriptVideoUnavailableError extends YoutubeTranscriptError {
  constructor(videoId) {
    super(`The video is no longer available (${videoId})`);
  }
}

class YoutubeTranscriptDisabledError extends YoutubeTranscriptError {
  constructor(videoId) {
    super(`Transcript is disabled on this video (${videoId})`);
  }
}

class YoutubeTranscriptNotAvailableError extends YoutubeTranscriptError {
  constructor(videoId) {
    super(`No transcripts are available for this video (${videoId})`);
  }
}

class YoutubeTranscriptNotAvailableLanguageError extends YoutubeTranscriptError {
  constructor(lang, availableLangs, videoId) {
    super(
      `No transcripts are available in ${lang} for this video (${videoId}). Available languages: ${availableLangs.join(
        ', '
      )}`
    );
  }
}

/**
 * Class to retrieve transcript if exist
 */
class YoutubeTranscript {
  /**
   * Fetch transcript from YouTube Video
   * @param videoId Video url or video identifier
   * @param config Get transcript in a specific language ISO
   */
  static async fetchTranscript(videoId, config) {
    const identifier = this.retrieveVideoId(videoId);
    
    // 首先尝试从缓存获取字幕数据
    const cachedTranscript = getCachedTranscript(identifier);
    if (cachedTranscript) {
      console.log(`Using cached transcript for video: ${identifier}`);
      return this.parseTranscriptResponse(cachedTranscript, config, identifier);
    }
    
    const videoPageResponse = await fetch(
      `https://www.youtube.com/watch?v=${identifier}`,
      {
        headers: {
          ...(config?.lang && { 'Accept-Language': config.lang }),
          'User-Agent': USER_AGENT,
        },
      }
    );
    const videoPageBody = await videoPageResponse.text();

    const splittedHTML = videoPageBody.split('"captions":');

    if (splittedHTML.length <= 1) {
      if (videoPageBody.includes('class="g-recaptcha"')) {
        throw new YoutubeTranscriptTooManyRequestError();
      }
      if (!videoPageBody.includes('"playabilityStatus":')) {
        throw new YoutubeTranscriptVideoUnavailableError(videoId);
      }
      throw new YoutubeTranscriptDisabledError(videoId);
    }

    const captions = (() => {
      try {
        return JSON.parse(
          splittedHTML[1].split(',"videoDetails')[0].replace('\n', '')
        );
      } catch (e) {
        return undefined;
      }
    })()?.['playerCaptionsTracklistRenderer'];

    if (!captions) {
      throw new YoutubeTranscriptDisabledError(videoId);
    }

    if (!('captionTracks' in captions)) {
      throw new YoutubeTranscriptNotAvailableError(videoId);
    }

    if (
      config?.lang &&
      !captions.captionTracks.some(
        (track) => track.languageCode === config?.lang
      )
    ) {
      throw new YoutubeTranscriptNotAvailableLanguageError(
        config?.lang,
        captions.captionTracks.map((track) => track.languageCode),
        videoId
      );
    }

    let transcriptURL = (
      config?.lang
        ? captions.captionTracks.find(
            (track) => track.languageCode === config?.lang
          )
        : captions.captionTracks[0]
    ).baseUrl;

    // 添加pot参数到transcriptURL
    const cachedPot = await getPotParameter(identifier);
    if (cachedPot) {
      const url = new URL(transcriptURL);
      url.searchParams.set('pot', cachedPot);
      url.searchParams.set('fmt', "json3");
      url.searchParams.set('c', "WEB");
      transcriptURL = url.toString();
      console.log(`Using pot parameter: ${cachedPot} for video: ${identifier}`);
    } else {
      console.warn(`No pot parameter found for video: ${identifier}, using original URL`);
    }

    const transcriptResponse = await fetch(transcriptURL, {
      headers: {
        ...(config?.lang && { 'Accept-Language': config.lang }),
        'User-Agent': USER_AGENT,
      },
    });
    if (!transcriptResponse.ok) {
      throw new YoutubeTranscriptNotAvailableError(videoId);
    }
    const transcriptBody = await transcriptResponse.text();

    console.log('transcriptURL', transcriptURL);
    console.log('transcriptBody', transcriptBody);
    
    return this.parseTranscriptResponse(transcriptBody, config, identifier, captions);
  }

  /**
   * Parse transcript response (JSON or XML format)
   * @param transcriptBody Response body text
   * @param config Configuration object
   * @param identifier Video identifier
   * @param captions Caption tracks info (optional)
   */
  static parseTranscriptResponse(transcriptBody, config, identifier, captions = null) {
    try {
      // 尝试解析 JSON 格式 (新格式)
      const jsonData = JSON.parse(transcriptBody);
      if (jsonData.events) {
        const results = [];
        
        jsonData.events.forEach(event => {
          if (event.segs) {
            // 合并所有文本片段
            let fullText = '';
            event.segs.forEach(seg => {
              if (seg.utf8) {
                fullText += seg.utf8;
              }
            });
            
            if (fullText.trim() && fullText.trim() !== '\n') {
              results.push({
                text: fullText.trim(),
                duration: event.dDurationMs / 1000, // 转换为秒
                offset: event.tStartMs / 1000, // 转换为秒
                lang: config?.lang ?? (captions ? captions.captionTracks[0].languageCode : 'unknown'),
              });
            }
          }
        });
        
        return results;
      }
    } catch (e) {
      console.log('JSON parsing failed, trying XML parsing:', e);
    }
    
    // 如果 JSON 解析失败，回退到 XML 格式解析
    const results = [...transcriptBody.matchAll(RE_XML_TRANSCRIPT)];
    return results.map((result) => ({
      text: result[3],
      duration: parseFloat(result[2]),
      offset: parseFloat(result[1]),
      lang: config?.lang ?? (captions ? captions.captionTracks[0].languageCode : 'unknown'),
    }));
  }

  /**
   * Retrieve video id from url or string
   * @param videoId video url or video id
   */
  static retrieveVideoId(videoId) {
    if (videoId.length === 11) {
      return videoId;
    }
    const matchId = videoId.match(RE_YOUTUBE);
    if (matchId && matchId.length) {
      return matchId[1];
    }
    throw new YoutubeTranscriptError(
      'Impossible to retrieve Youtube video ID.'
    );
  }
}
