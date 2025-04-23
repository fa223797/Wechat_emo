// pages/ai/home_page/home_page.js
const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    pageDisabled: false,
    // 可以在这里添加页面所需数据
    userInfo: {
      nickName: '微信用户',
      hasPhone: false
    },
    testRecords: [],
    articles: [],
    loading: true
  },

  /**
   * 导航到聊天页面
   */
  navigateToChat: function() {
    const app = getApp();
    // 检查聊天页面是否启用
    if (!app.isPageEnabled('chat_emo')) {
      wx.showModal({
        title: '提示',
        content: '该功能暂时不可用，请稍后再试。',
        showCancel: false
      });
      return;
    }
    
    wx.navigateTo({
      url: '../chat_emo/chat_emo',
    });
  },

  /**
   * 导航到测评页面
   */
  navigateToTest: function() {
    const app = getApp();
    // 检查测评页面是否启用
    if (!app.isPageEnabled('emo_test')) {
      wx.showModal({
        title: '提示',
        content: '该功能暂时不可用，请稍后再试。',
        showCancel: false
      });
      return;
    }
    
    wx.navigateTo({
      url: '../emo_test/emo_test',
    });
  },

  /**
   * 显示即将上线提示
   */
  showComingSoon: function() {
    wx.showToast({
      title: '功能即将开放，敬请期待！',
      icon: 'none',
      duration: 2000
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('首页加载，参数:', options);
    
    // 设置加载状态
    this.setData({
      loading: true
    });
    
    const app = getApp();
    // 检查页面是否启用
    if (!app.isPageEnabled('home_page')) {
      this.setData({ 
        pageDisabled: true 
      });
      wx.showModal({
        title: '提示',
        content: '该功能暂时不可用，请稍后再试。',
        showCancel: false,
        success: function(res) {
          if (res.confirm) {
            // 导航到首页或返回
            const homepagePath = app.globalData.homepagePath || '/pages/index/index';
            if (homepagePath !== '/pages/ai/home_page/home_page') {
              wx.reLaunch({
                url: homepagePath
              });
            } else {
              wx.navigateBack();
            }
          }
        }
      });
      return;
    }
    
    // 获取公告信息
    wx.request({
      url: app.globalData.apiBaseUrl + '/api/page-config/', // 修改为使用已有的page-config接口
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          // 从页面配置中提取公告信息
          const announcements = res.data.filter(config => config.page_key === 'home_page')
            .map(config => ({
              title: config.page_name,
              content: config.description || '暂无公告'
            }));
          this.setData({ announcements });
        }
      }
    });

    // 获取用户信息和测试记录
    this.getUserInfo();
    
    // 设置一些默认数据，避免页面显示空白
    this.setData({
      articles: [
        {
          id: 1,
          title: '如何缓解日常焦虑',
          summary: '本文介绍了几种简单有效的方法来缓解日常生活中的焦虑情绪。',
          image_url: 'https://example.com/images/anxiety.jpg',
          created_at: '2023-05-15'
        },
        {
          id: 2,
          title: '改善睡眠质量的7个小技巧',
          summary: '睡眠对心理健康至关重要，这里有7个小技巧可以帮助你改善睡眠质量。',
          image_url: 'https://example.com/images/sleep.jpg',
          created_at: '2023-05-10'
        }
      ],
      loading: false
    });
  },

  /**
   * 获取用户信息
   */
  getUserInfo: function() {
    const app = getApp();
    const that = this;
    
    // 如果没有openid，先获取
    if (!app.globalData.openid) {
      console.log('未获取到openid，先进行登录');
      app.wxLogin(function(openid) {
        if (openid) {
          // 登录成功后更新用户信息
          that.setData({
            userInfo: {
              nickName: app.globalData.userInfo ? app.globalData.userInfo.nickName : '微信用户',
              hasPhone: false
            },
            loading: false
          });
        } else {
          console.error('获取openid失败');
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none'
          });
          that.setData({ loading: false });
        }
      });
    } else {
      // 已有openid，直接更新用户信息
      that.setData({
        userInfo: {
          nickName: app.globalData.userInfo ? app.globalData.userInfo.nickName : '微信用户',
          hasPhone: false
        },
        loading: false
      });
    }
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
    // 下拉刷新时重新获取用户信息
    this.getUserInfo();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '奇妙医生 - 您的心理健康助手',
      path: '/pages/ai/home_page/home_page'
    }
  },

  // 获取服务列表
  getServices: function() {
    wx.request({
      url: app.globalData.apiBaseUrl + '/api/services/', // 修改这里，使用 /api/ 前缀
      method: 'GET',
      success: (res) => {
        // ...existing code...
      }
    });
  },

  // 获取用户资源数据
  fetchUserResources: function() {
    const app = getApp();
    const that = this;
    
    // 如果没有openid，先获取
    if (!app.globalData.openid) {
      console.log('未获取到openid，先进行登录');
      app.wxLogin(function(openid) {
        if (openid) {
          that.fetchResourcesWithOpenid(openid);
        } else {
          console.error('获取openid失败，无法获取资源数据');
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none'
          });
          that.setData({ loading: false });
        }
      });
    } else {
      // 已有openid，直接获取资源
      this.fetchResourcesWithOpenid(app.globalData.openid);
    }
  },

  // 使用openid获取资源
  fetchResourcesWithOpenid: function(openid) {
    const app = getApp();
    const that = this;
    
    console.log('开始获取用户资源数据，openid:', openid);
    
    wx.request({
      url: app.globalData.apiBaseUrl + '/api/resources/',
      method: 'GET',
      data: {
        openid: openid
      },
      header: {
        'content-type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      success: function(res) {
        console.log('获取资源响应:', res);
        
        if (res.statusCode === 200 && res.data.success) {
          // 更新用户信息
          if (res.data.user_exists) {
            that.setData({
              userInfo: {
                nickName: res.data.user_info.nickname || '微信用户',
                hasPhone: res.data.user_info.has_phone
              }
            });
            
            // 更新全局用户信息
            if (!app.globalData.userInfo || !app.globalData.userInfo.nickName) {
              app.globalData.userInfo = {
                nickName: res.data.user_info.nickname || '微信用户'
              };
            }
          }
          
          // 更新测试记录
          that.setData({
            testRecords: res.data.test_records || []
          });
          
          // 更新文章列表
          that.setData({
            articles: res.data.articles || []
          });
          
        } else {
          console.error('获取资源失败:', res);
          wx.showToast({
            title: '获取数据失败',
            icon: 'none'
          });
        }
      },
      fail: function(err) {
        console.error('请求资源接口失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      },
      complete: function() {
        // 无论成功失败，都关闭加载状态
        that.setData({ loading: false });
      }
    });
  },

  // 导航到心理测评页面
  navigateToEmoTest: function() {
    const app = getApp();
    
    // 检查页面是否启用
    if (!app.isPageEnabled('emo_test')) {
      wx.showModal({
        title: '功能未启用',
        content: '心理测评功能暂未启用，请稍后再试',
        showCancel: false
      });
      return;
    }
    
    // 检查登录状态
    app.checkLoginStatus('emo_test');
    
    // 如果已登录，直接跳转
    if (app.globalData.isLoggedIn) {
      wx.navigateTo({
        url: '/pages/ai/emo_test/emo_test',
        fail: function(err) {
          console.error('跳转到心理测评页面失败:', err);
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          });
        }
      });
    }
  },
  
  // 导航到心理咨询页面
  navigateToChatEmo: function() {
    const app = getApp();
    
    // 检查页面是否启用
    if (!app.isPageEnabled('chat_emo')) {
      wx.showModal({
        title: '功能未启用',
        content: '心理咨询功能暂未启用，请稍后再试',
        showCancel: false
      });
      return;
    }
    
    // 检查登录状态
    app.checkLoginStatus('chat_emo');
    
    // 如果已登录，直接跳转
    if (app.globalData.isLoggedIn) {
      wx.navigateTo({
        url: '/pages/ai/chat_emo/chat_emo',
        fail: function(err) {
          console.error('跳转到心理咨询页面失败:', err);
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          });
        }
      });
    }
  },
  
  // 查看所有测评记录
  viewAllRecords: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },
  
  // 查看测评记录详情
  viewRecordDetail: function(e) {
    const recordId = e.currentTarget.dataset.id;
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },
  
  // 查看所有文章
  viewAllArticles: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },
  
  // 查看文章详情
  viewArticleDetail: function(e) {
    const articleId = e.currentTarget.dataset.id;
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },
  
  // 页面相关事件处理函数
  onPullDownRefresh: function() {
    // 下拉刷新
    this.fetchUserResources();
    wx.stopPullDownRefresh();
  },
  
  onShareAppMessage: function() {
    // 用户点击右上角分享
    return {
      title: '心理健康小程序',
      path: '/pages/ai/home_page/home_page'
    };
  },

  // 添加导航到资料库页面的方法
  navigateToEmoBook: function() {
    wx.navigateTo({
      url: '/pages/ai/emo_book/emo_book'
    })
  }
})