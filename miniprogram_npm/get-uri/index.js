module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1665830430403, function(require, module, exports) {

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const debug_1 = __importDefault(require("debug"));
const url_1 = require("url");
// Built-in protocols
const data_1 = __importDefault(require("./data"));
const file_1 = __importDefault(require("./file"));
const ftp_1 = __importDefault(require("./ftp"));
const http_1 = __importDefault(require("./http"));
const https_1 = __importDefault(require("./https"));
const debug = debug_1.default('get-uri');
function getUri(uri, opts, fn) {
    const p = new Promise((resolve, reject) => {
        debug('getUri(%o)', uri);
        if (typeof opts === 'function') {
            fn = opts;
            opts = undefined;
        }
        if (!uri) {
            reject(new TypeError('Must pass in a URI to "get"'));
            return;
        }
        const parsed = url_1.parse(uri);
        // Strip trailing `:`
        const protocol = (parsed.protocol || '').replace(/:$/, '');
        if (!protocol) {
            reject(new TypeError(`URI does not contain a protocol: ${uri}`));
            return;
        }
        const getter = getUri.protocols[protocol];
        if (typeof getter !== 'function') {
            throw new TypeError(`Unsupported protocol "${protocol}" specified in URI: ${uri}`);
        }
        resolve(getter(parsed, opts || {}));
    });
    if (typeof fn === 'function') {
        p.then(rtn => fn(null, rtn), err => fn(err));
    }
    else {
        return p;
    }
}
(function (getUri) {
    getUri.protocols = {
        data: data_1.default,
        file: file_1.default,
        ftp: ftp_1.default,
        http: http_1.default,
        https: https_1.default
    };
})(getUri || (getUri = {}));
module.exports = getUri;
//# sourceMappingURL=index.js.map
}, function(modId) {var map = {"./data":1665830430404,"./file":1665830430406,"./ftp":1665830430408,"./http":1665830430409,"./https":1665830430410}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430404, function(require, module, exports) {

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
const stream_1 = require("stream");
const crypto_1 = require("crypto");
const data_uri_to_buffer_1 = __importDefault(require("data-uri-to-buffer"));
const notmodified_1 = __importDefault(require("./notmodified"));
const debug = debug_1.default('get-uri:data');
class DataReadable extends stream_1.Readable {
    constructor(hash, buf) {
        super();
        this.push(buf);
        this.push(null);
        this.hash = hash;
    }
}
/**
 * Returns a Readable stream from a "data:" URI.
 */
function get({ href: uri }, { cache }) {
    return __awaiter(this, void 0, void 0, function* () {
        // need to create a SHA1 hash of the URI string, for cacheability checks
        // in future `getUri()` calls with the same data URI passed in.
        const shasum = crypto_1.createHash('sha1');
        shasum.update(uri);
        const hash = shasum.digest('hex');
        debug('generated SHA1 hash for "data:" URI: %o', hash);
        // check if the cache is the same "data:" URI that was previously passed in.
        if (cache && cache.hash === hash) {
            debug('got matching cache SHA1 hash: %o', hash);
            throw new notmodified_1.default();
        }
        else {
            debug('creating Readable stream from "data:" URI buffer');
            const buf = data_uri_to_buffer_1.default(uri);
            return new DataReadable(hash, buf);
        }
    });
}
exports.default = get;
//# sourceMappingURL=data.js.map
}, function(modId) { var map = {"./notmodified":1665830430405}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430405, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Error subclass to use when the source has not been modified.
 *
 * @param {String} message optional "message" property to set
 * @api protected
 */
class NotModifiedError extends Error {
    constructor(message) {
        super(message ||
            'Source has not been modified since the provied "cache", re-use previous results');
        this.code = 'ENOTMODIFIED';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.default = NotModifiedError;
//# sourceMappingURL=notmodified.js.map
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430406, function(require, module, exports) {

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
const fs_1 = require("fs");
const fs_extra_1 = require("fs-extra");
const file_uri_to_path_1 = __importDefault(require("file-uri-to-path"));
const notfound_1 = __importDefault(require("./notfound"));
const notmodified_1 = __importDefault(require("./notmodified"));
const debug = debug_1.default('get-uri:file');
/**
 * Returns a `fs.ReadStream` instance from a "file:" URI.
 */
function get({ href: uri }, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const { cache, flags = 'r', mode = 438 // =0666
         } = opts;
        try {
            // Convert URI → Path
            const filepath = file_uri_to_path_1.default(uri);
            debug('Normalized pathname: %o', filepath);
            // `open()` first to get a file descriptor and ensure that the file
            // exists.
            const fd = yield fs_extra_1.open(filepath, flags, mode);
            // Now `fstat()` to check the `mtime` and store the stat object for
            // the cache.
            const stat = yield fs_extra_1.fstat(fd);
            // if a `cache` was provided, check if the file has not been modified
            if (cache && cache.stat && stat && isNotModified(cache.stat, stat)) {
                throw new notmodified_1.default();
            }
            // `fs.ReadStream` takes care of calling `fs.close()` on the
            // fd after it's done reading
            // @ts-ignore - `@types/node` doesn't allow `null` as file path :/
            const rs = fs_1.createReadStream(null, Object.assign(Object.assign({ autoClose: true }, opts), { fd }));
            rs.stat = stat;
            return rs;
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                throw new notfound_1.default();
            }
            throw err;
        }
    });
}
exports.default = get;
// returns `true` if the `mtime` of the 2 stat objects are equal
function isNotModified(prev, curr) {
    return +prev.mtime === +curr.mtime;
}
//# sourceMappingURL=file.js.map
}, function(modId) { var map = {"./notfound":1665830430407,"./notmodified":1665830430405}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430407, function(require, module, exports) {

/**
 * Error subclass to use when the source does not exist at the specified endpoint.
 *
 * @param {String} message optional "message" property to set
 * @api protected
 */
Object.defineProperty(exports, "__esModule", { value: true });
class NotFoundError extends Error {
    constructor(message) {
        super(message || 'File does not exist at the specified endpoint');
        this.code = 'ENOTFOUND';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.default = NotFoundError;
//# sourceMappingURL=notfound.js.map
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430408, function(require, module, exports) {

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const once_1 = __importDefault(require("@tootallnate/once"));
const ftp_1 = __importDefault(require("ftp"));
const path_1 = require("path");
const debug_1 = __importDefault(require("debug"));
const notfound_1 = __importDefault(require("./notfound"));
const notmodified_1 = __importDefault(require("./notmodified"));
const debug = debug_1.default('get-uri:ftp');
/**
 * Returns a Readable stream from an "ftp:" URI.
 */
function get(parsed, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const { cache } = opts;
        const filepath = parsed.pathname;
        let lastModified = null;
        if (!filepath) {
            throw new TypeError('No "pathname"!');
        }
        const client = new ftp_1.default();
        client.once('greeting', (greeting) => {
            debug('FTP greeting: %o', greeting);
        });
        function onend() {
            // close the FTP client socket connection
            client.end();
        }
        try {
            opts.host = parsed.hostname || parsed.host || 'localhost';
            opts.port = parseInt(parsed.port || '0', 10) || 21;
            opts.debug = debug;
            if (parsed.auth) {
                const [user, password] = parsed.auth.split(':');
                opts.user = user;
                opts.password = password;
            }
            // await cb(_ => client.connect(opts, _));
            const readyPromise = once_1.default(client, 'ready');
            client.connect(opts);
            yield readyPromise;
            // first we have to figure out the Last Modified date.
            // try the MDTM command first, which is an optional extension command.
            try {
                lastModified = yield new Promise((resolve, reject) => {
                    client.lastMod(filepath, (err, res) => {
                        return err ? reject(err) : resolve(res);
                    });
                });
            }
            catch (err) {
                // handle the "file not found" error code
                if (err.code === 550) {
                    throw new notfound_1.default();
                }
            }
            if (!lastModified) {
                // Try to get the last modified date via the LIST command (uses
                // more bandwidth, but is more compatible with older FTP servers
                const list = yield new Promise((resolve, reject) => {
                    client.list(path_1.dirname(filepath), (err, res) => {
                        return err ? reject(err) : resolve(res);
                    });
                });
                // attempt to find the "entry" with a matching "name"
                const name = path_1.basename(filepath);
                const entry = list.find(e => e.name === name);
                if (entry) {
                    lastModified = entry.date;
                }
            }
            if (lastModified) {
                if (isNotModified()) {
                    throw new notmodified_1.default();
                }
            }
            else {
                throw new notfound_1.default();
            }
            // XXX: a small timeout seemed necessary otherwise FTP servers
            // were returning empty sockets for the file occasionally
            // setTimeout(client.get.bind(client, filepath, onfile), 10);
            const rs = (yield new Promise((resolve, reject) => {
                client.get(filepath, (err, res) => {
                    return err ? reject(err) : resolve(res);
                });
            }));
            rs.once('end', onend);
            rs.lastModified = lastModified;
            return rs;
        }
        catch (err) {
            client.destroy();
            throw err;
        }
        // called when `lastModified` is set, and a "cache" stream was provided
        function isNotModified() {
            if (cache && cache.lastModified && lastModified) {
                return +cache.lastModified === +lastModified;
            }
            return false;
        }
    });
}
exports.default = get;
//# sourceMappingURL=ftp.js.map
}, function(modId) { var map = {"ftp":1665830430408,"./notfound":1665830430407,"./notmodified":1665830430405}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430409, function(require, module, exports) {

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const once_1 = __importDefault(require("@tootallnate/once"));
const debug_1 = __importDefault(require("debug"));
const url_1 = require("url");
const http_error_1 = __importDefault(require("./http-error"));
const notfound_1 = __importDefault(require("./notfound"));
const notmodified_1 = __importDefault(require("./notmodified"));
const debug = debug_1.default('get-uri:http');
/**
 * Returns a Readable stream from an "http:" URI.
 */
function get(parsed, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('GET %o', parsed.href);
        const cache = getCache(parsed, opts.cache);
        // first check the previous Expires and/or Cache-Control headers
        // of a previous response if a `cache` was provided
        if (cache && isFresh(cache) && typeof cache.statusCode === 'number') {
            // check for a 3xx "redirect" status code on the previous cache
            const type = (cache.statusCode / 100) | 0;
            if (type === 3 && cache.headers.location) {
                debug('cached redirect');
                throw new Error('TODO: implement cached redirects!');
            }
            // otherwise we assume that it's the destination endpoint,
            // since there's nowhere else to redirect to
            throw new notmodified_1.default();
        }
        // 5 redirects allowed by default
        const maxRedirects = typeof opts.maxRedirects === 'number' ? opts.maxRedirects : 5;
        debug('allowing %o max redirects', maxRedirects);
        let mod;
        if (opts.http) {
            // the `https` module passed in from the "http.js" file
            mod = opts.http;
            debug('using secure `https` core module');
        }
        else {
            mod = http_1.default;
            debug('using `http` core module');
        }
        const options = Object.assign(Object.assign({}, opts), parsed);
        // add "cache validation" headers if a `cache` was provided
        if (cache) {
            if (!options.headers) {
                options.headers = {};
            }
            const lastModified = cache.headers['last-modified'];
            if (lastModified) {
                options.headers['If-Modified-Since'] = lastModified;
                debug('added "If-Modified-Since" request header: %o', lastModified);
            }
            const etag = cache.headers.etag;
            if (etag) {
                options.headers['If-None-Match'] = etag;
                debug('added "If-None-Match" request header: %o', etag);
            }
        }
        const req = mod.get(options);
        const res = yield once_1.default(req, 'response');
        const code = res.statusCode || 0;
        // assign a Date to this response for the "Cache-Control" delta calculation
        res.date = Date.now();
        res.parsed = parsed;
        debug('got %o response status code', code);
        // any 2xx response is a "success" code
        let type = (code / 100) | 0;
        // check for a 3xx "redirect" status code
        let location = res.headers.location;
        if (type === 3 && location) {
            if (!opts.redirects)
                opts.redirects = [];
            let redirects = opts.redirects;
            if (redirects.length < maxRedirects) {
                debug('got a "redirect" status code with Location: %o', location);
                // flush this response - we're not going to use it
                res.resume();
                // hang on to this Response object for the "redirects" Array
                redirects.push(res);
                let newUri = url_1.resolve(parsed.href, location);
                debug('resolved redirect URL: %o', newUri);
                let left = maxRedirects - redirects.length;
                debug('%o more redirects allowed after this one', left);
                // check if redirecting to a different protocol
                let parsedUrl = url_1.parse(newUri);
                if (parsedUrl.protocol !== parsed.protocol) {
                    opts.http = parsedUrl.protocol === 'https:' ? https_1.default : undefined;
                }
                return get(parsedUrl, opts);
            }
        }
        // if we didn't get a 2xx "success" status code, then create an Error object
        if (type !== 2) {
            res.resume();
            if (code === 304) {
                throw new notmodified_1.default();
            }
            else if (code === 404) {
                throw new notfound_1.default();
            }
            // other HTTP-level error
            throw new http_error_1.default(code);
        }
        if (opts.redirects) {
            // store a reference to the "redirects" Array on the Response object so that
            // they can be inspected during a subsequent call to GET the same URI
            res.redirects = opts.redirects;
        }
        return res;
    });
}
exports.default = get;
/**
 * Returns `true` if the provided cache's "freshness" is valid. That is, either
 * the Cache-Control header or Expires header values are still within the allowed
 * time period.
 *
 * @return {Boolean}
 * @api private
 */
function isFresh(cache) {
    let fresh = false;
    let expires = parseInt(cache.headers.expires || '', 10);
    const cacheControl = cache.headers['cache-control'];
    if (cacheControl) {
        // for Cache-Control rules, see: http://www.mnot.net/cache_docs/#CACHE-CONTROL
        debug('Cache-Control: %o', cacheControl);
        const parts = cacheControl.split(/,\s*?\b/);
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const subparts = part.split('=');
            const name = subparts[0];
            switch (name) {
                case 'max-age':
                    expires = (cache.date || 0) + parseInt(subparts[1], 10) * 1000;
                    fresh = Date.now() < expires;
                    if (fresh) {
                        debug('cache is "fresh" due to previous %o Cache-Control param', part);
                    }
                    return fresh;
                case 'must-revalidate':
                    // XXX: what we supposed to do here?
                    break;
                case 'no-cache':
                case 'no-store':
                    debug('cache is "stale" due to explicit %o Cache-Control param', name);
                    return false;
                default:
                    // ignore unknown cache value
                    break;
            }
        }
    }
    else if (expires) {
        // for Expires rules, see: http://www.mnot.net/cache_docs/#EXPIRES
        debug('Expires: %o', expires);
        fresh = Date.now() < expires;
        if (fresh) {
            debug('cache is "fresh" due to previous Expires response header');
        }
        return fresh;
    }
    return false;
}
/**
 * Attempts to return a previous Response object from a previous GET call to the
 * same URI.
 *
 * @api private
 */
function getCache(parsed, cache) {
    if (cache) {
        if (cache.parsed && cache.parsed.href === parsed.href) {
            return cache;
        }
        if (cache.redirects) {
            for (let i = 0; i < cache.redirects.length; i++) {
                const c = getCache(parsed, cache.redirects[i]);
                if (c) {
                    return c;
                }
            }
        }
    }
    return null;
}
//# sourceMappingURL=http.js.map
}, function(modId) { var map = {"http":1665830430409,"https":1665830430410,"./http-error":1665830430411,"./notfound":1665830430407,"./notmodified":1665830430405}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430410, function(require, module, exports) {

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("./http"));
/**
 * Returns a Readable stream from an "https:" URI.
 */
function get(parsed, opts) {
    return http_1.default(parsed, Object.assign(Object.assign({}, opts), { http: https_1.default }));
}
exports.default = get;
//# sourceMappingURL=https.js.map
}, function(modId) { var map = {"https":1665830430410,"./http":1665830430409}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430411, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
/**
 * Error subclass to use when an HTTP application error has occurred.
 */
class HTTPError extends Error {
    constructor(statusCode, message = http_1.STATUS_CODES[statusCode]) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.statusCode = statusCode;
        this.code = `E${String(message)
            .toUpperCase()
            .replace(/\s+/g, '')}`;
    }
}
exports.default = HTTPError;
//# sourceMappingURL=http-error.js.map
}, function(modId) { var map = {"http":1665830430409}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1665830430403);
})()
//miniprogram-npm-outsideDeps=["debug","url","stream","crypto","data-uri-to-buffer","fs","fs-extra","file-uri-to-path","@tootallnate/once","path"]
//# sourceMappingURL=index.js.map