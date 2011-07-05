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