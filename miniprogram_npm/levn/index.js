module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1665830430465, function(require, module, exports) {
// Generated by LiveScript 1.4.0
(function(){
  var parseString, cast, parseType, VERSION, parsedTypeParse, parse;
  parseString = require('./parse-string');
  cast = require('./cast');
  parseType = require('type-check').parseType;
  VERSION = '0.3.0';
  parsedTypeParse = function(parsedType, string, options){
    options == null && (options = {});
    options.explicit == null && (options.explicit = false);
    options.customTypes == null && (options.customTypes = {});
    return cast(parseString(parsedType, string, options), parsedType, options);
  };
  parse = function(type, string, options){
    return parsedTypeParse(parseType(type), string, options);
  };
  module.exports = {
    VERSION: VERSION,
    parse: parse,
    parsedTypeParse: parsedTypeParse
  };
}).call(this);

}, function(modId) {var map = {"./parse-string":1665830430466,"./cast":1665830430467}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430466, function(require, module, exports) {
// Generated by LiveScript 1.4.0
(function(){
  var reject, special, tokenRegex;
  reject = require('prelude-ls').reject;
  function consumeOp(tokens, op){
    if (tokens[0] === op) {
      return tokens.shift();
    } else {
      throw new Error("Expected '" + op + "', but got '" + tokens[0] + "' instead in " + JSON.stringify(tokens) + ".");
    }
  }
  function maybeConsumeOp(tokens, op){
    if (tokens[0] === op) {
      return tokens.shift();
    }
  }
  function consumeList(tokens, arg$, hasDelimiters){
    var open, close, result, untilTest;
    open = arg$[0], close = arg$[1];
    if (hasDelimiters) {
      consumeOp(tokens, open);
    }
    result = [];
    untilTest = "," + (hasDelimiters ? close : '');
    while (tokens.length && (hasDelimiters && tokens[0] !== close)) {
      result.push(consumeElement(tokens, untilTest));
      maybeConsumeOp(tokens, ',');
    }
    if (hasDelimiters) {
      consumeOp(tokens, close);
    }
    return result;
  }
  function consumeArray(tokens, hasDelimiters){
    return consumeList(tokens, ['[', ']'], hasDelimiters);
  }
  function consumeTuple(tokens, hasDelimiters){
    return consumeList(tokens, ['(', ')'], hasDelimiters);
  }
  function consumeFields(tokens, hasDelimiters){
    var result, untilTest, key;
    if (hasDelimiters) {
      consumeOp(tokens, '{');
    }
    result = {};
    untilTest = "," + (hasDelimiters ? '}' : '');
    while (tokens.length && (!hasDelimiters || tokens[0] !== '}')) {
      key = consumeValue(tokens, ':');
      consumeOp(tokens, ':');
      result[key] = consumeElement(tokens, untilTest);
      maybeConsumeOp(tokens, ',');
    }
    if (hasDelimiters) {
      consumeOp(tokens, '}');
    }
    return result;
  }
  function consumeValue(tokens, untilTest){
    var out;
    untilTest == null && (untilTest = '');
    out = '';
    while (tokens.length && -1 === untilTest.indexOf(tokens[0])) {
      out += tokens.shift();
    }
    return out;
  }
  function consumeElement(tokens, untilTest){
    switch (tokens[0]) {
    case '[':
      return consumeArray(tokens, true);
    case '(':
      return consumeTuple(tokens, true);
    case '{':
      return consumeFields(tokens, true);
    default:
      return consumeValue(tokens, untilTest);
    }
  }
  function consumeTopLevel(tokens, types, options){
    var ref$, type, structure, origTokens, result, finalResult, x$, y$;
    ref$ = types[0], type = ref$.type, structure = ref$.structure;
    origTokens = tokens.concat();
    if (!options.explicit && types.length === 1 && ((!type && structure) || (type === 'Array' || type === 'Object'))) {
      result = structure === 'array' || type === 'Array'
        ? consumeArray(tokens, tokens[0] === '[')
        : structure === 'tuple'
          ? consumeTuple(tokens, tokens[0] === '(')
          : consumeFields(tokens, tokens[0] === '{');
      finalResult = tokens.length ? consumeElement(structure === 'array' || type === 'Array'
        ? (x$ = origTokens, x$.unshift('['), x$.push(']'), x$)
        : (y$ = origTokens, y$.unshift('('), y$.push(')'), y$)) : result;
    } else {
      finalResult = consumeElement(tokens);
    }
    return finalResult;
  }
  special = /\[\]\(\)}{:,/.source;
  tokenRegex = RegExp('("(?:\\\\"|[^"])*")|(\'(?:\\\\\'|[^\'])*\')|(/(?:\\\\/|[^/])*/[a-zA-Z]*)|(#.*#)|([' + special + '])|([^\\s' + special + '](?:\\s*[^\\s' + special + ']+)*)|\\s*');
  module.exports = function(types, string, options){
    var tokens, node;
    options == null && (options = {});
    if (!options.explicit && types.length === 1 && types[0].type === 'String') {
      return "'" + string.replace(/\\'/g, "\\\\'") + "'";
    }
    tokens = reject(not$, string.split(tokenRegex));
    node = consumeTopLevel(tokens, types, options);
    if (!node) {
      throw new Error("Error parsing '" + string + "'.");
    }
    return node;
  };
  function not$(x){ return !x; }
}).call(this);

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430467, function(require, module, exports) {
// Generated by LiveScript 1.4.0
(function(){
  var parsedTypeCheck, types, toString$ = {}.toString;
  parsedTypeCheck = require('type-check').parsedTypeCheck;
  types = {
    '*': function(value, options){
      switch (toString$.call(value).slice(8, -1)) {
      case 'Array':
        return typeCast(value, {
          type: 'Array'
        }, options);
      case 'Object':
        return typeCast(value, {
          type: 'Object'
        }, options);
      default:
        return {
          type: 'Just',
          value: typesCast(value, [
            {
              type: 'Undefined'
            }, {
              type: 'Null'
            }, {
              type: 'NaN'
            }, {
              type: 'Boolean'
            }, {
              type: 'Number'
            }, {
              type: 'Date'
            }, {
              type: 'RegExp'
            }, {
              type: 'Array'
            }, {
              type: 'Object'
            }, {
              type: 'String'
            }
          ], (options.explicit = true, options))
        };
      }
    },
    Undefined: function(it){
      if (it === 'undefined' || it === void 8) {
        return {
          type: 'Just',
          value: void 8
        };
      } else {
        return {
          type: 'Nothing'
        };
      }
    },
    Null: function(it){
      if (it === 'null') {
        return {
          type: 'Just',
          value: null
        };
      } else {
        return {
          type: 'Nothing'
        };
      }
    },
    NaN: function(it){
      if (it === 'NaN') {
        return {
          type: 'Just',
          value: NaN
        };
      } else {
        return {
          type: 'Nothing'
        };
      }
    },
    Boolean: function(it){
      if (it === 'true') {
        return {
          type: 'Just',
          value: true
        };
      } else if (it === 'false') {
        return {
          type: 'Just',
          value: false
        };
      } else {
        return {
          type: 'Nothing'
        };
      }
    },
    Number: function(it){
      return {
        type: 'Just',
        value: +it
      };
    },
    Int: function(it){
      return {
        type: 'Just',
        value: +it
      };
    },
    Float: function(it){
      return {
        type: 'Just',
        value: +it
      };
    },
    Date: function(value, options){
      var that;
      if (that = /^\#([\s\S]*)\#$/.exec(value)) {
        return {
          type: 'Just',
          value: new Date(+that[1] || that[1])
        };
      } else if (options.explicit) {
        return {
          type: 'Nothing'
        };
      } else {
        return {
          type: 'Just',
          value: new Date(+value || value)
        };
      }
    },
    RegExp: function(value, options){
      var that;
      if (that = /^\/([\s\S]*)\/([gimy]*)$/.exec(value)) {
        return {
          type: 'Just',
          value: new RegExp(that[1], that[2])
        };
      } else if (options.explicit) {
        return {
          type: 'Nothing'
        };
      } else {
        return {
          type: 'Just',
          value: new RegExp(value)
        };
      }
    },
    Array: function(value, options){
      return castArray(value, {
        of: [{
          type: '*'
        }]
      }, options);
    },
    Object: function(value, options){
      return castFields(value, {
        of: {}
      }, options);
    },
    String: function(it){
      var that;
      if (toString$.call(it).slice(8, -1) !== 'String') {
        return {
          type: 'Nothing'
        };
      }
      if (that = it.match(/^'([\s\S]*)'$/)) {
        return {
          type: 'Just',
          value: that[1].replace(/\\'/g, "'")
        };
      } else if (that = it.match(/^"([\s\S]*)"$/)) {
        return {
          type: 'Just',
          value: that[1].replace(/\\"/g, '"')
        };
      } else {
        return {
          type: 'Just',
          value: it
        };
      }
    }
  };
  function castArray(node, type, options){
    var typeOf, element;
    if (toString$.call(node).slice(8, -1) !== 'Array') {
      return {
        type: 'Nothing'
      };
    }
    typeOf = type.of;
    return {
      type: 'Just',
      value: (function(){
        var i$, ref$, len$, results$ = [];
        for (i$ = 0, len$ = (ref$ = node).length; i$ < len$; ++i$) {
          element = ref$[i$];
          results$.push(typesCast(element, typeOf, options));
        }
        return results$;
      }())
    };
  }
  function castTuple(node, type, options){
    var result, i, i$, ref$, len$, types, cast;
    if (toString$.call(node).slice(8, -1) !== 'Array') {
      return {
        type: 'Nothing'
      };
    }
    result = [];
    i = 0;
    for (i$ = 0, len$ = (ref$ = type.of).length; i$ < len$; ++i$) {
      types = ref$[i$];
      cast = typesCast(node[i], types, options);
      if (toString$.call(cast).slice(8, -1) !== 'Undefined') {
        result.push(cast);
      }
      i++;
    }
    if (node.length <= i) {
      return {
        type: 'Just',
        value: result
      };
    } else {
      return {
        type: 'Nothing'
      };
    }
  }
  function castFields(node, type, options){
    var typeOf, key, value;
    if (toString$.call(node).slice(8, -1) !== 'Object') {
      return {
        type: 'Nothing'
      };
    }
    typeOf = type.of;
    return {
      type: 'Just',
      value: (function(){
        var ref$, resultObj$ = {};
        for (key in ref$ = node) {
          value = ref$[key];
          resultObj$[typesCast(key, [{
            type: 'String'
          }], options)] = typesCast(value, typeOf[key] || [{
            type: '*'
          }], options);
        }
        return resultObj$;
      }())
    };
  }
  function typeCast(node, typeObj, options){
    var type, structure, castFunc, ref$;
    type = typeObj.type, structure = typeObj.structure;
    if (type) {
      castFunc = ((ref$ = options.customTypes[type]) != null ? ref$.cast : void 8) || types[type];
      if (!castFunc) {
        throw new Error("Type not defined: " + type + ".");
      }
      return castFunc(node, options, typesCast);
    } else {
      switch (structure) {
      case 'array':
        return castArray(node, typeObj, options);
      case 'tuple':
        return castTuple(node, typeObj, options);
      case 'fields':
        return castFields(node, typeObj, options);
      }
    }
  }
  function typesCast(node, types, options){
    var i$, len$, type, ref$, valueType, value;
    for (i$ = 0, len$ = types.length; i$ < len$; ++i$) {
      type = types[i$];
      ref$ = typeCast(node, type, options), valueType = ref$.type, value = ref$.value;
      if (valueType === 'Nothing') {
        continue;
      }
      if (parsedTypeCheck([type], value, {
        customTypes: options.customTypes
      })) {
        return value;
      }
    }
    throw new Error("Value " + JSON.stringify(node) + " does not type check against " + JSON.stringify(types) + ".");
  }
  module.exports = typesCast;
}).call(this);

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1665830430465);
})()
//miniprogram-npm-outsideDeps=["type-check","prelude-ls"]
//# sourceMappingURL=index.js.map