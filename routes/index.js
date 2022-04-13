/**
 * index
 *
 * Description
 * Serve the resources: bytestream and metadata
 *
 * @type {Router}
 */

const nconf = require('nconf');
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router({});
const xml2js = require('xml2js');

const cache = {};

// interceptor
router.all('*/*', function (req, res, next) {

    res.type( 'application/json');

    let folder = nconf.get('vfs') + '/' + req.user.sub;
    if (fs.existsSync(folder)) {
        let tree = cache[req.user.sub];
        let expire = new Date().valueOf();
        if (tree && tree['expire'] < expire) {
            tree = null;
        }
        if (!tree) {
            let objid = [];
            tree = dirTree(folder + '/dip', '/dip', objid);
            tree['expire'] = expire + 60000; // expire after one minute.
            tree['folder'] = folder;
            tree['objid'] = objid;
            cache[req.user.sub] = tree;
        }
        next();
    } else {
        console.info("Not found " + folder);
        if ( req.user.system === true) {
            next();
        } else {
            res.end(JSON.stringify("User not recognized"));
            res.status(401);
        }
    }
});

router.get('/ping', function (req, res) {
    res.end(JSON.stringify({status: 200, message: 'pong'}));
    res.status(200);
    res.send();
});

module.exports = router;
