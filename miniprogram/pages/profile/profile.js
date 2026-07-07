var app = getApp();
var api = require('../../utils/api.js');

Page({
  data: {
    userInfo: null,
    form: { nickname: '', currentPassword: '', newPassword: '', address: '' },
    saving: false,
    imgBase: '',
    roleName: '',
  },

  onShow() {
    var u = app.globalData.userInfo;
    var roleMap = { seller: '卖家', buyer: '买家', auction_admin: '拍卖管理员', system_admin: '系统管理员' };
    this.setData({
      imgBase: app.globalData.apiBase.replace('/api', ''),
      userInfo: u,
      roleName: roleMap[u && u.role] || '',
      form: {
        nickname: (u && u.nickname) || '',
        currentPassword: '',
        newPassword: '',
        address: (u && u.address) || '',
      },
    });
  },

  onInput(e) {
    var field = e.currentTarget.dataset.field;
    var val = {};
    val[field] = e.detail.value;
    this.setData({ ['form.' + field]: e.detail.value });
  },

  chooseAvatar() {
    var that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        var tempPath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '压缩中…' });
        wx.compressImage({
          src: tempPath,
          quality: 80,
          success: function (comp) {
            that.uploadAvatar(comp.tempFilePath || tempPath);
          },
          fail: function () {
            that.uploadAvatar(tempPath);
          },
        });
      },
    });
  },

  uploadAvatar(filePath) {
    var that = this;
    wx.showLoading({ title: '上传中…' });
    wx.uploadFile({
      url: app.globalData.apiBase + '/items/upload',
      filePath: filePath,
      name: 'images',
      header: { Authorization: 'Bearer ' + app.globalData.token },
      success: function (upRes) {
        var data = JSON.parse(upRes.data);
        if (data.code === 0 && data.data && data.data.urls && data.data.urls[0]) {
          var avatarUrl = data.data.urls[0];
          that.setData({ 'userInfo.avatar': avatarUrl });
          that.saveField('avatar', avatarUrl);
        } else {
          wx.showToast({ title: '上传失败', icon: 'none' });
        }
        wx.hideLoading();
      },
      fail: function () {
        wx.hideLoading();
        wx.showToast({ title: '上传失败', icon: 'none' });
      },
    });
  },

  saveField(field, value) {
    var body = {};
    body[field] = value;
    var that = this;
    api.put('/users/me', body, { silent: true })
      .then(function (res) {
        if (res && res.data) {
          app.globalData.userInfo = res.data;
          wx.showToast({ title: '已更新', icon: 'success' });
        }
      })
      .catch(function () {});
  },

  save() {
    var that = this;
    var f = that.data.form;
    var body = {};
    var changed = false;

    if (f.nickname && f.nickname !== (that.data.userInfo && that.data.userInfo.nickname)) {
      body.nickname = f.nickname;
      changed = true;
    }
    if (f.address !== (that.data.userInfo && that.data.userInfo.address)) {
      body.address = f.address || '';
      changed = true;
    }
    if (f.newPassword) {
      if (!f.currentPassword) { wx.showToast({ title: '请输入当前密码', icon: 'none' }); return; }
      if (f.newPassword.length < 6) { wx.showToast({ title: '新密码至少6位', icon: 'none' }); return; }
      if (f.newPassword === f.currentPassword) {
        wx.showToast({ title: '新密码不能与当前密码相同', icon: 'none' });
        return;
      }
      body.currentPassword = f.currentPassword;
      body.newPassword = f.newPassword;
      changed = true;
    }

    if (!changed) { wx.showToast({ title: '没有修改', icon: 'none' }); return; }

    that.setData({ saving: true });
    api.put('/users/me', body)
      .then(function (res) {
        if (res && res.data) {
          app.globalData.userInfo = res.data;
          that.setData({ userInfo: res.data, form: { nickname: res.data.nickname, currentPassword: '', newPassword: '', address: res.data.address || '' } });
          wx.showToast({ title: '保存成功', icon: 'success' });
        }
      })
      .catch(function () {})
      .finally(function () {
        that.setData({ saving: false });
      });
  },
});
