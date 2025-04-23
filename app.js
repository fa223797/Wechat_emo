// app.js
App({
  // 全局数据
  globalData: {
    userInfo: null,
    openid: '',
    isLoggedIn: false,
    apiBaseUrl: ' ',  // 修改为合法域名
    homepagePath: '/pages/ai/home_page/home_page',
    pageConfigs: [],
    hasPhoneNumber: false,
    publicPages: ['pages/ai/auth/auth'], // 添加不需要登录的页面列表
    lastPageKey: '',
    autoTestMode: false // 自动测试模式开关
  },

  // 小程序启动时执行
  onLaunch: function() {
    console.log('[应用启动] 小程序启动');
    
    // 从本地存储获取openid
    const openid = wx.getStorageSync('openid');
    if (openid) {
      console.log('[自动登录] 发现存储的openid:', openid);
      this.globalData.openid = openid;
    }
    
    // 获取后台配置
    this.fetchPageConfig();
  },
  
  // 自动登录
  autoLogin: function(autoRedirect = true) {
    const that = this;
    
    // 检查是否有存储的openid
    const openid = wx.getStorageSync('openid');
    if (openid) {
      console.log('[自动登录] 发现存储的openid:', openid);
      that.globalData.openid = openid;
      that.globalData.isLoggedIn = true;
      
      // 从存储恢复完整登录状态
      that.globalData.hasPhoneNumber = wx.getStorageSync('hasPhoneNumber') || false;
      that.globalData.userInfo = wx.getStorageSync('userInfo') || null;
      
      // 同步更新全局登录状态
      wx.setStorageSync('isLoggedIn', true);
      wx.setStorageSync('hasPhoneNumber', that.globalData.hasPhoneNumber);
      
      return true;
    } else {
      console.log('[自动登录] 未找到存储的openid');
      if (autoRedirect) {
        // 获取当前页面
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];
        const currentPath = currentPage ? currentPage.route : '';
        
        // 如果当前不在auth页面且不是公开页面,则跳转到auth
        if (!that.globalData.publicPages.includes(currentPath)) {
          wx.redirectTo({
            url: '/pages/ai/auth/auth'
          });
        }
      }
      return false;
    }
  },
  
  // 微信登录
  wxLogin: function(callback, retryCount = 3) {
    const that = this;
    
    // 如果已经有openid，直接返回
    if (that.globalData.openid) {
      console.log('[微信登录] 已有openid，跳过登录');
      if (callback) {
        callback(that.globalData.openid);
      }
      return;
    }
    
    // 调用微信登录接口
    wx.login({
      success: function(res) {
        if (res.code) {
          console.log('[微信登录] 获取到code:', res.code);
          
          // 构造请求参数
          const requestData = {
            code: res.code,
            action: 'get_openid'
          };
          console.log('[微信登录] 发送请求参数:', JSON.stringify(requestData));
          
          // 发送code到服务器换取openid
          wx.request({
            url: that.globalData.apiBaseUrl + '/api/wechat/',
            method: 'GET',
            data: requestData,
            header: {
              'content-type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            success: function(response) {
              console.log('[微信登录] 服务器响应状态码:', response.statusCode);
              console.log('[微信登录] 服务器响应数据:', response.data);
              
              if (response.statusCode === 200 && response.data.openid) {
                const openid = response.data.openid;
                console.log('[微信登录] 获取openid成功:', openid);
                
                // 保存openid
                that.globalData.openid = openid;
                that.globalData.isLoggedIn = true;
                wx.setStorageSync('openid', openid);
                
                if (callback) {
                  callback(openid);
                }
              } else {
                console.error('[微信登录] 获取openid失败:', response);
                if (callback) {
                  callback(null);
                }
              }
            },
            fail: function(err) {
              console.error('[微信登录] 请求失败:', err);
              
              // 服务器无响应时使用模拟数据
              console.log('[微信登录] 服务器无响应，使用模拟数据');
              const mockOpenid = 'mock_openid_' + new Date().getTime();
              that.globalData.openid = mockOpenid;
              that.globalData.isLoggedIn = true;
              wx.setStorageSync('openid', mockOpenid);
              
              if (callback) {
                callback(mockOpenid);
              }
            }
          });
        } else if (retryCount > 0) {
          console.log('[微信登录] 重试获取code, 剩余次数:', retryCount - 1);
          setTimeout(() => {
            that.wxLogin(callback, retryCount - 1);
          }, 1000);
        } else {
          console.error('[微信登录] 获取code失败');
          if (callback) callback(null);
        }
      },
      fail: function(err) {
        if (retryCount > 0) {
          console.log('[微信登录] 登录失败，重试中, 剩余次数:', retryCount - 1);
          setTimeout(() => {
            that.wxLogin(callback, retryCount - 1);
          }, 1000);
        } else {
          console.error('[微信登录] 登录失败:', err);
          if (callback) callback(null);
        }
      }
    });
  },
  
  // 获取页面配置
  fetchPageConfig: function() {
    const that = this;
    
    wx.request({
      url: that.globalData.apiBaseUrl + '/api/page-config/',
      method: 'GET',
      success: function(res) {
        if (res.statusCode === 200) {
          console.log('[页面配置] 获取成功:', res.data);
          that.globalData.pageConfigs = res.data;
          
          // 设置首页路径
          const homepage = res.data.find(page => page.is_homepage);
          if (homepage) {
            that.globalData.homepagePath = homepage.page_path;
            console.log('[页面配置] 设置首页路径:', that.globalData.homepagePath);
          }
        } else {
          console.error('[页面配置] 获取失败:', res);
          that._useDefaultPageConfig();
        }
      },
      fail: function(err) {
        console.error('[页面配置] 请求失败:', err);
        that._useDefaultPageConfig();
      }
    });
  },
  
  // 使用默认页面配置
  _useDefaultPageConfig: function() {
    console.log('[页面配置] 使用默认配置');
    const defaultConfig = [
      {
        'page_key': 'home_page',
        'page_name': '首页',
        'page_path': '/pages/ai/home_page/home_page',
        'is_enabled': true,
      },
      {
        'page_key': 'chat_emo',
        'page_name': '心理咨询',
        'page_path': '/pages/ai/chat_emo/chat_emo',
        'is_enabled': true
      },
      {
        'page_key': 'emo_test',
        'page_name': '心理测评',
        'page_path': '/pages/ai/emo_test/emo_test',
        'is_enabled': true
      }
    ];
    
    this.globalData.pageConfigs = defaultConfig;

  },
  
  // 检查页面是否启用
  isPageEnabled: function(pageKey) {
    const pageConfig = this.globalData.pageConfigs.find(config => config.page_key === pageKey);
    return pageConfig ? pageConfig.is_enabled : false;
  },
  
  // 检查登录状态，返回布尔值
  checkLoginStatus: function(pageKey) {
    console.log('[检查登录状态] 页面:', pageKey);
    
    // 获取当前页面路径
    const pages = getCurrentPages();
    const currentPath = pages.length  > 0 ? pages[0].route : '';
    
    // 如果是公开页面或授权页面，直接返回true
    if (this.globalData.publicPages.includes(currentPath) || currentPath.includes('auth')) {
      console.log('[检查登录状态] 公开页面，无需验证');
      return true;
    }

    // 检查是否有登录态和手机号
    const isLoggedIn = this.globalData.isLoggedIn && this.globalData.openid;
    const hasPhone = this.globalData.hasPhoneNumber;

    if (!isLoggedIn || !hasPhone) {
      console.log('[检查登录状态] 需要授权，当前状态:', {
        isLoggedIn: isLoggedIn,
        hasPhone: hasPhone
      });
      
      // 保存当前页面信息用于授权后跳转
      this.globalData.lastPageKey = pageKey;
      
      // 跳转到授权页面
      wx.redirectTo({
        url: '/pages/ai/auth/auth?pageKey=' + pageKey
      });
      return false;
    }

    console.log('[检查登录状态] 验证通过');
    return true;
  },
  
  // 跳转到授权页面
  navigateToAuth: function(pageKey) {
    const nickname = this.globalData.userInfo ? encodeURIComponent(this.globalData.userInfo.nickName) : '%E5%BE%AE%E4%BF%A1%E7%94%A8%E6%88%B7';
    
    console.log('[页面跳转] 准备跳转到授权页面，参数:', {
      pageKey: pageKey,
      nickname: nickname
    });
    
    // 确保pageKey不为undefined
    const safePageKey = pageKey || '';
    
    wx.navigateTo({
      url: `/pages/ai/auth/auth?pageKey=${safePageKey}&nickName=${nickname}`,
      success: function() {
        console.log('[页面跳转] 成功跳转到授权页面');
      },
      fail: function(err) {
        console.error('[页面跳转] 跳转到授权页面失败:', err);
        // 如果导航失败，尝试重定向
        wx.redirectTo({
          url: `/pages/ai/auth/auth?pageKey=${safePageKey}&nickName=${nickname}`,
          fail: function(redirectErr) {
            console.error('[页面跳转] 重定向到授权页面也失败:', redirectErr);
          }
        });
      }
    });
  }
});
