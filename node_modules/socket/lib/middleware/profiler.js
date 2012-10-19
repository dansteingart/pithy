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

/**
 * Profile the duration of a request.
 *
 * Typically this middleware should be utilized
 * _above_ all others, as it proxies the `res.end()`
 * method, being first allows it to encapsulate all
 * other middleware.
 *
 * Example Output:
 *
 *      request 
 *      response time 2ms
 *      memory rss 52.00kb
 *      memory vsize 2.07mb
 *      heap before 3.76mb / 8.15mb
 *      heap after 3.80mb / 8.15mb
 *
 * @api public
 */

var microtime = require('microtime');

/**
 * Row helper
 *
 * @param {String} key
 * @param {String} val
 * @api private
 */

function row(key, val) {
    console.log(' %s %s ', key, val);
}

/**
 * Format byte-size.
 *
 * @param {Number} bytes
 * @return {String}
 * @api private
 */

function formatBytes(bytes) {
    var kb = 1024,
        mb = 1024 * kb,
        gb = 1024 * mb;

    if (bytes < kb) {
        return bytes + 'b';
    }
    if (bytes < mb) {
        return (bytes / kb).toFixed(2) + 'kb';
    }
    if (bytes < gb) {
        return (bytes / mb).toFixed(2) + 'mb';
    }
    return (bytes / gb).toFixed(2) + 'gb';
}

/**
 * Compare `start` / `end` snapshots.
 *
 * @param {IncomingRequest} req
 * @param {Object} start
 * @param {Object} end
 * @api private
 */

function compare(req, start, end) {
    console.log();
    row('request:', typeof req.data === 'string' ? req.data : JSON.stringify(req.data));
    row('response time:', ((end.time - start.time) / 1000) + 'ms');
    row('memory rss:', formatBytes(end.mem.rss - start.mem.rss));
    row('heap before:', formatBytes(start.mem.heapUsed) + ' / ' + formatBytes(start.mem.heapTotal));
    row('heap after:', formatBytes(end.mem.heapUsed) + ' / ' + formatBytes(end.mem.heapTotal));
    console.log();
}

module.exports = function profiler() {
    return function (req, res, next) {
        var end,
            start;

        // state snapshot
        function snapshot() {
            return {
                mem: process.memoryUsage(),
                time: microtime.now() //new Date
            };
        }

        end = res.end;
        start = snapshot();

        // proxy res.end()
        res.end = function (data, encoding) {
            res.end = end;
            res.end(data, encoding);
            compare(req, start, snapshot());
        };

        next();
    };
};
