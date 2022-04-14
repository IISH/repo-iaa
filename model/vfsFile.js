'use strict';
const uuidv4 = require('uuid/v4');


/**
 * object model
 * // https://mongoosejs.com/docs/index.html
 *
 * vfs:
 *   vpath: virtual absolute path
 *   path: absolute path on a device
 *   filename: name without the basepath: can be a file or foldername
 *   parent: virtual base pathname
 *   depth: the path level. Root be level 0
 *   version: from archivesspace - a unique number
 *   objid: handle or identifier of the group.
 *   hdl: handle or identifier van de AIP
 *   length: number of bytes in the content
 *   contenttype: the nature of the bytestream
 *   uploaddate:
 *   files: list of files and folders inside this folder
 */

const dao = require('./dao');

let fileSchema = new dao.Schema({
    vpath: {type: String, index: {unique: true, dropDups: true}},
    path: String,
    filename: String,
    // parent: {type: String, index: {unique: false, dropDups: false}},
    version: Number,
    objid: {type: String, index: {unique: false, dropDups: false}},
    pid: {type: String, index: {unique: true, dropDups: true}},
    length: Number,
    contenttype: String,
    uploaddate: Date
});

fileSchema.pre('findOneAndUpdate', function (next) {
    let doc = this.getUpdate();
    if (doc.filename === undefined) {
        let i = doc.vpath.lastIndexOf('/') + 1;
        doc.filename = doc.vpath.substring(i);
    }
    next();
});

fileSchema.virtual('parent').get(function () {
    let i = this.vpath.lastIndexOf('/');
    return (i > 0) ? this.vpath.substring(0, i) : '.';
});

module.exports = dao.model('file', fileSchema, 'file');