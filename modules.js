/*
    JS/Python

    (C) 2011 Florian Schlachter, Berlin
    All rights reserved.

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions
    are met:
    1. Redistributions of source code must retain the above copyright
       notice, this list of conditions and the following disclaimer.
    2. Redistributions in binary form must reproduce the above copyright
       notice, this list of conditions and the following disclaimer in the
       documentation and/or other materials provided with the distribution.
    3. The name of the author may not be used to endorse or promote products
       derived from this software without specific prior written permission.

    THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR
    IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
    OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
    IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT,
    INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
    NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
    DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
    (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
    THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/
"use strict";

/* 
 * Webby
 */

function PyModWebby() {
    this.functions = {
        'js_eval': this.js_eval,
        'ask': this.ask,
        'redirect': this.redirect,
        'prompt': this.prompt
    };
};
PyModWebby.prototype = new PyModule();
PyModWebby.prototype.js_eval = function(params) {
    var code = params[0];
    eval(code);
};
PyModWebby.prototype.ask = function(params) {
    var question = params[0];
    return confirm(question);
};
PyModWebby.prototype.redirect = function(params) {
    var url = params[0];
    window.location = url;
};
PyModWebby.prototype.prompt = function(params) {
    var msg = params[0],
        dflt = params[1] || "";
    return prompt(msg, dflt);
};

/* 
 * Web Storage
 */

function PyModWebStorage() {
    this.functions = {
        'set': this.set,
        'has_key': this.has_key,
        'get': this.get,
        'clear': this.clear
    };
}
PyModWebStorage.prototype = new PyModule();
PyModWebStorage.prototype.set = function(params) {
    var key = params[0],
        val = params[1];
    
    sessionStorage.setItem(key, val);
};
PyModWebStorage.prototype.has_key = function(params) {
    var key = params[0];
    return (sessionStorage.getItem(key) != undefined);
};
PyModWebStorage.prototype.get = function(params) {
    var key = params[0];
    return sessionStorage.getItem(key);
};
PyModWebStorage.prototype.clear = function() {
    sessionStorage.clear();
};

/*
 * Time module
 */

function PyModTime() {
	this.functions = {
		'time': this.time
	};
};
PyModTime.prototype = new PyModule();
PyModTime.prototype.time = function() {
    return new Date().getTime() / 1000;
};

/*
 * Math module
 */

function PyModMath() {
    this.functions = {
        'sqrt': this.sqrt
    };
};
PyModMath.prototype = new PyModule();
PyModMath.prototype.sqrt = function(params) {
    var number = params[0];
    return Math.sqrt(number);
};