// 简化版 emo_book.js
const app = getApp();
const API_BASE_URL = app.globalData.apiBaseUrl;

Page({ 
  // 定义页面的数据对象，包含聊天记录、输入内容、模型选择等数据
  data: {
    pageDisabled: false,
    inputContent: '',          // 用户输入的内容
    chatHistory: [],           // 聊天记录数组，存储用户和助手的消息
    scrollToId: '',            // 滚动到指定消息的ID，用于动态滚动
    keyboardHeight: 0,         // 键盘高度，用于调整输入框位置

    API_BASE_URL: API_BASE_URL,          // API基础URL，从app.js获取
    resources: {            
      sendIcon: '/pages/ai/image/send.png',          // 修正路径
    },

    userId: '', // 用户ID
    userInfo: null, // 用户信息
    nickname: '', // 用户昵称
    inputValue: '',
    messages: [],
    loading: false,
    scrollTop: 0,
    scrollViewHeight: 0,
    showEmojiPanel: false,
    sessionId: '', // 添加会话ID，用于跟踪会话
  },

  onLoad: function() {
    // 页面加载时执行的函数
    this.setData({
      userId: app.globalData.userId || '',
      userInfo: app.globalData.userInfo || null
    });
  },

  // 处理输入变化
  onInputChange: function(e) {
    this.setData({
      inputContent: e.detail.value
    });
  },

  // 处理发送消息
  handleSendMessage: function() {
    // 如果输入内容为空或页面被禁用，则直接返回
    if (!this.data.inputContent.trim() || this.data.pageDisabled) {
      return;
    }

    const userMessage = {
      sender: 'user',
      content: this.data.inputContent,
    };

    // 添加用户消息到聊天记录
    this.addMessageToChatHistory(userMessage);

    // 添加思考中的消息
    const thinkingMessage = {
      sender: 'assistant',
      content: "请您耐心等待，因为资料库有100T，所有星辰管理员检索过程会在45秒左右......",
      isThinking: true
    };
    
    this.addMessageToChatHistory(thinkingMessage);

    // 禁用页面交互
    this.setData({
      pageDisabled: true,
      inputContent: ''
    });

    // 调用API获取回答
    this.getDeeskeepResponse(userMessage.content);
  },

  // 调用Deeskeep API获取回答 - 增加日志版本
  getDeeskeepResponse: function(content) {
    console.log('发送请求到API:', `${API_BASE_URL}/deeskeep/`);
    console.log('请求内容:', content);
    
    wx.request({
      url: `${API_BASE_URL}/deeskeep/`,
      method: 'POST',
      data: {
        content: content,
        has_thoughts: true
      },
      timeout: 600000, // 增加超时时间到600秒
      header: {
        'content-type': 'application/json'
      },
      success: (res) => {
        console.log('API响应成功，状态码:', res.statusCode);
        console.log('响应数据:', res.data);
        
        // 移除思考中的消息
        this.removeThinkingMessage();

        // 添加思考过程和回答到聊天记录
        if (res.data && res.data.thoughts) {
          let thoughtsText = '';
          
          try {
            // 从第一个思考项中提取knowledge检索结果
            if (res.data.thoughts[0] && res.data.thoughts[0].observation) {
              // 解析JSON字符串中的检索结果
              const ragResults = JSON.parse(res.data.thoughts[0].observation);
              
              // 处理检索到的文档
              if (Array.isArray(ragResults)) {
                thoughtsText += "检索到的相关资料：\n\n";
                
                // 遍历每个检索结果
                ragResults.forEach((doc, index) => {
                  if (doc.title) thoughtsText += `【${index+1}】${doc.title}\n`;
                  if (doc.content) {
                    // 提取正文内容，移除标记
                    const content = doc.content.replace(/【文档名】:|【标题】:|【正文】:/g, '')
                      .replace(/\\n/g, '\n');
                    thoughtsText += `${content}\n\n`;
                  }
                });
              }
            }
            
            // 从第三个思考项中提取思考过程
            if (res.data.thoughts[2] && res.data.thoughts[2].thought) {
              thoughtsText += "\n思考分析：\n";
              thoughtsText += res.data.thoughts[2].thought;
            }
            
          } catch (error) {
            console.error('解析思考过程出错:', error);
            thoughtsText = "思考过程解析失败，但已找到相关资料。";
          }
          
          // 添加思考流程提示
          if (thoughtsText.trim()) {
            thoughtsText = "思考流程如下：\n\n" + thoughtsText;
            
            const thoughtsMessage = {
              sender: 'assistant',
              content: thoughtsText,
              isThoughts: true
            };
            this.addMessageToChatHistory(thoughtsMessage);
          }
        }

        if (res.data && res.data.text) {
          // 添加最终结论提示
          const responseText = "最终结论如下，您可以针对文中提到的继续提问：\n\n" + res.data.text;
          
          const responseMessage = {
            sender: 'assistant',
            content: responseText
          };
          this.addMessageToChatHistory(responseMessage);
        } else {
          this.addMessageToChatHistory({
            sender: 'assistant',
            content: '抱歉，无法获取有效回答。'
          });
        }
      },
      fail: (err) => {
        console.error('API请求失败:', err);
        
        // 移除思考中的消息
        this.removeThinkingMessage();
        
        // 添加错误消息
        this.addMessageToChatHistory({
          sender: 'assistant',
          content: '抱歉，获取回答时出现错误，请稍后再试。错误信息: ' + err.errMsg
        });
      },
      complete: () => {
        // 启用页面交互
        this.setData({
          pageDisabled: false
        });
      }
    });
  },

  // 添加消息到聊天记录
  addMessageToChatHistory: function(message) {
    const chatHistory = [...this.data.chatHistory, message];
    
    this.setData({
      chatHistory: chatHistory,
    }, () => {
      // 设置数据后，再设置滚动位置，确保DOM已更新
      setTimeout(() => {
        this.setData({
          scrollToId: `msg${chatHistory.length - 1}`
        });
      }, 100);
    });
  },

  // 移除思考中的消息
  removeThinkingMessage: function() {
    const filteredHistory = this.data.chatHistory.filter(msg => !msg.isThinking);
    this.setData({
      chatHistory: filteredHistory
    });
  },

  // 输入框聚焦事件
  onInputFocus: function(e) {
    this.setData({
      keyboardHeight: e.detail.height || 0
    });
  },

  // 输入框失焦事件
  onInputBlur: function() {
    this.setData({
      keyboardHeight: 0
    });
  }
});
  