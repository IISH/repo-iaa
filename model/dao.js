'use strict';

const nconf = require('nconf');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
let datasource = nconf.get('datasource');
mongoose.connect(datasource.protocol + '://' + datasource.host + ':' + datasource.port + '/' + datasource['database']);
module.exports = mongoose;