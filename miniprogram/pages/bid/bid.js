const app = getApp();

Page({
  data: { id: null, auctionId: null, socket: null, amount: '', messages: [] },
  onLoad(query) {
    this.setData({ auctionId: query.id });
    if (!app.globalData.token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    this.connectWs();
  },
  connectWs() {
    const ws = wx.connectSocket({
      url: `${app.globalData.wsBase}/ws?token=${app.globalData.token}`,
    });
    ws.onOpen(() => {
      ws.send({ data: JSON.stringify({ action: 'subscribe', auctionId: Number(this.data.auctionId) }) });
    });
    ws.onMessage((res) => {
      const msg = JSON.parse(res.data);
      this.setData({ messages: [msg, ...this.data.messages].slice(0, 20) });
    });
    this.setData({ socket: ws });
  },
  onInput(e) {
    this.setData({ amount: e.detail.value });
  },
  bid() {
    const amount = Number(this.data.amount);
    if (!amount) return wx.showToast({ title: '请输入出价', icon: 'none' });
    this.data.socket.send({
      data: JSON.stringify({ action: 'bid', auctionId: Number(this.data.auctionId), amount }),
    });
  },
  onUnload() {
    if (this.data.socket) this.data.socket.close();
  },
});