const { get } = require('../../utils/api.js');
const app = getApp();

Page({
  data: { id: null, auction: null },
  onLoad(query) {
    this.setData({ id: query.id });
    this.load();
  },
  async load() {
    try {
      const res = await get(`/auctions/${this.data.id}`);
      this.setData({ auction: res.data });
    } catch (e) {}
  },
  goBid() {
    wx.navigateTo({ url: `/pages/bid/bid?id=${this.data.id}` });
  },
});