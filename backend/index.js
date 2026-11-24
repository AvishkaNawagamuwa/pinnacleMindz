const bundle = require('./dist/bundle.cjs');
const app = bundle.default || bundle;

module.exports = app;
module.exports.default = app;
