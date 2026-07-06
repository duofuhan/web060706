const { get, post } = require('../../utils/api.js');
const app = getApp();

const statusMap = {
  pending: '待支付', paid: '已支付', shipped: '已发货',
  completed: '已完成', canceled: '已取消', refunded: '已退款',
};

Page({
  data: { orders: [], statusMap, myUserId: null },
  onShow() {
    const user = app.globalData.userInfo;
    this.setData({ myUserId: user?.id ?? null });
    this.load();
  },
  async load() {
    try {
      // 确保有用户信息(页面刷新后 token 在但 userInfo 可能丢失)
      if (!app.globalData.userInfo) {
        const me = await get('/users/me');
        app.globalData.userInfo = me.data;
        this.setData({ myUserId: me.data.id });
      }
      const res = await get('/orders', { pageSize: 30 });
      this.setData({ orders: res.data.list || [] });
    } catch (e) {}
  },
  async pay(e) {
    const id = e.currentTarget.dataset.id;
    try {
      await post(`/orders/${id}/pay`, {});
      wx.showToast({ title: '已支付', icon: 'success' });
      this.load();
    } catch (e) {}
  },
  async confirm(e) {
    const id = e.currentTarget.dataset.id;
    try {
      await post(`/orders/${id}/complete`, {});
      wx.showToast({ title: '已确认收货', icon: 'success' });
      this.load();
    } catch (e) {}
  },
});