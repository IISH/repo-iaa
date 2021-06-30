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
const VFS = require('../model/vfs');
const xml2js = require('xml2js');

const cache = {};

// interceptor
router.all('*/*', function (req, res, next) {

    res.type( 'application/json');

    let folder = nconf.get('vfs') + '/' + (req.user.sub || 'dummy');
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
        res.end(JSON.stringify("User not recognized"));
        res.status(401);
    }
});

router.param('_package', function (req, res, next, _package) {
    req._package = _package;
    next();
});
router.param('na', function (req, res, next, na) {
    req.na = na;
    next();
});
router.param('id', function (req, res, next, id) {
    req.id = id;
    let hdl = req.na + '/' + id;
    req.hdl = hdl;

    if (['aip', 'dip'].includes(req._package)) {
        next();
    } else {
        // Bestaat dit object?
        let conditions = {$or: [{objid: hdl}, {aip: {$elemMatch: {hdl: hdl}}}, {dip: {$elemMatch: {hdl: hdl}}}]};
        VFS.findOne(conditions, {}, {}, function (err, _doc) {
            if (err) {
                console.error(err);
                res.status(500);
                res.send();
            } else {
                if (_doc) {
                    let doc = _doc.toJSON();
                    req.doc = doc;
                    // mag de gebruiker het zien?
                    let tree = cache[req.user.sub];
                    let authorized = tree.objid.includes(doc.objid);
                    if (authorized) {
                        let files = doc.aip.concat(doc.dip);
                        let file = files.find(function (file) {
                            return file.hdl === hdl;
                        });
                        let vpath = file.vpath;
                        let filename = path.basename(vpath);
                        let content_type = file.content_type;
                        let content_length = file.length;
                        req.download = {
                            hdl: hdl,
                            filename: filename,
                            vpath: vpath,
                            content_type: content_type,
                            content_length: content_length
                        }
                        next();
                    } else {
                        res.end(JSON.stringify({status: 403, message: 'Not authorized for ' + hdl}));
                        res.status(403).send();
                    }

                } else {
                    res.end(JSON.stringify({status: 404, message: 'handle not found ' + hdl}));
                    res.status(404).send();
                }
            }
        })
    }
});

// Human index page for login/logout
router.get('/', function (req, res) {
    res.type( 'application/json')
    res.render('index', {title: 'a title', user: req.user.fullname});
});

// verkrijg een tree overzicht - folders en files - van de gebruiker.
// bij de tree maken we een volledige diepte van folders - niet de files.
router.get('/metadata', function (req, res) {
    let tree = JSON.parse(JSON.stringify(cache[req.user.sub])); // clone
    delete tree.expire;
    delete tree.folder;
    res.status(200);
    res.end(JSON.stringify(tree));
});

router.head('/:na/:id', function (req, res) {
    let download = req.download;
    res.contentType(download.content_type);
    res.setHeader('Content-Length', download.content_length);
    res.setHeader('Content-Disposition', 'attachment; filename="' + download.filename + '"');
    res.status(200).send();
});

router.get('/:na/:id', function (req, res, next) {

    let download = req.download;

    let options = {
        headers: {
            'Content-Length': download.content_length,
            'Content-Type': download.content_type
        }
    }

    // if (download.content_type === 'application/octet-stream') {
    //     options.headers['Content-Disposition'] = 'attachment; filename="' + download.filename + '"';
    // }

    res.sendFile(download.vpath, options, function (err, result) {
        if (err) {
            console.error(err);
            next(err);
        } else {
            console.log(result + " file served " + download.hdl + " -> " + download.vpath);
        }
    });
});

router.get('/metadata/:na/:id', function (req, res) {
    let hdl = req.hdl;
    let doc = req.doc;
    let aip = (hdl === doc.objid) ? doc.aip.map(function (o) {
        delete o._id;
        delete o.path;
        delete o.__v;
        o.type = 'aip';
        return o;
    }) : [];
    let dip = doc.dip.map(function (o) {
        if (hdl === doc.objid || hdl === o.hdl) {
            delete o._id;
            delete o.path;
            delete o.__v;
            o.type = 'dip';
            return o;
        } else return null;
    }).filter(function (o) {
        return (o !== null)
    });
    delete doc._id;
    delete doc.aip;
    delete doc.dip;
    delete doc.__v;

    doc.files = aip.concat(dip);
    res.status(200);
    res.end(JSON.stringify(doc));
});

// alternatief is https://www.npmjs.com/package/directory-tree
function dirTree(filename, vfs, objid) {
    let stats = fs.lstatSync(filename);
    let info = {
        path: vfs,
        type: 'directory'
    };

    if (stats.isDirectory()) {
        info.children = fs.readdirSync(filename).map(function (child) {
            return dirTree(filename + '/' + child, vfs + '/' + child, objid);
        });
    } else {
        let _filename = readVFS(filename);
        if (_filename) {
            let children = fs.readdirSync(_filename).map(function (child) { // dit zijn de dip folders
                let na = _filename.split('/')[3]; // na is altijd op /folder1/folder2/na
                let name = path.basename(child);
                let accession_path = vfs + '/' + child;
                let hdl = na + '/' + name;
                objid.push(hdl);
                return {
                    path: accession_path,
                    name: name,
                    objid: hdl,
                    type: 'id'
                };
            });
            (children.length) && (info.children = children);
        }
    }

    return info;
}

function readVFS(filename) {
    // https://www.npmjs.com/package/xml2js
    let vfs_file = null;
    let parser = new xml2js.Parser();
    let data = fs.readFileSync(filename, {encoding: 'utf8', flag: 'r'});
    parser.parseString(data, function (err, result) {
        if (err) {
            console.dir(err);
        } else {
            // <VFS type="vector">
            //     <VFS_subitem type="properties">
            //         <type>DIR</type>
            //         <url>FILE://data/vfs/11240/aip/SAB/Athenaeumbibliotheek Deventer/</url>
            //     </VFS_subitem>
            // </VFS>
            let _url = result.VFS.VFS_subitem[0].url[0]; // dit is de plek in de XML
            vfs_file = _url.substr(6);
        }
    });
    return vfs_file;
}

router.post('/:_package/:na/:id', function (req, res) {
    let hdl = req.hdl;
    let conditions = {objid: hdl};
    let update = {};
    let _package = req._package;
    update[_package] = req.body.files;

    if (['aip', 'dip'].includes(_package)) {
        VFS.findOneAndUpdate(conditions, update, {upsert: true}, function (err, result) {
            if (err) {
                console.error(err);
                res.status(500);
                res.end(JSON.stringify({status: 500, message: err}));
            } else {
                console.info(result);
                res.status(200);
                res.end(JSON.stringify({status: 200, message: 'Stored ' + objid}));
            }
        });
    } else {
        res.status(406); // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/406
        res.end(JSON.stringify({status: 406, message: 'Only accept dip and aip buckets, but got ' + _package}));
    }
});

module.exports = router;
