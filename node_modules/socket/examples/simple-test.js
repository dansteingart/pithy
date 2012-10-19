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

var socket = require('../lib'),
    net = require('net'),
    microtime = require('microtime'),
    port = 8080,
    app,
    repeat = 1000,
    count = repeat,
    start = microtime.now(),
    i;

app = socket.createServer(
    socket.profiler(),
    socket.echo()
).listen(port);

console.log('Knot Server Started');

function test(port, ip, obj, callback) {
    var buffer = '',
        client;

    client = net.connect(port, ip, function () {
        client.write(JSON.stringify(obj) + app.TERM);
    });
    client.on('data', function (data) {
        buffer += data;
    });
    client.on('end', function () {
        var data;
        try {
            data = JSON.parse(buffer);
        } catch (e) {
            data = {error: 'bad json parse'};
        }
        callback(data);
    });
}

function log(msg) {
    count = count - 1;
    if (!count) {
        console.log('Total: ' + ((microtime.now() - start) / 1000000) + 'sec (' + repeat + ' requests)');
        process.exit();
    } else {
        console.log(msg);
    }
}

for (i = 0; i < count; i = i + 1) {
    test(port, 'localhost', {num: i}, log);
}