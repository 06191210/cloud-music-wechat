module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1665830430278, function(require, module, exports) {


const { parseContentType } = require('./utils.js');

function getInstance(cfg) {
  const headers = cfg.headers;
  const conType = parseContentType(headers['content-type']);
  if (!conType)
    throw new Error('Malformed content type');

  for (const type of TYPES) {
    const matched = type.detect(conType);
    if (!matched)
      continue;

    const instanceCfg = {
      limits: cfg.limits,
      headers,
      conType,
      highWaterMark: undefined,
      fileHwm: undefined,
      defCharset: undefined,
      defParamCharset: undefined,
      preservePath: false,
    };
    if (cfg.highWaterMark)
      instanceCfg.highWaterMark = cfg.highWaterMark;
    if (cfg.fileHwm)
      instanceCfg.fileHwm = cfg.fileHwm;
    instanceCfg.defCharset = cfg.defCharset;
    instanceCfg.defParamCharset = cfg.defParamCharset;
    instanceCfg.preservePath = cfg.preservePath;
    return new type(instanceCfg);
  }

  throw new Error(`Unsupported content type: ${headers['content-type']}`);
}

// Note: types are explicitly listed here for easier bundling
// See: https://github.com/mscdex/busboy/issues/121
const TYPES = [
  require('./types/multipart'),
  require('./types/urlencoded'),
].filter(function(typemod) { return typeof typemod.detect === 'function'; });

module.exports = (cfg) => {
  if (typeof cfg !== 'object' || cfg === null)
    cfg = {};

  if (typeof cfg.headers !== 'object'
      || cfg.headers === null
      || typeof cfg.headers['content-type'] !== 'string') {
    throw new Error('Missing Content-Type');
  }

  return getInstance(cfg);
};

}, function(modId) {var map = {"./types/multipart":1665830430280,"./types/urlencoded":1665830430282}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430280, function(require, module, exports) {


const { Readable, Writable } = require('stream');

const StreamSearch = require('streamsearch');

const {
  basename,
  convertToUTF8,
  getDecoder,
  parseContentType,
  parseDisposition,
} = require('../utils.js');

const BUF_CRLF = Buffer.from('\r\n');
const BUF_CR = Buffer.from('\r');
const BUF_DASH = Buffer.from('-');

function noop() {}

const MAX_HEADER_PAIRS = 2000; // From node
const MAX_HEADER_SIZE = 16 * 1024; // From node (its default value)

const HPARSER_NAME = 0;
const HPARSER_PRE_OWS = 1;
const HPARSER_VALUE = 2;
class HeaderParser {
  constructor(cb) {
    this.header = Object.create(null);
    this.pairCount = 0;
    this.byteCount = 0;
    this.state = HPARSER_NAME;
    this.name = '';
    this.value = '';
    this.crlf = 0;
    this.cb = cb;
  }

  reset() {
    this.header = Object.create(null);
    this.pairCount = 0;
    this.byteCount = 0;
    this.state = HPARSER_NAME;
    this.name = '';
    this.value = '';
    this.crlf = 0;
  }

  push(chunk, pos, end) {
    let start = pos;
    while (pos < end) {
      switch (this.state) {
        case HPARSER_NAME: {
          let done = false;
          for (; pos < end; ++pos) {
            if (this.byteCount === MAX_HEADER_SIZE)
              return -1;
            ++this.byteCount;
            const code = chunk[pos];
            if (TOKEN[code] !== 1) {
              if (code !== 58/* ':' */)
                return -1;
              this.name += chunk.latin1Slice(start, pos);
              if (this.name.length === 0)
                return -1;
              ++pos;
              done = true;
              this.state = HPARSER_PRE_OWS;
              break;
            }
          }
          if (!done) {
            this.name += chunk.latin1Slice(start, pos);
            break;
          }
          // FALLTHROUGH
        }
        case HPARSER_PRE_OWS: {
          // Skip optional whitespace
          let done = false;
          for (; pos < end; ++pos) {
            if (this.byteCount === MAX_HEADER_SIZE)
              return -1;
            ++this.byteCount;
            const code = chunk[pos];
            if (code !== 32/* ' ' */ && code !== 9/* '\t' */) {
              start = pos;
              done = true;
              this.state = HPARSER_VALUE;
              break;
            }
          }
          if (!done)
            break;
          // FALLTHROUGH
        }
        case HPARSER_VALUE:
          switch (this.crlf) {
            case 0: // Nothing yet
              for (; pos < end; ++pos) {
                if (this.byteCount === MAX_HEADER_SIZE)
                  return -1;
                ++this.byteCount;
                const code = chunk[pos];
                if (FIELD_VCHAR[code] !== 1) {
                  if (code !== 13/* '\r' */)
                    return -1;
                  ++this.crlf;
                  break;
                }
              }
              this.value += chunk.latin1Slice(start, pos++);
              break;
            case 1: // Received CR
              if (this.byteCount === MAX_HEADER_SIZE)
                return -1;
              ++this.byteCount;
              if (chunk[pos++] !== 10/* '\n' */)
                return -1;
              ++this.crlf;
              break;
            case 2: { // Received CR LF
              if (this.byteCount === MAX_HEADER_SIZE)
                return -1;
              ++this.byteCount;
              const code = chunk[pos];
              if (code === 32/* ' ' */ || code === 9/* '\t' */) {
                // Folded value
                start = pos;
                this.crlf = 0;
              } else {
                if (++this.pairCount < MAX_HEADER_PAIRS) {
                  this.name = this.name.toLowerCase();
                  if (this.header[this.name] === undefined)
                    this.header[this.name] = [this.value];
                  else
                    this.header[this.name].push(this.value);
                }
                if (code === 13/* '\r' */) {
                  ++this.crlf;
                  ++pos;
                } else {
                  // Assume start of next header field name
                  start = pos;
                  this.crlf = 0;
                  this.state = HPARSER_NAME;
                  this.name = '';
                  this.value = '';
                }
              }
              break;
            }
            case 3: { // Received CR LF CR
              if (this.byteCount === MAX_HEADER_SIZE)
                return -1;
              ++this.byteCount;
              if (chunk[pos++] !== 10/* '\n' */)
                return -1;
              // End of header
              const header = this.header;
              this.reset();
              this.cb(header);
              return pos;
            }
          }
          break;
      }
    }

    return pos;
  }
}

class FileStream extends Readable {
  constructor(opts, owner) {
    super(opts);
    this.truncated = false;
    this._readcb = null;
    this.once('end', () => {
      // We need to make sure that we call any outstanding _writecb() that is
      // associated with this file so that processing of the rest of the form
      // can continue. This may not happen if the file stream ends right after
      // backpressure kicks in, so we force it here.
      this._read();
      if (--owner._fileEndsLeft === 0 && owner._finalcb) {
        const cb = owner._finalcb;
        owner._finalcb = null;
        // Make sure other 'end' event handlers get a chance to be executed
        // before busboy's 'finish' event is emitted
        process.nextTick(cb);
      }
    });
  }
  _read(n) {
    const cb = this._readcb;
    if (cb) {
      this._readcb = null;
      cb();
    }
  }
}

const ignoreData = {
  push: (chunk, pos) => {},
  destroy: () => {},
};

function callAndUnsetCb(self, err) {
  const cb = self._writecb;
  self._writecb = null;
  if (err)
    self.destroy(err);
  else if (cb)
    cb();
}

function nullDecoder(val, hint) {
  return val;
}

class Multipart extends Writable {
  constructor(cfg) {
    const streamOpts = {
      autoDestroy: true,
      emitClose: true,
      highWaterMark: (typeof cfg.highWaterMark === 'number'
                      ? cfg.highWaterMark
                      : undefined),
    };
    super(streamOpts);

    if (!cfg.conType.params || typeof cfg.conType.params.boundary !== 'string')
      throw new Error('Multipart: Boundary not found');

    const boundary = cfg.conType.params.boundary;
    const paramDecoder = (typeof cfg.defParamCharset === 'string'
                            && cfg.defParamCharset
                          ? getDecoder(cfg.defParamCharset)
                          : nullDecoder);
    const defCharset = (cfg.defCharset || 'utf8');
    const preservePath = cfg.preservePath;
    const fileOpts = {
      autoDestroy: true,
      emitClose: true,
      highWaterMark: (typeof cfg.fileHwm === 'number'
                      ? cfg.fileHwm
                      : undefined),
    };

    const limits = cfg.limits;
    const fieldSizeLimit = (limits && typeof limits.fieldSize === 'number'
                            ? limits.fieldSize
                            : 1 * 1024 * 1024);
    const fileSizeLimit = (limits && typeof limits.fileSize === 'number'
                           ? limits.fileSize
                           : Infinity);
    const filesLimit = (limits && typeof limits.files === 'number'
                        ? limits.files
                        : Infinity);
    const fieldsLimit = (limits && typeof limits.fields === 'number'
                         ? limits.fields
                         : Infinity);
    const partsLimit = (limits && typeof limits.parts === 'number'
                        ? limits.parts
                        : Infinity);

    let parts = -1; // Account for initial boundary
    let fields = 0;
    let files = 0;
    let skipPart = false;

    this._fileEndsLeft = 0;
    this._fileStream = undefined;
    this._complete = false;
    let fileSize = 0;

    let field;
    let fieldSize = 0;
    let partCharset;
    let partEncoding;
    let partType;
    let partName;
    let partTruncated = false;

    let hitFilesLimit = false;
    let hitFieldsLimit = false;

    this._hparser = null;
    const hparser = new HeaderParser((header) => {
      this._hparser = null;
      skipPart = false;

      partType = 'text/plain';
      partCharset = defCharset;
      partEncoding = '7bit';
      partName = undefined;
      partTruncated = false;

      let filename;
      if (!header['content-disposition']) {
        skipPart = true;
        return;
      }

      const disp = parseDisposition(header['content-disposition'][0],
                                    paramDecoder);
      if (!disp || disp.type !== 'form-data') {
        skipPart = true;
        return;
      }

      if (disp.params) {
        if (disp.params.name)
          partName = disp.params.name;

        if (disp.params['filename*'])
          filename = disp.params['filename*'];
        else if (disp.params.filename)
          filename = disp.params.filename;

        if (filename !== undefined && !preservePath)
          filename = basename(filename);
      }

      if (header['content-type']) {
        const conType = parseContentType(header['content-type'][0]);
        if (conType) {
          partType = `${conType.type}/${conType.subtype}`;
          if (conType.params && typeof conType.params.charset === 'string')
            partCharset = conType.params.charset.toLowerCase();
        }
      }

      if (header['content-transfer-encoding'])
        partEncoding = header['content-transfer-encoding'][0].toLowerCase();

      if (partType === 'application/octet-stream' || filename !== undefined) {
        // File

        if (files === filesLimit) {
          if (!hitFilesLimit) {
            hitFilesLimit = true;
            this.emit('filesLimit');
          }
          skipPart = true;
          return;
        }
        ++files;

        if (this.listenerCount('file') === 0) {
          skipPart = true;
          return;
        }

        fileSize = 0;
        this._fileStream = new FileStream(fileOpts, this);
        ++this._fileEndsLeft;
        this.emit(
          'file',
          partName,
          this._fileStream,
          { filename,
            encoding: partEncoding,
            mimeType: partType }
        );
      } else {
        // Non-file

        if (fields === fieldsLimit) {
          if (!hitFieldsLimit) {
            hitFieldsLimit = true;
            this.emit('fieldsLimit');
          }
          skipPart = true;
          return;
        }
        ++fields;

        if (this.listenerCount('field') === 0) {
          skipPart = true;
          return;
        }

        field = [];
        fieldSize = 0;
      }
    });

    let matchPostBoundary = 0;
    const ssCb = (isMatch, data, start, end, isDataSafe) => {
retrydata:
      while (data) {
        if (this._hparser !== null) {
          const ret = this._hparser.push(data, start, end);
          if (ret === -1) {
            this._hparser = null;
            hparser.reset();
            this.emit('error', new Error('Malformed part header'));
            break;
          }
          start = ret;
        }

        if (start === end)
          break;

        if (matchPostBoundary !== 0) {
          if (matchPostBoundary === 1) {
            switch (data[start]) {
              case 45: // '-'
                // Try matching '--' after boundary
                matchPostBoundary = 2;
                ++start;
                break;
              case 13: // '\r'
                // Try matching CR LF before header
                matchPostBoundary = 3;
                ++start;
                break;
              default:
                matchPostBoundary = 0;
            }
            if (start === end)
              return;
          }

          if (matchPostBoundary === 2) {
            matchPostBoundary = 0;
            if (data[start] === 45/* '-' */) {
              // End of multipart data
              this._complete = true;
              this._bparser = ignoreData;
              return;
            }
            // We saw something other than '-', so put the dash we consumed
            // "back"
            const writecb = this._writecb;
            this._writecb = noop;
            ssCb(false, BUF_DASH, 0, 1, false);
            this._writecb = writecb;
          } else if (matchPostBoundary === 3) {
            matchPostBoundary = 0;
            if (data[start] === 10/* '\n' */) {
              ++start;
              if (parts >= partsLimit)
                break;
              // Prepare the header parser
              this._hparser = hparser;
              if (start === end)
                break;
              // Process the remaining data as a header
              continue retrydata;
            } else {
              // We saw something other than LF, so put the CR we consumed
              // "back"
              const writecb = this._writecb;
              this._writecb = noop;
              ssCb(false, BUF_CR, 0, 1, false);
              this._writecb = writecb;
            }
          }
        }

        if (!skipPart) {
          if (this._fileStream) {
            let chunk;
            const actualLen = Math.min(end - start, fileSizeLimit - fileSize);
            if (!isDataSafe) {
              chunk = Buffer.allocUnsafe(actualLen);
              data.copy(chunk, 0, start, start + actualLen);
            } else {
              chunk = data.slice(start, start + actualLen);
            }

            fileSize += chunk.length;
            if (fileSize === fileSizeLimit) {
              if (chunk.length > 0)
                this._fileStream.push(chunk);
              this._fileStream.emit('limit');
              this._fileStream.truncated = true;
              skipPart = true;
            } else if (!this._fileStream.push(chunk)) {
              if (this._writecb)
                this._fileStream._readcb = this._writecb;
              this._writecb = null;
            }
          } else if (field !== undefined) {
            let chunk;
            const actualLen = Math.min(
              end - start,
              fieldSizeLimit - fieldSize
            );
            if (!isDataSafe) {
              chunk = Buffer.allocUnsafe(actualLen);
              data.copy(chunk, 0, start, start + actualLen);
            } else {
              chunk = data.slice(start, start + actualLen);
            }

            fieldSize += actualLen;
            field.push(chunk);
            if (fieldSize === fieldSizeLimit) {
              skipPart = true;
              partTruncated = true;
            }
          }
        }

        break;
      }

      if (isMatch) {
        matchPostBoundary = 1;

        if (this._fileStream) {
          // End the active file stream if the previous part was a file
          this._fileStream.push(null);
          this._fileStream = null;
        } else if (field !== undefined) {
          let data;
          switch (field.length) {
            case 0:
              data = '';
              break;
            case 1:
              data = convertToUTF8(field[0], partCharset, 0);
              break;
            default:
              data = convertToUTF8(
                Buffer.concat(field, fieldSize),
                partCharset,
                0
              );
          }
          field = undefined;
          fieldSize = 0;
          this.emit(
            'field',
            partName,
            data,
            { nameTruncated: false,
              valueTruncated: partTruncated,
              encoding: partEncoding,
              mimeType: partType }
          );
        }

        if (++parts === partsLimit)
          this.emit('partsLimit');
      }
    };
    this._bparser = new StreamSearch(`\r\n--${boundary}`, ssCb);

    this._writecb = null;
    this._finalcb = null;

    // Just in case there is no preamble
    this.write(BUF_CRLF);
  }

  static detect(conType) {
    return (conType.type === 'multipart' && conType.subtype === 'form-data');
  }

  _write(chunk, enc, cb) {
    this._writecb = cb;
    this._bparser.push(chunk, 0);
    if (this._writecb)
      callAndUnsetCb(this);
  }

  _destroy(err, cb) {
    this._hparser = null;
    this._bparser = ignoreData;
    if (!err)
      err = checkEndState(this);
    const fileStream = this._fileStream;
    if (fileStream) {
      this._fileStream = null;
      fileStream.destroy(err);
    }
    cb(err);
  }

  _final(cb) {
    this._bparser.destroy();
    if (!this._complete)
      return cb(new Error('Unexpected end of form'));
    if (this._fileEndsLeft)
      this._finalcb = finalcb.bind(null, this, cb);
    else
      finalcb(this, cb);
  }
}

function finalcb(self, cb, err) {
  if (err)
    return cb(err);
  err = checkEndState(self);
  cb(err);
}

function checkEndState(self) {
  if (self._hparser)
    return new Error('Malformed part header');
  const fileStream = self._fileStream;
  if (fileStream) {
    self._fileStream = null;
    fileStream.destroy(new Error('Unexpected end of file'));
  }
  if (!self._complete)
    return new Error('Unexpected end of form');
}

const TOKEN = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0,
  0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

const FIELD_VCHAR = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
];

module.exports = Multipart;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430282, function(require, module, exports) {


const { Writable } = require('stream');

const { getDecoder } = require('../utils.js');

class URLEncoded extends Writable {
  constructor(cfg) {
    const streamOpts = {
      autoDestroy: true,
      emitClose: true,
      highWaterMark: (typeof cfg.highWaterMark === 'number'
                      ? cfg.highWaterMark
                      : undefined),
    };
    super(streamOpts);

    let charset = (cfg.defCharset || 'utf8');
    if (cfg.conType.params && typeof cfg.conType.params.charset === 'string')
      charset = cfg.conType.params.charset;

    this.charset = charset;

    const limits = cfg.limits;
    this.fieldSizeLimit = (limits && typeof limits.fieldSize === 'number'
                           ? limits.fieldSize
                           : 1 * 1024 * 1024);
    this.fieldsLimit = (limits && typeof limits.fields === 'number'
                        ? limits.fields
                        : Infinity);
    this.fieldNameSizeLimit = (
      limits && typeof limits.fieldNameSize === 'number'
      ? limits.fieldNameSize
      : 100
    );

    this._inKey = true;
    this._keyTrunc = false;
    this._valTrunc = false;
    this._bytesKey = 0;
    this._bytesVal = 0;
    this._fields = 0;
    this._key = '';
    this._val = '';
    this._byte = -2;
    this._lastPos = 0;
    this._encode = 0;
    this._decoder = getDecoder(charset);
  }

  static detect(conType) {
    return (conType.type === 'application'
            && conType.subtype === 'x-www-form-urlencoded');
  }

  _write(chunk, enc, cb) {
    if (this._fields >= this.fieldsLimit)
      return cb();

    let i = 0;
    const len = chunk.length;
    this._lastPos = 0;

    // Check if we last ended mid-percent-encoded byte
    if (this._byte !== -2) {
      i = readPctEnc(this, chunk, i, len);
      if (i === -1)
        return cb(new Error('Malformed urlencoded form'));
      if (i >= len)
        return cb();
      if (this._inKey)
        ++this._bytesKey;
      else
        ++this._bytesVal;
    }

main:
    while (i < len) {
      if (this._inKey) {
        // Parsing key

        i = skipKeyBytes(this, chunk, i, len);

        while (i < len) {
          switch (chunk[i]) {
            case 61: // '='
              if (this._lastPos < i)
                this._key += chunk.latin1Slice(this._lastPos, i);
              this._lastPos = ++i;
              this._key = this._decoder(this._key, this._encode);
              this._encode = 0;
              this._inKey = false;
              continue main;
            case 38: // '&'
              if (this._lastPos < i)
                this._key += chunk.latin1Slice(this._lastPos, i);
              this._lastPos = ++i;
              this._key = this._decoder(this._key, this._encode);
              this._encode = 0;
              if (this._bytesKey > 0) {
                this.emit(
                  'field',
                  this._key,
                  '',
                  { nameTruncated: this._keyTrunc,
                    valueTruncated: false,
                    encoding: this.charset,
                    mimeType: 'text/plain' }
                );
              }
              this._key = '';
              this._val = '';
              this._keyTrunc = false;
              this._valTrunc = false;
              this._bytesKey = 0;
              this._bytesVal = 0;
              if (++this._fields >= this.fieldsLimit) {
                this.emit('fieldsLimit');
                return cb();
              }
              continue;
            case 43: // '+'
              if (this._lastPos < i)
                this._key += chunk.latin1Slice(this._lastPos, i);
              this._key += ' ';
              this._lastPos = i + 1;
              break;
            case 37: // '%'
              if (this._encode === 0)
                this._encode = 1;
              if (this._lastPos < i)
                this._key += chunk.latin1Slice(this._lastPos, i);
              this._lastPos = i + 1;
              this._byte = -1;
              i = readPctEnc(this, chunk, i + 1, len);
              if (i === -1)
                return cb(new Error('Malformed urlencoded form'));
              if (i >= len)
                return cb();
              ++this._bytesKey;
              i = skipKeyBytes(this, chunk, i, len);
              continue;
          }
          ++i;
          ++this._bytesKey;
          i = skipKeyBytes(this, chunk, i, len);
        }
        if (this._lastPos < i)
          this._key += chunk.latin1Slice(this._lastPos, i);
      } else {
        // Parsing value

        i = skipValBytes(this, chunk, i, len);

        while (i < len) {
          switch (chunk[i]) {
            case 38: // '&'
              if (this._lastPos < i)
                this._val += chunk.latin1Slice(this._lastPos, i);
              this._lastPos = ++i;
              this._inKey = true;
              this._val = this._decoder(this._val, this._encode);
              this._encode = 0;
              if (this._bytesKey > 0 || this._bytesVal > 0) {
                this.emit(
                  'field',
                  this._key,
                  this._val,
                  { nameTruncated: this._keyTrunc,
                    valueTruncated: this._valTrunc,
                    encoding: this.charset,
                    mimeType: 'text/plain' }
                );
              }
              this._key = '';
              this._val = '';
              this._keyTrunc = false;
              this._valTrunc = false;
              this._bytesKey = 0;
              this._bytesVal = 0;
              if (++this._fields >= this.fieldsLimit) {
                this.emit('fieldsLimit');
                return cb();
              }
              continue main;
            case 43: // '+'
              if (this._lastPos < i)
                this._val += chunk.latin1Slice(this._lastPos, i);
              this._val += ' ';
              this._lastPos = i + 1;
              break;
            case 37: // '%'
              if (this._encode === 0)
                this._encode = 1;
              if (this._lastPos < i)
                this._val += chunk.latin1Slice(this._lastPos, i);
              this._lastPos = i + 1;
              this._byte = -1;
              i = readPctEnc(this, chunk, i + 1, len);
              if (i === -1)
                return cb(new Error('Malformed urlencoded form'));
              if (i >= len)
                return cb();
              ++this._bytesVal;
              i = skipValBytes(this, chunk, i, len);
              continue;
          }
          ++i;
          ++this._bytesVal;
          i = skipValBytes(this, chunk, i, len);
        }
        if (this._lastPos < i)
          this._val += chunk.latin1Slice(this._lastPos, i);
      }
    }

    cb();
  }

  _final(cb) {
    if (this._byte !== -2)
      return cb(new Error('Malformed urlencoded form'));
    if (!this._inKey || this._bytesKey > 0 || this._bytesVal > 0) {
      if (this._inKey)
        this._key = this._decoder(this._key, this._encode);
      else
        this._val = this._decoder(this._val, this._encode);
      this.emit(
        'field',
        this._key,
        this._val,
        { nameTruncated: this._keyTrunc,
          valueTruncated: this._valTrunc,
          encoding: this.charset,
          mimeType: 'text/plain' }
      );
    }
    cb();
  }
}

function readPctEnc(self, chunk, pos, len) {
  if (pos >= len)
    return len;

  if (self._byte === -1) {
    // We saw a '%' but no hex characters yet
    const hexUpper = HEX_VALUES[chunk[pos++]];
    if (hexUpper === -1)
      return -1;

    if (hexUpper >= 8)
      self._encode = 2; // Indicate high bits detected

    if (pos < len) {
      // Both hex characters are in this chunk
      const hexLower = HEX_VALUES[chunk[pos++]];
      if (hexLower === -1)
        return -1;

      if (self._inKey)
        self._key += String.fromCharCode((hexUpper << 4) + hexLower);
      else
        self._val += String.fromCharCode((hexUpper << 4) + hexLower);

      self._byte = -2;
      self._lastPos = pos;
    } else {
      // Only one hex character was available in this chunk
      self._byte = hexUpper;
    }
  } else {
    // We saw only one hex character so far
    const hexLower = HEX_VALUES[chunk[pos++]];
    if (hexLower === -1)
      return -1;

    if (self._inKey)
      self._key += String.fromCharCode((self._byte << 4) + hexLower);
    else
      self._val += String.fromCharCode((self._byte << 4) + hexLower);

    self._byte = -2;
    self._lastPos = pos;
  }

  return pos;
}

function skipKeyBytes(self, chunk, pos, len) {
  // Skip bytes if we've truncated
  if (self._bytesKey > self.fieldNameSizeLimit) {
    if (!self._keyTrunc) {
      if (self._lastPos < pos)
        self._key += chunk.latin1Slice(self._lastPos, pos - 1);
    }
    self._keyTrunc = true;
    for (; pos < len; ++pos) {
      const code = chunk[pos];
      if (code === 61/* '=' */ || code === 38/* '&' */)
        break;
      ++self._bytesKey;
    }
    self._lastPos = pos;
  }

  return pos;
}

function skipValBytes(self, chunk, pos, len) {
  // Skip bytes if we've truncated
  if (self._bytesVal > self.fieldSizeLimit) {
    if (!self._valTrunc) {
      if (self._lastPos < pos)
        self._val += chunk.latin1Slice(self._lastPos, pos - 1);
    }
    self._valTrunc = true;
    for (; pos < len; ++pos) {
      if (chunk[pos] === 38/* '&' */)
        break;
      ++self._bytesVal;
    }
    self._lastPos = pos;
  }

  return pos;
}

/* eslint-disable no-multi-spaces */
const HEX_VALUES = [
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
   0,  1,  2,  3,  4,  5,  6,  7,  8,  9, -1, -1, -1, -1, -1, -1,
  -1, 10, 11, 12, 13, 14, 15, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, 10, 11, 12, 13, 14, 15, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
];
/* eslint-enable no-multi-spaces */

module.exports = URLEncoded;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1665830430278);
})()
//miniprogram-npm-outsideDeps=["./utils.js","stream","streamsearch","../utils.js"]
//# sourceMappingURL=index.js.map