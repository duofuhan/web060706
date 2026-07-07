var app = getApp();
var api = require('../../utils/api.js');

Page({
  data: {
    userInfo: null,
    showAccountModal: false,
    showAddModal: false,
    accounts: [],
    newUsername: '',
    newPassword: '',
    imgBase: '',
  },

  onShow() {
    this.setData({ userInfo: app.globalData.userInfo, imgBase: app.globalData.apiBase.replace('/api', '') });
    this.loadAccounts();
  },

  loadAccounts() {
    var list = wx.getStorageSync('accounts') || [];
    if (list.length === 0) {
      list = [
        { username: 'seller01', password: '123456' },
        { username: 'buyer01', password: '123456' },
      ];
      wx.setStorageSync('accounts', list);
    }
    var current = app.globalData.userInfo;
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      a.current = current && a.username === current.username && a.password === (current._pwd || '');
    }
    this.setData({ accounts: list });
  },

  saveAccounts(list) {
    wx.setStorageSync('accounts', list || this.data.accounts);
  },

  showSwitchAccount() {
    this.loadAccounts();
    this.setData({ showAccountModal: true });
  },
  hideAccountModal() {
    this.setData({ showAccountModal: false });
  },

  switchToAccount(e) {
    var idx = e.currentTarget.dataset.idx;
    var account = this.data.accounts[idx];
    if (account.current) {
      this.setData({ showAccountModal: false });
      return;
    }
    var that = this;
    wx.showLoading({ title: '切换中…' });
    api.post('/users/login', { username: account.username, password: account.password })
      .then(function (res) {
        if (res && res.data) {
          res.data._pwd = account.password;
          app.globalData.token = res.data.token;
          app.globalData.userInfo = res.data;
          wx.setStorageSync('token', res.data.token);

          var list = wx.getStorageSync('accounts') || [];
          for (var i = 0; i < list.length; i++) {
            if (list[i].username === account.username) { list[i].role = res.data.role; }
          }
          that.saveAccounts(list);

          that.setData({ userInfo: res.data, showAccountModal: false, accounts: list });
          wx.hideLoading();
          wx.showToast({ title: '已切换至 ' + account.username, icon: 'success' });
        }
      })
      .catch(function () {
        wx.hideLoading();
        wx.showToast({ title: '切换失败', icon: 'none' });
      });
  },

  deleteAccount(e) {
    var idx = e.currentTarget.dataset.idx;
    var list = this.data.accounts;
    var account = list[idx];
    var that = this;
    wx.showModal({
      title: '删除账号',
      content: '确定删除 ' + account.username + ' 吗？',
      success: function (r) {
        if (r.confirm) {
          list.splice(idx, 1);
          that.setData({ accounts: list });
          that.saveAccounts(list);
        }
      },
    });
  },

  addAccount() {
    this.setData({ showAccountModal: false, showAddModal: true, newUsername: '', newPassword: '' });
  },
  hideAddModal() {
    this.setData({ showAddModal: false });
  },
  onNewUsername(e) { this.setData({ newUsername: e.detail.value }); },
  onNewPassword(e) { this.setData({ newPassword: e.detail.value }); },

  doAddAccount() {
    var username = this.data.newUsername.trim();
    var password = this.data.newPassword.trim();
    if (!username || !password) {
      wx.showToast({ title: '请填写用户名和密码', icon: 'none' });
      return;
    }
    var that = this;
    wx.showLoading({ title: '登录中…' });
    api.post('/users/login', { username: username, password: password })
      .then(function (res) {
        if (res && res.data) {
          res.data._pwd = password;
          app.globalData.token = res.data.token;
          app.globalData.userInfo = res.data;
          wx.setStorageSync('token', res.data.token);

          var list = wx.getStorageSync('accounts') || [];
          var exists = false;
          for (var i = 0; i < list.length; i++) {
            if (list[i].username === username) { list[i].role = res.data.role; exists = true; break; }
          }
          if (!exists) {
            list.push({ username: username, password: password, role: res.data.role });
            that.saveAccounts(list);
          } else {
            that.saveAccounts(list);
          }
          that.setData({
            userInfo: res.data, showAddModal: false, accounts: list,
            newUsername: '', newPassword: '',
          });
          wx.hideLoading();
          wx.showToast({ title: '添加成功', icon: 'success' });
        }
      })
      .catch(function () {
        wx.hideLoading();
        wx.showToast({ title: '登录失败,请检查账号密码', icon: 'none' });
      });
  },

  goProfile() { wx.navigateTo({ url: '/pages/profile/profile' }); },

  switchRole() {
    var u = this.data.userInfo;
    if (!u || (u.role !== 'seller' && u.role !== 'buyer')) return;
    var newRole = u.role === 'seller' ? 'buyer' : 'seller';
    var that = this;
    wx.showModal({
      title: '切换身份',
      content: '确定切换为' + (newRole === 'seller' ? '卖家' : '买家') + '吗？',
      success: function (r) {
        if (!r.confirm) return;
        api.put('/users/me', { role: newRole })
          .then(function (res) {
            if (res && res.data) {
              app.globalData.userInfo = res.data;
              that.setData({ userInfo: res.data });
              wx.showToast({ title: '已切换为' + (newRole === 'seller' ? '卖家' : '买家'), icon: 'success' });
            }
          })
          .catch(function () {
            wx.showToast({ title: '切换失败', icon: 'none' });
          });
      },
    });
  },

  goLogin() { wx.navigateTo({ url: '/pages/login/login' }); },
  goMyItems() { wx.navigateTo({ url: '/pages/myItems/myItems' }); },
  goOrders() { wx.navigateTo({ url: '/pages/orders/orders' }); },
  goValuation() { wx.navigateTo({ url: '/pages/valuation/valuation' }); },
  goDispute() { wx.navigateTo({ url: '/pages/dispute/dispute' }); },
  logout() {
    app.globalData.token = '';
    app.globalData.userInfo = null;
    wx.removeStorageSync('token');
    this.setData({ userInfo: null });
    wx.showToast({ title: '已退出', icon: 'success' });
  },
});
