// 监听获取正文请求
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
  }
});

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

// 是否开启快捷翻译
chrome.storage.sync.get(QUICK_TRANS, function(config) {
const enabled = config[QUICK_TRANS].enabled;
if(enabled == false) {
  console.log("[FisherAI Content Script] Quick Translate is disabled.");
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
    contentContainer.style.marginTop = '5px'; // Adjust as needed relative to close button etc.

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
        contentContainer.style.marginTop = '5px';
        
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
    quickTransButton.style.display = 'none';
    quickTransButton.style.position = 'absolute';
    quickTransButton.style.zIndex = '999999';
    quickTransButton.style.border = 'none';
    quickTransButton.style.borderRadius = '50%';
    quickTransButton.style.width = '32px';
    quickTransButton.style.height = '32px';
    quickTransButton.style.display = 'flex';
    quickTransButton.style.alignItems = 'center';
    quickTransButton.style.justifyContent = 'center';
    quickTransButton.style.cursor = 'pointer';
    quickTransButton.style.transition = 'transform 0.2s ease';
    quickTransButton.style.display = 'none'; // Initially hidden

    // Add hover effects
    quickTransButton.addEventListener('mouseover', function() {
      quickTransButton.style.transform = 'scale(1.1)';
    });
    quickTransButton.addEventListener('mouseout', function() {
      quickTransButton.style.transform = 'scale(1)';
    });

    // Create and add image to button
    const image = document.createElement('img');
    image.src = chrome.runtime.getURL('images/logo_48.png');
    image.style.width = '20px';
    image.style.height = '20px';
    image.style.filter = 'drop-shadow(0 0 1px rgba(0, 0, 0, 0.5))';
    quickTransButton.appendChild(image);

    // Add button to body
    document.body.appendChild(quickTransButton);

    // --- Add button click listener ---
    quickTransButton.addEventListener('click', function () {
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
        const middleX = (minX + maxX) / 2 + window.scrollX;
        const lastRect = rects[rects.length - 1];
        const topY = lastRect.bottom + window.scrollY;

        // Position near the end of the selection
        translationPopup.style.top = `${topY + 15}px`; // Offset below selection
        // Use fixed width when positioning
        const popupWidth = 350; // Width of popup (match the fixed width set above)
        translationPopup.style.left = `${middleX - popupWidth / 2}px`;
        
        // --- THEN: Show popup immediately with loading state ---
        translationPopup.style.display = 'block';
        
        // Small delay for fade and slide-in effect
        setTimeout(() => {
          if (translationPopup) {
            translationPopup.style.opacity = '1';
            translationPopup.style.transform = 'translateY(0)';
          }
        }, 10);

        // Hide the button itself
        if (quickTransButton) quickTransButton.style.display = 'none';

        // --- Call LLM ---
        try {
          let model = config[QUICK_TRANS].selectedModel;
          let provider = config[QUICK_TRANS].provider;
          if (!model || !provider) {
               contentContainer.innerHTML = "Model or provider not configured.";
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
    }
  } else {
    // No text selected or button doesn't exist, hide button
    if (quickTransButton) quickTransButton.style.display = 'none';
    // Do NOT hide the popup here, only hide button. Popup hides on close click or mousedown outside.
  }
});

// Listen for clicks outside the selection/button/popup
document.addEventListener('mousedown', function (event) {
  const clickedButton = quickTransButton && quickTransButton.contains(event.target);
  const clickedPopup = translationPopup && translationPopup.contains(event.target);

  if (!clickedButton && !clickedPopup) {
      // Clicked outside, hide button and popup, clear selection
      if (quickTransButton) quickTransButton.style.display = 'none';
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
            if (appearance === 'light') {
                translationPopup.classList.add('light-mode');
                translationPopup.style.backgroundColor = '#FFFFFF';
                translationPopup.style.color = '#1A202C';
                translationPopup.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
                translationPopup.style.border = '1px solid #E2E8F0';
            } else {
                translationPopup.classList.remove('light-mode');
                translationPopup.style.backgroundColor = '#1E293B';
                translationPopup.style.color = '#E2E8F0';
                translationPopup.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
                translationPopup.style.border = '1px solid #4A5568';
            }
        }
    });
}

// Listen for changes to appearance setting
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'sync' && changes.appearance) {
        applyThemeToTranslationPopup();
    }
});

