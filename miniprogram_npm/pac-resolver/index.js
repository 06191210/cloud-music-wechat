module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1665830430592, function(require, module, exports) {

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const url_1 = require("url");
const degenerator_1 = require("degenerator");
/**
 * Built-in PAC functions.
 */
const dateRange_1 = __importDefault(require("./dateRange"));
const dnsDomainIs_1 = __importDefault(require("./dnsDomainIs"));
const dnsDomainLevels_1 = __importDefault(require("./dnsDomainLevels"));
const dnsResolve_1 = __importDefault(require("./dnsResolve"));
const isInNet_1 = __importDefault(require("./isInNet"));
const isPlainHostName_1 = __importDefault(require("./isPlainHostName"));
const isResolvable_1 = __importDefault(require("./isResolvable"));
const localHostOrDomainIs_1 = __importDefault(require("./localHostOrDomainIs"));
const myIpAddress_1 = __importDefault(require("./myIpAddress"));
const shExpMatch_1 = __importDefault(require("./shExpMatch"));
const timeRange_1 = __importDefault(require("./timeRange"));
const weekdayRange_1 = __importDefault(require("./weekdayRange"));
/**
 * Returns an asynchronous `FindProxyForURL()` function
 * from the given JS string (from a PAC file).
 *
 * @param {String} str JS string
 * @param {Object} opts optional "options" object
 * @return {Function} async resolver function
 */
function createPacResolver(_str, _opts = {}) {
    const str = Buffer.isBuffer(_str) ? _str.toString('utf8') : _str;
    // The sandbox to use for the `vm` context.
    const sandbox = Object.assign(Object.assign({}, createPacResolver.sandbox), _opts.sandbox);
    const opts = Object.assign(Object.assign({ filename: 'proxy.pac' }, _opts), { sandbox });
    // Construct the array of async function names to add `await` calls to.
    const names = Object.keys(sandbox).filter((k) => isAsyncFunction(sandbox[k]));
    // Compile the JS `FindProxyForURL()` function into an async function.
    const resolver = (0, degenerator_1.compile)(str, 'FindProxyForURL', names, opts);
    function FindProxyForURL(url, _host, _callback) {
        let host = null;
        let callback = null;
        if (typeof _callback === 'function') {
            callback = _callback;
        }
        if (typeof _host === 'string') {
            host = _host;
        }
        else if (typeof _host === 'function') {
            callback = _host;
        }
        if (!host) {
            host = (0, url_1.parse)(url).hostname;
        }
        if (!host) {
            throw new TypeError('Could not determine `host`');
        }
        const promise = resolver(url, host);
        if (typeof callback === 'function') {
            toCallback(promise, callback);
        }
        else {
            return promise;
        }
    }
    Object.defineProperty(FindProxyForURL, 'toString', {
        value: () => resolver.toString(),
        enumerable: false,
    });
    return FindProxyForURL;
}
// eslint-disable-next-line @typescript-eslint/no-namespace
(function (createPacResolver) {
    createPacResolver.sandbox = Object.freeze({
        alert: (message = '') => console.log('%s', message),
        dateRange: dateRange_1.default,
        dnsDomainIs: dnsDomainIs_1.default,
        dnsDomainLevels: dnsDomainLevels_1.default,
        dnsResolve: dnsResolve_1.default,
        isInNet: isInNet_1.default,
        isPlainHostName: isPlainHostName_1.default,
        isResolvable: isResolvable_1.default,
        localHostOrDomainIs: localHostOrDomainIs_1.default,
        myIpAddress: myIpAddress_1.default,
        shExpMatch: shExpMatch_1.default,
        timeRange: timeRange_1.default,
        weekdayRange: weekdayRange_1.default,
    });
})(createPacResolver || (createPacResolver = {}));
function toCallback(promise, callback) {
    promise.then((rtn) => callback(null, rtn), callback);
}
function isAsyncFunction(v) {
    if (typeof v !== 'function')
        return false;
    // Native `AsyncFunction`
    if (v.constructor.name === 'AsyncFunction')
        return true;
    // TypeScript compiled
    if (String(v).indexOf('__awaiter(') !== -1)
        return true;
    // Legacy behavior - set `async` property on the function
    return Boolean(v.async);
}
module.exports = createPacResolver;
//# sourceMappingURL=index.js.map
}, function(modId) {var map = {"./dateRange":1665830430593,"./dnsDomainIs":1665830430594,"./dnsDomainLevels":1665830430595,"./dnsResolve":1665830430596,"./isInNet":1665830430598,"./isPlainHostName":1665830430599,"./isResolvable":1665830430600,"./localHostOrDomainIs":1665830430601,"./myIpAddress":1665830430602,"./shExpMatch":1665830430603,"./timeRange":1665830430604,"./weekdayRange":1665830430605}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430593, function(require, module, exports) {

/**
 * If only a single value is specified (from each category: day, month, year), the
 * function returns a true value only on days that match that specification. If
 * both values are specified, the result is true between those times, including
 * bounds.
 *
 * Even though the examples don't show, the "GMT" parameter can be specified
 * in any of the 9 different call profiles, always as the last parameter.
 *
 * Examples:
 *
 * ``` js
 * dateRange(1)
 * true on the first day of each month, local timezone.
 *
 * dateRange(1, "GMT")
 * true on the first day of each month, GMT timezone.
 *
 * dateRange(1, 15)
 * true on the first half of each month.
 *
 * dateRange(24, "DEC")
 * true on 24th of December each year.
 *
 * dateRange(24, "DEC", 1995)
 * true on 24th of December, 1995.
 *
 * dateRange("JAN", "MAR")
 * true on the first quarter of the year.
 *
 * dateRange(1, "JUN", 15, "AUG")
 * true from June 1st until August 15th, each year (including June 1st and August
 * 15th).
 *
 * dateRange(1, "JUN", 15, 1995, "AUG", 1995)
 * true from June 1st, 1995, until August 15th, same year.
 *
 * dateRange("OCT", 1995, "MAR", 1996)
 * true from October 1995 until March 1996 (including the entire month of October
 * 1995 and March 1996).
 *
 * dateRange(1995)
 * true during the entire year 1995.
 *
 * dateRange(1995, 1997)
 * true from beginning of year 1995 until the end of year 1997.
 * ```
 *
 * dateRange(day)
 * dateRange(day1, day2)
 * dateRange(mon)
 * dateRange(month1, month2)
 * dateRange(year)
 * dateRange(year1, year2)
 * dateRange(day1, month1, day2, month2)
 * dateRange(month1, year1, month2, year2)
 * dateRange(day1, month1, year1, day2, month2, year2)
 * dateRange(day1, month1, year1, day2, month2, year2, gmt)
 *
 * @param {String} day is the day of month between 1 and 31 (as an integer).
 * @param {String} month is one of the month strings: JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC
 * @param {String} year is the full year number, for example 1995 (but not 95). Integer.
 * @param {String} gmt is either the string "GMT", which makes time comparison occur in GMT timezone; if left unspecified, times are taken to be in the local timezone.
 * @return {Boolean}
 */
Object.defineProperty(exports, "__esModule", { value: true });
function dateRange() {
    // TODO: implement me!
    return false;
}
exports.default = dateRange;
//# sourceMappingURL=dateRange.js.map
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430594, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Returns true iff the domain of hostname matches.
 *
 * Examples:
 *
 * ``` js
 * dnsDomainIs("www.netscape.com", ".netscape.com")
 *   // is true.
 *
 * dnsDomainIs("www", ".netscape.com")
 *   // is false.
 *
 * dnsDomainIs("www.mcom.com", ".netscape.com")
 *   // is false.
 * ```
 *
 *
 * @param {String} host is the hostname from the URL.
 * @param {String} domain is the domain name to test the hostname against.
 * @return {Boolean} true iff the domain of the hostname matches.
 */
function dnsDomainIs(host, domain) {
    host = String(host);
    domain = String(domain);
    return host.substr(domain.length * -1) === domain;
}
exports.default = dnsDomainIs;
//# sourceMappingURL=dnsDomainIs.js.map
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430595, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Returns the number (integer) of DNS domain levels (number of dots) in the
 * hostname.
 *
 * Examples:
 *
 * ``` js
 * dnsDomainLevels("www")
 *   // returns 0.
 * dnsDomainLevels("www.netscape.com")
 *   // returns 2.
 * ```
 *
 * @param {String} host is the hostname from the URL.
 * @return {Number} number of domain levels
 */
function dnsDomainLevels(host) {
    const match = String(host).match(/\./g);
    let levels = 0;
    if (match) {
        levels = match.length;
    }
    return levels;
}
exports.default = dnsDomainLevels;
//# sourceMappingURL=dnsDomainLevels.js.map
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430596, function(require, module, exports) {

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
/**
 * Resolves the given DNS hostname into an IP address, and returns it in the dot
 * separated format as a string.
 *
 * Example:
 *
 * ``` js
 * dnsResolve("home.netscape.com")
 *   // returns the string "198.95.249.79".
 * ```
 *
 * @param {String} host hostname to resolve
 * @return {String} resolved IP address
 */
function dnsResolve(host) {
    return __awaiter(this, void 0, void 0, function* () {
        const family = 4;
        try {
            const r = yield (0, util_1.dnsLookup)(host, { family });
            if (typeof r === 'string') {
                return r;
            }
        }
        catch (err) {
            // @ignore
        }
        return null;
    });
}
exports.default = dnsResolve;
//# sourceMappingURL=dnsResolve.js.map
}, function(modId) { var map = {"./util":1665830430597}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430597, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.isGMT = exports.dnsLookup = void 0;
const dns_1 = require("dns");
function dnsLookup(host, opts) {
    return new Promise((resolve, reject) => {
        (0, dns_1.lookup)(host, opts, (err, res) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(res);
            }
        });
    });
}
exports.dnsLookup = dnsLookup;
function isGMT(v) {
    return v === 'GMT';
}
exports.isGMT = isGMT;
//# sourceMappingURL=util.js.map
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430598, function(require, module, exports) {

/**
 * Module dependencies.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const netmask_1 = require("netmask");
const util_1 = require("./util");
/**
 * True iff the IP address of the host matches the specified IP address pattern.
 *
 * Pattern and mask specification is done the same way as for SOCKS configuration.
 *
 * Examples:
 *
 * ``` js
 * isInNet(host, "198.95.249.79", "255.255.255.255")
 *   // is true iff the IP address of host matches exactly 198.95.249.79.
 *
 * isInNet(host, "198.95.0.0", "255.255.0.0")
 *   // is true iff the IP address of the host matches 198.95.*.*.
 * ```
 *
 * @param {String} host a DNS hostname, or IP address. If a hostname is passed,
 *   it will be resoved into an IP address by this function.
 * @param {String} pattern an IP address pattern in the dot-separated format mask.
 * @param {String} mask for the IP address pattern informing which parts of the
 *   IP address should be matched against. 0 means ignore, 255 means match.
 * @return {Boolean}
 */
function isInNet(host, pattern, mask) {
    return __awaiter(this, void 0, void 0, function* () {
        const family = 4;
        try {
            const ip = yield (0, util_1.dnsLookup)(host, { family });
            if (typeof ip === 'string') {
                const netmask = new netmask_1.Netmask(pattern, mask);
                return netmask.contains(ip);
            }
        }
        catch (err) { }
        return false;
    });
}
exports.default = isInNet;
//# sourceMappingURL=isInNet.js.map
}, function(modId) { var map = {"./util":1665830430597}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430599, function(require, module, exports) {

/**
 * True iff there is no domain name in the hostname (no dots).
 *
 * Examples:
 *
 * ``` js
 * isPlainHostName("www")
 *   // is true.
 *
 * isPlainHostName("www.netscape.com")
 *   // is false.
 * ```
 *
 * @param {String} host The hostname from the URL (excluding port number).
 * @return {Boolean}
 */
Object.defineProperty(exports, "__esModule", { value: true });
function isPlainHostName(host) {
    return !/\./.test(host);
}
exports.default = isPlainHostName;
//# sourceMappingURL=isPlainHostName.js.map
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430600, function(require, module, exports) {

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
/**
 * Tries to resolve the hostname. Returns true if succeeds.
 *
 * @param {String} host is the hostname from the URL.
 * @return {Boolean}
 */
function isResolvable(host) {
    return __awaiter(this, void 0, void 0, function* () {
        const family = 4;
        try {
            if (yield (0, util_1.dnsLookup)(host, { family })) {
                return true;
            }
        }
        catch (err) {
            // ignore
        }
        return false;
    });
}
exports.default = isResolvable;
//# sourceMappingURL=isResolvable.js.map
}, function(modId) { var map = {"./util":1665830430597}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430601, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Is true if the hostname matches exactly the specified hostname, or if there is
 * no domain name part in the hostname, but the unqualified hostname matches.
 *
 * Examples:
 *
 * ``` js
 * localHostOrDomainIs("www.netscape.com", "www.netscape.com")
 *   // is true (exact match).
 *
 * localHostOrDomainIs("www", "www.netscape.com")
 *   // is true (hostname match, domain not specified).
 *
 * localHostOrDomainIs("www.mcom.com", "www.netscape.com")
 *   // is false (domain name mismatch).
 *
 * localHostOrDomainIs("home.netscape.com", "www.netscape.com")
 *   // is false (hostname mismatch).
 * ```
 *
 * @param {String} host the hostname from the URL.
 * @param {String} hostdom fully qualified hostname to match against.
 * @return {Boolean}
 */
function localHostOrDomainIs(host, hostdom) {
    const parts = host.split('.');
    const domparts = hostdom.split('.');
    let matches = true;
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] !== domparts[i]) {
            matches = false;
            break;
        }
    }
    return matches;
}
exports.default = localHostOrDomainIs;
//# sourceMappingURL=localHostOrDomainIs.js.map
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430602, function(require, module, exports) {

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
const ip_1 = __importDefault(require("ip"));
const net_1 = __importDefault(require("net"));
/**
 * Returns the IP address of the host that the Navigator is running on, as
 * a string in the dot-separated integer format.
 *
 * Example:
 *
 * ``` js
 * myIpAddress()
 *   // would return the string "198.95.249.79" if you were running the
 *   // Navigator on that host.
 * ```
 *
 * @return {String} external IP address
 */
function myIpAddress() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            // 8.8.8.8:53 is "Google Public DNS":
            // https://developers.google.com/speed/public-dns/
            const socket = net_1.default.connect({ host: '8.8.8.8', port: 53 });
            const onError = () => {
                // if we fail to access Google DNS (as in firewall blocks access),
                // fallback to querying IP locally
                resolve(ip_1.default.address());
            };
            socket.once('error', onError);
            socket.once('connect', () => {
                socket.removeListener('error', onError);
                const addr = socket.address();
                socket.destroy();
                if (typeof addr === 'string') {
                    resolve(addr);
                }
                else if (addr.address) {
                    resolve(addr.address);
                }
                else {
                    reject(new Error('Expected a `string`'));
                }
            });
        });
    });
}
exports.default = myIpAddress;
//# sourceMappingURL=myIpAddress.js.map
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430603, function(require, module, exports) {

/**
 * Returns true if the string matches the specified shell
 * expression.
 *
 * Actually, currently the patterns are shell expressions,
 * not regular expressions.
 *
 * Examples:
 *
 * ``` js
 * shExpMatch("http://home.netscape.com/people/ari/index.html", "*\/ari/*")
 *   // is true.
 *
 * shExpMatch("http://home.netscape.com/people/montulli/index.html", "*\/ari/*")
 *   // is false.
 * ```
 *
 * @param {String} str is any string to compare (e.g. the URL, or the hostname).
 * @param {String} shexp is a shell expression to compare against.
 * @return {Boolean} true if the string matches the shell expression.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function shExpMatch(str, shexp) {
    const re = toRegExp(shexp);
    return re.test(str);
}
exports.default = shExpMatch;
/**
 * Converts a "shell expression" to a JavaScript RegExp.
 *
 * @api private
 */
function toRegExp(str) {
    str = String(str)
        .replace(/\./g, '\\.')
        .replace(/\?/g, '.')
        .replace(/\*/g, '.*');
    return new RegExp(`^${str}$`);
}
//# sourceMappingURL=shExpMatch.js.map
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430604, function(require, module, exports) {

/**
 * True during (or between) the specified time(s).
 *
 * Even though the examples don't show it, this parameter may be present in
 * each of the different parameter profiles, always as the last parameter.
 *
 *
 * Examples:
 *
 * ``` js
 * timerange(12)
 * true from noon to 1pm.
 *
 * timerange(12, 13)
 * same as above.
 *
 * timerange(12, "GMT")
 * true from noon to 1pm, in GMT timezone.
 *
 * timerange(9, 17)
 * true from 9am to 5pm.
 *
 * timerange(8, 30, 17, 00)
 * true from 8:30am to 5:00pm.
 *
 * timerange(0, 0, 0, 0, 0, 30)
 * true between midnight and 30 seconds past midnight.
 * ```
 *
 * timeRange(hour)
 * timeRange(hour1, hour2)
 * timeRange(hour1, min1, hour2, min2)
 * timeRange(hour1, min1, sec1, hour2, min2, sec2)
 * timeRange(hour1, min1, sec1, hour2, min2, sec2, gmt)
 *
 * @param {String} hour is the hour from 0 to 23. (0 is midnight, 23 is 11 pm.)
 * @param {String} min minutes from 0 to 59.
 * @param {String} sec seconds from 0 to 59.
 * @param {String} gmt either the string "GMT" for GMT timezone, or not specified, for local timezone.
 * @return {Boolean}
 */
Object.defineProperty(exports, "__esModule", { value: true });
function timeRange() {
    // eslint-disable-next-line prefer-rest-params
    const args = Array.prototype.slice.call(arguments);
    const lastArg = args.pop();
    const useGMTzone = lastArg === 'GMT';
    const currentDate = new Date();
    if (!useGMTzone) {
        args.push(lastArg);
    }
    const noOfArgs = args.length;
    let result = false;
    let numericArgs = args.map((n) => parseInt(n, 10));
    // timeRange(hour)
    if (noOfArgs === 1) {
        result = getCurrentHour(useGMTzone, currentDate) === numericArgs[0];
        // timeRange(hour1, hour2)
    }
    else if (noOfArgs === 2) {
        const currentHour = getCurrentHour(useGMTzone, currentDate);
        result = numericArgs[0] <= currentHour && currentHour < numericArgs[1];
        // timeRange(hour1, min1, hour2, min2)
    }
    else if (noOfArgs === 4) {
        result = valueInRange(secondsElapsedToday(numericArgs[0], numericArgs[1], 0), secondsElapsedToday(getCurrentHour(useGMTzone, currentDate), getCurrentMinute(useGMTzone, currentDate), 0), secondsElapsedToday(numericArgs[2], numericArgs[3], 59));
        // timeRange(hour1, min1, sec1, hour2, min2, sec2)
    }
    else if (noOfArgs === 6) {
        result = valueInRange(secondsElapsedToday(numericArgs[0], numericArgs[1], numericArgs[2]), secondsElapsedToday(getCurrentHour(useGMTzone, currentDate), getCurrentMinute(useGMTzone, currentDate), getCurrentSecond(useGMTzone, currentDate)), secondsElapsedToday(numericArgs[3], numericArgs[4], numericArgs[5]));
    }
    return result;
}
exports.default = timeRange;
function secondsElapsedToday(hh, mm, ss) {
    return hh * 3600 + mm * 60 + ss;
}
function getCurrentHour(gmt, currentDate) {
    return gmt ? currentDate.getUTCHours() : currentDate.getHours();
}
function getCurrentMinute(gmt, currentDate) {
    return gmt ? currentDate.getUTCMinutes() : currentDate.getMinutes();
}
function getCurrentSecond(gmt, currentDate) {
    return gmt ? currentDate.getUTCSeconds() : currentDate.getSeconds();
}
// start <= value <= finish
function valueInRange(start, value, finish) {
    return start <= value && value <= finish;
}
//# sourceMappingURL=timeRange.js.map
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430605, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
/**
 * Only the first parameter is mandatory. Either the second, the third, or both
 * may be left out.
 *
 * If only one parameter is present, the function yeilds a true value on the
 * weekday that the parameter represents. If the string "GMT" is specified as
 * a second parameter, times are taken to be in GMT, otherwise in local timezone.
 *
 * If both wd1 and wd1 are defined, the condition is true if the current weekday
 * is in between those two weekdays. Bounds are inclusive. If the "GMT" parameter
 * is specified, times are taken to be in GMT, otherwise the local timezone is
 * used.
 *
 * Valid "weekday strings" are:
 *
 *     SUN MON TUE WED THU FRI SAT
 *
 * Examples:
 *
 * ``` js
 * weekdayRange("MON", "FRI")
 * true Monday trhough Friday (local timezone).
 *
 * weekdayRange("MON", "FRI", "GMT")
 * same as above, but GMT timezone.
 *
 * weekdayRange("SAT")
 * true on Saturdays local time.
 *
 * weekdayRange("SAT", "GMT")
 * true on Saturdays GMT time.
 *
 * weekdayRange("FRI", "MON")
 * true Friday through Monday (note, order does matter!).
 * ```
 *
 *
 * @param {String} wd1 one of the weekday strings.
 * @param {String} wd2 one of the weekday strings.
 * @param {String} gmt is either the string: GMT or is left out.
 * @return {Boolean}
 */
function weekdayRange(wd1, wd2, gmt) {
    let useGMTzone = false;
    let wd1Index = -1;
    let wd2Index = -1;
    let wd2IsGmt = false;
    if ((0, util_1.isGMT)(gmt)) {
        useGMTzone = true;
    }
    else if ((0, util_1.isGMT)(wd2)) {
        useGMTzone = true;
        wd2IsGmt = true;
    }
    wd1Index = weekdays.indexOf(wd1);
    if (!wd2IsGmt && isWeekday(wd2)) {
        wd2Index = weekdays.indexOf(wd2);
    }
    let todaysDay = getTodaysDay(useGMTzone);
    let result;
    if (wd2Index < 0) {
        result = todaysDay === wd1Index;
    }
    else if (wd1Index <= wd2Index) {
        result = valueInRange(wd1Index, todaysDay, wd2Index);
    }
    else {
        result =
            valueInRange(wd1Index, todaysDay, 6) ||
                valueInRange(0, todaysDay, wd2Index);
    }
    return result;
}
exports.default = weekdayRange;
function getTodaysDay(gmt) {
    return gmt ? new Date().getUTCDay() : new Date().getDay();
}
// start <= value <= finish
function valueInRange(start, value, finish) {
    return start <= value && value <= finish;
}
function isWeekday(v) {
    return weekdays.indexOf(v) !== -1;
}
//# sourceMappingURL=weekdayRange.js.map
}, function(modId) { var map = {"./util":1665830430597}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1665830430592);
})()
//miniprogram-npm-outsideDeps=["url","degenerator","dns","netmask","ip","net"]
//# sourceMappingURL=index.js.map