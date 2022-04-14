/**
 * index
 *
 * Description
 * Serve the resources: bytestream and metadata
 *
 * @type {Router}
 */

const express = require('express');
const router = express.Router({});
const VFSFile = require('../model/vfsFile');
const VFSFolder = require('../model/vfsFolder');
const render = require('../modules/render');


router.param('na', function (req, res, next, na) {
    req.na = na;
    next();
});
router.param('vpath', function (req, res, next, vpath) {
    req.vpath = vpath;
    next();
});

router.get('/list/:na', function (req, res) {
    let na = req.na;
    list('/' + na, res);
});

router.get('/list/:na/:vpath(*)', function (req, res) {
    let na = req.na;
    let vpath = req.vpath;
    list('/' + na + '/' + vpath, res);
});

function list(vpath = '.', res) {
    VFSFolder.findOne({vpath: vpath}, '-_id -__v').populate({path: 'folders', select: '-_id -__v -folders -files'}).populate({path: 'files', select: '-_id -__v'}).exec(function (err, doc) {
            if (err) {
                render(res, 500, err);
            } else {
                if (doc) {
                    render(res, 200, doc);
                } else {
                    render(res, 404, 'Resource not found: ' + vpath);
                }
            }
        }
    );
}

module.exports = router;
