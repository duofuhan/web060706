var app = getApp();
var api = require('../../utils/api.js');

Page({
  data: { username: '', password: '', role: 'buyer' },
  onInput: function (e) {
    var field = e.currentTarget.dataset.field;
    var val = {};
    val[field] = e.detail.value;
    this.setData(val);
  },
  onRoleChange: function (e) {
    this.setData({ role: e.detail.value });
  },
  doRegister: function () {
    var that = this;
    var username = that.data.username;
    var password = that.data.password;
    if (!username || !password) {
      wx.showToast({ title: '请填写账号和密码', icon: 'none' });
      return;
    }
    if (username.length < 3) { wx.showToast({ title: '账号至少3位', icon: 'none' }); return; }
    if (password.length < 6) { wx.showToast({ title: '密码至少6位', icon: 'none' }); return; }
    wx.showLoading({ title: '注册中…' });
    api.post('/users/register', { username: username, password: password, role: that.data.role })
      .then(function (res) {
        wx.hideLoading();
        if (res && res.data) {
          app.globalData.token = res.data.token;
          app.globalData.userInfo = res.data;
          wx.setStorageSync('token', app.globalData.token);
          wx.showToast({ title: '注册成功', icon: 'success' });
          setTimeout(function () { wx.switchTab({ url: '/pages/index/index' }); }, 800);
        }
      })
      .catch(function (e) {
        wx.hideLoading();
        var msg = e && e.message ? e.message : '注册失败';
        wx.showToast({ title: msg, icon: 'none' });
      });
  },
  goLogin: function () {
    wx.navigateBack();
  },
});
