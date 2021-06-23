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
router.param('accession', function (req, res, next, accession) {
    req.accession = accession;
    next();
});

router.get('/', function (req, res) {
    res.render('index', {title: 'a title', user: req.user.fullname});
});

// verkrijg een tree overzicht - folders en files - van de gebruiker.
// bij de tree maken we een volledige diepte van folders - niet de files.
router.get('/tree', function (req, res) {
    let folder = nconf.get('vfs') + '/' + req.user.sub;
    if (fs.existsSync(folder)) {
        res.status(200);
        res.end(JSON.stringify(dirTree(folder + '/dip', '/dip')));
    } else {
        console.info("Not found " + folder);
        res.end(JSON.stringify("Unknown user or not authorized"));
        res.status(403);
    }
});

router.get('/tree/:accession', function (req, res) {
    let folder = nconf.get('vfs') + '/' + req.user.sub;
    if (fs.existsSync(folder)) {
        res.status(200);
        res.end(JSON.stringify(dirTree(folder + '/dip', '/dip', req.accession)));
    } else {
        console.info("Not found " + folder);
        res.end(JSON.stringify("Unknown user or not authorized"));
        res.status(403);
    }
});

// alternatief is https://www.npmjs.com/package/directory-tree
function dirTree(filename, vfs, accession) {
    let stats = fs.lstatSync(filename);
    let info = {
        path: vfs,
        name: path.basename(filename),
        type: 'directory'
    };

    if (stats.isDirectory()) {
        info.children = fs.readdirSync(filename).map(function (child) {
            return dirTree(filename + '/' + child, vfs + '/' + child, accession);
        });
    } else {
        let _filename = readVFS(filename);
        if (_filename)
            info.children = fs.readdirSync(_filename).map(function (child) { // dit zijn de dip folders
                let accession_path = vfs + '/' + child;
                let children = (accession === child) ? readManifest(_filename + '/' + child + '/manifest.json', accession_path) : [];
                return {
                    path: accession_path,
                    name: path.basename(child),
                    type: 'accession',
                    children: children
                };
            });
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

function readManifest(filename, accession_path) {
    if (fs.existsSync(filename)) {
        let data = fs.readFileSync(filename, {encoding: 'utf8', flag: 'r'});
        let json = JSON.parse(data);
        // omdat de vfs verschilt per genbruiker, passen we dit aan.
        return json.files.map(function (o) {
            o.path = accession_path + '/' + o.name;
            delete o.vpath;
            o.type = 'file';
            return o
        });
    }
    return null;
}

router.post('/:na/:accession', function (req, res) {
    let objid = req.na + '/' + req.accession;
    let conditions = {objid: objid};
    let update = {files: req.body.files};
    VFS.findOneAndUpdate(conditions, update, {upsert: true}, function (err, result) {
        if (err) {
            res.status(500);
            res.end(JSON.stringify({status: 500, message: result}));
        } else {
            res.status(200);
            res.end(JSON.stringify({status: 200, message: 'Stored ' + objid}));
        }
    });
});

module.exports = router;
