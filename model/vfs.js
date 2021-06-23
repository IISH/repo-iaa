/**
 * object model
 * // https://mongoosejs.com/docs/index.html
 *
 * vfs:
 *   files:
 *     path: absolute path on a device
 *     vpath: virtual path
 *     hdl: handle or identifier
 *   objid: object identifier
 *
 */

'use strict';

const dao = require('./dao');


let filesSchema = new dao.Schema({
    path: String,
    vpath: {type: String, index: {unique: true, dropDups: true}},
    hdl: {type: String, index: {unique: true, dropDups: true}}
});

let vfsSchema = new dao.Schema({
    objid: {type: String, index: {unique: true, dropDups: true}},
    files: [filesSchema]
});

module.exports = dao.model('VFS', vfsSchema, 'vfs');