App({
  globalData: {
    apiBase: 'http://localhost:3000/api',
    wsBase: 'ws://localhost:3000',
    token: '',
    userInfo: null,
    editItemId: null,
  },
  onLaunch() {
    const token = wx.getStorageSync('token');
    if (token) this.globalData.token = token;
  },
});