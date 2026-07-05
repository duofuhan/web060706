const { post } = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    form: { name: '', condition: '', originPrice: '', startPrice: '', description: '' },
    imageList: [],
    aiLoading: false,
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 5 - this.data.imageList.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const paths = res.tempFiles.map(f => f.tempFilePath);
        this.setData({ imageList: [...this.data.imageList, ...paths].slice(0, 5) });
      },
    });
  },

  removeImage(e) {
    const idx = e.currentTarget.dataset.idx;
    const list = [...this.data.imageList];
    list.splice(idx, 1);
    this.setData({ imageList: list });
  },

  async uploadImages() {
    const urls = [];
    for (const p of this.data.imageList) {
      const r = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${app.globalData.apiBase}/items/upload`,
          filePath: p,
          name: 'images',
          header: { Authorization: `Bearer ${app.globalData.token}` },
          success: (res) => resolve(JSON.parse(res.data)),
          fail: reject,
        });
      });
      if (r.code === 0) urls.push(...(r.data.urls || []));
    }
    return urls;
  },

  async optimizeDescription() {
    const { name, condition, originPrice } = this.data.form;
    if (!name || !condition || !originPrice) {
      return wx.showToast({ title: '请先填写名称/成色/原价', icon: 'none' });
    }
    this.setData({ aiLoading: true });
    try {
      const res = await post('/ai/optimize-description', {
        name, condition, originPrice: Number(originPrice),
      });
      this.setData({ 'form.description': res.data.description });
      wx.showToast({ title: 'AI 文案已生成', icon: 'success' });
    } catch (e) {
    } finally {
      this.setData({ aiLoading: false });
    }
  },

  goValuation() {
    const { name, condition, originPrice } = this.data.form;
    if (!name) return wx.showToast({ title: '请先填写拍品名称', icon: 'none' });
    wx.navigateTo({
      url: `/pages/valuation/valuation?name=${encodeURIComponent(name)}&condition=${encodeURIComponent(condition)}&originPrice=${originPrice}`,
    });
  },

  async submit() {
    const f = this.data.form;
    if (!f.name || !f.startPrice) {
      return wx.showToast({ title: '请填写必填项', icon: 'none' });
    }
    wx.showLoading({ title: '提交中…' });
    try {
      const images = this.data.imageList.length ? await this.uploadImages() : [];
      const res = await post('/items', {
        name: f.name, condition: f.condition, originPrice: Number(f.originPrice) || 0,
        startPrice: Number(f.startPrice), description: f.description, images,
        submitForReview: true,
      });
      wx.showToast({ title: '已提交,等待审核', icon: 'success' });
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 1000);
    } catch (e) {
    } finally {
      wx.hideLoading();
    }
  },
});