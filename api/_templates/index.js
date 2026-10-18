'use strict';
const list = [require('./quarterly'), require('./annual'), require('./l10'), require('./4dx'), require('./standup'), require('./project'), require('./generic')];
const byId = {}; list.forEach(function (t) { byId[t.id] = t; });
module.exports = { list: list, byId: byId };
