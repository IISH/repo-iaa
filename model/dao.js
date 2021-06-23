'use strict';

var nconf = require('nconf');

// https://mongoosejs.com/docs/index.html
var mongoose = require('mongoose');

// https://mongoosejs.com/docs/deprecations.html#findandmodify
mongoose.set('useFindAndModify', false);

mongoose.Promise = global.Promise;
let datasource = nconf.get('datasource');
mongoose.connect(datasource.protocol + '://' + datasource.host + ':' + datasource.port + '/' + datasource.database);
module.exports = mongoose;
