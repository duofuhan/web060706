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
  submit: function () {
    var that = this;
    var username = this.data.username;
    var password = this.data.password;
    var role = this.data.role;

    if (!username || !password) {
      return wx.showToast({ title: '请填写账号和密码', icon: 'none' });
    }
    if (username.length < 3) return wx.showToast({ title: '账号至少3位', icon: 'none' });
    if (password.length < 6) return wx.showToast({ title: '密码至少6位', icon: 'none' });

    that._doSubmit(username, password, role);
  },
  _doSubmit: async function (username, password, role) {
    var that = this;
    var res;
    try {
      res = await api.post('/users/register', { username: username, password: password, role: role }, { silent: true });
      wx.showToast({ title: '注册成功', icon: 'success' });
    } catch (e) {
      try {
        res = await api.post('/users/login', { username: username, password: password }, { silent: true });
        wx.showToast({ title: '登录成功', icon: 'success' });
      } catch (e2) {
        var msg = e2 && e2.message ? e2.message : (e && e.message ? e.message : '账号或密码错误');
        wx.showToast({ title: msg, icon: 'none' });
        return;
      }
    }
    if (res && res.data) {
      app.globalData.token = res.data.token;
      app.globalData.userInfo = res.data;
      wx.setStorageSync('token', app.globalData.token);
      setTimeout(function () { wx.switchTab({ url: '/pages/index/index' }); }, 800);
    }
  },
});