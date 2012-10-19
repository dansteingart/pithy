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

/*jslint stupid: true, nomen: true*/

'use strict';

/**
 * Module dependencies.
 */

var proto = require('./proto'),
    utils = require('./utils'),
    path = require('path'),
    basename = path.basename,
    fs = require('fs');

/**
 * Create a new knot server.
 *
 * @return {Function}
 * @api public
 */

function createServer() {
    var i, opt;
    function app(req, res) {
        app.handle(req, res);
    }
    utils.merge(app, proto);
    app.route = '/';
    app.stack = [];
    app.TERM = '\r\n';
    app.ENCODING = 'utf8';

    // I have no idea how Connect does this?
    for (i = 0; i < arguments.length; i = i + 1) {
        if (typeof arguments[i] === 'function') {
            app.use(arguments[i]);
        } else if (typeof arguments[i] === 'object' && !opt) {
            opt = arguments[i];
        }
    }
    // If we were given options, use them.
    if (opt) {
        app.TERM = opt.term !== undefined ? opt.term : '\r\n';
        app.ENCODING = opt.encoding || 'utf8';
    }

    return app;
}

// expose createServer() as the module

module.exports = createServer;

/**
 * Framework version.
 */

module.exports.version = '0.1.0';

/**
 * Expose createServer
 */

module.exports.createServer = createServer;

/**
 * Expose createServer
 */

module.exports.dispatch = proto.dispatch;

/**
 * Auto-load bundled middleware with getters.
 */

fs.readdirSync(__dirname + '/middleware').forEach(function (filename) {
    var name;

    if (!/\.js$/.test(filename)) {
        return;
    }
    name = basename(filename, '.js');
    function load() {
        return require('./middleware/' + name);
    }
    module.exports.__defineGetter__(name, load);
});
