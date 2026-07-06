const { post } = require('../../utils/api.js');

Page({
  data: {
    input: '',
    msgs: [],
    loading: false,
    elapsed: 0,
  },
  _timer: null,

  onLoad(query) {
    const name = decodeURIComponent(query.name || '');
    const condition = decodeURIComponent(query.condition || '');
    const price = query.originPrice || '';
    if (name) {
      this.setData({
        input: `我有一台 ${name}(${condition}, 原价 ¥${price}) 希望拍卖,请帮我分析市场定价并给出起拍价建议。`,
      });
    }
  },

  onInput(e) { this.setData({ input: e.detail.value }); },
  sendBtn() {
    if (!this.data.input.trim() || this.data.loading) return;
    this.send(this.data.input);
  },

  async send(text) {
    const newMsgs = [...this.data.msgs, { role: 'user', content: text }];
    this.setData({ msgs: newMsgs, input: '', loading: true, elapsed: 0 });

    this._timer = setInterval(() => {
      this.setData({ elapsed: this.data.elapsed + 1 });
    }, 1000);

    try {
      const body = { query: text };
      if (this.data._sessionId) body.sessionId = this.data._sessionId;
      const res = await post('/ai/valuation', body, { timeout: 180000 });
      this.setData({
        _sessionId: res.data?.sessionId,
        msgs: [...newMsgs, { role: 'assistant', content: res.data?.reply || '无回复' }],
      });
    } catch (e) {
      this.setData({
        msgs: [...newMsgs, { role: 'assistant', content: '请求失败,请重试' }],
      });
    } finally {
      clearInterval(this._timer);
      this.setData({ loading: false, elapsed: 0 });
    }
  },

  onUnload() { if (this._timer) clearInterval(this._timer); },
});