var protections = (function (exports) {
	'use strict';

	function createCommonjsModule(fn) {
	  var module = { exports: {} };
		return fn(module, module.exports), module.exports;
	}

	/** @fileOverview Javascript cryptography implementation.
	 *
	 * Crush to remove comments, shorten variable names and
	 * generally reduce transmission size.
	 *
	 * @author Emily Stark
	 * @author Mike Hamburg
	 * @author Dan Boneh
	 */

	var sjcl_1 = createCommonjsModule(function (module) {
	/*jslint indent: 2, bitwise: false, nomen: false, plusplus: false, white: false, regexp: false */
	/*global document, window, escape, unescape, module, require, Uint32Array */

	/**
	 * The Stanford Javascript Crypto Library, top-level namespace.
	 * @namespace
	 */
	var sjcl = {
	  /**
	   * Symmetric ciphers.
	   * @namespace
	   */
	  cipher: {},

	  /**
	   * Hash functions.  Right now only SHA256 is implemented.
	   * @namespace
	   */
	  hash: {},

	  /**
	   * Key exchange functions.  Right now only SRP is implemented.
	   * @namespace
	   */
	  keyexchange: {},
	  
	  /**
	   * Cipher modes of operation.
	   * @namespace
	   */
	  mode: {},

	  /**
	   * Miscellaneous.  HMAC and PBKDF2.
	   * @namespace
	   */
	  misc: {},
	  
	  /**
	   * Bit array encoders and decoders.
	   * @namespace
	   *
	   * @description
	   * The members of this namespace are functions which translate between
	   * SJCL's bitArrays and other objects (usually strings).  Because it
	   * isn't always clear which direction is encoding and which is decoding,
	   * the method names are "fromBits" and "toBits".
	   */
	  codec: {},
	  
	  /**
	   * Exceptions.
	   * @namespace
	   */
	  exception: {
	    /**
	     * Ciphertext is corrupt.
	     * @constructor
	     */
	    corrupt: function(message) {
	      this.toString = function() { return "CORRUPT: "+this.message; };
	      this.message = message;
	    },
	    
	    /**
	     * Invalid parameter.
	     * @constructor
	     */
	    invalid: function(message) {
	      this.toString = function() { return "INVALID: "+this.message; };
	      this.message = message;
	    },
	    
	    /**
	     * Bug or missing feature in SJCL.
	     * @constructor
	     */
	    bug: function(message) {
	      this.toString = function() { return "BUG: "+this.message; };
	      this.message = message;
	    },

	    /**
	     * Something isn't ready.
	     * @constructor
	     */
	    notReady: function(message) {
	      this.toString = function() { return "NOT READY: "+this.message; };
	      this.message = message;
	    }
	  }
	};
	/** @fileOverview Arrays of bits, encoded as arrays of Numbers.
	 *
	 * @author Emily Stark
	 * @author Mike Hamburg
	 * @author Dan Boneh
	 */

	/**
	 * Arrays of bits, encoded as arrays of Numbers.
	 * @namespace
	 * @description
	 * <p>
	 * These objects are the currency accepted by SJCL's crypto functions.
	 * </p>
	 *
	 * <p>
	 * Most of our crypto primitives operate on arrays of 4-byte words internally,
	 * but many of them can take arguments that are not a multiple of 4 bytes.
	 * This library encodes arrays of bits (whose size need not be a multiple of 8
	 * bits) as arrays of 32-bit words.  The bits are packed, big-endian, into an
	 * array of words, 32 bits at a time.  Since the words are double-precision
	 * floating point numbers, they fit some extra data.  We use this (in a private,
	 * possibly-changing manner) to encode the number of bits actually  present
	 * in the last word of the array.
	 * </p>
	 *
	 * <p>
	 * Because bitwise ops clear this out-of-band data, these arrays can be passed
	 * to ciphers like AES which want arrays of words.
	 * </p>
	 */
	sjcl.bitArray = {
	  /**
	   * Array slices in units of bits.
	   * @param {bitArray} a The array to slice.
	   * @param {Number} bstart The offset to the start of the slice, in bits.
	   * @param {Number} bend The offset to the end of the slice, in bits.  If this is undefined,
	   * slice until the end of the array.
	   * @return {bitArray} The requested slice.
	   */
	  bitSlice: function (a, bstart, bend) {
	    a = sjcl.bitArray._shiftRight(a.slice(bstart/32), 32 - (bstart & 31)).slice(1);
	    return (bend === undefined) ? a : sjcl.bitArray.clamp(a, bend-bstart);
	  },

	  /**
	   * Extract a number packed into a bit array.
	   * @param {bitArray} a The array to slice.
	   * @param {Number} bstart The offset to the start of the slice, in bits.
	   * @param {Number} blength The length of the number to extract.
	   * @return {Number} The requested slice.
	   */
	  extract: function(a, bstart, blength) {
	    // FIXME: this Math.floor is not necessary at all, but for some reason
	    // seems to suppress a bug in the Chromium JIT.
	    var x, sh = Math.floor((-bstart-blength) & 31);
	    if ((bstart + blength - 1 ^ bstart) & -32) {
	      // it crosses a boundary
	      x = (a[bstart/32|0] << (32 - sh)) ^ (a[bstart/32+1|0] >>> sh);
	    } else {
	      // within a single word
	      x = a[bstart/32|0] >>> sh;
	    }
	    return x & ((1<<blength) - 1);
	  },

	  /**
	   * Concatenate two bit arrays.
	   * @param {bitArray} a1 The first array.
	   * @param {bitArray} a2 The second array.
	   * @return {bitArray} The concatenation of a1 and a2.
	   */
	  concat: function (a1, a2) {
	    if (a1.length === 0 || a2.length === 0) {
	      return a1.concat(a2);
	    }
	    
	    var last = a1[a1.length-1], shift = sjcl.bitArray.getPartial(last);
	    if (shift === 32) {
	      return a1.concat(a2);
	    } else {
	      return sjcl.bitArray._shiftRight(a2, shift, last|0, a1.slice(0,a1.length-1));
	    }
	  },

	  /**
	   * Find the length of an array of bits.
	   * @param {bitArray} a The array.
	   * @return {Number} The length of a, in bits.
	   */
	  bitLength: function (a) {
	    var l = a.length, x;
	    if (l === 0) { return 0; }
	    x = a[l - 1];
	    return (l-1) * 32 + sjcl.bitArray.getPartial(x);
	  },

	  /**
	   * Truncate an array.
	   * @param {bitArray} a The array.
	   * @param {Number} len The length to truncate to, in bits.
	   * @return {bitArray} A new array, truncated to len bits.
	   */
	  clamp: function (a, len) {
	    if (a.length * 32 < len) { return a; }
	    a = a.slice(0, Math.ceil(len / 32));
	    var l = a.length;
	    len = len & 31;
	    if (l > 0 && len) {
	      a[l-1] = sjcl.bitArray.partial(len, a[l-1] & 0x80000000 >> (len-1), 1);
	    }
	    return a;
	  },

	  /**
	   * Make a partial word for a bit array.
	   * @param {Number} len The number of bits in the word.
	   * @param {Number} x The bits.
	   * @param {Number} [_end=0] Pass 1 if x has already been shifted to the high side.
	   * @return {Number} The partial word.
	   */
	  partial: function (len, x, _end) {
	    if (len === 32) { return x; }
	    return (_end ? x|0 : x << (32-len)) + len * 0x10000000000;
	  },

	  /**
	   * Get the number of bits used by a partial word.
	   * @param {Number} x The partial word.
	   * @return {Number} The number of bits used by the partial word.
	   */
	  getPartial: function (x) {
	    return Math.round(x/0x10000000000) || 32;
	  },

	  /**
	   * Compare two arrays for equality in a predictable amount of time.
	   * @param {bitArray} a The first array.
	   * @param {bitArray} b The second array.
	   * @return {boolean} true if a == b; false otherwise.
	   */
	  equal: function (a, b) {
	    if (sjcl.bitArray.bitLength(a) !== sjcl.bitArray.bitLength(b)) {
	      return false;
	    }
	    var x = 0, i;
	    for (i=0; i<a.length; i++) {
	      x |= a[i]^b[i];
	    }
	    return (x === 0);
	  },

	  /** Shift an array right.
	   * @param {bitArray} a The array to shift.
	   * @param {Number} shift The number of bits to shift.
	   * @param {Number} [carry=0] A byte to carry in
	   * @param {bitArray} [out=[]] An array to prepend to the output.
	   * @private
	   */
	  _shiftRight: function (a, shift, carry, out) {
	    var i, last2=0, shift2;
	    if (out === undefined) { out = []; }
	    
	    for (; shift >= 32; shift -= 32) {
	      out.push(carry);
	      carry = 0;
	    }
	    if (shift === 0) {
	      return out.concat(a);
	    }
	    
	    for (i=0; i<a.length; i++) {
	      out.push(carry | a[i]>>>shift);
	      carry = a[i] << (32-shift);
	    }
	    last2 = a.length ? a[a.length-1] : 0;
	    shift2 = sjcl.bitArray.getPartial(last2);
	    out.push(sjcl.bitArray.partial(shift+shift2 & 31, (shift + shift2 > 32) ? carry : out.pop(),1));
	    return out;
	  },
	  
	  /** xor a block of 4 words together.
	   * @private
	   */
	  _xor4: function(x,y) {
	    return [x[0]^y[0],x[1]^y[1],x[2]^y[2],x[3]^y[3]];
	  },

	  /** byteswap a word array inplace.
	   * (does not handle partial words)
	   * @param {sjcl.bitArray} a word array
	   * @return {sjcl.bitArray} byteswapped array
	   */
	  byteswapM: function(a) {
	    var i, v, m = 0xff00;
	    for (i = 0; i < a.length; ++i) {
	      v = a[i];
	      a[i] = (v >>> 24) | ((v >>> 8) & m) | ((v & m) << 8) | (v << 24);
	    }
	    return a;
	  }
	};
	/** @fileOverview Bit array codec implementations.
	 *
	 * @author Emily Stark
	 * @author Mike Hamburg
	 * @author Dan Boneh
	 */

	/**
	 * UTF-8 strings
	 * @namespace
	 */
	sjcl.codec.utf8String = {
	  /** Convert from a bitArray to a UTF-8 string. */
	  fromBits: function (arr) {
	    var out = "", bl = sjcl.bitArray.bitLength(arr), i, tmp;
	    for (i=0; i<bl/8; i++) {
	      if ((i&3) === 0) {
	        tmp = arr[i/4];
	      }
	      out += String.fromCharCode(tmp >>> 8 >>> 8 >>> 8);
	      tmp <<= 8;
	    }
	    return decodeURIComponent(escape(out));
	  },

	  /** Convert from a UTF-8 string to a bitArray. */
	  toBits: function (str) {
	    str = unescape(encodeURIComponent(str));
	    var out = [], i, tmp=0;
	    for (i=0; i<str.length; i++) {
	      tmp = tmp << 8 | str.charCodeAt(i);
	      if ((i&3) === 3) {
	        out.push(tmp);
	        tmp = 0;
	      }
	    }
	    if (i&3) {
	      out.push(sjcl.bitArray.partial(8*(i&3), tmp));
	    }
	    return out;
	  }
	};
	/** @fileOverview Javascript SHA-256 implementation.
	 *
	 * An older version of this implementation is available in the public
	 * domain, but this one is (c) Emily Stark, Mike Hamburg, Dan Boneh,
	 * Stanford University 2008-2010 and BSD-licensed for liability
	 * reasons.
	 *
	 * Special thanks to Aldo Cortesi for pointing out several bugs in
	 * this code.
	 *
	 * @author Emily Stark
	 * @author Mike Hamburg
	 * @author Dan Boneh
	 */

	/**
	 * Context for a SHA-256 operation in progress.
	 * @constructor
	 */
	sjcl.hash.sha256 = function (hash) {
	  if (!this._key[0]) { this._precompute(); }
	  if (hash) {
	    this._h = hash._h.slice(0);
	    this._buffer = hash._buffer.slice(0);
	    this._length = hash._length;
	  } else {
	    this.reset();
	  }
	};

	/**
	 * Hash a string or an array of words.
	 * @static
	 * @param {bitArray|String} data the data to hash.
	 * @return {bitArray} The hash value, an array of 16 big-endian words.
	 */
	sjcl.hash.sha256.hash = function (data) {
	  return (new sjcl.hash.sha256()).update(data).finalize();
	};

	sjcl.hash.sha256.prototype = {
	  /**
	   * The hash's block size, in bits.
	   * @constant
	   */
	  blockSize: 512,
	   
	  /**
	   * Reset the hash state.
	   * @return this
	   */
	  reset:function () {
	    this._h = this._init.slice(0);
	    this._buffer = [];
	    this._length = 0;
	    return this;
	  },
	  
	  /**
	   * Input several words to the hash.
	   * @param {bitArray|String} data the data to hash.
	   * @return this
	   */
	  update: function (data) {
	    if (typeof data === "string") {
	      data = sjcl.codec.utf8String.toBits(data);
	    }
	    var i, b = this._buffer = sjcl.bitArray.concat(this._buffer, data),
	        ol = this._length,
	        nl = this._length = ol + sjcl.bitArray.bitLength(data);
	    if (nl > 9007199254740991){
	      throw new sjcl.exception.invalid("Cannot hash more than 2^53 - 1 bits");
	    }

	    if (typeof Uint32Array !== 'undefined') {
		var c = new Uint32Array(b);
	    	var j = 0;
	    	for (i = 512+ol - ((512+ol) & 511); i <= nl; i+= 512) {
	      	    this._block(c.subarray(16 * j, 16 * (j+1)));
	      	    j += 1;
	    	}
	    	b.splice(0, 16 * j);
	    } else {
		for (i = 512+ol - ((512+ol) & 511); i <= nl; i+= 512) {
	      	    this._block(b.splice(0,16));
	      	}
	    }
	    return this;
	  },
	  
	  /**
	   * Complete hashing and output the hash value.
	   * @return {bitArray} The hash value, an array of 8 big-endian words.
	   */
	  finalize:function () {
	    var i, b = this._buffer, h = this._h;

	    // Round out and push the buffer
	    b = sjcl.bitArray.concat(b, [sjcl.bitArray.partial(1,1)]);
	    
	    // Round out the buffer to a multiple of 16 words, less the 2 length words.
	    for (i = b.length + 2; i & 15; i++) {
	      b.push(0);
	    }
	    
	    // append the length
	    b.push(Math.floor(this._length / 0x100000000));
	    b.push(this._length | 0);

	    while (b.length) {
	      this._block(b.splice(0,16));
	    }

	    this.reset();
	    return h;
	  },

	  /**
	   * The SHA-256 initialization vector, to be precomputed.
	   * @private
	   */
	  _init:[],
	  /*
	  _init:[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],
	  */
	  
	  /**
	   * The SHA-256 hash key, to be precomputed.
	   * @private
	   */
	  _key:[],
	  /*
	  _key:
	    [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	     0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	     0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	     0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	     0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	     0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	     0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	     0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2],
	  */


	  /**
	   * Function to precompute _init and _key.
	   * @private
	   */
	  _precompute: function () {
	    var i = 0, prime = 2, factor, isPrime;

	    function frac(x) { return (x-Math.floor(x)) * 0x100000000 | 0; }

	    for (; i<64; prime++) {
	      isPrime = true;
	      for (factor=2; factor*factor <= prime; factor++) {
	        if (prime % factor === 0) {
	          isPrime = false;
	          break;
	        }
	      }
	      if (isPrime) {
	        if (i<8) {
	          this._init[i] = frac(Math.pow(prime, 1/2));
	        }
	        this._key[i] = frac(Math.pow(prime, 1/3));
	        i++;
	      }
	    }
	  },
	  
	  /**
	   * Perform one cycle of SHA-256.
	   * @param {Uint32Array|bitArray} w one block of words.
	   * @private
	   */
	  _block:function (w) {  
	    var i, tmp, a, b,
	      h = this._h,
	      k = this._key,
	      h0 = h[0], h1 = h[1], h2 = h[2], h3 = h[3],
	      h4 = h[4], h5 = h[5], h6 = h[6], h7 = h[7];

	    /* Rationale for placement of |0 :
	     * If a value can overflow is original 32 bits by a factor of more than a few
	     * million (2^23 ish), there is a possibility that it might overflow the
	     * 53-bit mantissa and lose precision.
	     *
	     * To avoid this, we clamp back to 32 bits by |'ing with 0 on any value that
	     * propagates around the loop, and on the hash state h[].  I don't believe
	     * that the clamps on h4 and on h0 are strictly necessary, but it's close
	     * (for h4 anyway), and better safe than sorry.
	     *
	     * The clamps on h[] are necessary for the output to be correct even in the
	     * common case and for short inputs.
	     */
	    for (i=0; i<64; i++) {
	      // load up the input word for this round
	      if (i<16) {
	        tmp = w[i];
	      } else {
	        a   = w[(i+1 ) & 15];
	        b   = w[(i+14) & 15];
	        tmp = w[i&15] = ((a>>>7  ^ a>>>18 ^ a>>>3  ^ a<<25 ^ a<<14) + 
	                         (b>>>17 ^ b>>>19 ^ b>>>10 ^ b<<15 ^ b<<13) +
	                         w[i&15] + w[(i+9) & 15]) | 0;
	      }
	      
	      tmp = (tmp + h7 + (h4>>>6 ^ h4>>>11 ^ h4>>>25 ^ h4<<26 ^ h4<<21 ^ h4<<7) +  (h6 ^ h4&(h5^h6)) + k[i]); // | 0;
	      
	      // shift register
	      h7 = h6; h6 = h5; h5 = h4;
	      h4 = h3 + tmp | 0;
	      h3 = h2; h2 = h1; h1 = h0;

	      h0 = (tmp +  ((h1&h2) ^ (h3&(h1^h2))) + (h1>>>2 ^ h1>>>13 ^ h1>>>22 ^ h1<<30 ^ h1<<19 ^ h1<<10)) | 0;
	    }

	    h[0] = h[0]+h0 | 0;
	    h[1] = h[1]+h1 | 0;
	    h[2] = h[2]+h2 | 0;
	    h[3] = h[3]+h3 | 0;
	    h[4] = h[4]+h4 | 0;
	    h[5] = h[5]+h5 | 0;
	    h[6] = h[6]+h6 | 0;
	    h[7] = h[7]+h7 | 0;
	  }
	};


	/** @fileOverview HMAC implementation.
	 *
	 * @author Emily Stark
	 * @author Mike Hamburg
	 * @author Dan Boneh
	 */

	/** HMAC with the specified hash function.
	 * @constructor
	 * @param {bitArray} key the key for HMAC.
	 * @param {Object} [Hash=sjcl.hash.sha256] The hash function to use.
	 */
	sjcl.misc.hmac = function (key, Hash) {
	  this._hash = Hash = Hash || sjcl.hash.sha256;
	  var exKey = [[],[]], i,
	      bs = Hash.prototype.blockSize / 32;
	  this._baseHash = [new Hash(), new Hash()];

	  if (key.length > bs) {
	    key = Hash.hash(key);
	  }
	  
	  for (i=0; i<bs; i++) {
	    exKey[0][i] = key[i]^0x36363636;
	    exKey[1][i] = key[i]^0x5C5C5C5C;
	  }
	  
	  this._baseHash[0].update(exKey[0]);
	  this._baseHash[1].update(exKey[1]);
	  this._resultHash = new Hash(this._baseHash[0]);
	};

	/** HMAC with the specified hash function.  Also called encrypt since it's a prf.
	 * @param {bitArray|String} data The data to mac.
	 */
	sjcl.misc.hmac.prototype.encrypt = sjcl.misc.hmac.prototype.mac = function (data) {
	  if (!this._updated) {
	    this.update(data);
	    return this.digest(data);
	  } else {
	    throw new sjcl.exception.invalid("encrypt on already updated hmac called!");
	  }
	};

	sjcl.misc.hmac.prototype.reset = function () {
	  this._resultHash = new this._hash(this._baseHash[0]);
	  this._updated = false;
	};

	sjcl.misc.hmac.prototype.update = function (data) {
	  this._updated = true;
	  this._resultHash.update(data);
	};

	sjcl.misc.hmac.prototype.digest = function () {
	  var w = this._resultHash.finalize(), result = new (this._hash)(this._baseHash[1]).update(w).finalize();

	  this.reset();

	  return result;
	};
	if(module.exports){
	  module.exports = sjcl;
	}
	});

	function getDataKeySync (sessionKey, domainKey, inputData) {
	    // eslint-disable-next-line new-cap
	    const hmac = new sjcl_1.misc.hmac(sjcl_1.codec.utf8String.toBits(sessionKey + domainKey), sjcl_1.hash.sha256);
	    return sjcl_1.codec.hex.fromBits(hmac.encrypt(inputData))
	}

	// linear feedback shift register to find a random approximation
	function nextRandom (v) {
	    return Math.abs((v >> 1) | (((v << 62) ^ (v << 61)) & (~(~0 << 63) << 62)))
	}

	const exemptionLists = {};

	function shouldExemptUrl (type, url) {
	    for (const regex of exemptionLists[type]) {
	        if (regex.test(url)) {
	            return true
	        }
	    }
	    return false
	}

	function initStringExemptionLists (args) {
	    const { stringExemptionLists } = args;
	    for (const type in stringExemptionLists) {
	        exemptionLists[type] = [];
	        for (const stringExemption of stringExemptionLists[type]) {
	            exemptionLists[type].push(new RegExp(stringExemption));
	        }
	    }
	}

	// Checks the stack trace if there are known libraries that are broken.
	function shouldExemptMethod (type) {
	    try {
	        const errorLines = new Error().stack.split('\n');
	        const errorFiles = new Set();
	        // Should cater for Chrome and Firefox stacks, we only care about https? resources.
	        const lineTest = /(\()?(http[^)]+):[0-9]+:[0-9]+(\))?/;
	        for (const line of errorLines) {
	            const res = line.match(lineTest);
	            if (res) {
	                const path = res[2];
	                // checked already
	                if (errorFiles.has(path)) {
	                    continue
	                }
	                if (shouldExemptUrl(type, path)) {
	                    return true
	                }
	                errorFiles.add(res[2]);
	            }
	        }
	    } catch (e) {
	        // Fall through
	    }
	    return false
	}

	// Iterate through the key, passing an item index and a byte to be modified
	function iterateDataKey (key, callback) {
	    let item = key.charCodeAt(0);
	    for (const i in key) {
	        let byte = key.charCodeAt(i);
	        for (let j = 8; j >= 0; j--) {
	            callback(item, byte);

	            // find next item to perturb
	            item = nextRandom(item);

	            // Right shift as we use the least significant bit of it
	            byte = byte >> 1;
	        }
	    }
	}

	function isFeatureBroken (args, feature) {
	    return args.site.brokenFeatures.includes(feature)
	}

	function initProtection (args) {
	    initStringExemptionLists(args);
	    // JKTODO remove
	    {
	        initCanvasProtection(args);
	    }
	    if (!isFeatureBroken(args, 'audio')) {
	        initAudioProtection(args);
	    }
	}

	function initCanvasProtection (args) {
	    const { sessionKey, site } = args;
	    const domainKey = site.domain;

	    // Using proxies here to swallow calls to toString etc
	    const getImageDataProxy = new DDGProxy(CanvasRenderingContext2D.prototype, 'getImageData', {
	        apply (target, thisArg, args) {
	            // The normal return value
	            if (shouldExemptMethod('canvas')) {
	                return DDGReflect.apply(target, thisArg, args)
	            }
	            // Anything we do here should be caught and ignored silently
	            try {
	                const { offScreenCtx } = computeOffScreenCanvas(thisArg.canvas);
	                // Call the original method on the modified off-screen canvas
	                return DDGReflect.apply(target, offScreenCtx, args)
	            } catch (e) {
	            }

	            return DDGReflect.apply(target, thisArg, args)
	        }
	    });

	    function computeOffScreenCanvas (canvas) {
	        const ctx = canvas.getContext('2d');
	        // We *always* compute the random pixels on the complete pixel set, then pass back the subset later
	        let imageData = getImageDataProxy._native2.apply(ctx, [0, 0, canvas.width, canvas.height]);
	        imageData = modifyPixelData(imageData, sessionKey, domainKey);

	        // Make a off-screen canvas and put the data there
	        const offScreenCanvas = document.createElement('canvas');
	        offScreenCanvas.width = canvas.width;
	        offScreenCanvas.height = canvas.height;
	        const offScreenCtx = offScreenCanvas.getContext('2d');
	        offScreenCtx.putImageData(imageData, 0, 0);

	        return { offScreenCanvas, offScreenCtx }
	    }

	    function modifyPixelData (imageData, domainKey, sessionKey) {
	        const arr = [];
	        // We calculate a checksum as passing imageData as a key is too slow.
	        // We might want to do something more pseudo random that is less observable through timing attacks and collisions (but this will come at a performance cost)
	        let checkSum = 0;
	        // Create an array of only pixels that have data in them
	        const d = imageData.data;
	        for (let i = 0; i < d.length; i += 4) {
	            // Ignore non blank pixels there is high chance compression ignores them
	            const sum = d[i] + d[i + 1] + d[i + 2] + d[i + 3];
	            if (sum !== 0) {
	                checkSum += sum;
	                arr.push(i);
	            }
	        }

	        const canvasKey = getDataKeySync(sessionKey, domainKey, checkSum);
	        const length = arr.length;
	        iterateDataKey(canvasKey, (item, byte) => {
	            const channel = byte % 3;
	            const lookupId = item % length;
	            const pixelCanvasIndex = arr[lookupId] + channel;

	            imageData.data[pixelCanvasIndex] = imageData.data[pixelCanvasIndex] ^ (byte & 0x1);
	        });

	        return imageData
	    }

	    const canvasMethods = ['toDataURL', 'toBlob'];
	    for (const methodName of canvasMethods) {
	        new DDGProxy(HTMLCanvasElement.prototype, methodName, {
	            apply (target, thisArg, args) {
	                if (shouldExemptMethod('canvas')) {
	                    return DDGReflect.apply(target, thisArg, args)
	                }
	                try {
	                    const { offScreenCanvas } = computeOffScreenCanvas(thisArg);
	                    // Call the original method on the modified off-screen canvas
	                    return DDGReflect.apply(target, offScreenCanvas, args)
	                } catch (e) {
	                    // Something we did caused an exception, fall back to the native
	                    return DDGReflect.apply(target, thisArg, args)
	                }
	            }
	        });
	    }
	}

	function initAudioProtection (args) {
	    const { sessionKey, site } = args;
	    const domainKey = site.domain;

	    // In place modify array data to remove fingerprinting
	    function transformArrayData (channelData, domainKey, sessionKey, thisArg) {
	        let { audioKey } = getCachedResponse(thisArg, args);
	        if (!audioKey) {
	            const cdSum = channelData.reduce((sum, v) => {
	                return sum + v
	            }, 0);
	            audioKey = getDataKeySync(sessionKey, domainKey, cdSum);
	            setCache(thisArg, args, audioKey);
	        }
	        iterateDataKey(audioKey, (item, byte) => {
	            const itemAudioIndex = item % channelData.length;

	            let factor = byte * 0.0000001;
	            if (byte ^ 0x1) {
	                factor = 0 - factor;
	            }
	            channelData[itemAudioIndex] = channelData[itemAudioIndex] + factor;
	        });
	    }

	    AudioBuffer.prototype.copyFromChannel = new Proxy(AudioBuffer.prototype.copyFromChannel, {
	        apply (target, thisArg, args) {
	            const [source, channelNumber, startInChannel] = args;
	            // This is implemented in a different way to canvas purely because calling the function copied the original value, which is not ideal
	            if (shouldExemptMethod('audio') ||
	                // If channelNumber is longer than arrayBuffer number of channels then call the default method to throw
	                channelNumber > thisArg.numberOfChannels ||
	                // If startInChannel is longer than the arrayBuffer length then call the default method to throw
	                startInChannel > thisArg.length) {
	                // The normal return value
	                return target.apply(thisArg, args)
	            }
	            try {
	                // Call the protected getChannelData we implement, slice from the startInChannel value and assign to the source array
	                thisArg.getChannelData(channelNumber).slice(startInChannel).forEach((val, index) => {
	                    source[index] = val;
	                });
	            } catch {
	                return target.apply(thisArg, args)
	            }
	        }
	    });

	    const cacheExpiry = 60;
	    const cacheData = new WeakMap();
	    function getCachedResponse (thisArg, args) {
	        const data = cacheData.get(thisArg);
	        const timeNow = Date.now();
	        if (data &&
	            data.args === JSON.stringify(args) &&
	            data.expires > timeNow) {
	            data.expires = timeNow + cacheExpiry;
	            cacheData.set(thisArg, data);
	            return data
	        }
	        return { audioKey: null }
	    }

	    function setCache (thisArg, args, audioKey) {
	        cacheData.set(thisArg, { args: JSON.stringify(args), expires: Date.now() + cacheExpiry, audioKey });
	    }

	    AudioBuffer.prototype.getChannelData = new Proxy(AudioBuffer.prototype.getChannelData, {
	        apply (target, thisArg, args) {
	            // The normal return value
	            const channelData = target.apply(thisArg, args);
	            if (shouldExemptMethod('audio')) {
	                return channelData
	            }
	            // Anything we do here should be caught and ignored silently
	            try {
	                transformArrayData(channelData, domainKey, sessionKey, thisArg, args);
	            } catch {
	            }
	            return channelData
	        }
	    });

	    const audioMethods = ['getByteTimeDomainData', 'getFloatTimeDomainData', 'getByteFrequencyData', 'getFloatFrequencyData'];
	    for (const methodName of audioMethods) {
	        AnalyserNode.prototype[methodName] = new Proxy(AnalyserNode.prototype[methodName], {
	            apply (target, thisArg, args) {
	                target.apply(thisArg, args);
	                if (shouldExemptMethod('audio')) {
	                    return
	                }
	                // Anything we do here should be caught and ignored silently
	                try {
	                    transformArrayData(args[0], domainKey, sessionKey, thisArg, args);
	                } catch {
	                }
	            }
	        });
	    }
	}

	exports.initProtection = initProtection;

	Object.defineProperty(exports, '__esModule', { value: true });

	return exports;

}({}));
