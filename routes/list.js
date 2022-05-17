/**
 * /list
 *
 * Description
 * Show the resource metadata
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

// everything
router.get('/', function (req, res) {
    list('/', res);
});

// a repo
// router.get('/:na', function (req, res) {
//     let na = req.na;
//     list('/' + na, res);
// });

// a path in a repo
// router.get('/:na/:vpath(*)', function (req, res) {
//     let na = req.na;
//     let vpath = (req.vpath.slice(-1) === '/') ? req.vpath.slice(0, -1) : req.vpath;
//     list('/' + vpath, res);
// });
//
router.get('/:vpath(*)', function (req, res) {
    let vpath = (req.vpath.slice(-1) === '/') ? req.vpath.slice(0, -1) : req.vpath;
    list('/' + vpath, res);
});

function list(vpath = '.', res) {
    let filter = {vpath: vpath};
    VFSFolder.findOne(filter, '-_id -__v').populate({
        path: 'folders',
        select: '-_id -__v -folders -files'
    }).populate({path: 'files', select: '-_id -__v'}).exec(function (err, folder) {
            if (err) {
                render(res, 500, err);
            } else {
                if (folder) {
                    render(res, 200, folder);
                } else { // Did they want a file?
                    let pid = vpath.slice(1);
                    let filter = {$or:[{vpath: vpath},{pid:pid}]};
                    VFSFile.findOne(filter, '-_id -__v').exec(function (err, file) {
                            if (err) {
                                render(res, 500, err);
                            } else {
                                if (file) {
                                    render(res, 200, file);
                                } else { // Did they want a file?
                                    render(res, 404, 'Resource not found: ' + vpath);
                                }
                            }
                        }
                    )
                }
            }
        }
    );
}

module.exports = router;
