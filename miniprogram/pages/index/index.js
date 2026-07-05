const { get, post } = require('../../utils/api.js');

Page({
  data: { auctions: [], loading: true },
  onLoad() { this.loadList(); },
  onPullDownRefresh() { this.loadList().finally(() => wx.stopPullDownRefresh()); },
  async loadList() {
    this.setData({ loading: true });
    try {
      const res = await get('/auctions', { status: 'live', pageSize: 20 });
      this.setData({ auctions: res.data.list || [] });
    } catch (e) { this.setData({ auctions: [] }); }
    finally { this.setData({ loading: false }); }
  },
  goAuction(e) {
    wx.navigateTo({ url: `/pages/auction/auction?id=${e.currentTarget.dataset.id}` });
  },
});