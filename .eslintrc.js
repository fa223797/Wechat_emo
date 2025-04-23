module.exports = {
  extends: 'eslint-config-ali/wxapp',
  rules: {
    'max-lines': ['warn', { max: 500 }],
    'complexity': ['warn', 10]
  }
}; 