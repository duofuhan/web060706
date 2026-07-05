const { post } = require('../../utils/api.js');

Page({
  data: {
    input: '',
    messages: [],
    sessionId: null,
    loading: false,
    references: [],
  },
  onLoad(query) {
    const name = decodeURIComponent(query.name || '');
    const condition = decodeURIComponent(query.condition || '');
    const originPrice = query.originPrice || '';
    if (name) {
      const first = `我有一台 ${name}(${condition}, 原价 ¥${originPrice}) 希望拍卖,请帮我分析市场定价并给出起拍价建议。`;
      this.setData({ input: first });
      this.send(first);
    }
  },

  onInput(e) { this.setData({ input: e.detail.value }); },

  sendBtn() {
    if (!this.data.input.trim()) return;
    this.send(this.data.input);
  },

  async send(text) {
    this.setData({ loading: true });
    this.setData({
      messages: [...this.data.messages, { role: 'user', content: text }],
      input: '',
    });
    try {
      const body = { query: text };
      if (this.data.sessionId) body.sessionId = this.data.sessionId;
      const res = await post('/ai/valuation', body);
      const reply = res.data?.reply || '抱歉,暂时无法生成回复。';
      this.setData({
        sessionId: res.data?.sessionId ?? this.data.sessionId,
        references: res.data?.references ?? [],
        messages: [...this.data.messages, { role: 'assistant', content: reply }],
      });
    } catch (e) {
      this.setData({ messages: [...this.data.messages, { role: 'assistant', content: '服务异常,请稍后再试' }] });
    } finally {
      this.setData({ loading: false });
    }
  },
});