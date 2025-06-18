// 存储视频ID对应的pot参数
const potCache = new Map();

// 监听网络请求以获取pot参数
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    const url = new URL(details.url);
    const pot = url.searchParams.get('pot');
    const v = url.searchParams.get('v');
    
    if (pot && v) {
      potCache.set(v, pot);
      console.log(`Background: Captured pot parameter for video ${v}: ${pot}`);
    }
  },
  {
    urls: ["*://www.youtube.com/api/timedtext*"]
  }
);

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "openSettings") {
    chrome.tabs.create({'url': 'settings.html'});
  } else if (message.action === "getPageTitle") {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (chrome.runtime.lastError) {
        // 如果出现错误，返回错误信息
        sendResponse({title: null, error: chrome.runtime.lastError.message});
      } else if (tabs && tabs[0]) {
        sendResponse({title: tabs[0].title});
      } else {
        sendResponse({title: null});
      }
    });
    return true; // Keep the message channel open to send the response asynchronously
  } else if (message.action === "getPotParameter") {
    // 响应content script请求pot参数
    const pot = potCache.get(message.videoId);
    sendResponse({pot: pot});
    return true;
  } else if (message.action === "storePotParameter") {
    // 存储从页面拦截器获取的pot参数
    if (message.videoId && message.pot) {
      potCache.set(message.videoId, message.pot);
      console.log(`Background: Stored pot parameter from page interceptor for video ${message.videoId}: ${message.pot}`);
    }
    return true;
  } else if (message.action === "sendSelectedTextToSidePanel" || message.action === "sendPageContentToSidePanel" || message.action === "clearSelectedTextFromSidePanel") {
    // 转发选中文本、页面内容或清除选中内容到侧边栏
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        // 向侧边栏发送消息
        chrome.runtime.sendMessage(message).catch(err => {
          console.log('Failed to send message to side panel:', err);
        });
      }
    });
    return true;
  }
});

// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;
  await chrome.sidePanel.setOptions({
    tabId,
    path: 'side_panel.html',
    enabled: true
  });
});


chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: "mainMenu",
    title: "FisherAI",
    contexts: ["all"]
  });
  
  chrome.contextMenus.create({
    id: "downloadSubtitles",
    title: "下载视频字幕文件(SRT)",
    contexts: ["all"],
    parentId: "mainMenu",
    documentUrlPatterns: [
      "*://*.youtube.com/watch*",
      "*://*.bilibili.com/video/*",
      "*://*.bilibili.com/list/watchlater*"
    ]
  });
  chrome.contextMenus.create({
    id: "copyPurePageContent",
    title: "复制网页正文(纯文本)",
    contexts: ["all"],
    parentId: "mainMenu"
  });
  chrome.contextMenus.create({
    id: "copyPageContent",
    title: "复制网页正文(HTML)",
    contexts: ["all"],
    parentId: "mainMenu"
  });
  
});

// 监听菜单项的点击事件
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "copyPageContent") {
    chrome.tabs.sendMessage(tab.id, {action: 'copyPageContent'});
  } else if(info.menuItemId === "copyPurePageContent") {
    chrome.tabs.sendMessage(tab.id, {action: 'copyPurePageContent'});
  } else if(info.menuItemId === "downloadSubtitles") {
    chrome.tabs.sendMessage(tab.id, {action: 'downloadSubtitles'});
  }
});