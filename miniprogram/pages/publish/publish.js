const { get, post, put } = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    form: { name: '', condition: '', originPrice: '', startPrice: '', description: '' },
    imageList: [],
    aiLoading: false,
    editItemId: null,
    existingImages: [],
    saving: false,
    imgBase: '',
  },

  onLoad() {
    this.setData({ imgBase: app.globalData.apiBase.replace('/api', '') });
  },

  onShow() {
    var editId = app.globalData.editItemId;
    if (editId && editId !== this.data.editItemId) {
      app.globalData.editItemId = null;
      this.loadItem(Number(editId));
    }
  },

  onHide() {
    this.saveDraft();
  },

  async loadItem(itemId) {
    try {
      wx.showLoading({ title: '加载中…' });
      var res = await get('/items/' + itemId, {}, { silent: true });
      var item = res.data;
      var oldImages = (item.images || []).map(function (u) { return u; });
      this.setData({
        editItemId: itemId,
        existingImages: oldImages,
        imageList: oldImages,
        form: {
          name: item.name || '',
          condition: item.condition || '',
          originPrice: String(item.originPrice || ''),
          startPrice: String(item.startPrice || ''),
          description: item.description || '',
        },
      });
      wx.hideLoading();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  isEditing() {
    return this.data.editItemId !== null;
  },

  isServerUrl(url) {
    return url.indexOf('/uploads/') === 0 || (url.indexOf('http') === 0 && url.indexOf('http://tmp/') !== 0);
  },

  imageSrc(url) {
    return this.isServerUrl(url) ? this.data.imgBase + url : url;
  },

  async saveDraft() {
    var f = this.data.form;
    if (this.data.saving || !f.name || this._submitted) return;
    var hasChanged = this._lastSaved === undefined ||
      this._lastSaved.name !== f.name ||
      this._lastSaved.condition !== f.condition ||
      this._lastSaved.originPrice !== f.originPrice ||
      this._lastSaved.startPrice !== f.startPrice ||
      this._lastSaved.description !== f.description;
    if (!hasChanged) return;

    this.setData({ saving: true });
    try {
      var images = [];
      for (var i = 0; i < this.data.imageList.length; i++) {
        var img = this.data.imageList[i];
        if (this.isServerUrl(img)) {
          images.push(img);
        }
      }
      var newImgs = [];
      for (var j = 0; j < this.data.imageList.length; j++) {
        var img2 = this.data.imageList[j];
        if (!this.isServerUrl(img2)) newImgs.push(img2);
      }
      if (newImgs.length) {
        for (var k = 0; k < newImgs.length; k++) {
          var r = await new Promise(function (resolve, reject) {
            wx.uploadFile({
              url: app.globalData.apiBase + '/items/upload',
              filePath: newImgs[k],
              name: 'images',
              header: { Authorization: 'Bearer ' + app.globalData.token },
              success: function (res) { resolve(JSON.parse(res.data)); },
              fail: reject,
            });
          });
          if (r && r.code === 0) images = images.concat(r.data.urls || []);
        }
      }

      var body = {
        name: f.name, condition: f.condition,
        originPrice: Number(f.originPrice) || 0,
        startPrice: Number(f.startPrice) || 0,
        description: f.description || '', images: images,
      };

      if (this.isEditing()) {
        await put('/items/' + this.data.editItemId, body, { silent: true });
      } else {
        var createRes = await post('/items', body, { silent: true });
        if (createRes && createRes.data && createRes.data.id) {
          this.setData({ editItemId: createRes.data.id, existingImages: images, imageList: images });
        }
      }
      this._lastSaved = { name: f.name, condition: f.condition, originPrice: f.originPrice, startPrice: f.startPrice, description: f.description };
    } catch (e) {
    } finally {
      this.setData({ saving: false });
    }
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ ['form.' + field]: e.detail.value });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 5 - this.data.imageList.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        var paths = res.tempFiles.map(function (f) { return f.tempFilePath; });
        this.setData({ imageList: this.data.imageList.concat(paths).slice(0, 5) });
      },
    });
  },

  removeImage(e) {
    var idx = e.currentTarget.dataset.idx;
    var list = this.data.imageList.slice();
    list.splice(idx, 1);
    var old = this.data.existingImages.slice();
    var newList = [];
    var exList = [];
    for (var i = 0; i < list.length; i++) {
      if (this.isServerUrl(list[i])) exList.push(list[i]);
      newList.push(list[i]);
    }
    this.setData({ imageList: newList, existingImages: exList });
  },

  async uploadImages() {
    var urls = [];
    for (var i = 0; i < this.data.imageList.length; i++) {
      var p = this.data.imageList[i];
      if (this.isServerUrl(p)) { urls.push(p); continue; }
      var r = await new Promise(function (resolve, reject) {
        wx.uploadFile({
          url: app.globalData.apiBase + '/items/upload',
          filePath: p,
          name: 'images',
          header: { Authorization: 'Bearer ' + app.globalData.token },
          success: function (res) { resolve(JSON.parse(res.data)); },
          fail: reject,
        });
      });
      if (r.code === 0) urls.push.apply(urls, r.data.urls || []);
    }
    return urls;
  },

  async optimizeDescription() {
    const { name, condition, originPrice } = this.data.form;
    const op = Number(originPrice);
    if (!name || !condition || !originPrice || isNaN(op) || op <= 0) {
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
    const op = Number(originPrice);
    if (!name) return wx.showToast({ title: '请先填写拍品名称', icon: 'none' });
    if (originPrice && (isNaN(op) || op <= 0)) return wx.showToast({ title: '请输入正确价格', icon: 'none' });
    wx.navigateTo({
      url: '/pages/valuation/valuation?name=' + encodeURIComponent(name) + '&condition=' + encodeURIComponent(condition) + '&originPrice=' + originPrice,
    });
  },

  async submit() {
    const f = this.data.form;
    if (!f.name || !f.startPrice) {
      this._submitted = false;
      return wx.showToast({ title: '请填写必填项', icon: 'none' });
    }
    const originPrice = Number(f.originPrice);
    if (f.originPrice && (isNaN(originPrice) || originPrice <= 0)) {
      this._submitted = false;
      return wx.showToast({ title: '请输入正确价格', icon: 'none' });
    }
    const startPrice = Number(f.startPrice);
    if (isNaN(startPrice) || startPrice <= 0) {
      this._submitted = false;
      return wx.showToast({ title: '请输入正确价格', icon: 'none' });
    }
    this._submitted = true;
    wx.showLoading({ title: '提交中…' });
    try {
      const images = this.data.imageList.length ? await this.uploadImages() : [];
      var body = {
        name: f.name, condition: f.condition, originPrice: Number(f.originPrice) || 0,
        startPrice: Number(f.startPrice), description: f.description, images: images,
      };
      if (this.isEditing()) {
        body.submitForReview = true;
        body.status = 'pending';
        await put('/items/' + this.data.editItemId, body, { silent: true });
      } else {
        body.submitForReview = true;
        await post('/items', body);
      }
      wx.showToast({ title: '已提交,等待审核', icon: 'success' });
      this.setData({ form: { name: '', condition: '', originPrice: '', startPrice: '', description: '' }, imageList: [], editItemId: null, existingImages: [] });
      this._submitted = false;
      this._lastSaved = undefined;
      setTimeout(function () { wx.switchTab({ url: '/pages/index/index' }); }, 1000);
    } catch (e) {
      this._submitted = false;
      wx.hideLoading();
    }
  },

  onUnload() {
    this.saveDraft();
  },
});
