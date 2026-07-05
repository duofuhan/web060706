const { get, post } = require('../../utils/api.js');

const statusMap = {
  pending: '待支付', paid: '已支付', shipped: '已发货',
  completed: '已完成', canceled: '已取消', refunded: '已退款',
};

Page({
  data: { orders: [], statusMap },
  onShow() { this.load(); },
  async load() {
    try {
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