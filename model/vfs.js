/**
 * object model
 * // https://mongoosejs.com/docs/index.html
 *
 * vfs:
 *   files:
 *     path: absolute path on a device
 *     vpath: virtual path
 *     hdl: handle or identifier
 *     length: number of bytes in the content
 *     contenttype: the nature of the bytestream
 *   objid: object identifier
 *
 */

'use strict';

const dao = require('./dao');


let filesSchema = new dao.Schema({
    path: String,
    vpath: String,
    hdl: {type: String, index: {unique: false}},
    length: Number,
    content_type: String
});

let vfsSchema = new dao.Schema({
    objid: {type: String, index: {unique: true, dropDups: true}},
    aip: [filesSchema],
    dip: [filesSchema]
});

module.exports = dao.model('VFS', vfsSchema, 'vfs');