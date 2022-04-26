/**
 * /file
 *
 * Description
 * Serve a file as a bytestream
 *
 * @type {Router}
 */

const express = require('express');
const router = express.Router({});
const VFSFile = require('../model/vfsFile');
const render = require('../modules/render');


router.param('na', function (req, res, next, na) {
    req.na = na;
    next();
});
router.param('id', function (req, res, next, id) {
    req.id = id;
    next();
});

router.get('/:na/:id(*)', function (req, res) {

    let na = req.na;
    let id = req.id;
    let pid = na + '/' + id;

    VFSFile.findOne({pid: pid}, function (err, doc) {
        if (err) {
            render(res, 500, err);
        } else {
            if (doc) {
                if (req.method === 'HEAD') {
                    res.contentType(doc.contenttype);
                    res.setHeader('Content-Length', doc.length);
                    res.status(200);
                    res.send();
                } else {
                    let options = {
                        headers: {
                            'Content-Length': doc.length,
                            'Content-Type': doc.contenttype,
                            'Content-Disposition': 'attachment; filename="' + doc.name + '"'
                        }
                    }

                    res.sendFile(doc.path, options, function (err, result) {
                        if (err) {
                            if (err.statusCode === 404) { // the underlying filesystem does not serve the file.
                                render(res, 503, err);
                            } else {
                                render(res, err.statusCode, err);
                            }
                        } else {
                            console.log(result + " file served " + pid + " -> " + doc.path);
                        }
                    });
                }
            } else {
                render(res, 404, "Resource not found: " + pid, null);
            }
        }
    });
});

module.exports = router;
