const { post } = require('../../utils/api.js');

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
  },
  _timer: null,

  onLoad(query) {
    const name = decodeURIComponent(query.name || '');
    const condition = decodeURIComponent(query.condition || '');
    const price = query.originPrice || '';
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

  async send(text) {
    var that = this;
    var newMsgs = that.data.msgs.concat([{ role: 'user', content: text }]);
    that.setData({ msgs: newMsgs, input: '', loading: true, elapsed: 0 });

    that._timer = setInterval(function () {
      that.setData({ elapsed: that.data.elapsed + 1 });
    }, 1000);

    try {
      var body = { query: text };
      if (that.data.sessionId) body.sessionId = that.data.sessionId;
      var res = await post('/ai/valuation', body, { timeout: 180000 });
      var reply = (res && res.data && res.data.reply) ? res.data.reply : '无回复';
      var cleaned = stripMarkdown(reply);
      that.setData({
        sessionId: (res && res.data && res.data.sessionId) ? res.data.sessionId : 0,
        msgs: newMsgs.concat([{ role: 'assistant', content: cleaned }]),
      });
    } catch (e) {
      that.setData({
        msgs: newMsgs.concat([{ role: 'assistant', content: '请求失败,请重试' }]),
      });
    } finally {
      clearInterval(that._timer);
      that.setData({ loading: false, elapsed: 0 });
    }
  },

  onUnload() { if (this._timer) clearInterval(this._timer); },
});
