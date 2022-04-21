/**
 * /vfs router
 *
 * Description
 * Insert the file metadata and location.
 *
 * @type {Router}
 */

const express = require('express');
const router = express.Router({});
const VFSFile = require('../model/vfsFile');
const VFSFolder = require('../model/vfsFolder');
const render = require('../modules/render');

const OPTS = {new: true, upsert: true};

router.param('na', function (req, res, next, na) {
    req.na = na;
    next();
});
router.param('id', function (req, res, next, id) {
    req.id = id;
    next();
});

router.post('/:na/:id', function (req, res) {

    let na = req.na;
    let update = req.body;
    let pid = na + '/' + req.id;

    if (pid === update.pid) {
        let required = valid(update);
        if (required.length === 0) {
            update['vpath'] = '/' + na + '/' + update['vpath'].split('/').filter(function(item){
                return (item.length);
            }).join('/');
            VFSFile.findOneAndUpdate({pid: pid}, update, OPTS, function (err, doc) {
                if (err) {
                    render(res, 500, err);
                } else {
                    add(doc['_id'], doc['parent'], new Date(), true);
                    render(res, 200, "Ok: " + pid);
                }
            });
            // we saved the document. Now lets walk back the file system as well.
        } else {
            render(res, 400, 'Missing required ' + required.join(', '));
        }
    } else {
        render(res, 400, 'Expect ' + pid);
    }
});

function valid(update) {

    if ( update['uploaddate'] === undefined ) {
        update['uploaddate'] = new Date();
    }
    if ( update['contenttype'] === undefined ) {
        update['contenttype'] = 'application/octet-stream';
    }

    const required = ['gv', 'fv', 'pid', 'objid', 'length', 'path', 'vpath', 'uploaddate', 'contenttype'];
    return required.filter(function(item) {
        return update[item] === undefined;
    })
}

function add(id, vpath, uploaddate, isFile = false) {

    let update = (isFile === true) ? {
        vpath: vpath,
        uploaddate: uploaddate,
        $addToSet: {files: id}
    } : {
        vpath: vpath,
        uploaddate: uploaddate,
        $addToSet: {folders: id}
    };
    VFSFolder.findOneAndUpdate({vpath: vpath}, update, OPTS, function (err, doc) {
        if (err) {
            console.error(err);
        } else {
            if (vpath === '/') {
                // we arrived at the root, so no need to nestle further.
            } else {
                add(doc['_id'], doc['parent'], doc['uploaddate'], false);
            }
        }
    });
}

module.exports = router;