//    (The MIT License)
//
//    Copyright (c) 2012 Richard S Allinson <rsa@mountainmansoftware.com>
//
//    Permission is hereby granted, free of charge, to any person obtaining
//    a copy of this software and associated documentation files (the
//    'Software'), to deal in the Software without restriction, including
//    without limitation the rights to use, copy, modify, merge, publish,
//    distribute, sublicense, and/or sell copies of the Software, and to
//    permit persons to whom the Software is furnished to do so, subject to
//    the following conditions:
//
//    The above copyright notice and this permission notice shall be
//    included in all copies or substantial portions of the Software.
//
//    THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
//    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
//    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
//    IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
//    CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
//    TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
//    SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var net = require('net');
var utils = require('./utils');

// prototype

var app = module.exports = {};

// environment

var env = process.env.NODE_ENV || 'development';

/**
 * use
 */

app.use = function (key, fn) {

    if ('string' !== typeof key) {
        fn = key;
        key = '';
    }

    // wrap sub-apps
    if ('function' === typeof fn.handle) {
        var server = fn;
        fn.key = key;
        fn = function (req, res, next) {
            server.handle(req, res, next);
        };
    }

    this.stack.push({
        key: key,
        handle: fn
    });

    return this;
};

/**
 * handle
 */

app.handle = function (req, res, out) {
    var stack = this.stack, index = 0;

    function next(err) {
        var layer,
            arity;

        // next callback
        layer = stack[index];

        index = index + 1;

        // all done
        if (!layer) {
            // delegate to parent
            if (out) {
                out(err);
                return;
            }

            // unhandled error
            if (err) {
                res.end(err.toString());
            } else {
                res.end();
            }
            return;
        }

        try {
            // If we have a key and the req is JSON can we match to some middleware?
            // 'some.key.path' === use middleware
            if (layer.key !== '' && typeof req === 'object' && utils.keyExists(layer.key, req) === false) {
                next(err);
                return;
            }

            arity = layer.handle.length;
            if (err) {
                if (arity === 4) {
                    layer.handle(err, req, res, next);
                } else {
                    next(err);
                }
            } else if (arity < 4) {
                layer.handle(req, res, next);
            } else {
                next();
            }
        } catch (e) {
            next(e);
        }
    }
    next();
};

/**
 * listen
 */

app.listen = function (port, ip) {
    var that = this,
        server;

    server = net.createServer(function (socket) {
        var req = {data: ''},
            res = {data: ''},
            handle;

        handle = function (data) {
            if (typeof data === 'undefined') {
                data = '';
            }
            req.data += data;
            if (data.slice(-that.TERM.length) === that.TERM) {
                try {
                    req.data = req.data.slice(0, req.data.length - that.TERM.length);
                } catch (e) {
                    socket.end('bad request' + that.TERM, that.ENCODING);
                    return;
                }
                that.handle(req, res);
            }
        };

        res.end = function (data, encoding) {
            socket.end(data, encoding || that.ENCODING);
        };

        socket.setEncoding('utf8');
        socket.on('data', handle);

        if (!that.TERM) {
            socket.on('connect', handle);
        }

    });
    server.listen(port, ip);
    return this;
};

/**
 * dispatch
 */

app.dispatch = function dispatch(req, port, ip, callback) {
    var term = this.TERM || '\r\n',
        buffer = '',
        client;

    client = net.connect(port, ip, function () {
        client.write(req + term);
    });
    client.on('data', function (data) {
        buffer += data;
    });
    client.on('end', function () {
        if (buffer.slice(-term.length) === term) {
            buffer = buffer.slice(0, buffer.length - term.length);
        }
        callback(buffer);
    });
};