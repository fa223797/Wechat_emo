// chat_emo.js
const app = getApp();
// 使用app.js中的API基础URL
const API_BASE_URL = app.globalData.apiBaseUrl;

// 添加思考消息提示语定义
const thinkingMessages = {
  text: '请您稍等，奇妙医生正在努力思考中........',
  image: '正在深度解析图片情感信息，请稍候...',
  file: '正在分析文档心理特征，这需要一些时间...',
  audio: '正在解析语音情感，请稍等片刻...'
};

Page({ 
  // 定义页面的数据对象，包含聊天记录、输入内容、模型选择等数据
  data: {
    pageDisabled: false,
    inputContent: '',          // 用户输入的内容
    chatHistory: [],           // 聊天记录数组，存储用户和助手的消息
    scrollToId: '',            // 滚动到指定消息的ID，用于动态滚动
    keyboardHeight: 0,         // 键盘高度，用于调整输入框位置
    currentModel: 'psychology-dialogue', // 当前使用的AI模型
    textModels: ['psychology-dialogue'], // 只保留心理医生模型
    mediaModels: [], // 可用的媒体模型列表
    audioModel: 'qwen-audio-turbo-latest', // 设置默认值
    fileModel: '', // 文件处理模型
    isRecording: false,        // 是否正在录音
    recordTimeoutID: null,     // 录音超时定时器ID
    API_BASE_URL: API_BASE_URL,          // API基础URL，从app.js获取
    resources: {               // 图标资源路径
      downArrowIcon: '/pages/ai/image/down.png',     // 修正路径
      audioIcon: '/pages/ai/image/audio.png',        // 修正路径
      voiceIcon: '/pages/ai/image/talk.png',         // 修正路径
      uploadIcon: '../image/up.png',          // 上传图标
      sendIcon: '/pages/ai/image/send.png',          // 修正路径
    },

    
    showRecordButton: false,   // 是否显示录音按钮
    recordingDuration: 0,      // 录音时长（秒）
    intervalID: null,          // 定时器ID，用于更新录音时长
    voiceParam: 'cherry',      // 语音参数
    userId: '', // 用户ID
    currentModelName: '', // 添加当前模型显示名称
    hasRecordAuth: false, // 添加录音权限状态
    userInfo: null, // 用户信息
    nickname: '', // 用户昵称
    inputValue: '',
    messages: [],
    loading: false,
    scrollTop: 0,
    scrollViewHeight: 0,
    showEmojiPanel: false,
    sessionId: '', // 添加会话ID，用于跟踪会话
    isLoading: false, // 统一加载状态管理
    currentMediaFile: null,  // 当前媒体文件路径
    currentMediaType: null,   // 当前媒体类型
  },
 
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    console.log('[聊天页面] 加载参数:', options);
    const app = getApp();
    
    // 1. 立即初始化模型名称
    this.loadResources();
    
    // 2. 恢复会话ID
    this.restoreOrCreateSession();
    
    // 3. 检查登录状态
    if (!app.checkLoginStatus('chat_emo')) {
      console.log('[聊天页面] 用户未登录，跳转到/pages/auth/auth');
      return;
    }
    
    // 4. 执行后续初始化
    this.initChatPage();
    
    // 从参数获取昵称
    if (options.nickname) {
      this.setData({ nickname: decodeURIComponent(options.nickname) });
    }
    app.globalData.userInfo = { nickName: this.data.nickname };
    
    // 页面启用检查
    if (!app.isPageEnabled('chat_emo')) {
      wx.showModal({
        title: '提示',
        content: '该功能暂时不可用，请稍后再试。',
        showCancel: false,
        success: function(res) {
          if (res.confirm) {
            wx.navigateBack();
          }
        }
      });
      return;
    }
    
    // 设置全局用户信息
    this.setData({ 
      userInfo: app.globalData.userInfo, 
      nickname: (app.globalData.userInfo  && app.globalData.userInfo.nickName)  ? app.globalData.userInfo.nickName  : this.data.nickname  || '微信用户',
      userId: app.globalData.openid  || ''
    });
    
    // 测试事件绑定
    console.log('[聊天页面] 测试handleSendMessage函数是否存在:', typeof this.handleSendMessage === 'function');
    console.log('[聊天页面] 所有方法:', Object.keys(this).filter(key => typeof this[key] === 'function'));

    this.scrollToBottomTimer = setInterval(() => {
        this.scrollToBottom();
    }, 500);
  },
  
  /**
   * 生成或恢复会话ID
   */
  restoreOrCreateSession: function() {
    // 尝试从缓存获取会话ID
    const sessionId = wx.getStorageSync('chat_session_id');
    if (sessionId) {
      console.log('[聊天页面] 恢复会话ID:', sessionId);
      this.setData({ sessionId });
    } else {
      // 生成新的会话ID
      const newSessionId = 'session_' + new Date().getTime();
      console.log('[聊天页面] 创建新会话ID:', newSessionId);
      this.setData({ sessionId: newSessionId });
      wx.setStorageSync('chat_session_id', newSessionId);
    }
  },
  
  /**
   * 初始化聊天页面
   */
  initChatPage: function() {
    const app = getApp();
    
    // 获取系统信息，计算可用高度
    wx.getSystemInfo({
      success: (res) => {
        this.setData({
          scrollViewHeight: res.windowHeight - 100
        });
      }
    });
    
    // 监听键盘高度变化
    wx.onKeyboardHeightChange(res => {
      this.setData({
        keyboardHeight: res.height,
        scrollViewHeight: this.data.scrollViewHeight - res.height
      });
      this.scrollToBottom();
    });
  },
 
  // 加载后台资源的方法
  loadResources: function() {
    const app = getApp();
    const defaultConfig = {
        textModels: ['psychology-dialogue'],
        modelNameMap: {
          'psychology-dialogue': '星语心聆',
          'glm-4v-flash': '中国芯研睿视',
          'qwen2-vl-2b-instruct': '千问心理全景视研'
      },
    };

    // 立即设置默认值
    this.setData({
        textModels: defaultConfig.textModels,
        modelNameMap: defaultConfig.modelNameMap,
        currentModel: defaultConfig.textModels[0],
        currentModelName: defaultConfig.modelNameMap[defaultConfig.textModels[0]]
    });

    // 异步获取配置
    wx.request({ 
      url: app.globalData.apiBaseUrl  + '/api/resources/',
      method: 'GET',
      success: (res) => {
          if (res.statusCode  === 200) {
              const data = res.data  || {};
              const textModels = data.textModels  || defaultConfig.textModels; 
              const modelNameMap = data.modelNameMap  || defaultConfig.modelNameMap; 

              // 确保 currentModel 和 currentModelName 有值
              const currentModel = textModels.length  > 0 ? textModels[0] : defaultConfig.textModels[0]; 
              const currentModelName = modelNameMap[currentModel] || defaultConfig.modelNameMap[defaultConfig.textModels[0]]; 

              this.setData({ 
                  textModels: textModels,
                  modelNameMap: modelNameMap,
                  currentModel: currentModel,
                  currentModelName: currentModelName
              });
          }
      },
      fail: () => {
          this.setData({ 
              textModels: defaultConfig.textModels,   // 确保有值 
              modelNameMap: defaultConfig.modelNameMap,   // 确保有值
              currentModel: defaultConfig.textModels[0], 
              currentModelName: defaultConfig.modelNameMap[defaultConfig.textModels[0]] 
          });
      }
    });
  },
 
  // 切换输入模式（文本/语音）
  toggleRecordMode() {
    const that = this;
    
    // 如果当前有媒体文件并尝试切换到录音模式，直接阻止并提示
    if (this.data.currentMediaFile && !this.data.showRecordButton) {
        wx.showToast({ 
            title: '此模型不支持语音',
            icon: 'none',
            duration: 2000
        });
        return;
    }

    if (!this.data.showRecordButton) { // 切换到录音模式时才请求权限
        wx.getSetting({
            success(res) {
                if (!res.authSetting['scope.record']) {
                    wx.authorize({
                        scope: 'scope.record',
                        success() {
                            that.setData({ hasRecordAuth: true });
                            that._toggleRecordMode();
                        },
                        fail() {
                            wx.showToast({ title: '需要麦克风权限', icon: 'none' });
                            that.setData({ showRecordButton: false });
                        }
                    });
                } else {
                    that._toggleRecordMode();
                }
            }
        });
    } else {
        this._toggleRecordMode();
    }
},

// 实际切换逻辑
_toggleRecordMode() {
    const newModel = !this.data.showRecordButton ? 
        'psychology-dialogue' :  // 统一使用心理医生模型
        'psychology-dialogue';   // 始终使用心理医生模型

    this.setData({
        showRecordButton: !this.data.showRecordButton,
        inputContent: '',
        currentModel: newModel,
        currentModelName: this.data.modelNameMap[newModel],
        currentMediaFile: null,
        currentMediaType: null
    });
},
 
  // 开始录音
  startRecording: function() {
    const that = this;
    wx.getSetting({
        success(res) {
            if (!res.authSetting['scope.record']) {
                wx.authorize({
                    scope: 'scope.record',
                    success() {
                        that.setData({ hasRecordAuth: true });
                        that._startRealRecording();
                    },
                    fail() {
                        wx.showToast({ title: '需要麦克风权限', icon: 'none' });
                    }
                });
            } else {
                that.setData({ hasRecordAuth: true });
                that._startRealRecording();
            }
        }
    });
  },
 
  // 实际录音逻辑
  _startRealRecording() {
    // 确保只有一个录音管理器实例
    if (!this.recorderManager) {
        this.recorderManager = wx.getRecorderManager();
        this.recorderManager.onStop((res) => {
            console.log('录音自然结束', res);
            this._handleRecordingStop(res);
        });
    }

    // 重置录音状态
    this.setData({ 
        isRecording: true,
        recordingDuration: 0
    });

    // 开始新录音
    this.recorderManager.start({
        duration: 60000,  // 最长60秒
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 48000,
        format: 'wav'
    });

    // 设置计时器
    this.recordTimer = setInterval(() => {
        this.setData({
            recordingDuration: this.data.recordingDuration + 1
        });
    }, 1000);
  },
 
  // 结束录音
  stopRecording: function() {
    if (!this.data.isRecording) return;
    
    console.log('用户主动停止录音');
    
    // 清除计时器
    clearInterval(this.recordTimer);
    this.recordTimer = null;

    // 立即停止录音
    if (this.recorderManager) {
        this.recorderManager.stop();
    }

    // 更新状态
    this.setData({
        isRecording: false,
        isLoading: true
    });
  },
  
  // 处理录音停止
  _handleRecordingStop: function(res) {
    console.log('处理录音停止', res);
    
    // 统一清除计时器
    if (this.recordTimer) {
        clearInterval(this.recordTimer);
        this.recordTimer = null;
    }

    // 确保状态更新
    this.setData({
        isRecording: false,
        isLoading: true
    });

    // 如果录音时长太短，提示用户
    if (this.data.recordingDuration < 1) {
        this.setData({ isLoading: false });
        wx.showToast({ 
            title: '录音时间太短', 
            icon: 'none' 
        });
        return;
    }
    
    // 发送录音文件
    wx.getFileSystemManager().readFile({
        filePath: res.tempFilePath,
        encoding: 'base64',
        success: (fileRes) => {
            // 添加用户语音消息
            const chatHistory = this.data.chatHistory;
            chatHistory.push({
                sender: 'user',
                type: 'audio',
                content: res.tempFilePath,
                duration: this.data.recordingDuration
            });
            
            // 添加思考消息
            const thinkingMessageIndex = chatHistory.length;
            const thinkingMessage = {
                sender: 'assistant',
                type: 'text',
                content: thinkingMessages.audio,
                timestamp: new Date().getTime()
            };
            chatHistory.push(thinkingMessage);
            
            this.setData({
                chatHistory,
                scrollToId: `msg${chatHistory.length - 1}`
            }, () => {
                this.forceScrollToBottom();
                setTimeout(() => this.forceScrollToBottom(), 300);
            });
            
            // 发送到服务器
            wx.uploadFile({
                url: app.globalData.apiBaseUrl + '/QwenAudio/',
                filePath: res.tempFilePath,
                name: 'file',
                formData: {
                    model: 'qwen-audio-turbo-latest',
                    duration: this.data.recordingDuration
                },
                success: (response) => {
                    if (response.statusCode === 200) {
                        try {
                            const result = JSON.parse(response.data);
                            if (result.text) {
                                chatHistory[thinkingMessageIndex].content = result.text;
                                this.setData({
                                    chatHistory,
                                    scrollToId: `msg${chatHistory.length - 1}`
                                });
                            } else if (result.error) {
                                throw new Error(result.error);
                            } else {
                                throw new Error('无效的响应格式');
                            }
                        } catch (e) {
                            console.error('解析响应失败:', e);
                            chatHistory[thinkingMessageIndex].content = '服务响应异常';
                        }
                    } else {
                        chatHistory[thinkingMessageIndex].content = `请求失败[${response.statusCode}]`;
                    }
                    this.setData({ chatHistory });
                },
                fail: (error) => {
                    console.error('发送音频失败:', error);
                    chatHistory[thinkingMessageIndex].content = '网络连接失败';
                    this.setData({ chatHistory });
                },
                complete: () => {
                    this.setData({ isLoading: false });
                }
            });
        },
        fail: (error) => {
            console.error('读取录音文件失败:', error);
            this.setData({ isLoading: false });
            wx.showToast({
                title: '录音处理失败',
                icon: 'none'
            });
        }
    });
  },
 
  // 更新用户输入的内容实时到 inputContent 中
  onInputChange(e) {
     this.setData({ 
      inputContent: e.detail.value // 更新输入内容
    });
  },
 
  // 当输入框聚焦时，获取键盘高度并动态调整输入框位置
  onInputFocus(e) {
    this.setData({ 
      keyboardHeight: e.detail.height  // 获取键盘高度
    });
  },
 
  // 当输入框失焦时，重置键盘高度 
  onInputBlur() {
    this.setData({ 
      keyboardHeight: 0 // 重置键盘高度
    });
  },
 
  // 选择媒体文件
  chooseMedia() {
    // 如果当前是录音模式，先切换回文本模式
    if (this.data.showRecordButton) {
        this.setData({ 
            showRecordButton: false,
            currentModel: this.data.textModels[0], 
            currentModelName: this.data.modelNameMap[this.data.textModels[0]] || this.data.textModels[0] 
        });
        return;
    }

    wx.showActionSheet({ 
        itemList: ['上传诊断报告', '聊天中的科研论文'],
        success: (res) => {
            if (res.tapIndex === 0) { 
                // 图片上传
                wx.chooseImage({
                    count: 1,
                    sourceType: ['album', 'camera'],
                    success: (res) => {
                        this.handleImageSelection(res.tempFilePaths[0]);
                    }
                });
            } else if (res.tapIndex === 1) {
                // 确保使用正确的参数
                wx.chooseMessageFile({
                    count: 1,
                    type: 'file',
                    extension: ['doc','docx','pdf','txt','xlsx','epub','mobi','md'],
                    success: (res) => {
                        const tempFile = res.tempFiles[0];
                        this.handleFileSelection(tempFile);
                    }
                });
            }
        }
    });
  },
 
  // 图片处理方法
  handleImageSelection(filePath) {
    wx.showActionSheet({
        itemList: ['中国芯心研睿视', '千问心理全景视研'],
        success: (modelRes) => {
            const modelMap = {
                0: 'glm-4v-flash',
                1: 'qwen2-vl-2b-instruct'
            };
            
            const selectedModel = modelMap[modelRes.tapIndex];
            const newChatHistory = [...this.data.chatHistory];
            
            newChatHistory.push({ 
                sender: 'user',
                type: 'image',
                content: filePath
            });

            this.setData({ 
                chatHistory: newChatHistory,
                currentMediaFile: filePath,
                currentMediaType: 'image',
                currentModel: selectedModel,
                currentModelName: this.data.modelNameMap[selectedModel],  // 确保使用映射名称
                scrollToId: `msg${newChatHistory.length - 1}`
            });
        }
    });
  },

  // 文件处理方法
  handleFileSelection(tempFile) {
    const newChatHistory = [...this.data.chatHistory];
    
    newChatHistory.push({ 
        sender: 'user',
        type: 'file',
        content: tempFile.name
    });

    this.setData({ 
        chatHistory: newChatHistory,
        currentMediaFile: tempFile.path,
        currentMediaType: 'file',
        currentModel: this.data.fileModel,
        scrollToId: `msg${newChatHistory.length - 1}`
    });
  },
 
  // 处理发送消息
  async handleSendMessage() {
    const { inputContent, currentMediaFile, currentMediaType } = this.data;
    const app = getApp();
    
    if (!inputContent && !currentMediaFile) {
        wx.showToast({ title: '请输入内容或上传文件', icon: 'none' });
        return;
    }

    this.setData({ isLoading: true });

    try {
        // 添加用户消息
        const userMessage = {
            sender: 'user',
            type: 'text',
            content: inputContent,
            timestamp: new Date().getTime()
        };
        
        // 统一修改所有等待提示语
        const thinkingMessages = {
            text: '请您稍等，奇妙医生正在努力思考中........',
            image: '正在深度解析图片情感信息，请稍候...',
            file: '正在分析文档心理特征，这需要一些时间...',
            audio: '正在解析语音情感，请稍等片刻...'
        };

        // 使用concat创建新数组保证数据更新
        const newChatHistory = this.data.chatHistory.concat([userMessage, {
            sender: 'assistant',
            type: 'text',
            content: thinkingMessages.text,  // 使用统一提示语
            timestamp: new Date().getTime()
        }]);

        this.setData({
            chatHistory: newChatHistory,
            scrollToId: `msg${newChatHistory.length - 1}`
        });

        // 等待视图更新
        await new Promise(resolve => wx.nextTick(resolve));
        
        // 强制滚动到底部
        this.forceScrollToBottom();

        // 根据消息类型处理
        if (currentMediaType === 'image') {
            this.handleImageMessage(currentMediaFile, inputContent, newChatHistory.length - 1);
        } else if (currentMediaType === 'file') {
            this.handleFileMessage(currentMediaFile, inputContent, newChatHistory.length - 1);
        } else {
            // 文本消息处理
            const thinkingIndex = newChatHistory.length - 1;
            const aiResponse = await this.sendToAI(inputContent, thinkingIndex);
            newChatHistory[thinkingIndex].content = aiResponse;
            this.setData({ chatHistory: newChatHistory });
        }

        // 保存记录
        await this.saveConversation({ 
          content: inputContent,
          aiResponse: newChatHistory[newChatHistory.length - 1].content,
          nickname: app.globalData.userInfo  && app.globalData.userInfo.nickName  ? app.globalData.userInfo.nickName  : '微信用户',
          phoneNumber: wx.getStorageSync('userPhoneNumber')  || ''
        });

    } finally {
        this.setData({ 
            isLoading: false,
            inputContent: '',
            currentMediaFile: null,
            currentMediaType: null
        });
    }
  },

  // 修改 sendToAI 方法，添加 thinkingMessageIndex 参数
  async sendToAI(content, thinkingMessageIndex) {
    const app = getApp();
    return new Promise((resolve, reject) => {
        wx.request({
            url: app.globalData.apiBaseUrl + '/QwenChatToke/',
            method: 'POST',
            data: { content: content },
            header: {
                'content-type': 'application/json',
                'cookie': wx.getStorageSync('cookies') // 携带cookie
            },
            success: (res) => {
                if (res.statusCode === 200 && res.data.text) {
                    resolve(res.data.text);
                } else {
                    const errorMsg = res && res.data  && res.data.error  ? res.data.error  : '服务响应异常';
                    this.updateChatHistory(thinkingMessageIndex, errorMsg);
                    reject(errorMsg);
                }
                
                // 保存服务器返回的cookie
                if (res.header && res.header['Set-Cookie']) {
                    wx.setStorageSync('cookies', res.header['Set-Cookie']);
                }
            },
            fail: (error) => {
                this.updateChatHistory(thinkingMessageIndex, '网络连接失败，请检查网络后重试');
                reject(error);
            }
        });
    });
  },

  // 专用保存方法
  async saveConversation(data) {
    try {
        const response = await new Promise((resolve, reject) => {
            wx.request({
                url: `${getApp().globalData.apiBaseUrl}/api/simple-save/`,
                method: 'POST',
                data: {
                    openid: getApp().globalData.openid,
                    content: data.content.substring(0, 5000),
                    ai_response: (data.aiResponse || '').substring(0, 5000),
                    nickName: (data.nickname || '微信用户').substring(0, 255),
                    phoneNumber: (data.phoneNumber || '').substring(0, 20)
                },
                header: {'Content-Type': 'application/json'},
                success: resolve,
                fail: reject
            });
        });

        if (!response.statusCode || response.statusCode !== 200) {
            throw new Error(`HTTP ${response.statusCode || 'undefined'}`);
        }

        if (response.data.error) {
            throw new Error(response.data.error);
        }

        return true;

    } catch (err) {
        console.error('保存错误:', err.message);
        wx.showToast({
            title: '保存失败',
            icon: 'none',
            duration: 2000
        });
        return false;
    }
  },

  // 修改 handleTextMessage 方法
  handleTextMessage: function(text, thinkingMessageIndex) {
    const app = getApp();
    wx.request({
        url: app.globalData.apiBaseUrl + '/QwenChatToke/',
        method: 'POST',
        data: { content: text },
        header: {
            'content-type': 'application/json',
            'cookie': wx.getStorageSync('cookies') // 携带cookie
        },
        success: (res) => {
            // 保存cookie
            if (res.header && res.header['Set-Cookie']) {
                wx.setStorageSync('cookies', res.header['Set-Cookie']);
            }
            
            const chatHistory = this.data.chatHistory;
            if (res.statusCode === 200 && res.data.text) {
                chatHistory[thinkingMessageIndex].content = res.data.text;
            } else {
                chatHistory[thinkingMessageIndex].content = '请您稍等，因为我的参数比较多，但是我正在努力思考中......';
            }
            this.setData({ chatHistory });
        },
        fail: (error) => {
            const chatHistory = this.data.chatHistory;
            chatHistory[thinkingMessageIndex].content = '请您稍等，因为我的参数比较多，但是我正在努力思考中......';
            this.setData({ chatHistory });
        }
    });
  },

  // 处理图片消息
  handleImageMessage(filePath, text, thinkingMessageIndex) {
    const app = getApp();
    const that = this;
    
    // 获取当前聊天记录
    const currentChatHistory = [...this.data.chatHistory];

    console.log('[图片上传] 文件信息', {
        path: filePath,
        type: 'image',
        prompt: "结合上下文你是一位富有同理心的心理医生..." + text
    });

    wx.getFileSystemManager().readFile({
        filePath: filePath,
        encoding: 'base64',
        success: (res) => {
            console.log('[图片处理] Base64数据摘要', {
                header: res.data.substring(0, 50) + '...',
                length: res.data.length
            });
            
            const base64Image = res.data;
            
            // 更新处理中的消息
            currentChatHistory[thinkingMessageIndex].content = thinkingMessages.image;
            that.setData({ chatHistory: currentChatHistory });

            // 根据模型选择接口
            const requestConfig = {
                url: '',
                data: {},
                method: 'POST'
            };

            if (that.data.currentModel === 'glm-4v-flash') {
                requestConfig.url = app.globalData.apiBaseUrl + '/GLM-4V/';
                requestConfig.data = {
                    model: 'glm-4v-flash',
                    messages: [{
                        role: 'user',
                        content: [
                            {type: 'text', text: text || '请分析这张图片'},
                            {type: 'image_url', image_url: {url: `data:image/jpeg;base64,${base64Image}`}}
                        ]
                    }]
                };
            } else {
                requestConfig.url = app.globalData.apiBaseUrl + '/Qwenvl/';
                requestConfig.data = {
                    text: text || '请分析这张图片',
                    file: base64Image
                };
            }

            // 在请求前添加日志
            console.log('[图片请求] 请求配置', JSON.parse(JSON.stringify(requestConfig)));

            wx.request({ 
              ...requestConfig,
              success: (res) => {
                  console.log('[图片响应] 完整响应', {
                      status: res.statusCode,
                      data: res.data
                  });
                  const updatedHistory = [...that.data.chatHistory]; 
                  if (res.statusCode  === 200) {
                      const content = (res.data  && res.data.choices  && res.data.choices[0]  && res.data.choices[0].message  && res.data.choices[0].message.content)  
                                      ? res.data.choices[0].message.content  
                                      : (res.data  && res.data.text)  
                                          ? res.data.text  
                                          : '分析完成';
                      updatedHistory[thinkingMessageIndex].content = content;
                  } else {
                      updatedHistory[thinkingMessageIndex].content = '分析失败';
                  }
                  that.setData({  chatHistory: updatedHistory });
                  that.forceScrollToBottom(); 
              },
              fail: (error) => {
                  console.error('[图片错误] 请求失败', error);
                  const updatedHistory = [...that.data.chatHistory]; 
                  updatedHistory[thinkingMessageIndex].content = '请求失败';
                  that.setData({  chatHistory: updatedHistory });
                  that.forceScrollToBottom(); 
              }
          });
        },
        fail: (error) => {
            console.error('[图片错误] 读取失败', error);
            const updatedHistory = [...that.data.chatHistory];
            updatedHistory[thinkingMessageIndex].content = '图片读取失败';
            that.setData({ chatHistory: updatedHistory });
            that.forceScrollToBottom();
        }
    });
  },

  // 通用更新方法
  updateChatHistory(index, content) {
    const chatHistory = this.data.chatHistory;
    chatHistory[index].content = content;
    this.setData({ chatHistory });
  },

  // 处理文件消息
  handleFileMessage(filePath, text, thinkingMessageIndex) {
    const app = getApp();
    console.log('[文件上传] 文件信息', {
        path: filePath,
        prompt: "结合上下文你是一位富有同理心的心理医生..." + text
    });

    wx.uploadFile({
        url: app.globalData.apiBaseUrl + '/QwenChatFile/', // 使用正确接口路径
        filePath: filePath,
        name: 'file',
        formData: {
            text: text || '请分析这个文档'
        },
        success: (res) => {
            console.log('[文件响应] 原始数据', {
                status: res.statusCode,
                data: res.data
            });
            const chatHistory = this.data.chatHistory;
            try {
                const data = JSON.parse(res.data);
                chatHistory[thinkingMessageIndex].content = data.text || data.content || res.data;
            } catch (error) {
                chatHistory[thinkingMessageIndex].content = res.data;
            }
            this.setData({ chatHistory });
        },
        fail: (error) => {
            console.error('[文件错误] 上传失败', error);
            const chatHistory = this.data.chatHistory;
            chatHistory[thinkingMessageIndex].content = thinkingMessages.file;
            this.setData({ chatHistory });
        }
    });
  },
 
  // 修改模型选择方法，处理取消操作
  showModelSelector() {
    const models = this.data.textModels; 
    const modelNames = models.map(model => this.data.modelNameMap[model] || model);

    wx.showActionSheet({ 
        itemList: modelNames,
        success: (res) => {
            const selectedModel = models[res.tapIndex];
            this.setData({ 
                currentModel: selectedModel,
                currentModelName: this.data.modelNameMap[selectedModel] || selectedModel
            });
        },
        fail: (err) => {
            if (err.errMsg !== 'showActionSheet:fail cancel') {
                console.error('选择模型失败:', err);
            }
        }
    });
  },
 
  // 添加发送文本消息的方法
  sendTextToAI: function(textInput, thinkingMessageIndex) { 
    const app = getApp();
    wx.request({
        url: `${app.globalData.apiBaseUrl}/QwenChatToke/`, // 保持使用相同接口
        method: 'POST',
        header: {
            'content-type': 'application/json'
        },
        data: {
            content: textInput,
            model: this.data.currentModel // 自动适配模型参数
        },
        success: this.handleAIResponse.bind(this, thinkingMessageIndex),
        fail: (error) => {
            console.error('发送文本失败:', error);
            const chatHistory = this.data.chatHistory;
            chatHistory[thinkingMessageIndex].content = '发送失败，请重试';
            this.setData({ chatHistory });
        }
    });
  },
 
  // 添加发送图片的方法
  sendImageToAI: function(base64Data, textInput, thinkingMessageIndex) {
    const app = getApp();
    wx.request({
      url: `${app.globalData.apiBaseUrl}/AI_ALL/`,
      method: 'POST',
      header: {
        'content-type': 'application/json'
      },
      data: {
        model: this.data.currentModel,
        text: textInput || '请分析这张图片',
        file: base64Data,
        voice: this.data.voiceParam
      },
      success: (res) => {
        console.log('图片处理响应:', res);
        this.handleAIResponse(thinkingMessageIndex, res);
      },
      fail: (error) => {
        console.error('发送图片失败:', error);
        const chatHistory = this.data.chatHistory;
        chatHistory[thinkingMessageIndex].content = '发送失败，请重试';
        this.setData({ chatHistory });
      }
    });
  },
 
  // 添加图片预览方法
  previewImage: function(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      urls: [url],
      current: url
    });
  },

  // 用户点击右上角分享
  onShareAppMessage: function() {
    return {
      title: '奇妙医生 - 您的AI心理咨询师',
      path: '/pages/ai/chat_emo/chat_emo'
    };
  },

  // 语音相关方法中增加权限检查
  handleRecordStart: function() {
    if (this.data.hasRecordAuth) {
      // 直接开始录音
      this.startRecording();
    } else {
      // 如果没有授权，重新请求授权
      wx.authorize({
        scope: 'scope.record',
        success: () => {
          wx.setStorage({
            key: 'recordAuth',
            data: true
          });
          this.setData({
            hasRecordAuth: true
          });
          this.startRecording();
        }
      });
    }
  },

  // 添加消息到界面
  addMessage: function(message) {
    const messages = this.data.messages;
    messages.push(message);
    
    this.setData({
      messages: messages
    });
    
    // 滚动到底部
    this.scrollToBottom();
  },
  
  // 增强的滚动到底部方法
  scrollToBottom: function() {
    const lastIndex = this.data.chatHistory.length - 1;
    this.setData({
        scrollToId: `msg${lastIndex}`
    });
    
    // 双保险滚动机制
    this.forceScrollToBottom();
    setTimeout(() => {
        this.setData({
            scrollToId: `msg${lastIndex}`
        });
    }, 300);
  },

  // 切换表情面板
  toggleEmojiPanel: function() {
    this.setData({
      showEmojiPanel: !this.data.showEmojiPanel
    });
  },


  // 输入框内容变化
  onInput: function(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  // 发送消息
  sendMessage: function() {
    const content = this.data.inputValue.trim();
    if (!content) return;
    
    // 添加用户消息到界面
    this.addMessage({
      type: 'user',
      content: content
    });
    
    // 清空输入框
    this.setData({
      inputValue: '',
      showEmojiPanel: false
    });
    
    // 显示AI正在输入
    this.setData({
      loading: true
    });
    
    // 发送请求到服务器
    this.requestAIResponse(content);
  },
  
  // 请求AI响应
  requestAIResponse: function(content) {
    const that = this;
    console.log('[AI请求] 开始请求, content:', content);
    
    if (!app.globalData.apiBaseUrl) {
      console.error('[AI请求] API地址未配置');
      that.addMessage({
        type: 'ai',
        content: '系统配置错误，请稍后重试'
      });
      return;
    }
    
    wx.request({
      url: app.globalData.apiBaseUrl + '/QwenChatToke/',
      method: 'POST',
      data: {
        content: content,
        model: 'qwen2.5-1.5b-instruct'
      },
      header: {
        'content-type': 'application/json'
      },
      success: function(res) {
        console.log('[AI响应]:', res);
        
        let aiResponse = '';
        if (res.statusCode === 200) {
          aiResponse = res.data.text || '抱歉，我暂时无法回答这个问题。';
          console.log('[AI响应] 成功获取回复:', aiResponse);
          
          // 添加AI回复到界面
          that.addMessage({
            type: 'ai',
            content: aiResponse
          });
          
          // 保存对话记录到服务器
          console.log('[AI响应] 准备调用saveConversation函数');

          // 直接在这里执行保存对话的代码，避免调用saveConversation可能的问题
          // 获取用户信息 
          const userInfo = wx.getStorageSync('userInfo')  || {};
          const phoneNumber = wx.getStorageSync('userPhoneNumber'); 
          const nickname = userInfo.nickName  || (app.globalData.userInfo  && app.globalData.userInfo.nickName)  ? app.globalData.userInfo.nickName  : that.data.nickname  || '微信用户';
          
          console.log('[AI响应] 保存对话的用户信息:', {
              openid: app.globalData.openid,
              nickname: nickname,
              phone_number: phoneNumber ? '已设置' : '未设置'
          });
          
          // 发送保存对话请求
          wx.request({
              url: app.globalData.apiBaseUrl + '/api/save-conversation/',
              method: 'POST',
              data: {
                  openid: app.globalData.openid,
                  content: content,  // 用户消息
                  ai_response: aiResponse,  // AI回复
                  nickName: nickname,
                  phone_number: phoneNumber
              },
              header: {
                  'content-type': 'application/json'
              },
              success: (saveRes) => {
                  console.log('[保存对话] 结果:', saveRes);
                  if (saveRes.data.error) {
                      console.error('保存对话失败:', saveRes.data.error);
                  }
              },
              fail: (err) => {
                  console.error('[保存对话] 请求失败:', err);
              }
          });
          
        } else {
          console.error('[AI响应] 请求失败:', res);
          aiResponse = '抱歉，服务器出现了问题，请稍后再试。';
          that.addMessage({
            type: 'ai',
            content: aiResponse
          });
        }
      },
      fail: function(err) {
        console.error('[AI请求失败]:', err);
        that.addMessage({
          type: 'ai',
          content: '抱歉，网络连接出现问题，请检查您的网络后重试。'
        });
      },
      complete: function() {
        that.setData({
          loading: false
        });
      }
    });
  },

  /**
   * 页面显示时触发
   */
  onShow: function() {
    console.log('[聊天页面] 页面显示');
    // 恢复或创建会话
    this.restoreOrCreateSession();
  },
  
  /**
   * 页面隐藏时触发
   */
  onHide: function() {
    console.log('[聊天页面] 页面隐藏');
    // 可以在这里添加会话状态保存逻辑
  },

  onUnload: function() {
    clearInterval(this.scrollToBottomTimer);
  },

  // 新增强制滚动方法
  forceScrollToBottom: function() {
    const query = wx.createSelectorQuery();
    query.select('.chat-box').boundingClientRect();
    query.selectViewport().scrollOffset();
    query.exec((res) => {
        if (res && res[1]) {
            wx.pageScrollTo({
                scrollTop: res[1].scrollHeight,
                duration: 300
            });
        }
    });
  },
});
