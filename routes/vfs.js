/**
 * /vfs router
 *
 * Description
 * Insert the file metadata and location.
 *
 * @type {Router}
 */

const nconf = require('nconf');
const express = require('express');
const router = express.Router({});
const VFSFile = require('../model/vfsFile');
const VFSFolder = require('../model/vfsFolder');
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
    let pid = req.na + '/' + req.id;
    let update = req.body;
    if (pid === update.pid && valid(update)) {
        VFSFile.findOneAndUpdate({pid: pid}, update, OPTS, function (err, doc) {
            if (err) {
                let status = 500;
                res.end(JSON.stringify({status: status, message: err}));
                res.status(status);
            } else {
                add(doc['_id'], doc['parent'], new Date(), true);
                let status = 200;
                res.end(JSON.stringify({status: status, message: "Ok: " + pid}));
                res.status(status);
            }
        });
        // we saved the document. Now lets walk back the file system as well.
    } else {
        let status = 400;
        let err = 'Identifier obligatory in package. Expecting metadata.pid = ' + pid;
        console.error(err);
        res.end(JSON.stringify({status: status, message: err}));
        res.status(status);
    }
    res.send();
});

function valid(update) {
    return (update !== undefined);
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
            if (vpath === '.') {
                // we are at the root
                return true;
            } else {
                add(doc['_id'], doc['parent'], doc['uploaddate'], false);
            }
        }
    });
    return true;
}

module.exports = router;