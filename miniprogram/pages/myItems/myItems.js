const { get, post } = require('../../utils/api.js');

const statusMap = {
  draft: '草稿', pending: '待审核', approved: '审核通过',
  rejected: '已驳回', removed: '已下架',
};

Page({
  data: { items: [], statusMap },
  onShow() { this.load(); },
  async load() {
    try {
      const res = await get('/items/mine', { pageSize: 50 });
      this.setData({ items: res.data.list || [] });
    } catch (e) {}
  },
  async startAuction(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '开始拍卖',
      content: '设置拍卖结束时间(分钟)',
      editable: true,
      placeholder: '60',
      success: async (r) => {
        if (!r.confirm) return;
        const minutes = Number(r.content) || 60;
        const now = new Date();
        const end = new Date(now.getTime() + minutes * 60000);
        try {
          await post('/auctions', {
            itemId: id,
            startTime: now.toISOString().replace(/\.\d+Z$/, 'Z'),
            endTime: end.toISOString().replace(/\.\d+Z$/, 'Z'),
          });
          wx.showToast({ title: '拍卖已启动', icon: 'success' });
          this.load();
        } catch (e) {}
      },
    });
  },
});