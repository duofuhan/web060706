const { get } = require('../../utils/api.js');
const app = getApp();

Page({
  data: { id: null, auction: null, socket: null, imgBase: '' },
  onLoad(query) {
    this.setData({ id: query.id, imgBase: app.globalData.apiBase.replace('/api', '') });
    this.load();
    this.connectWs();
  },
  async load() {
    try {
      const res = await get('/auctions/' + this.data.id);
      this.setData({ auction: res.data });
    } catch (e) {}
  },
  connectWs() {
    if (!app.globalData.token) return;
    try {
      var ws = wx.connectSocket({
        url: app.globalData.wsBase + '/ws?token=' + app.globalData.token,
      });
      var that = this;
      ws.onOpen(function () {
        ws.send({ data: JSON.stringify({ action: 'subscribe', auctionId: Number(that.data.id) }) });
      });
      ws.onMessage(function (res) {
        var msg = JSON.parse(res.data);
        if (msg.action === 'bid' && msg.auctionId === Number(that.data.id)) {
          // 更新当前价
          var a = that.data.auction;
          if (a && msg.currentPrice) {
            a.currentPrice = msg.currentPrice;
            that.setData({ auction: a });
          }
        }
      });
      this.setData({ socket: ws });
    } catch (e) {}
  },
  goBid() {
    wx.navigateTo({ url: '/pages/bid/bid?id=' + this.data.id });
  },
  onUnload() {
    if (this.data.socket) this.data.socket.close();
  },
});
