/**
 * index
 *
 * Description
 * Serve the home page
 *
 * @type {createApplication}
 */

const nconf = require('nconf');
const express = require('express');
// const dirTree = require("directory-tree");
const router = express.Router({});
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const VFS = require('../model/vfs');

router.param('na', function (req, res, next, na) {
    req.na = na;
    next();
});
router.param('_package', function (req, res, next, _package) {
    req._package = _package;
    next();
});
router.param('id', function (req, res, next, id) {
    req.id = id;
    next();
});

router.all('*/*', function (req, res, next) {
    let folder = nconf.get('vfs') + '/' + (req.user.sub || 'dummy');
    if (fs.existsSync(folder)) {
        req.folder = folder;
        next();
    } else {
        console.info("Not found " + folder);
        res.end(JSON.stringify("Unknown user or not authorized"));
        res.status(403);
    }
});

// Human index page
router.get('/', function (req, res) {
    res.render('index', {title: 'a title', user: req.user.fullname});
});

// verkrijg een tree overzicht - folders en files - van de gebruiker.
// bij de tree maken we een volledige diepte van folders - niet de files.
router.get('/tree', function (req, res) {
    let folder = req.folder;
    res.status(200);
    res.end(JSON.stringify(dirTree(folder + '/dip', '/dip')));
});

router.head('/:na/:id', function (req, res) {

    let folder = req.folder;
    let tree = dirTree(folder + '/dip', '/dip'); // todo: cache dit voor 1 minuut. Gebruik tree voor authorizatie besluit.

    let hdl = req.na + '/' + req.id;
    let conditions = {$or: [{objid: hdl}, {aip: {$elemMatch: {hdl: hdl}}}, {dip: {$elemMatch: {hdl: hdl}}}]};
    VFS.findOne(conditions, {}, {}, function (err, doc) {
        if (err) {
            console.error(err);
            res.status(500);
            res.headers.set('ServerError', err);
            res.send();
        } else {
            if (doc) {
                let tmp = doc.toJSON();
                let files = tmp.aip.concat(tmp.dip);
                let metadata = files.filter(function (file) {
                    return file.hdl === hdl;
                })[0];
                let name = metadata.name;
                let content_type = metadata.contenttype;
                let content_length = metadata.length;
                res.attachment = name;
                res.contentType(content_type);
                res.setHeader('Content-Length', content_length);
                res.status(200).send();
            } else {
                res.headers.set('ServerError', "Not found " + hdl);
                res.status(404).send();
            }
        }
    });
});

router.get('/file/:na/:id', function (req, res, next) {
    let folder = req.folder;
    let tree = dirTree(folder + '/dip', '/dip'); // todo: cache dit voor 1 minuut. Gebruik tree voor authorizatie besluit.

    let hdl = req.na + '/' + req.id;
    let conditions = {$or: [{objid: hdl}, {aip: {$elemMatch: {hdl: hdl}}}, {dip: {$elemMatch: {hdl: hdl}}}]};
    VFS.findOne(conditions, {}, {}, function (err, doc) {
        if (err) {
            console.error(err);
            res.status(500);
            res.headers.set('ServerError', err);
            res.send();
        } else {
            if (doc) {
                let tmp = doc.toJSON();
                let files = tmp.aip.concat(tmp.dip);
                let metadata = files.filter(function (file) {
                    return file.hdl === hdl;
                })[0];
                let file = metadata.path; // # todo, make this the virtual path
                let name = metadata.name;
                let content_length = metadata.content_length;
                let content_type = metadata.contenttype;

                let options = {
                    headers: {
                        'Content-Length': content_length,
                        'Content-Type': content_type
                    }
                }

                res.sendFile(file, options, function (err, result) {
                    if (err) {
                        console.error(err);
                        next(err);
                    } else {
                        console.log("File served " + hdl + '->' + file);
                    }
                });
            } else {
                res.status(404).send();
            }
        }
    });
});

router.get('/metadata/:na/:id', function (req, res) {
    let folder = req.folder;
    let tree = dirTree(folder + '/dip', '/dip'); // todo: cache dit voor 1 minuut. Gebruik tree voor authorizatie besluit.

    let hdl = req.na + '/' + req.id;
    let conditions = {$or: [{objid: hdl}, {aip: {$elemMatch: {hdl: hdl}}}, {dip: {$elemMatch: {hdl: hdl}}}]}; // look for id number of file handle.
    VFS.findOne(conditions, {}, {}, function (err, doc) {
        if (err) {
            console.error(err);
            res.status(500);
            res.end(JSON.stringify({status: 500, message: err}));
        } else {
            if (doc) {
                let tmp = doc.toJSON();
                let aip = (hdl === doc.objid) ? tmp.aip.map(function (o) {
                    delete o._id;
                    delete o.path;
                    delete o.__v;
                    o.type = 'aip';
                    return o;
                }) : [];
                let dip = tmp.dip.map(function (o) {
                    if (hdl === doc.objid || hdl === o.hdl) {
                        delete o._id;
                        delete o.path;
                        delete o.__v;
                        o.type = 'dip';
                        return o;
                    }
                });
                delete tmp._id;
                delete tmp.aip;
                delete tmp.dip;
                delete tmp.__v;

                tmp.files = aip.concat(dip);
                res.status(200);
                res.end(JSON.stringify(tmp));
                // toda: wijzig absolute vpath in relatief voor de vfs van de gebruiker.
                res.status(200);
                res.end(JSON.stringify(tmp));
            } else {
                res.status(404);
                res.end(JSON.stringify({status: 404, message: "Unknown " + hdl}));
            }
        }
    });
});

// alternatief is https://www.npmjs.com/package/directory-tree
function dirTree(filename, vfs) {
    let stats = fs.lstatSync(filename);
    let info = {
        path: vfs,
        type: 'directory'
    };

    if (stats.isDirectory()) {
        info.children = fs.readdirSync(filename).map(function (child) {
            return dirTree(filename + '/' + child, vfs + '/' + child);
        });
    } else {
        let _filename = readVFS(filename);
        if (_filename) {
            let children = fs.readdirSync(_filename).map(function (child) { // dit zijn de dip folders
                let na = _filename.split('/')[3]; // na is altijd op /folder/folder/na

                let name = path.basename(child);
                let accession_path = vfs + '/' + child;
                return {
                    path: accession_path,
                    name: name,
                    hdl: na + '/' + name,
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
    let objid = req.na + '/' + req.id;
    let conditions = {objid: objid};
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
