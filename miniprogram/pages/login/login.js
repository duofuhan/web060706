const app = getApp();

Page({
  data: { username: '', password: '', role: 'buyer' },
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },
  onRoleChange(e) {
    this.setData({ role: e.detail.value });
  },
  async submit() {
    const { username, password, role } = this.data;
    if (!username || !password) {
      return wx.showToast({ title: '请填写账号和密码', icon: 'none' });
    }
    try {
      const res = await wx.request({
        url: `${app.globalData.apiBase}/users/register`,
        method: 'POST',
        data: { username, password, role },
      });
      if (res.data && res.data.code === 0) {
        app.globalData.token = res.data.data.token;
        app.globalData.userInfo = res.data.data;
        wx.setStorageSync('token', app.globalData.token);
        wx.showToast({ title: '登录成功', icon: 'success' });
        wx.switchTab({ url: '/pages/index/index' });
      } else {
        wx.showToast({ title: res.data.message || '失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  },
});