module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1665830430734, function(require, module, exports) {


module.exports = function decodeURIComponent(string) {
  var k = string.indexOf('%');
  if (k === -1) return string;

  var length = string.length;
  var decoded = '';
  var last = 0;
  var codepoint = 0;
  var startOfOctets = k;
  state = UTF8_ACCEPT;

  while (k > -1 && k < length - 2) {
    var high = hexCodeToInt(string[k + 1], 4);
    var low = hexCodeToInt(string[k + 2], 0);
    codepoint = decode(codepoint, high | low);

    switch (state) {
      case UTF8_ACCEPT:
        decoded += string.substring(last, startOfOctets);

        decoded += (codepoint <= 0xFFFF) ?
          String.fromCharCode(codepoint) :
          String.fromCharCode(
            (0xD7C0 + (codepoint >> 10)),
            (0xDC00 + (codepoint & 0x3FF))
          );

        codepoint = 0;
        last = k + 3;
        k = startOfOctets = string.indexOf('%', last);
        break;
      default:
        k += 3;
        if (k < length && string[k] === '%') break;

        // Intentional fall-through
      case UTF8_REJECT:
        state = UTF8_ACCEPT;
        codepoint = 0;
        k = startOfOctets = string.indexOf('%', startOfOctets + 1);
        break;
    }
  }

  return decoded + string.substring(last);
};

var HEX = Object.assign(Object.create(null), {
  '0':  0, '1':  1,
  '2':  2, '3':  3,
  '4':  4, '5':  5,
  '6':  6, '7':  7,
  '8':  8, '9':  9,
  'a': 10, 'A': 10,
  'b': 11, 'B': 11,
  'c': 12, 'C': 12,
  'd': 13, 'D': 13,
  'e': 14, 'E': 14,
  'f': 15, 'F': 15,
});
function hexCodeToInt(c, shift) {
  var i = HEX[c];
  return i === undefined ? 255 : i << shift;
}


/**
 * The below algorithm is based on Bjoern Hoehrmann's DFA Unicode Decoder.
 * Copyright (c) 2008-2009 Bjoern Hoehrmann <bjoern@hoehrmann.de>
 * See http://bjoern.hoehrmann.de/utf-8/decoder/dfa/ for details.
 */
var UTF8_ACCEPT = 12;
var UTF8_REJECT = 0;
var UTF8_DATA = [
  // The first part of the table maps bytes to character to a transition.
   0, 0, 0, 0,  0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0,  0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0,  0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0,  0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0,  0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0,  0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0,  0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0,  0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,
   1, 1, 1, 1,  1, 1, 1, 1,   1, 1, 1, 1, 1, 1, 1, 1,
   2, 2, 2, 2,  2, 2, 2, 2,   2, 2, 2, 2, 2, 2, 2, 2,
   3, 3, 3, 3,  3, 3, 3, 3,   3, 3, 3, 3, 3, 3, 3, 3,
   3, 3, 3, 3,  3, 3, 3, 3,   3, 3, 3, 3, 3, 3, 3, 3,
   4, 4, 5, 5,  5, 5, 5, 5,   5, 5, 5, 5, 5, 5, 5, 5,
   5, 5, 5, 5,  5, 5, 5, 5,   5, 5, 5, 5, 5, 5, 5, 5,
   6, 7, 7, 7,  7, 7, 7, 7,   7, 7, 7, 7, 7, 8, 7, 7,
  10, 9, 9, 9, 11, 4, 4, 4,   4, 4, 4, 4, 4, 4, 4, 4,

  // The second part of the table maps a state to a new state when adding a
  // transition.
   0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  12,  0,  0,  0,  0, 24, 36, 48, 60, 72, 84, 96,
   0, 12, 12, 12,  0,  0,  0,  0,  0,  0,  0,  0,
   0,  0,  0, 24,  0,  0,  0,  0,  0,  0,  0,  0,
   0, 24, 24, 24,  0,  0,  0,  0,  0,  0,  0,  0,
   0, 24, 24,  0,  0,  0,  0,  0,  0,  0,  0,  0,
   0, 48, 48, 48,  0,  0,  0,  0,  0,  0,  0,  0,
   0,  0, 48, 48,  0,  0,  0,  0,  0,  0,  0,  0,
   0, 48,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,

  // The third part maps the current transition to a mask that needs to apply
  // to the byte.
  0x7F, 0x3F, 0x3F, 0x3F, 0x00, 0x1F, 0x0F, 0x0F, 0x0F, 0x07, 0x07, 0x07,
];

var state = UTF8_ACCEPT;
function decode(codepoint, byte) {
  var type = UTF8_DATA[byte];
  state = UTF8_DATA[256 + state + type];
  return (codepoint << 6) | (byte & UTF8_DATA[364 + type]);
}

}, function(modId) {var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1665830430734);
})()
//miniprogram-npm-outsideDeps=[]
//# sourceMappingURL=index.js.map