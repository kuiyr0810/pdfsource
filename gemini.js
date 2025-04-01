// == Google AI Chat Widget (Avatar Toggle Version) ==
// WARNING: Exposing API keys in client-side code is insecure for public websites.
// Use only in controlled environments or where the user provides their own key.

(function() {
    // --- Configuration ---
    const GOOGLE_AI_API_KEY = "AIzaSyAykHKBfzkeRZJt0lCWjT9t4lDen8Q_6xQ"; // !!! REPLACE WITH YOUR KEY (INSECURE) !!!
    const AI_MODEL = "gemini-1.5-flash-latest"; // Or "gemini-pro", etc.
    const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${GOOGLE_AI_API_KEY}`;
    const WIDGET_TITLE = "AI助手";
    const AVATAR_ICON = '🤖'; // You can use an emoji, text, or set a background image via CSS
    const AVATAR_TOOLTIP = "点击与AI对话"; // Tooltip for the avatar

    // --- State Variables ---
    let isDragging = false;
    let offsetX, offsetY;
    let startX, startY;
    let chatHistory = [];
    let isExpanded = false; // Track widget state

    // --- Create Widget Elements ---
    function createWidget() {
        if (document.getElementById('aiChatWidget')) return;

        const widget = document.createElement('div');
        widget.id = 'aiChatWidget'; // Initially in collapsed state (no .expanded class)
        widget.innerHTML = `
            <div id="aiChatAvatar" title="${AVATAR_TOOLTIP}">
                ${AVATAR_ICON}
            </div>
            <div id="aiChatBody">
                <div id="aiChatHeader">
                    ${WIDGET_TITLE}
                    <span id="aiChatClose" title="收起">✖</span> 
                </div>
                <div id="aiChatMessages">
                    <div class="ai-message">你好！有什么可以帮你的吗？</div>
                </div>
                <div id="aiChatInputArea">
                    <input type="text" id="aiChatInput" placeholder="输入消息...">
                    <button id="aiChatSend">发送</button>
                </div>
                <div id="aiChatLoading" style="display: none;">思考中...</div>
            </div>
        `;
        document.body.appendChild(widget);

        injectCSS(); // Inject CSS styles

        // Get element references
        const avatar = document.getElementById('aiChatAvatar');
        const chatBody = document.getElementById('aiChatBody'); // The expandable part
        const header = document.getElementById('aiChatHeader');
        const messagesContainer = document.getElementById('aiChatMessages');
        const input = document.getElementById('aiChatInput');
        const sendButton = document.getElementById('aiChatSend');
        const loadingIndicator = document.getElementById('aiChatLoading');
        const closeButton = document.getElementById('aiChatClose');

        // --- Add Event Listeners ---

        // Toggle Expand/Collapse
        //avatar.addEventListener('click', expandWidget);
        avatar.addEventListener('mousedown', startDrag); 
        closeButton.addEventListener('click', collapseWidget);

        // Dragging (only works when header is visible, i.e., expanded)
        header.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);

        // Send message
        sendButton.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        loadMarkedJs(); // Load Markdown library
    }

    // --- Inject CSS ---
    function injectCSS() {
        const style = document.createElement('style');
        style.textContent = `
            /* --- Base Widget Container --- */
            #aiChatWidget {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                font-family: sans-serif;
                transition: width 0.3s ease, height 0.3s ease, box-shadow 0.3s ease, border-radius 0.3s ease; /* Smooth transitions */
                overflow: hidden; /* Needed for smooth transition */
            }

            /* --- Collapsed State (Avatar) --- */
            #aiChatWidget {
                width: 60px; /* Avatar size */
                height: 60px;
                background-color: #4a90e2; /* Avatar background */
                border-radius: 50%; /* Circular avatar */
                cursor: pointer;
                display: flex;
                justify-content: center;
                align-items: center;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            }
            #aiChatAvatar {
                display: flex; /* Show avatar */
                justify-content: center;
                align-items: center;
                font-size: 30px; /* Adjust icon size */
                color: white;
                user-select: none;
            }
            #aiChatBody {
                display: none; /* Hide chat body when collapsed */
            }

            /* --- Expanded State --- */
            #aiChatWidget.expanded {
                width: 320px; /* Full chat width */
                height: 450px; /* Full chat height */
                background-color: #ffffff;
                border: 1px solid #ccc;
                border-radius: 8px; /* Rectangular chat */
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                cursor: default; /* Normal cursor */
                /* Ensure flex direction for the body */
                 display: flex;
                flex-direction: column;
            }
             #aiChatWidget.expanded #aiChatAvatar {
                display: none; /* Hide avatar when expanded */
            }
             #aiChatWidget.expanded #aiChatBody {
                display: flex; /* Show chat body */
                flex-direction: column;
                width: 100%;
                height: 100%;
                overflow: hidden; /* Important to contain children */
            }

            /* --- Chat Body Elements (Styles mostly same as before) --- */
            #aiChatHeader {
                background-color: #4a90e2;
                color: white;
                padding: 10px 15px;
                font-weight: bold;
                cursor: move; /* Drag cursor */
                user-select: none;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                /* Explicit height can sometimes help layout */
                /* height: 40px; */
                flex-shrink: 0; /* Prevent header from shrinking */
            }
            #aiChatClose {
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
                padding: 0 5px;
            }
            #aiChatClose:hover { color: #eee; }

            #aiChatMessages {
                flex-grow: 1; /* Take available space */
                overflow-y: auto;
                padding: 15px;
                background-color: #f9f9f9;
                border-bottom: 1px solid #eee;
                display: flex;
                flex-direction: column;
                gap: 10px;
                /* Ensure it scrolls if content overflows */
                 min-height: 0; /* Important for flex-grow + overflow */
            }
            /* Message Styles (user, ai, error, markdown) - Keep as before */
            .message { padding: 8px 12px; border-radius: 15px; max-width: 80%; word-wrap: break-word; line-height: 1.4; }
            .user-message { background-color: #dcf8c6; align-self: flex-end; border-bottom-right-radius: 5px; }
            .ai-message { background-color: #e5e5ea; align-self: flex-start; border-bottom-left-radius: 5px; }
            .error-message { background-color: #ffebee; color: #c62828; align-self: flex-start; border-bottom-left-radius: 5px; font-size: 0.9em; border: 1px solid #ef9a9a; }
            .ai-message p { margin: 0 0 0.5em 0; }
            .ai-message ul, .ai-message ol { margin: 0.5em 0 0.5em 20px; padding-left: 15px; }
            .ai-message li { margin-bottom: 0.3em; }
            .ai-message code { background-color: rgba(0,0,0,0.05); padding: 2px 5px; border-radius: 3px; font-family: monospace; }
            .ai-message pre { background-color: rgba(0,0,0,0.07); padding: 10px; border-radius: 4px; overflow-x: auto; margin: 0.5em 0; } /* Added margin */
            .ai-message pre code { background-color: transparent; padding: 0; }
            .ai-message blockquote { border-left: 3px solid #ccc; padding-left: 10px; margin: 0.5em 0; color: #555; }
            .ai-message img { max-width: 100%; height: auto; border-radius: 4px; margin-top: 5px; display: block; } /* Added display block */


            #aiChatInputArea {
                display: flex;
                padding: 10px;
                border-top: 1px solid #eee;
                background-color: #fff; /* Ensure background */
                flex-shrink: 0; /* Prevent input area from shrinking */
            }
            #aiChatInput { flex-grow: 1; border: 1px solid #ccc; border-radius: 4px; padding: 8px 10px; margin-right: 8px; font-size: 0.95em; }
            #aiChatSend { padding: 8px 15px; background-color: #4a90e2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.95em; transition: background-color 0.2s; }
            #aiChatSend:hover { background-color: #357abd; }
            #aiChatSend:disabled { background-color: #cccccc; cursor: not-allowed; }

            #aiChatLoading {
                text-align: center;
                padding: 8px;
                font-style: italic;
                color: #777;
                background-color: #f0f0f0;
                font-size: 0.9em;
                 /* Ensure it's part of the flex flow but doesn't grow */
                flex-shrink: 0;
            }
        `;
        document.head.appendChild(style);
    }

    // --- Load Marked.js ---
    function loadMarkedJs() {
        if (typeof marked === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
            script.onload = () => console.log('Marked.js loaded.');
            script.onerror = () => console.error('Failed to load Marked.js');
            document.body.appendChild(script);
        }
    }

    // --- Widget State Control ---
    function expandWidget() {
        const widget = document.getElementById('aiChatWidget');
        if (widget && !widget.classList.contains('expanded')) {
            widget.classList.add('expanded');
            isExpanded = true;
            // Optional: focus input field when expanded
            const input = document.getElementById('aiChatInput');
            if (input) setTimeout(() => input.focus(), 300); // Delay slightly for transition
        }
    }

    function collapseWidget() {
        const widget = document.getElementById('aiChatWidget');
        if (widget && widget.classList.contains('expanded')) {
            widget.classList.remove('expanded');
            isExpanded = false;
            // If dragging was somehow active, stop it
            if (isDragging) stopDrag();
        }
    }

    // --- Dragging Logic (Only active when expanded) ---
    function startDrag(e) {
        // Ensure widget is expanded and not clicking the close button
         if (isExpanded && e.target.id === 'aiChatClose') {
            return; // 不启动拖动，让关闭按钮的 click 事件生效
        };

        startX = e.clientX; // 记录起始 X
        startY = e.clientY; // 记录起始 Y

        isDragging = true;
        const widget = document.getElementById('aiChatWidget');
        offsetX = e.clientX - widget.offsetLeft;
        offsetY = e.clientY - widget.offsetTop;
        widget.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none'; // Prevent text selection globally during drag
    }

    function drag(e) {
        if (!isDragging) return;
        const widget = document.getElementById('aiChatWidget');
        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;

        const maxX = window.innerWidth - widget.offsetWidth;
        const maxY = window.innerHeight - widget.offsetHeight;
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        widget.style.left = newX + 'px';
        widget.style.top = newY + 'px';
        widget.style.bottom = 'auto';
        widget.style.right = 'auto';
    }

    function stopDrag(e) { // <-- 传入事件对象 'e'
        if (!isDragging) return; // 如果没有开始拖动，直接返回

    // --- 添加开始 ---
        const deltaX = Math.abs(e.clientX - startX); // 计算 X 轴移动距离
        const deltaY = Math.abs(e.clientY - startY); // 计算 Y 轴移动距离
        const clickThreshold = 5; // 定义一个小的像素阈值来区分点击和拖动
    
        const wasClick = deltaX < clickThreshold && deltaY < clickThreshold; // 判断是否移动距离很小

        // 如果是收起状态，并且移动距离很小（判定为点击），则展开
        if (!isExpanded && wasClick) {
             expandWidget(); // 调用展开函数
             // 注意：因为展开了，后续的 isDragging = false 等仍然需要执行
        }
        // --- 添加结束 ---
    
    
        // --- 原有的 stopDrag 逻辑继续执行 ---
        isDragging = false; // 停止拖动状态
        const widget = document.getElementById('aiChatWidget');
        const header = document.getElementById('aiChatHeader');
    
        // Set cursor based on state (根据当前状态设置光标)
        if (isExpanded && header) { // 确保用 isExpanded 的最新状态
             widget.style.cursor = 'default';
             header.style.cursor = 'move';
        } else {
             widget.style.cursor = 'pointer'; // 收起状态的光标
        }
        document.body.style.userSelect = ''; // Re-enable text selection

    }

    //function stopDrag() {
    //    if (!isDragging) return;
    //    isDragging = false;
    //    const widget = document.getElementById('aiChatWidget');
    //    widget.style.cursor = 'default'; // Reset main widget cursor
    //    // Ensure header keeps move cursor if widget remains expanded
    //     const header = document.getElementById('aiChatHeader');
    //     if(header) header.style.cursor = 'move';
    //    document.body.style.userSelect = ''; // Re-enable text selection
    //}

    // --- Chat Logic (Display Message, Send Message) ---
    function displayMessage(text, sender) {
        const messagesContainer = document.getElementById('aiChatMessages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        if (sender === 'ai' && typeof marked !== 'undefined') {
             try {
                 // IMPORTANT: Sanitize potentially harmful HTML before inserting if the source isn't fully trusted.
                 // Marked.js alone doesn't sanitize by default. For this example, assuming AI response is safe enough.
                 // For production, consider using DOMPurify after marked:
                 // messageDiv.innerHTML = DOMPurify.sanitize(marked.parse(text));
                messageDiv.innerHTML = marked.parse(text);
             } catch (e) {
                 console.error("Markdown parsing error:", e);
                 messageDiv.textContent = text; // Fallback
             }
        } else {
            messageDiv.textContent = text;
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom
    }

    async function sendMessage() {
        const input = document.getElementById('aiChatInput');
        const sendButton = document.getElementById('aiChatSend');
        const loadingIndicator = document.getElementById('aiChatLoading');
        const prompt = input.value.trim();

        if (!prompt || !isExpanded) return; // Only send if expanded and prompt exists

        if (!GOOGLE_AI_API_KEY || GOOGLE_AI_API_KEY === "YOUR_API_KEY") {
            displayMessage("错误：API密钥未配置。", "error");
            return;
        }

        displayMessage(prompt, 'user');
        input.value = '';
        input.disabled = true;
        sendButton.disabled = true;
        loadingIndicator.style.display = 'block';

        // --- Call Google AI API (Same as before) ---
        try {
            const requestData = {
                contents: [{ parts: [{ text: prompt }] }]
                // Add history management here if needed for multi-turn chat
            };

            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            const data = await response.json();

            // Process response (same logic as previous version)
             if (response.ok) {
                 if (data.candidates && data.candidates.length > 0) {
                    const candidate = data.candidates[0];
                    if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                       const aiText = candidate.content.parts[0].text;
                       displayMessage(aiText, 'ai');
                    } else if (candidate.finishReason) {
                         const reason = candidate.finishReason;
                         let safetyMessage = `响应因 "${reason}" 而停止。`;
                         // Add details from promptFeedback if available
                         displayMessage(safetyMessage, 'error');
                    } else {
                         displayMessage("AI返回了空的回应。", "error");
                    }
                 } else if (data.promptFeedback && data.promptFeedback.blockReason) {
                      displayMessage(`提示因 "${data.promptFeedback.blockReason}" 被阻止。`, 'error');
                 } else {
                    console.error("Unexpected successful response format:", data);
                    displayMessage("收到意外的回应格式。", "error");
                 }
            } else {
                const errorMsg = data.error ? data.error.message : `HTTP Error: ${response.status}`;
                console.error("API Error:", data);
                displayMessage(`API错误: ${errorMsg}`, 'error');
            }

        } catch (error) {
            console.error("Fetch Error:", error);
            displayMessage(`网络或请求错误: ${error.message}`, 'error');
        } finally {
            input.disabled = false;
            sendButton.disabled = false;
            loadingIndicator.style.display = 'none';
            if (isExpanded) input.focus(); // Keep focus if still expanded
        }
    }

    // --- Initialize ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createWidget);
    } else {
        createWidget();
    }

})(); // End of IIFE
