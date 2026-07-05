const app = getApp();

function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: app.globalData.apiBase + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        Authorization: app.globalData.token ? `Bearer ${app.globalData.token}` : '',
      },
      success(res) {
        if (res.data && res.data.code === 0) return resolve(res.data);
        const msg = (res.data && res.data.message) || `请求失败 (${res.statusCode})`;
        wx.showToast({ title: msg, icon: 'none' });
        return reject(res.data || res);
      },
      fail(err) {
        wx.showToast({ title: '网络错误', icon: 'none' });
        reject(err);
      },
    });
  });
}

function get(url, data) {
  return request({ url, method: 'GET', data });
}
function post(url, data) {
  return request({ url, method: 'POST', data });
}

module.exports = { request, get, post };