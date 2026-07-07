const { get, post } = require('../../utils/api.js');
const app = getApp();

const statusMap = {
  draft: '草稿', pending: '待审核', approved: '审核通过',
  rejected: '已驳回', removed: '已下架',
};

Page({
  data: { items: [], statusMap, imgBase: '' },
  onShow() {
    this.setData({ imgBase: app.globalData.apiBase.replace('/api', '') });
    this.load();
  },
  async load() {
    try {
      const res = await get('/items/mine', { pageSize: 50 });
      const items = res.data.list || [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.images && it.images.length > 0 && it.images[0] && it.images[0].indexOf('/uploads/') === 0) {
          items[i]._imgUrl = app.globalData.apiBase.replace('/api', '') + it.images[0];
        } else {
          items[i]._imgUrl = '';
        }
      }
      this.setData({ items: items });
    } catch (e) {}
  },
  onItemTap(e) {
    var id = e.currentTarget.dataset.id;
    var status = e.currentTarget.dataset.status;
    if (status === 'draft') {
      app.globalData.editItemId = id;
      wx.switchTab({ url: '/pages/publish/publish' });
    }
  },

  async startAuction(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '设置拍卖结束时间',
      editable: true,
      placeholderText: '填写分钟数',
      content: '',
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
        } catch (e) {
          // 如果服务器返回"已存在场次",立刻刷新列表(按钮隐藏)
          this.load();
        }
      },
    });
  },
});