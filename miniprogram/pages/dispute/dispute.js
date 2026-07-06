const { post, get } = require('../../utils/api.js');
const app = getApp();

Page({
  data: { auctionId: null, reason: '', list: [], loggedIn: false },
  onLoad(q) {
    this.setData({ loggedIn: !!(app.globalData.token && app.globalData.userInfo) });
    if (q.auctionId) this.setData({ auctionId: Number(q.auctionId) });
    if (this.data.loggedIn) this.load();
  },
  onShow() {
    if (!this.data.loggedIn && app.globalData.token && app.globalData.userInfo) {
      this.setData({ loggedIn: true });
      this.load();
    }
  },
  onInput(e) { this.setData({ reason: e.detail.value }); },
  onAuctionInput(e) { this.setData({ auctionId: e.detail.value ? Number(e.detail.value) : null }); },
  async submit() {
    if (!this.data.auctionId) return wx.showToast({ title: '缺少拍卖场次', icon: 'none' });
    if (this.data.reason.length < 5) return wx.showToast({ title: '字数不达标', icon: 'none' });
    try {
      await post('/disputes', { auctionId: this.data.auctionId, reason: this.data.reason });
      wx.showToast({ title: '已提交争议', icon: 'success' });
      this.setData({ reason: '' });
      this.load();
    } catch (e) {}
  },
  async load() {
    try {
      const res = await get('/disputes');
      this.setData({ list: res.data.list || [] });
    } catch (e) {}
  },
  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },
});