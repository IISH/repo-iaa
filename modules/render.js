module.exports = function (res, status = 200, message = 'OK', mimetype = 'application/json'){
    res.type(mimetype);
    res.status(status);
    res.end(JSON.stringify({status: status, message: message}));
    res.send();

    if ( status !== 200) {
        console.error(message);
    }
}