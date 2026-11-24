const app = require('./dist/index.js');

module.exports = app.default || app;
module.exports.default = app.default || app;
