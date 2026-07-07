var app = getApp();

function request(options) {
  return new Promise(function (resolve, reject) {
    var headers = { 'Content-Type': 'application/json' };
    if (app.globalData.token) {
      headers.Authorization = 'Bearer ' + app.globalData.token;
    }
    var timeoutVal = options.timeout || 60000;
    wx.request({
      url: app.globalData.apiBase + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      timeout: timeoutVal,
      header: headers,
      success: function (res) {
        if (res.data && res.data.code === 0) { return resolve(res.data); }
        var msg = (res.data && res.data.message) || ('请求失败 (' + res.statusCode + ')');
        if (!options.silent) { wx.showToast({ title: msg, icon: 'none' }); }
        return reject(res.data || res);
      },
      fail: function (err) {
        if (!options.silent) { wx.showToast({ title: '网络错误', icon: 'none' }); }
        reject(err);
      },
    });
  });
}

function get(url, data, opts) {
  opts = opts || {};
  return request({ url: url, method: 'GET', data: data, silent: opts.silent, timeout: opts.timeout });
}
function post(url, data, opts) {
  opts = opts || {};
  return request({ url: url, method: 'POST', data: data, silent: opts.silent, timeout: opts.timeout });
}
function put(url, data, opts) {
  opts = opts || {};
  return request({ url: url, method: 'PUT', data: data, silent: opts.silent, timeout: opts.timeout });
}

module.exports = { request: request, get: get, post: post, put: put };