/* Review feedback from the client's recorded walkthrough. */
module.exports = function clientFeedback(html) {
  html = require('./client-feedback-copy.cjs')(html);
  html = require('./claim-opening-copy.cjs')(html);
  html = require('./client-return.cjs')(html);
  return require('./currency-input.cjs')(html);
};
