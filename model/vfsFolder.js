'use strict';


/**
 * object model
 * // https://mongoosejs.com/docs/index.html
 *
 * vfs:
 *   vpath: virtual path
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

const folderSchema = new dao.Schema({
    vpath: {type: String, index: {unique: true, dropDups: true}},
    path: String,
    name: String,
    uploaddate: Date,
    folders: [{type: dao.Schema.Types.ObjectId, ref: 'folder'}],
    files: [{type: dao.Schema.Types.ObjectId, ref: 'file'}],
});

folderSchema.pre('findOneAndUpdate', function (next) {
    let doc = this.getUpdate();
    if (doc.name === undefined) {
        let filename = doc.vpath.split('/').filter( function(item) {return item.length > 0} ).pop();
        doc.name = filename || '.';
    }
    next();
});

folderSchema.virtual('parent').get(function () {
    let parts = this.vpath.split('/').filter( function(item) {return item.length > 0} );
    parts.pop();
    return (parts.length === 0) ? '/' : '/' + parts.join('/');
});

module.exports = dao.model('folder', folderSchema, 'folder');