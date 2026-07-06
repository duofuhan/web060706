const { get } = require('../../utils/api.js');
const app = getApp();

Page({
  data: { auctionId: null, socket: null, amount: '', currentPrice: 0, startPrice: 0, bids: [], itemName: '', itemImage: '', loggedIn: false, imgBase: '' },
  onLoad(query) {
    this.setData({ auctionId: query.id, imgBase: app.globalData.apiBase.replace('/api', ''), loggedIn: !!(app.globalData.token && app.globalData.userInfo) });
    if (!this.data.loggedIn) return;
    this.loadAuction();
    this.loadBids();
    this.connectWs();
  },
  onShow() {
    if (!this.data.loggedIn && app.globalData.token && app.globalData.userInfo) {
      this.setData({ loggedIn: true });
      this.loadAuction();
      this.loadBids();
      this.connectWs();
    }
  },
  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },
  async loadAuction() {
    try {
      var res = await get('/auctions/' + this.data.auctionId);
      if (res && res.data) {
        this.setData({
          currentPrice: res.data.currentPrice,
          startPrice: res.data.startPrice,
          itemName: res.data.item ? res.data.item.name : '',
          itemImage: (res.data.item && res.data.item.images && res.data.item.images.length > 0) ? this.data.imgBase + res.data.item.images[0] : '',
        });
      }
    } catch (e) {}
  },
  async loadBids() {
    try {
      var res = await get('/bids/auction/' + this.data.auctionId);
      if (res && res.data) {
        var list = res.data || [];
        list.sort(function (a, b) { return b.amount - a.amount; });
        this.setData({ bids: list });
      }
    } catch (e) {}
  },
  connectWs() {
    var that = this;
    var ws = wx.connectSocket({
      url: app.globalData.wsBase + '/ws?token=' + app.globalData.token,
    });
    ws.onOpen(function () {
      ws.send({ data: JSON.stringify({ action: 'subscribe', auctionId: Number(that.data.auctionId) }) });
    });
    ws.onMessage(function (res) {
      var msg = JSON.parse(res.data);
      if (msg.action === 'bid' && msg.auctionId === Number(that.data.auctionId)) {
        if (msg.currentPrice) {
          that.setData({ currentPrice: msg.currentPrice });
        }
        // 将新出价插入bids并保持排序
        var newBids = that.data.bids.concat([{
          userId: msg.userId,
          amount: msg.amount,
          createdAt: msg.time || new Date().toISOString(),
        }]);
        newBids.sort(function (a, b) { return b.amount - a.amount; });
        that.setData({ bids: newBids });
      }
    });
    this.setData({ socket: ws });
  },
  onInput(e) {
    this.setData({ amount: e.detail.value });
  },
  bid() {
    var amount = Number(this.data.amount);
    if (!amount) return wx.showToast({ title: '请输入出价', icon: 'none' });
    if (amount <= Number(this.data.currentPrice)) {
      return wx.showToast({ title: '出价需高于当前价', icon: 'none' });
    }
    this.data.socket.send({
      data: JSON.stringify({ action: 'bid', auctionId: Number(this.data.auctionId), amount: amount }),
    });
    this.setData({ amount: '' });
  },
  onUnload() {
    if (this.data.socket) this.data.socket.close();
  },
});
