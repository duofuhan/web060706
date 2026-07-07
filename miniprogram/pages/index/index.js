const { get, post } = require('../../utils/api.js');
const app = getApp();

Page({
  data: { auctions: [], loading: true, imgBase: '' },
  onLoad() {
    this.setData({ imgBase: app.globalData.apiBase.replace('/api', '') });
  },
  onShow() {
    this.loadList();
  },
  onPullDownRefresh() { this.loadList().finally(() => wx.stopPullDownRefresh()); },
  async loadList() {
    this.setData({ loading: true });
    try {
      const res = await get('/auctions', { pageSize: 50 });
      const all = res.data.list || [];
      const visible = all.filter(function (a) { return a.status === 'live' || a.status === 'scheduled'; });
      for (let i = 0; i < visible.length; i++) {
        const a = visible[i];
        if (a.item && a.item.images && a.item.images.length > 0 && a.item.images[0] && a.item.images[0].indexOf('/uploads/') === 0) {
          visible[i].item._imgUrl = app.globalData.apiBase.replace('/api', '') + a.item.images[0];
        } else {
          visible[i].item._imgUrl = '';
        }
      }
      this.setData({ auctions: visible });
    } catch (e) { this.setData({ auctions: [] }); }
    finally { this.setData({ loading: false }); }
  },
  goAuction(e) {
    wx.navigateTo({ url: `/pages/auction/auction?id=${e.currentTarget.dataset.id}` });
  },
});
