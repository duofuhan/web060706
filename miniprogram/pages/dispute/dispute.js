const { post, get } = require('../../utils/api.js');
const app = getApp();

Page({
  data: { auctionId: null, reason: '', list: [] },
  onLoad(q) {
    if (q.auctionId) this.setData({ auctionId: Number(q.auctionId) });
    this.load();
  },
  onInput(e) { this.setData({ reason: e.detail.value }); },
  async submit() {
    if (!this.data.auctionId) return wx.showToast({ title: '缺少拍卖场次', icon: 'none' });
    if (this.data.reason.length < 5) return wx.showToast({ title: '请填写详细原因', icon: 'none' });
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
});