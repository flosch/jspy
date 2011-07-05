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

    Not finished yet! Missing a lot of things. Not well documented yet, will
    finish this later.

*/

"use strict";
/* Global vars */
var _current_jspy, _current_frame, _current_frame_cfg, _mainframe;

/* Helper functions */

function ord(x) {
    return x.charCodeAt(0);
}
function chr(x) {
    return String.fromCharCode(x);
}

/*
 * Assert
 */

function AssertException(message) {
    this.message = message;
}
AssertException.prototype.toString = function () {
    return 'AssertException: ' + this.message;
};

function assert(exp, message) {
    if (!exp) {
      throw new AssertException(message);
  }
}

/*
 * BufferStream
 */

function BufferStream(buffer) {
    var i;
    
    if (buffer instanceof Uint8Array)
        this.buffer = buffer;
    else if (typeof buffer == "string") {
        this.buffer = new Uint8Array(new ArrayBuffer(buffer.length));
        for (i=0; i<buffer.length;i++)
            this.buffer[i] = ord(buffer[i]);
    }
    else
        this.buffer = new Uint8Array(buffer);
}
BufferStream.prototype.getByte = function(offset) {
    return this.buffer[offset];
};
BufferStream.prototype.getWord = function(offset) {
    return this.buffer[offset] + (this.buffer[offset+1] << 8);
};
BufferStream.prototype.getDWord = function(offset) {
    return this.buffer[offset] + (this.buffer[offset+1] << 8) +
        (this.buffer[offset+2] << 16) + (this.buffer[offset+3] << 24);
};
BufferStream.prototype.getQWord = function(offset) {
    return this.buffer[offset] + (this.buffer[offset+1] << 8) +
           (this.buffer[offset+2] << 16) + (this.buffer[offset+3] << 24) +
           (this.buffer[offset+4] << 32) + (this.buffer[offset+5] << 40) + 
           (this.buffer[offset+6] << 48) + (this.buffer[offset+7] << 56);
};
BufferStream.prototype.getBuffer = function(offset, size) {
    return this.buffer.subarray(offset, offset+size);
};
BufferStream.prototype.bufferToString = function(buffer) {
    // TODO better way?!
    var s = new String(),
        size = buffer.byteLength,
        i;
    
    for (i=0; i<size;i++)
        s += chr(buffer[i]);
    
    return s;
};
BufferStream.prototype.getString = function(offset, size) {
    return this.bufferToString(this.getBuffer(offset, size));
};

/* 
 * Little bit of patching
 */ 
 Uint8Array.prototype.toString = function() {
     var s = new String(),
         size = this.byteLength,
         i;

     for (i=0; i<size;i++)
         s += chr(this[i]);

     return s;
 };


/* 
 * Console 
 */
 
function Console(cfg) {
    this.config = cfg;
    this.element = document.getElementById(cfg.canvas);
    if (!this.element)
        throw('Console element not found.');
}
Console.prototype.print = function(val) {
    if(!this.element) return;
    val += ' ';
    this.element.appendChild(
        document.createTextNode(val));
};
Console.prototype.println = function(val) {
    if(!this.element) return;
    if(!val) val = '';
    this.print(val);
    this.element.appendChild(document.createElement('br'));
};
Console.prototype.line = function() {
    this.element.appendChild(document.createElement('hr'));
};
Console.prototype.clear = function() {
    var i;
    
    if (this.element.hasChildNodes()) 
        for (i=0;i<this.element.childNodes.length;i++) {
            this.element.removeChild(this.element.childNodes[i]);
        }
    this.element.innerHTML = '';
};

/* 
 * Python Code object
 */

var cmp_table = {
        0: function(x, y) { return x.lt(y); }, // <
        1: function(x, y) { return x.lte(y); }, // <=
        2: function(x, y) { return x.eq(y); }, // ==
        3: function(x, y) { return x.neq(y); }, // !=
        4: function(x, y) { return x.gt(y); }, // >
        5: function(x, y) { return x.gte(y); }, // >=
        8: function(x) { return x instanceof PyObjNone; } // == None
    },
    opmap = {
        1: 'POP_TOP',
        2: 'ROT_TWO',
        20: 'BINARY_MULTIPLY',
        21: 'BINARY_DIVIDE',
        22: 'BINARY_MODULO',
        23: 'BINARY_ADD',
        24: 'BINARY_SUBTRACT',
        55: 'INPLACE_ADD',
        64: 'BINARY_AND',
        68: 'GET_ITER',
        71: 'PRINT_ITEM',
        72: 'PRINT_NEWLINE',
        80: 'BREAK_LOOP',
        83: 'RETURN_VALUE',
        86: 'YIELD_VALUE',
        87: 'POP_BLOCK',
        90: 'STORE_NAME',
        92: 'UNPACK_SEQUENCE',
        93: 'FOR_ITER',
        97: 'STORE_GLOBAL',
        100: 'LOAD_CONST',
        101: 'LOAD_NAME',
        102: 'BUILD_TUPLE',
        103: 'BUILD_LIST',
        106: 'LOAD_ATTR',
        107: 'COMPARE_OP',
        108: 'IMPORT_NAME',
        110: 'JUMP_FORWARD',
        113: 'JUMP_ABSOLUTE',
        114: 'POP_JUMP_IF_FALSE',
        115: 'POP_JUMP_IF_TRUE',
        116: 'LOAD_GLOBAL',
        120: 'SETUP_LOOP',
        124: 'LOAD_FAST',
        125: 'STORE_FAST',
        131: 'CALL_FUNCTION',
        132: 'MAKE_FUNCTION'
    };

function CodeObject() {
    this.argcount = null;
    this.nlocals = null;
    this.stacksize = null;
    this.flags = null;
    this.flags_optimized = false;
    this.flags_newlocals = false;
    this.flags_varargs = false;
    this.flags_varkeywords = false;
    this.flags_nested = false;
    this.flags_generator = false;
    
    this.code = null;
    this.consts = null;
    this.names = null;
    this.varnames = null;
    this.freevars = null;
    this.cellvars = null;
    this.filename = null;
    this.name = null;
    this.firstlineno = null;
    this.lnotab = null;

    /* vm vars following */
    this.code_pos = 0;
}

CodeObject.prototype.parse_flags = function() {
    /*
     * #define CO_OPTIMIZED 0x0001
        #define CO_NEWLOCALS    0x0002
        #define CO_VARARGS  0x0004
        #define CO_VARKEYWORDS  0x0008
        #define CO_NESTED       0x0010
        #define CO_GENERATOR    0x0020
     */
    this.flags_optimized = this.flags & 0x0001;
    this.flags_newlocals = this.flags & 0x0002;
    this.flags_varargs = this.flags & 0x0004;
    this.flags_varkeywords = this.flags & 0x0008;
    this.flags_nested = this.flags & 0x0010;
    this.flags_generator = this.flags & 0x0020;
};

CodeObject.prototype.eval = function(cfg) {
    var b, oparg, fn, old_pos, ic, i, params, newobj, 
        tos, tos2, op1, op2, by, obj, res,
        
        async = async || true, // run asynchronously until otherwise stated
        instructions_per_cycle = cfg.instructions_per_cycle || _current_jspy.instructions_per_cycle;
    
    for (ic = 0; ic < instructions_per_cycle; ic++) {
        if (!_current_jspy.running) {
            /*
             * User halted; Ending...
             */
            _current_jspy.endtime = new Date().getTime();
            _current_jspy.console.line();
            _current_jspy.console.println("User halted application (executed " + _current_jspy.instructions + 
                                          " instructions in " + (_current_jspy.endtime - _current_jspy.starttime) +
                                          " ms [" + Math.round(_current_jspy.instructions/(_current_jspy.endtime -
                                                  _current_jspy.starttime) * 1000) + " ins/sec]).");

            if (_current_jspy.onfinished) _current_jspy.onfinished(); // onfinished callback
            return false;
        }
        
        _current_jspy.instructions += 1;
        
        // deactivate debugging when there are too many instructions 
        if (_current_jspy.debug && _current_jspy.instructions >= 250) _current_jspy.debug = false; 
        
        // max instructions reached? if so, stop the application
        if (_current_jspy.max_instructions && 
            _current_jspy.instructions > _current_jspy.max_instructions) {
            _current_jspy.running = false;
            _current_jspy.console.line();
            _current_jspy.console.println('Halted application due too much ' +
                                          'instructions (reached ' + _current_jspy.max_instructions + ').');
            return;
        }

        // Save position before new instruction is read
        old_pos = this.code_pos;
        b = this.code.getByte(this.code_pos);
        if (b == undefined) {
            // remove previously added instruction
            _current_jspy.instructions -= 1;
            
            // no instruction left in this frame, left it!
            _current_jspy.frame = _current_jspy.previous_frame;
            if (!this.previous_frame) {
                _current_jspy.endtime = new Date().getTime();
                _current_jspy.console.line();
                _current_jspy.console.println("Application normally halted (executed " + _current_jspy.instructions +
                                              " instructions in " + (_current_jspy.endtime - _current_jspy.starttime) +
                                              " ms [" + Math.round(_current_jspy.instructions/(_current_jspy.endtime -
                                              _current_jspy.starttime) * 1000) + " ins/sec]).");
                
                if (_current_jspy.onfinished) _current_jspy.onfinished(); // callback
                return;
            } else {
                // there are frames with code left
                this.eval(cfg);
                return;
            }
        }
        this.code_pos += 1;
    
        // Do load the operand argument
        if (b >= 90) {
            oparg = this.code.getWord(
                this.code_pos);
            this.code_pos += 2;
        
            if (oparg == null) throw('oparg needed, but not available.');
        } else oparg = null;
    
        if (_current_jspy.debug) {
            if (this.instructions % 100000 == 0)
                console.log("Instruction counter: " + this.instructions);
            
            console.log("[" + this.name + "] op=" + opmap[b] +
                        " (" + b + ") oparg=" + oparg + " pos=" + old_pos +  
                        " ins=" + _current_jspy.instructions);
        }

        // Evaluate the operand
        switch (b) {
            
            case 1: // POP_TOP
                _current_frame.stack.pop();
                break;
            
            case 2: // ROT_TWO
                tos = _current_frame.stack.pop();
                tos2 = _current_frame.stack.pop();
                _current_frame.stack.push(tos);
                _current_frame.stack.push(tos2);
                break;
            
            case 19: // BINARY_POWER
                throw("todo"); // TODO XXX
                op1 = _current_frame.stack.pop();
                op2 = _current_frame.stack.pop();
                _current_frame.stack.push(op2.power(op1));
                break;
            
            case 20: // BINARY_MULTIPLY
                op1 = _current_frame.stack.pop();
                op2 = _current_frame.stack.pop();
                _current_frame.stack.push(op2.multiply(op1));
                break;
            
            case 21: // BINARY_DIVIDE
                op1 = _current_frame.stack.pop();
                op2 = _current_frame.stack.pop();
                _current_frame.stack.push(op2.divide(op1));
                break;
        
            case 22: // BINARY_MODULO
                op1 = _current_frame.stack.pop();
                op2 = _current_frame.stack.pop();
                _current_frame.stack.push(op2.modulo(op1));
                break;
            
            case 23: // BINARY_ADD
                /*console.dir(op1);
                console.dir(op2);*/
                op1 = _current_frame.stack.pop();
                op2 = _current_frame.stack.pop();
                _current_frame.stack.push(op2.add(op1));
                break;
        
            case 24: // BINARY_SUBTRACT
                op1 = _current_frame.stack.pop();
                op2 = _current_frame.stack.pop();
                _current_frame.stack.push(op2.subtract(op1));
                break;
            
            case 26: // BINARY_FLOOR_DIVIDE
                op1 = _current_frame.stack.pop();
                op2 = _current_frame.stack.pop();
                _current_frame.stack.push(Math.floor(op2.getValue() / op1.getValue())); // XXX TODO Right?!
                break;
        
            case 55: // INPLACE_ADD
                tos = _current_frame.stack.pop();
                by = _current_frame.stack.pop();
                _current_frame.stack.push(tos.add(by));
                break;
            
            case 64: // BINARY_AND
                op1 = _current_frame.stack.pop();
                op2 = _current_frame.stack.pop();
                _current_frame.stack.push(op1.and(op2));
                break;
            
            case 68: // GET_ITER
                tos = _current_frame.stack.pop();
                obj = new PyIter({
                    obj: tos,
                    instance: this
                });
                _current_frame.stack.push(obj);
                break;

            case 71: // PRINT_ITEM
                _current_frame.console.print(_current_frame.stack.pop().getValue()); 
                break;
        
            case 72: // PRINT_NEWLINE
                _current_frame.console.println();
                break;
            
            case 80: // BREAK_LOOP
                obj = _current_frame.blockstack.pop();
                _current_frame.code_object.code_pos = obj[1];
                break;
        
            case 83: // RETURN_VALUE
                // console.log(this.stack[_current_frame.stack.length-1])
                // TODO?!
                break;
            
            case 86: // YIELD_VALUE
                throw("todo");
                tos = _current_frame.stack.pop();
                this.codestack.pop();
                return tos; 

            case 87: // POP_BLOCK
                _current_frame.blockstack.pop();
                break;

            case 90: // STORE_NAME
                _current_frame.setLocal(this.names[oparg].getValue(), _current_frame.stack.pop());
                break;

            case 92: // UNPACK_SEQUENCE
                // Unpacks TOS into count individual values, which are put
                // onto the stack right-to-left.
                
                tos = _current_frame.stack.pop();
                for (i=oparg; i>0;i--) {
                    _current_frame.stack.push(tos[i-1]);
                }
                break;

            case 93: // FOR_ITER
                tos = _current_frame.stack[_current_frame.stack.length-1];
                obj = tos.next();
                if (obj != undefined) {
                    // next value available
                    _current_frame.stack.push(obj);
                } else {
                    _current_frame.stack.pop();
                    this.code_pos += oparg;
                }
                break;

            case 97: // STORE_GLOBAL
                //_current_frame.globals[this.names[oparg]] = _current_frame.stack.pop();
                _current_frame.setGlobal(this.names[oparg].getValue(), _current_frame.stack.pop());
                break;

            case 100: // LOAD_CONST
                _current_frame.stack.push(this.consts[oparg]);
                break;

            case 101: // LOAD_NAME
                obj = _current_frame.getLocal(this.names[oparg].getValue());
                if (obj == undefined) {
                    obj = this.names[oparg];
                }
                _current_frame.stack.push(obj);
                break;
            
            case 102: // BUILD_TUPLE
            case 103: // BUILD_LIST
                newobj = new Array();
                for (i=0;i<oparg;i++) {
                    newobj.push(_current_frame.stack.pop());
                }
                newobj.reverse();
                if (b == 102)
                    obj = new PyObjTuple(newobj);
                else if (b == 103)
                    obj = new PyObjList(newobj);
                else
                    throw('Unknown operand.');
                _current_frame.stack.push(obj);
                break;
        
            case 106: // LOAD_ATTR
                // Replaces TOS with getattr(TOS, co_names[namei]).
                tos = _current_frame.stack.pop(); // module name
                if (obj = _current_jspy.get_module_function(tos.getValue(), this.names[oparg].getValue())) {
                    _current_frame.stack.push(obj);
                } else
                    _current_frame.stack.push(tos + '.' + this.names[oparg].getValue());
                break;
        
            case 107: // COMPARE_OP
                op1 = _current_frame.stack.pop();
                op2 = _current_frame.stack.pop();
                _current_frame.stack.push(cmp_table[oparg](op2, op1));
                break;
        
            case 108: // IMPORT_NAME
                _current_frame.stack.push(this.names[oparg].getValue());
                break;
            
            case 110: // JUMP_FORWARD
                this.code_pos += oparg;
                break;
        
            case 113: // JUMP_ABSOLUTE
                this.code_pos = oparg;
                break;
        
            case 114: // POP_JUMP_IF_FALSE
                obj = _current_frame.stack.pop();
                if (!obj.getValue()) // rather than == false
                    this.code_pos = oparg;
                break;
        
            case 115: // POP_JUMP_IF_TRUE
                obj= _current_frame.stack.pop();
                console.dir(obj);
                if (obj.getValue()) // rather than == true
                    this.code_pos = oparg;
                break;
        
            case 116: // LOAD_GLOBAL
                /*obj = this.globals[frame.code_object.names[oparg]];
                if (obj == undefined) obj = frame.code_object.names[oparg];
                _current_frame.stack.push(obj); */
                _current_frame.stack.push(_current_frame.getGlobal(this.names[oparg]));
                break;
        
            case 120: // SETUP_LOOP
                _current_frame.blockstack.push([old_pos, this.code_pos+oparg]);
                break;

            case 124: // LOAD_FAST
                _current_frame.stack.push(this.locals[this.varnames[oparg]]);
                break;

            case 125: // STORE_FAST
                frame.locals[this.varnames[oparg]] = _current_frame.stack.pop();
                break;

            case 131: // CALL_FUNCTION
                /* CALL_FUNCTION    argc
                 * Calls a function. The low byte of argc indicates the number of 
                 * positional parameters, the high byte the number of keyword parameters. 
                 * On the stack, the opcode finds the keyword parameters first.
                 * For each keyword argument, the value is on top of the key. 
                 * Below the keyword parameters, the positional parameters are on the stack,
                 * with the right-most parameter on top. Below the parameters, the function
                 * object to call is on the stack. 
                */
                
                
                
                params = new Array();
                for (i=0; i<oparg;i++) {
                    params.push(_current_frame.stack.pop());
                }
                params.reverse();
                
                fn = _current_frame.stack.pop();

                if (fn instanceof CodeObject) { // Is CodeObject?
                    throw("codeblock execute not implemented yet... lol ;)");
                    // prepare function call
                    for (i=0; i<fn.argcount;i++) {
                        fn.vm_varnames[fn.varnames[i]] = params.pop();
                    }
                    
                    // check for flags! (generator function etc...)
                    
                } else if (typeof fn == "function") { 
                    // Is function, e.g. PyModule?
                    for (i = 0; i < params.length; i++)
                        params[i] = params[i].getValue();
                    res = fn(params);
                    if (res == undefined) res = false;
                    _current_frame.stack.push(PyAutoObject(res));
                } else {
                    // Check for buitlins, __builtins__
                    if (obj = _current_jspy.get_module_function('__builtins__', fn.getValue())) {
                        _current_frame.stack.push(PyAutoObject(obj(params)));
                    } else {
                        console.log(fn);
                        console.dir(fn);
                        throw('function not supported yet: ' + fn);
                    }
                }
                
                break;
        
            case 132: // MAKE_FUNCTION
                // TODO XXX
                break;
        
            default:
                throw('Unknown operand: ' + b);
        }
    }

    /*
     * Make sure rendering is done during execution 
     */
    if (async) {
        window.setTimeout('eval_frame_async()', 1);
    } else {
        return this.eval(cfg);
    }
};

function eval_frame_async() {
    assert(_current_frame != null);
    assert(_current_frame_cfg != null);
    _current_frame.eval(_current_frame_cfg);
}

/*
 * (Un)Marshal
 */

function Marshal(cfg) {
    this.config = cfg;
    this.buffer = cfg.buffer;
    this.pos = 8;
    
    // for the parsing process
    this.interned_strings = new Array();
    this.PyLong_SHIFT = 15; // or 30?
    this.PyLong_MARSHAL_SHIFT = 15;
    this.PyLong_MARSHAL_BASE = 1 << this.PyLong_MARSHAL_SHIFT;
    this.PyLong_MARSHAL_RATIO = this.PyLong_SHIFT / this.PyLong_MARSHAL_SHIFT;
}

Marshal.prototype.read_byte = function() {
    var r = this.buffer.getByte(this.pos);
    this.pos += 1;
    return r;
};

Marshal.prototype.read_word = function() {
    var r = this.buffer.getWord(this.pos);
    this.pos += 2;
    return r;
};

Marshal.prototype.read_dword = function() {
    var r = this.buffer.getDWord(this.pos);
    this.pos += 4;
    return r;
};

Marshal.prototype.read_qword = function() {
    var r = this.buffer.getQWord(this.pos);
    this.pos += 8;
    return r;
};

Marshal.prototype.read_buffer = function(size) {
    var r = this.buffer.getBuffer(this.pos, size);
    this.pos += size;
    return r;
};

Marshal.prototype.read_string = function(size) {
    var r = this.buffer.getString(this.pos, size);
    this.pos += size;
    return r;
};

Marshal.prototype.parse = function() {
    return this.read_object();
};

Marshal.prototype.read_object = function() {
    var c, newobj, i, j, n, size, d, md, shorts_in_top_digit, digits, obj;
    
    c = chr(this.read_byte());

    console.log("Token = " + c);

    switch (c) {
        case 'N': // NONE
            return new PyObjNone();
        
        case 'F': // FALSE
            return new PyObjBool(false);
        
        case 'T': // TRUE
            return new PyObjBool(true);
    
        case 'i': // INT
            return new PyObjNumber(this.read_dword());
        
        case 'l': // LONG
            n = this.read_dword(); // how long is the LONG?
            console.log("Found long, n=" + n);
            if (n == 0) return 0;
            
            digits = new Array();
            
            size = 1 + (Math.abs(n) - 1) / this.PyLong_MARSHAL_RATIO;
            shorts_in_top_digit = 1 + (Math.abs(n) - 1) %
                this.PyLong_MARSHAL_RATIO;
            
            for (i = 0; i < size - 1; i++) {
                d = 0;
                for (j = 0; j < this.PyLong_MARSHAL_RATIO; j++) {
                    md = this.read_byte();
                    if (md < 0 || md > this.PyLong_MARSHAL_BASE)
                        throw('Bad marshal data (digit out of range in' +
                              ' long)');
                    
                    d += md << (j * this.PyLong_MARSHAL_SHIFT);
                }
                digits[i] = d;
            }
            
            d = 0;
            for (j = 0; j < shorts_in_top_digit; j++) {
                md = this.read_byte();
                if (md < 0 || md > this.PyLong_MARSHAL_BASE)
                    throw('Bad marshal data (digit out of range in long)');
                
                if (md == 0 && j == shorts_in_top_digit - 1)
                    throw('Bad marshal data (unnormalized long data)');
                
                d += md << j * this.PyLong_MARSHAL_SHIFT;
            }
            
            digits[size-1] = d;
            this.read_byte(); // Why? :(
            obj = parseInt(digits.join(""));
            console.log("Parsed long = " + obj);
            return obj;
        
        case 'y': // TYPE_BINARY_COMPLEX
            console.log(this.pos);
            obj = this.read_buffer(8);
            obj = this.read_buffer(8);
            return 0;
            break;
        
        case '.': // ELLIPSIS
            return new PyObjEllipsis;  // TODO XXX
        
        case 'R': // STRINGREF
            n = this.read_dword();
            return new PyObjString(this.interned_strings[n]);

        case '(': // TUPLE
            n = this.read_dword();
            newobj = new Array();
            for (i=0; i<n;i++) {
                newobj.push(this.read_object());
            }
            return new PyObjTuple(newobj);
        
        case '[': // LIST
            throw('list todo');
            n = this.read_dword();
            newobj = new Array();
            
            return new PyObjList(newobj);
        
        case 't': // INTERNED
        case 's': // STRING
            n = this.read_dword();
            
            newobj = this.read_string(n);
            
            if (c == 't')
                this.interned_strings.push(newobj);
            
            return new PyObjString(newobj);
            
        case 'c': // CODE
            newobj = new CodeObject();
            newobj.argcount = this.read_dword();
            newobj.nlocals = this.read_dword();
            newobj.stacksize = this.read_dword();
            newobj.flags = this.read_dword();
            newobj.code = new BufferStream(this.read_object().getValue());
            newobj.consts = this.read_object().getValue();
            newobj.names = this.read_object().getValue();
            newobj.varnames = this.read_object().getValue();
            newobj.freevars = this.read_object().getValue();
            newobj.cellvars = this.read_object().getValue();
            newobj.filename = this.read_object().getValue();
            newobj.name = this.read_object().value.toString();
            newobj.firstlineno = this.read_dword();
            newobj.lnotab = new BufferStream(this.read_object().getValue());
            newobj.parse_flags();
            return newobj;
        default:
            throw('[parser] Unknown token: "' + c + '" (' + ord(c) + ')' +
                  ' at position ' + this.pos);
    }
};

/*
 * PyModule
 */

function PyModule() {
    
}

function PyModBuiltIns() {
    this.functions = {
        'range': this.range,
        'int': this.int_conv
    };
}

PyModBuiltIns.prototype = new PyModule();

PyModBuiltIns.prototype.range = function(params) {
    var a = new Array(), i, c, start, end;
    
    if (params.length == 1) { // bis
        end = params[0];
        for (i = 0; i < end; i++) a[i] = i;
    } else if (params.length == 2) { // von, bis
        start = params[0], end = params[1];
        for (i = start, c = 0; i < end; i++, c++) a[c] = i;
    }
    return a;
};

PyModBuiltIns.prototype.int_conv = function(params) {
    var number = params[0];
    return parseInt(number);
};

/*
 * PyFrame
 */

function PyFrame(cfg) {
    this.vm = cfg.vm;
    assert(this.vm != null);
    this.console = this.vm.console; // make an alias
    
    this.previous_frame = null; // if null = END
    
    this.code_object = cfg.code_object;
    assert(this.code_object != null);
    
    this.builtins = cfg.builtins || {};
    this.globals = cfg.globals || {};
    this.locals = cfg.locals || {};

    this.lineno = 1; // current line number

    this.blockstack = new Array(); // blocks
    this.stack = new Array(); // global stack
}

PyFrame.prototype.getGlobal = function(key) {
    return _mainframe.globals[key];
};

PyFrame.prototype.setGlobal = function(key, value) {
    _mainframe.globals[key] = PyAutoObject(value);
};

PyFrame.prototype.getLocal = function(key) {
    return this.locals[key];
};

PyFrame.prototype.setLocal = function(key, value) {
    this.locals[key] = PyAutoObject(value);
};

PyFrame.prototype.eval = function(cfg) {
    _current_frame = this;
    _current_frame_cfg = cfg;
    
    return this.code_object.eval(cfg);
    try {
        // fŸr spŠter mal hier reinsetzen den aufruf
    }
    catch (e) {
        if (this.vm.onerror) this.vm.onerror();
        throw(e);
    }
};

/*
 * PyException
 */

function PyException() {
    
}

/*
 * PyIter
 */

function PyIter(cfg) {
    this.obj = cfg.obj;
    this.instance = cfg.instance;
    this.pos = 0;
}

PyIter.prototype.next = function() {
    var r;
    
    if (this.obj instanceof PyGenerator) {
        // It's a PyGenerator, enter into it and get the yielded
        // value
        this.instance.codestack.push(this.obj);
        
        throw("noes");
        
        // do not run asynchroniously
        r = this.instance.handle_operation(false);
    } else {
        r = this.obj[this.pos];
    };

    this.pos += 1;
    return r;
};
/*
PyIter.prototype.get = function() {
    return this.obj[this.pos];
}*/

/*
 * PyGenerator
 */

function PyGenerator(cfg) {
    this.func = cfg.func;
    this.instance = cfg.instance;
}

/*
 * PyObject
 */

/*
OBJ_TUPLE = 0
OBJ_LIST = 1
OBJ_FUNC = 2
OBJ_MODULE = 3
...
*/

function PyObject(value) {
    this.value = value || null;
}

PyObject.prototype.getValue = function() {
    return this.value;
};

PyObject.prototype.lt = function(as) {
    assert(as instanceof PyObject);
    return new PyObjBool(this.getValue() < as.getValue());
};

PyObject.prototype.eq = function(as) {
    assert(as instanceof PyObject);
    return new PyObjBool(this.getValue() == as.getValue());
};

/*
 * PyAutoObject
 */

function PyAutoObject(value) {
    if (value instanceof PyObject || 
        value instanceof CodeObject) return value;
    
    if (parseFloat(value)) {
        return new PyObjNumber(value);
    } else if (value == "True" || value == "False") {
        return new PyObjBool(value == "True");
    } else {
        return new PyObjString(value);
    }
}

/*
 * PyObjNone
 */

function PyObjNone() {
    this.value = null;
}

PyObjNone.prototype = new PyObject();

/*
 * PyObjBool
 */

function PyObjBool(value) {
    assert(value === true || value === false);
    this.value = value;
}

PyObjBool.prototype = new PyObject();

/*
 * PyObjString
 */

function PyObjString(value) {
    this.value = new String(value);
}

PyObjString.prototype = new PyObject();

PyObjString.prototype.getValue = function() {
    return this.value.toString();
};

/*
 * PyObjNumber
 */

function PyObjNumber(value) {
    this.value = parseFloat(value);
}

PyObjNumber.prototype = new PyObject();

PyObjNumber.prototype.multiply = function(by) {
    assert(by instanceof PyObjNumber);
    return new PyObjNumber(this.value * by.value);
};

PyObjNumber.prototype.add = function(by) {
    assert(by instanceof PyObjNumber);
    return new PyObjNumber(this.value + by.value);
};

PyObjNumber.prototype.modulo = function(by) {
    assert(by instanceof PyObjNumber);
    return new PyObjNumber(this.value % by.value);
};

/*
 * PyObjTuple
 */

function PyObjTuple(value) {

    assert(value instanceof Array);
    this.value = value;
}

PyObjTuple.prototype = new PyObject();


/*
 * PyObjList
 */

function PyObjList(value) {
    this.prototype = new PyObjTuple(value);
}

/*
 * JSPython-VM
 */

function JSPython(cfg) {
    _current_jspy = this;
    
    this.version='0.1';
    this.fname = null;
    this.config = cfg;
    this.debug = (cfg.debug == undefined) ? false : cfg.debug;
    
    /* code flow */
    this.entrypoint = null;
    this.running = false;
    this.instructions_per_cycle = 200000;
    this.max_instructions = cfg.max_instructions;
    this.instructions = 0;
    this.starttime = 0;
    this.endtime = 0;
    
    /* vm */
    this.modules = {};
    this.frame = null;

    
    this.console = new Console({canvas: this.config.canvas});
    if(!this.console)
        throw('Could not initialize console.');
    this.console.clear(); // clear console output
    
    this.console.println('JS/Python v' + this.version + ' loaded. :)');
    this.console.line();
}

JSPython.prototype.register_jsmodule = function(name, moduleobj) {
    this.modules[name] = moduleobj;
};

JSPython.prototype.has_module_function = function(module, fname) {
    return this.modules[module] != undefined &&
        this.modules[module].functions[fname] != undefined;
};

JSPython.prototype.get_module_function = function(module, fname) {
    if (this.has_module_function(module, fname)) {
        if (this.debug) 
            console.log("["+module+"."+fname+"] Getting function pointer.");
        return this.modules[module].functions[fname];
    } else {
        console.log(module + ' / ' + fname + ' not found as module/func.');
        console.dir(this.modules);
    }
    return null;
};

JSPython.prototype.load = function(fn) {
    this.fname = fn;
    var xmlHttp, tmpBuffer, magic, timestamp;
    
    xmlHttp = new XMLHttpRequest();
    
    this.console.println('Loading ' + fn + '...');
    
    xmlHttp.open('GET', fn, false);
    xmlHttp.setRequestHeader('Cache-Control', 'no-cache');
    xmlHttp.responseType = 'arraybuffer';
    xmlHttp.mozResponseType = 'arraybuffer';
    xmlHttp.send(null);

    tmpBuffer = new BufferStream(xmlHttp.mozResponseArrayBuffer ?
        xmlHttp.mozResponseArrayBuffer : xmlHttp.response);

    // Do some prechecks (magic, timestamp) & read them
    
    // hard-coded magic
    magic = tmpBuffer.getDWord(0);
    if (magic != 168686339) {
        this.console.println('No valid compiled pythonfile (maybe not a' + 
                             ' Python 2.7.2 file?).');
        return;
    }
    
    // timestamp
    timestamp = tmpBuffer.getDWord(4);
    this.console.println('- File created ' + new Date(timestamp * 1000));
    
    // Go parsing...
    this.console.println('- OK, parsing now. Wish me luck...');
    this.parse(tmpBuffer);
};

JSPython.prototype.parse = function(code) {
    var m;
    
    if (!code)
        throw('No code loaded.');

    // Unmarshal raw code and build entrypoint
    m = new Marshal({buffer: code});
    this.entrypoint = m.parse();

    this.console.println('- Hoooray, parsing done!');
};
    
JSPython.prototype.run = function() {
    // Check for entrypoint
    if (!this.entrypoint) {
        this.console.println('No entrypoint found, can not start.');
        return;
    }
    
    if (this.debug)
        console.dir(this.entrypoint);
   
    // Prepare frame
    this.frame = new PyFrame({
        vm: this,
        code_object: this.entrypoint
    });
    _mainframe = this.frame;
    
    // Load modules
    this.register_jsmodule('__builtins__', new PyModBuiltIns());
    this.register_jsmodule('webstorage', new PyModWebStorage());
    this.register_jsmodule('time', new PyModTime());
    this.register_jsmodule('math', new PyModMath());
    
    //  Go executing
    this.console.println('Executing now...');
    this.console.line();
    
    this.running = true;
    this.starttime = new Date().getTime();
    this.frame.eval({});
};

JSPython.prototype.stop = function() {
    this.running = false;
};
