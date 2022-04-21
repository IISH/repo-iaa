module.exports = function (res, status = 200, message = 'OK', mimetype = 'application/json'){
    res.status(status);
    if (message && mimetype) {
        res.type(mimetype);
        let o = JSON.stringify({status: status, message: message});
        let length = Object.keys(o).length;
        res.setHeader('Content-Length', length);
        res.end(o);
    } else {
        res.setHeader('Content-Length', 0);
    }
    res.send();

    if ( status !== 200) {
        console.error(message);
    }
}