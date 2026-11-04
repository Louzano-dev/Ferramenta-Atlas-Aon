/* The requested case-management evolution, applied to the preserved source. */
module.exports=html=>require('./case-history.cjs')(require('./case-lifecycle.cjs')(require('./case-navigation.cjs')(html)));
