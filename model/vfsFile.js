'use strict';


/**
 * object model
 * // https://mongoosejs.com/docs/index.html
 *
 * vfs:
 *   vpath: virtual absolute path
 *   path: absolute path on a device
 *   name: name without the basepath: can be a file or foldername
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

const fileSchema = new dao.Schema({
    vpath: {type: String, index: {unique: true, dropDups: true}},
    path: String,
    name: String,
    gv: Number,
    fv: Number,
    objid: {type: String, index: {unique: false, dropDups: false}},
    pid: {type: String, index: {unique: true, dropDups: true}},
    length: Number,
    contenttype: {type: String, default: 'application/octet-stream'},
    uploaddate: Date
});

fileSchema.pre('findOneAndUpdate', function (next) {
    let doc = this.getUpdate();
    if (doc.name === undefined) {
        let filename = doc.vpath.split('/').filter( function(item) {return item.length > 0} ).pop();
        doc.name = filename || '/';
    }
    next();
});

fileSchema.virtual('parent').get(function () {
    let parts = this.vpath.split('/').filter( function(item) {return item.length > 0} );
    parts.pop();
    return (parts) ? '/' + parts.join('/') : '.';
});

module.exports = dao.model('file', fileSchema, 'file');