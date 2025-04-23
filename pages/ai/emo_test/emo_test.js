// pages/ai/emo_test/emo_test.js
const app = getApp();
// 修改API基础URL
const API_BASE_URL = app.globalData.apiBaseUrl + '/api/emo-test/depression/';

Page({

  /**
   * 页面的初始数据
   */
  data: {
    loading: true,
    loadingText: "正在初始化测评系统...",
    showTypeSelect: true,
    showResult: false,
    questionnaireTypes: [
      { id: 'depression', name: 'Beck抑郁问卷', coming_soon: false },
      { id: 'dawurenge', name: '大五人格测验', coming_soon: false },
      { id: 'scl90', name: 'SCL-90症状自评量表', coming_soon: false }
    ],
    testData: null,
    testInstructions: null, // 改为null,由后台获取
    questions: [],
    questionOptions: [],
    currentQuestionIndex: 0,
    selectedOption: null,
    userAnswers: [],
    result: null,
    userId: '',
    userNickname: '',
    aiProcessing: false,
    progressPercent: 0,
    loadingPhases: [
      "正在分析您的回答...",
      "生成基础评估报告...",
      "正在连接中国芯睿情绪智能评估系统...",
      "模型正在深度解析您的测评结果...",
      "正在整合评估报告，即将完成..."
    ],
    currentPhase: 0,
    pageDisabled: false,
    selectedTestType: '',
    testType: '',
    showGenderSelect: false, // 是否显示性别选择
    selectedGender: '', // 用户选择的性别
    devModeClickCount: 0,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    // 检查页面是否启用
    if (!app.isPageEnabled('emo_test')) {
      this.setData({ 
        pageDisabled: true,
        loading: false,
        loadingText: "该功能暂时不可用，请稍后再试。"
      });
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
    
    // 从本地存储获取用户手机号
    const userPhone = wx.getStorageSync('userPhoneNumber');
    if (!userPhone) {
      // 如果没有手机号，跳转到授权页面
      wx.redirectTo({
        url: '/pages/auth/auth?pageKey=emo_test'
      });
      return;
    }
    
    this.setData({
      userId: userPhone,  // 使用手机号作为用户标识符
      userNickname: wx.getStorageSync('userNickname') || '微信用户'
    });
    
    // 模拟短暂加载
    setTimeout(() => {
      this.setData({ loading: false });
    }, 1000);
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 处理量表类型选择
   */
  handleTypeSelect: function(e) {
    const typeId = e.currentTarget.dataset.type;
    const selectedType = this.data.questionnaireTypes.find(type => type.id === typeId);
    
    if (selectedType.coming_soon) {
      wx.showToast({
        title: '该量表即将上架，敬请期待！',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 开始加载测试数据
    this.setData({ 
      loading: true,
      loadingText: "正在加载专业测评量表...",
      selectedTestType: typeId // 存储选择的测试类型
    });
    this.fetchTestData(typeId);
  },

  /**
   * 获取测试数据
   */
  fetchTestData: function(testType = 'depression') {
    // 根据测试类型确定API路径
    let apiPath = '';
    switch(testType) {
      case 'dawurenge':
        apiPath = '/api/emo-test/dawurenge/';
        // 如果是大五人格测试，先显示性别选择
        this.setData({
          testType: testType,
          loading: false,
          showTypeSelect: false,
          showGenderSelect: true, // 显示性别选择界面
          selectedGender: '' // 重置性别选择
        });
        return; // 直接返回，不继续执行
      case 'scl90':
        apiPath = '/api/emo-test/scl90/';
        break;
      case 'depression':
      default:
        apiPath = '/api/emo-test/depression/';
        break;
    }
    
    wx.request({
      url: app.globalData.apiBaseUrl + apiPath,
      method: 'GET',
      success: res => {
        if (res.statusCode === 200) {
          const testData = res.data;
          const questions = testData.questions;

          this.setData({
            testData: testData,
            testType: testType,
            testInstructions: testData.instructions,
            questions: questions,
            questionOptions: questions.length > 0 ? questions[0].options : {},
            loading: false,
            showTypeSelect: false,
            currentQuestionIndex: 0,
            userAnswers: new Array(questions.length).fill(null)
          });
        } else {
          this.showErrorMessage('获取测试数据失败');
          this.setData({ loading: false });
        }
      },
      fail: err => {
        console.error('请求失败:', err);
        this.showErrorMessage('网络请求失败，请检查网络连接');
        this.setData({ loading: false });
      }
    });
  },

  /**
   * 处理选项选择
   */
  handleOptionSelect: function(e) {
    const score =  e.currentTarget.dataset.score;
    const currentQuestion = this.data.questions[this.data.currentQuestionIndex];
    
    // 记录当前问题和选择的分数信息
    console.log(`问题${this.data.currentQuestionIndex + 1}/${this.data.questions.length}:`, 
      currentQuestion.question, 
      `选择分数: ${score}`);
    
    // 更新当前用户选择，不再进行0-4到1-5的转换
    this.setData({
      selectedOption: score // 直接使用原始分数
    });
  },

  /**
   * 处理下一题按钮
   */
  handleNextQuestion: function() {
    const { currentQuestionIndex, selectedOption, questions, userAnswers, testType } = this.data;
    
    if (selectedOption === null) {
      wx.showToast({
        title: '请选择一个选项',
        icon: 'none'
      });
      return;
    }
    
    // 保存当前答案
    const question = questions[currentQuestionIndex];
    const updatedAnswers = [...userAnswers];
    
    // 根据测试类型构建不同的答案结构
    if (testType === 'dawurenge' || testType === 'scl90') {
      updatedAnswers[currentQuestionIndex] = {
        question: question.question,
        dimension: question.dimension,
        score: selectedOption // 直接使用选择的原始分数
      };
    } else {
      // 抑郁症测试的原有答案结构
      updatedAnswers[currentQuestionIndex] = {
        question: question.question,
        option: selectedOption.toString(),
        score: selectedOption // 直接使用原始分数
      };
    }
    
    if (currentQuestionIndex < questions.length - 1) {
      // 跳转到下一题
      const nextIndex = currentQuestionIndex + 1;
      // 不再使用Object.values，直接使用选项对象
      
      this.setData({
        currentQuestionIndex: nextIndex,
        questionOptions: questions[nextIndex].options, // 直接使用原始options对象
        selectedOption: null,
        userAnswers: updatedAnswers
      });
    } else {
      // 已完成所有问题，提交答案
      this.setData({
        userAnswers: updatedAnswers,
        loading: true,
        aiProcessing: true,
        loadingText: "正在分析您的回答..."
      });
      
      // 开始进度条动画
      this.startProgressAnimation();
      
      // 提交答案
      this.submitAnswers(updatedAnswers);
    }
  },

  /**
   * 开始进度条动画和加载阶段更新
   */
  startProgressAnimation: function() {
    let progress = 0;
    let phase = 0;
    
    const progressInterval = setInterval(() => {
      progress += 1;
      
      // 每20%更新一次提示语
      if (progress % 20 === 0 && phase < this.data.loadingPhases.length - 1) {
        phase++;
        this.setData({
          loadingText: this.data.loadingPhases[phase],
          currentPhase: phase
        });
      }
      
      this.setData({
        progressPercent: progress
      });
      
      if (progress >= 100) {
        clearInterval(progressInterval);
      }
    }, 300); // 慢速进度，大约30秒完成
    
    // 保存interval id以便可以在数据返回时清除
    this.progressInterval = progressInterval;
  },

  /**
   * 处理上一题按钮
   */
  handlePrevQuestion: function() {
    if (this.data.currentQuestionIndex > 0) {
      const prevIndex = this.data.currentQuestionIndex - 1;
      const prevQuestionOptions = this.data.questions[prevIndex].options; // 保持原始对象结构
      const prevAnswer = this.data.userAnswers[prevIndex];
      
      this.setData({
        currentQuestionIndex: prevIndex,
        questionOptions: prevQuestionOptions, // 使用原始选项对象
        selectedOption: prevAnswer ? 
          (this.data.testType === 'depression' ? parseInt(prevAnswer.option) : prevAnswer.score) 
          : null
      });
    }
  },

  /**
   * 提交答案
   */
  submitAnswers: function(answers) {
    // 过滤掉未回答的问题
    const validAnswers = answers.filter(answer => answer !== null);
    
    // 验证每个答案的格式是否符合要求
    const invalidAnswers = validAnswers.filter(answer => {
      // SCL-90 测试的答案格式
      if (this.data.testType === 'scl90') {
        return !answer.question || !answer.score || answer.score < 1 || answer.score > 5;
      }
      // 大五人格测试的答案格式
      else if (this.data.testType === 'dawurenge') {
        return !answer.dimension || !answer.question || answer.score < 1 || answer.score > 5;
      }
      // 其他测试的答案格式 (beck抑郁量表)
      else {
        return !answer.question || !answer.option || answer.score < 0 || answer.score > 3;
      }
    });

    if (invalidAnswers.length > 0) {
      console.error('发现格式不正确的答案:', invalidAnswers);
      wx.showToast({
        title: '提交的答案格式不正确，请重新测试',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 构建请求数据
    let requestData = {
      test_id: this.data.testData.test_id ? this.data.testData.test_id.toString() : "0003", // 确保是字符串，提供默认值
      user_identifier: this.data.userId,
      answers: validAnswers,
      request_ai_report: true // 添加参数，明确请求AI报告
    };

    // 如果是大五人格测试，添加用户选择的性别字段
    if (this.data.testType === 'dawurenge') {
      requestData.gender = this.data.selectedGender;
      // 确保有其他可能必要的字段
      requestData.need_detailed_analysis = true; // 请求详细分析
      requestData.version = "v2"; // 添加版本信息
    }

    console.log('提交的答案数据:', JSON.stringify(requestData));

    // 确定API路径
    const apiPath = this.data.testType === 'dawurenge' 
      ? '/api/emo-test/dawurenge/'
      : this.data.testType === 'scl90'
      ? '/api/emo-test/scl90/'
      : '/api/emo-test/depression/';
    
    wx.request({
      url: app.globalData.apiBaseUrl + apiPath,
      method: 'POST',
      data: requestData,
      success: res => {
        console.log('提交答案成功，响应:', res); // 添加日志记录响应
        if (res.statusCode === 200 && res.data.success) {
          // 处理成功响应
          const processedResult = {...res.data};
          
          // 处理AI报告
          if (processedResult.ai_report) {
            processedResult.ai_report = this.formatAIReport(processedResult.ai_report);
            console.log('AI报告已处理:', processedResult.ai_report); // 检查AI报告是否存在
          } else {
            console.warn('响应中缺少AI报告'); // 检查是否缺少AI报告
          }
          
          // 清除进度动画
          if (this.progressInterval) {
            clearInterval(this.progressInterval);
          }
          
          this.setData({
            progressPercent: 100,
            loadingText: "评估完成，正在展示结果..."
          });
          
          setTimeout(() => {
            this.setData({
              result: processedResult,
              loading: false,
              aiProcessing: false,
              showResult: true
            });
            
            // 检查设置的数据
            console.log('设置到result中的数据:', processedResult);
          }, 1000);
        } else {
          console.error('提交答案失败，响应内容:', res.data); // 打印错误信息
          this.showErrorMessage('提交答案失败: ' + (res.data.error || '未知错误'));
          this.setData({ 
            loading: false,
            aiProcessing: false 
          });
          
          if (this.progressInterval) {
            clearInterval(this.progressInterval);
          }
        }
      },
      fail: err => {
        console.error('提交答案失败:', err);
        this.showErrorMessage('网络请求失败，请检查网络连接');
        this.setData({ 
          loading: false,
          aiProcessing: false 
        });
        
        if (this.progressInterval) {
          clearInterval(this.progressInterval);
        }
      }
    });
  },
  
  /**
   * 格式化AI报告
   */
  formatAIReport: function(report) {
    if (!report) return '';
    
    // 去除特殊字符和多余空格
    let formatted = report
      .replace(/#+/g, '') // 去除#号
      .replace(/\*+/g, '') // 去除*号
      .replace(/\s+/g, ' ') // 多个空格替换为单个空格
      .trim();
    
    // 分段处理
    formatted = formatted
      .replace(/。\s*/g, '。\n\n') // 在句号后添加换行
      .replace(/：\s*/g, '：\n') // 在冒号后添加换行
      .replace(/(?:建议|注意|提醒|结论|总结|分析|解读)：\n/g, match => `\n${match}`) // 在特定词后的冒号添加额外换行
      .replace(/\n{3,}/g, '\n\n'); // 最多保留两个连续换行
    
    return formatted;
  },

  /**
   * 重新测试
   */
  restartTest: function() {
    this.setData({
      showResult: false,
      showTypeSelect: true,
      showGenderSelect: false,
      currentQuestionIndex: 0,
      selectedOption: null,
      selectedGender: '', // 重置性别选择
      userAnswers: [],
      result: null,
      progressPercent: 0,
      currentPhase: 0
    });
  },

  /**
   * 显示错误信息
   */
  showErrorMessage: function(message) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {
    if (this.data.showResult) {
      return {
        title: `我完成了问卷测试，评估结果: ${this.data.result.result}`,
        path: '/pages/ai/emo_test/emo_test',
        imageUrl: '/static/images/share_emo_test.png'
      };
    } else {
      return {
        title: '来测测你的心理健康状况吧!',
        path: '/pages/ai/emo_test/emo_test',
        imageUrl: '/static/images/share_emo_test.png'
      };
    }
  },

  /**
   * 处理性别选择
   */
  handleGenderSelect: function(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      selectedGender: gender
    });
  },

  /**
   * 确认性别选择并开始获取测试数据
   */
  confirmGenderSelection: function() {
    if (!this.data.selectedGender) {
      wx.showToast({
        title: '请选择性别',
        icon: 'none'
      });
      return;
    }
    
    // 开始加载测试数据
    this.setData({ 
      loading: true,
      loadingText: "正在加载大五人格测试...",
      showGenderSelect: false // 隐藏性别选择界面
    });
    
    // 获取大五人格测试数据
    const apiPath = '/api/emo-test/dawurenge/';
    wx.request({
      url: app.globalData.apiBaseUrl + apiPath,
      method: 'GET',
      success: res => {
        if (res.statusCode === 200) {
          const testData = res.data;
          const questions = testData.questions;
          
          this.setData({
            testData: testData,
            testInstructions: testData.instructions,
            questions: questions,
            questionOptions: questions.length > 0 ? questions[0].options : {}, // 直接使用原始options对象
            loading: false,
            currentQuestionIndex: 0,
            userAnswers: new Array(questions.length).fill(null)
          });
        } else {
          this.showErrorMessage('获取测试数据失败');
          this.setData({ 
            loading: false,
            showTypeSelect: true, // 失败时返回到测试类型选择
            showGenderSelect: false
          });
        }
      },
      fail: err => {
        console.error('请求失败:', err);
        this.showErrorMessage('网络请求失败，请检查网络连接');
        this.setData({ 
          loading: false,
          showTypeSelect: true, // 失败时返回到测试类型选择
          showGenderSelect: false
        });
      }
    });
  },

  /**
   * 获取维度中文名称
   */
  getDimensionName: function(dim) {
    const dimensionNames = {
      'N': '(神经质)',
      'E': '(外向性)',
      'O': '(开放性)',
      'A': '(宜人性)',
      'C': '(尽责性)'
    };
    return dimensionNames[dim] || '';
  },

  /**
   * 获取子维度中文名称
   */
  getSubDimensionName: function(subDim) {
    const subDimensionNames = {
      // 神经质
      'N1': '(焦虑)',
      'N2': '(愤怒与敌意)',
      'N3': '(抑郁)',
      'N4': '(自我意识)',
      'N5': '(冲动性)',
      'N6': '(脆弱性)',
      
      // 外向性
      'E1': '(热情)',
      'E2': '(群居性)',
      'E3': '(果断性)',
      'E4': '(活跃性)',
      'E5': '(寻求刺激)',
      'E6': '(积极情绪)',
      
      // 开放性
      'O1': '(想象力)',
      'O2': '(审美)',
      'O3': '(情感丰富性)',
      'O4': '(行动)',
      'O5': '(思想)',
      'O6': '(价值观)',
      
      // 宜人性
      'A1': '(信任)',
      'A2': '(坦诚)',
      'A3': '(利他)',
      'A4': '(顺从)',
      'A5': '(谦虚)',
      'A6': '(同情心)',
      
      // 尽责性
      'C1': '(胜任)',
      'C2': '(条理性)',
      'C3': '(尽职)',
      'C4': '(成就追求)',
      'C5': '(自律)',
      'C6': '(谨慎)'
    };
    return subDimensionNames[subDim] || '';
  },
})