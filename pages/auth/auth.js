const app = getApp();

Page({
  data: {
    pageKey: '',
    nickName: '',
    isLoading: false,
    phoneNumber: '',
    errorMsg: '',
    isValid: false
  },

  onLoad(options) {
    console.log('[授权页面] 加载参数:', options);
    
    // 检查是否已经有存储的手机号
    const storedPhone = wx.getStorageSync('userPhoneNumber');
    if (storedPhone) {
      // 如果有存储的手机号，直接跳转
      app.globalData.hasPhoneNumber = true;
      this.navigateToTarget();
      return;
    }
    
    this.setData({
      pageKey: options.pageKey || 'home_page',  // 默认跳转到首页
      nickName: decodeURIComponent(options.nickName || '微信用户')
    });

    // 确保有openid
    if (!app.globalData.openid) {
      app.wxLogin((openid) => {
        if (!openid) {
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none'
          });
        }
      });
    }
  },

  // 处理手机号输入
  onPhoneInput(e) {
    const phoneNumber = e.detail.value;
    const isValid = this.validatePhoneNumber(phoneNumber);
    
    this.setData({
      phoneNumber,
      isValid,
      errorMsg: isValid ? '' : (phoneNumber.length === 11 ? '请输入正确的手机号' : '')
    });
  },

  // 验证手机号
  validatePhoneNumber(phone) {
    const phoneReg = /^1[3-9]\d{9}$/;
    return phoneReg.test(phone);
  },

  // 提交手机号
  submitPhoneNumber() {
    if (!this.data.isValid) {
      this.setData({
        errorMsg: '请输入正确的手机号'
      });
      return;
    }

    console.log('[提交手机号] 开始保存用户信息:', {
      nickName: this.data.nickName,
      phoneNumber: this.data.phoneNumber,
      openid: app.globalData.openid
    });

    this.setData({ isLoading: true });
    
    // 先保存用户基本信息
    wx.request({
      url: app.globalData.apiBaseUrl + '/api/save_test_user/',
      method: 'POST',
      data: {
        nickName: this.data.nickName,
        openid: app.globalData.openid,
        phoneNumber: this.data.phoneNumber
      },
      header: {
        'content-type': 'application/json'
      },
      success: (res) => {
        console.log('[保存用户信息] 响应:', res);
        if (res.statusCode === 200) {
          console.log('[保存用户信息] 成功');
          // 保存手机号到本地存储
          wx.setStorageSync('userPhoneNumber', this.data.phoneNumber);
          
          app.globalData.isLoggedIn = true;
          app.globalData.hasPhoneNumber = true;
          app.globalData.userInfo = {
            nickName: this.data.nickName,
            phoneNumber: this.data.phoneNumber
          };
          
          // 存储登录状态
          wx.setStorageSync('hasPhoneNumber', true);
          
          this.navigateToTarget();
        } else {
          console.error('[保存用户信息] 失败:', res.data);
          wx.showToast({
            title: res.data.error || '提交失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('[保存用户信息] 请求失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({ isLoading: false });
      }
    });
  },

  // 导航到目标页面
  navigateToTarget() {
    // 获取后台配置的首页
    const homePage = app.globalData.pageConfigs.find(page => page.is_homepage);
    const pageToNavigate = homePage ? homePage.page_path : '/pages/ai/home_page/home_page';
    
    // 跳转到首页
    wx.reLaunch({
      url: pageToNavigate + `?nickname=${encodeURIComponent(this.data.nickName)}`,
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.reLaunch({
          url: '/pages/ai/home_page/home_page'
        });
      }
    });
  },

  // 返回上一页
  navigateBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      // 如果没有历史页面,跳转到首页
      wx.redirectTo({
        url: getApp().globalData.homepagePath
      });
    }
  }
});
