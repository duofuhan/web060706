var app = getApp();

function getApiBase() {
  return app.globalData.apiBase;
}

function getAuthHeader() {
  var h = { 'Content-Type': 'application/json' };
  if (app.globalData.token) h.Authorization = 'Bearer ' + app.globalData.token;
  return h;
}

function postJson(url, data, timeout) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: getApiBase() + url,
      method: 'POST',
      data: data,
      header: getAuthHeader(),
      timeout: timeout || 60000,
      success: function (res) {
        if (res.data && res.data.code === 0) return resolve(res.data);
        return reject(res.data || res);
      },
      fail: function (err) { reject(err); },
    });
  });
}

function streamPost(url, data, onChunk, onDone, onError) {
  var task = wx.request({
    url: getApiBase() + url,
    method: 'POST',
    data: data,
    header: getAuthHeader(),
    timeout: 180000,
    enableChunked: true,
    success: function () {},
    fail: function (err) { onError(err.errMsg || '网络错误'); },
  });

  var buf = '';
  var decoder = new TextDecoder('utf-8');
  task.onChunkReceived(function (res) {
    var str = decoder.decode(res.data, { stream: true });
    buf += str;
    var lines = buf.split('\n');
    buf = lines.pop();
    for (var j = 0; j < lines.length; j++) {
      var line = lines[j].trim();
      if (line.indexOf('data: ') !== 0) continue;
      var jsonStr = line.slice(6);
      if (!jsonStr) continue;
      try {
        var obj = JSON.parse(jsonStr);
        if (obj.type === 'chunk') onChunk(obj.text);
        else if (obj.type === 'done') onDone(obj.reply, obj.sessionId);
        else if (obj.type === 'error') onError(obj.message);
      } catch (e) {}
    }
  });
}

function stripMarkdown(text) {
  if (!text) return '';
  var s = text;
  s = s.replace(/\*\*(.+?)\*\*/g, '$1');
  s = s.replace(/\*(.+?)\*/g, '$1');
  s = s.replace(/`(.+?)`/g, '$1');
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/^>\s?/gm, '');
  s = s.replace(/^[-*+]\s+/gm, '· ');
  s = s.replace(/^\|[-:\s|]+\|$/gm, '');
  s = s.replace(/^\|(.+)\|$/gm, function (line) {
    return line.replace(/^\||\|$/g, '').replace(/\|/g, ' | ');
  });
  s = s.replace(/^---+$/gm, '');
  s = s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '');
  s = s.replace(/\n{3,}/g, '\n\n');
  s = s.replace(/\\n/g, '\n');
  return s.trim();
}

Page({
  data: {
    input: '',
    msgs: [],
    loading: false,
    elapsed: 0,
    sessionId: 0,
    loadingText: '联网搜索中',
    streamingText: '',
    isStreaming: false,
  },
  _timer: null,

  onLoad(query) {
    var name = decodeURIComponent(query.name || '');
    var condition = decodeURIComponent(query.condition || '');
    var price = query.originPrice || '';
    if (name) {
      this.setData({
        input: '我有一台 ' + name + '(' + condition + ', 原价 ¥' + price + ') 希望拍卖,请帮我分析市场定价并给出起拍价建议。',
      });
    }
  },

  onInput(e) { this.setData({ input: e.detail.value }); },

  sendBtn() {
    if (!this.data.input.trim() || this.data.loading) return;
    this.send(this.data.input);
  },

  send(text) {
    var that = this;
    var newMsgs = that.data.msgs.concat([{ role: 'user', content: text }]);
    that.setData({ msgs: newMsgs, input: '', loading: true, elapsed: 0, loadingText: '联网搜索中', streamingText: '', isStreaming: false });

    that._timer = setInterval(function () {
      that.setData({ elapsed: that.data.elapsed + 1 });
    }, 1000);

    var body = { query: text };
    if (that.data.sessionId) body.sessionId = that.data.sessionId;

    postJson('/ai/valuation-search', body, 60000).then(function (searchRes) {
      var sessionId = (searchRes && searchRes.data && searchRes.data.sessionId) ? searchRes.data.sessionId : 0;
      var webContext = (searchRes && searchRes.data && searchRes.data.webContext) ? searchRes.data.webContext : '';

      that.setData({ loadingText: '思考中', isStreaming: true, streamingText: '' });

      var genBody = { query: text, webContext: webContext };
      if (sessionId) genBody.sessionId = sessionId;

      streamPost(
        '/ai/valuation-stream',
        genBody,
        function onChunk(delta) {
          that.setData({ streamingText: that.data.streamingText + delta });
        },
        function onDone(reply, sid) {
          clearInterval(that._timer);
          var cleaned = stripMarkdown(reply);
          that.setData({
            sessionId: sid || that.data.sessionId,
            msgs: that.data.msgs.concat([{ role: 'assistant', content: cleaned }]),
            loading: false,
            elapsed: 0,
            isStreaming: false,
            streamingText: '',
            loadingText: '思考中',
          });
        },
        function onError(err) {
          clearInterval(that._timer);
          that.setData({
            msgs: that.data.msgs.concat([{ role: 'assistant', content: '请求失败,请重试' }]),
            loading: false,
            elapsed: 0,
            isStreaming: false,
            streamingText: '',
            loadingText: '思考中',
          });
        }
      );
    }).catch(function () {
      clearInterval(that._timer);
      that.setData({
        msgs: that.data.msgs.concat([{ role: 'assistant', content: '请求失败,请重试' }]),
        loading: false,
        elapsed: 0,
        loadingText: '思考中',
      });
    });
  },

  onUnload() { if (this._timer) clearInterval(this._timer); },
});
