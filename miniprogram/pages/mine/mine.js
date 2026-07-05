const app = getApp();

Page({
  data: { userInfo: null },
  onShow() { this.setData({ userInfo: app.globalData.userInfo }); },
  goLogin() { wx.navigateTo({ url: '/pages/login/login' }); },
  goMyItems() { wx.navigateTo({ url: '/pages/myItems/myItems' }); },
  goOrders() { wx.navigateTo({ url: '/pages/orders/orders' }); },
  goValuation() { wx.navigateTo({ url: '/pages/valuation/valuation' }); },
  goDispute() { wx.navigateTo({ url: '/pages/dispute/dispute' }); },
  logout() {
    app.globalData.token = '';
    app.globalData.userInfo = null;
    wx.removeStorageSync('token');
    this.setData({ userInfo: null });
    wx.showToast({ title: '已退出', icon: 'success' });
  },
});