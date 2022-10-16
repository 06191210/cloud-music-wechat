module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1665830430566, function(require, module, exports) {
const fs = require('fs')
const path = require('path')
const { cookieToJson } = require('./util')
const request = require('./util/request')

/** @type {Record<string, any>} */
let obj = {}
fs.readdirSync(path.join(__dirname, 'module'))
  .reverse()
  .forEach((file) => {
    if (!file.endsWith('.js')) return
    let fileModule = require(path.join(__dirname, 'module', file))
    let fn = file.split('.').shift() || ''
    obj[fn] = function (data = {}) {
      if (typeof data.cookie === 'string') {
        data.cookie = cookieToJson(data.cookie)
      }
      return fileModule(
        {
          ...data,
          cookie: data.cookie ? data.cookie : {},
        },
        request,
      )
    }
  })

/**
 * @type {Record<string, any> & import("./server")}
 */
module.exports = {
  ...require('./server'),
  ...obj,
}

}, function(modId) {var map = {"./util":1665830430567,"./util/request":1665830430568,"./server":1665830430571}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430567, function(require, module, exports) {
module.exports = {
  toBoolean(val) {
    if (typeof val === 'boolean') return val
    if (val === '') return val
    return val === 'true' || val == '1'
  },
  cookieToJson(cookie) {
    if (!cookie) return {}
    let cookieArr = cookie.split(';')
    let obj = {}
    cookieArr.forEach((i) => {
      let arr = i.split('=')
      obj[arr[0]] = arr[1]
    })
    return obj
  },
  getRandom(num) {
    var random = Math.floor(
      (Math.random() + Math.floor(Math.random() * 9 + 1)) *
        Math.pow(10, num - 1),
    )
    return random
  },
}

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430568, function(require, module, exports) {
const encrypt = require('./crypto')
const axios = require('axios')
const PacProxyAgent = require('pac-proxy-agent')
const http = require('http')
const https = require('https')
const tunnel = require('tunnel')
const { URLSearchParams, URL } = require('url')
const config = require('../util/config.json')
// request.debug = true // 开启可看到更详细信息

const chooseUserAgent = (ua = false) => {
  const userAgentList = {
    mobile: [
      // iOS 13.5.1 14.0 beta with safari
      'Mozilla/5.0 (iPhone; CPU iPhone OS 13_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.',
      // iOS with qq micromsg
      'Mozilla/5.0 (iPhone; CPU iPhone OS 13_5_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML like Gecko) Mobile/14A456 QQ/6.5.7.408 V1_IPH_SQ_6.5.7_1_APP_A Pixel/750 Core/UIWebView NetType/4G Mem/103',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 13_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/7.0.15(0x17000f27) NetType/WIFI Language/zh',
      // Android -> Huawei Xiaomi
      'Mozilla/5.0 (Linux; Android 9; PCT-AL10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.64 HuaweiBrowser/10.0.3.311 Mobile Safari/537.36',
      'Mozilla/5.0 (Linux; U; Android 9; zh-cn; Redmi Note 8 Build/PKQ1.190616.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/71.0.3578.141 Mobile Safari/537.36 XiaoMi/MiuiBrowser/12.5.22',
      // Android + qq micromsg
      'Mozilla/5.0 (Linux; Android 10; YAL-AL00 Build/HUAWEIYAL-AL00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/78.0.3904.62 XWEB/2581 MMWEBSDK/200801 Mobile Safari/537.36 MMWEBID/3027 MicroMessenger/7.0.18.1740(0x27001235) Process/toolsmp WeChat/arm64 NetType/WIFI Language/zh_CN ABI/arm64',
      'Mozilla/5.0 (Linux; U; Android 8.1.0; zh-cn; BKK-AL10 Build/HONORBKK-AL10) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/66.0.3359.126 MQQBrowser/10.6 Mobile Safari/537.36',
    ],
    pc: [
      // macOS 10.15.6  Firefox / Chrome / Safari
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:80.0) Gecko/20100101 Firefox/80.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.30 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.2 Safari/605.1.15',
      // Windows 10 Firefox / Chrome / Edge
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:80.0) Gecko/20100101 Firefox/80.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.30 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/13.10586',
      // Linux 就算了
    ],
  }
  let realUserAgentList =
    userAgentList[ua] || userAgentList.mobile.concat(userAgentList.pc)
  return ['mobile', 'pc', false].indexOf(ua) > -1
    ? realUserAgentList[Math.floor(Math.random() * realUserAgentList.length)]
    : ua
}
const createRequest = (method, url, data = {}, options) => {
  return new Promise((resolve, reject) => {
    let headers = { 'User-Agent': chooseUserAgent(options.ua) }
    if (method.toUpperCase() === 'POST')
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
    if (url.includes('music.163.com'))
      headers['Referer'] = 'https://music.163.com'
    let ip = options.realIP || options.ip || ''
    // console.log(ip)
    if (ip) {
      headers['X-Real-IP'] = ip
      headers['X-Forwarded-For'] = ip
    }
    // headers['X-Real-IP'] = '118.88.88.88'
    if (typeof options.cookie === 'object') {
      options.cookie = {
        ...options.cookie,
        __remember_me: true,
        NMTID: 'xxx',
      }
      if (!options.cookie.MUSIC_U) {
        // 游客
        if (!options.cookie.MUSIC_A) {
          options.cookie.MUSIC_A = config.anonymous_token
        }
      }
      headers['Cookie'] = Object.keys(options.cookie)
        .map(
          (key) =>
            encodeURIComponent(key) +
            '=' +
            encodeURIComponent(options.cookie[key]),
        )
        .join('; ')
    } else if (options.cookie) {
      headers['Cookie'] = options.cookie
    } else {
      headers['Cookie'] = '__remember_me=true; NMTID=xxx'
    }
    // console.log(options.cookie, headers['Cookie'])
    if (options.crypto === 'weapi') {
      let csrfToken = (headers['Cookie'] || '').match(/_csrf=([^(;|$)]+)/)
      data.csrf_token = csrfToken ? csrfToken[1] : ''
      data = encrypt.weapi(data)
      url = url.replace(/\w*api/, 'weapi')
    } else if (options.crypto === 'linuxapi') {
      data = encrypt.linuxapi({
        method: method,
        url: url.replace(/\w*api/, 'api'),
        params: data,
      })
      headers['User-Agent'] =
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36'
      url = 'https://music.163.com/api/linux/forward'
    } else if (options.crypto === 'eapi') {
      const cookie = options.cookie || {}
      const csrfToken = cookie['__csrf'] || ''
      const header = {
        osver: cookie.osver, //系统版本
        deviceId: cookie.deviceId, //encrypt.base64.encode(imei + '\t02:00:00:00:00:00\t5106025eb79a5247\t70ffbaac7')
        appver: cookie.appver || '8.7.01', // app版本
        versioncode: cookie.versioncode || '140', //版本号
        mobilename: cookie.mobilename, //设备model
        buildver: cookie.buildver || Date.now().toString().substr(0, 10),
        resolution: cookie.resolution || '1920x1080', //设备分辨率
        __csrf: csrfToken,
        os: cookie.os || 'android',
        channel: cookie.channel,
        requestId: `${Date.now()}_${Math.floor(Math.random() * 1000)
          .toString()
          .padStart(4, '0')}`,
      }
      if (cookie.MUSIC_U) header['MUSIC_U'] = cookie.MUSIC_U
      if (cookie.MUSIC_A) header['MUSIC_A'] = cookie.MUSIC_A
      headers['Cookie'] = Object.keys(header)
        .map(
          (key) =>
            encodeURIComponent(key) + '=' + encodeURIComponent(header[key]),
        )
        .join('; ')
      data.header = header
      data = encrypt.eapi(options.url, data)
      url = url.replace(/\w*api/, 'eapi')
    }
    const answer = { status: 500, body: {}, cookie: [] }
    let settings = {
      method: method,
      url: url,
      headers: headers,
      data: new URLSearchParams(data).toString(),
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true }),
    }

    if (options.crypto === 'eapi') settings.encoding = null

    if (options.proxy) {
      if (options.proxy.indexOf('pac') > -1) {
        settings.httpAgent = new PacProxyAgent(options.proxy)
        settings.httpsAgent = new PacProxyAgent(options.proxy)
      } else {
        const purl = new URL(options.proxy)
        if (purl.hostname) {
          const agent = tunnel.httpsOverHttp({
            proxy: {
              host: purl.hostname,
              port: purl.port || 80,
            },
          })
          settings.httpsAgent = agent
          settings.httpAgent = agent
          settings.proxy = false
        } else {
          console.error('代理配置无效,不使用代理')
        }
      }
    } else {
      settings.proxy = false
    }
    if (options.crypto === 'eapi') {
      settings = {
        ...settings,
        responseType: 'arraybuffer',
      }
    }
    axios(settings)
      .then((res) => {
        const body = res.data
        answer.cookie = (res.headers['set-cookie'] || []).map((x) =>
          x.replace(/\s*Domain=[^(;|$)]+;*/, ''),
        )
        try {
          if (options.crypto === 'eapi') {
            answer.body = JSON.parse(encrypt.decrypt(body).toString())
          } else {
            answer.body = body
          }

          answer.status = answer.body.code || res.status
          if (
            [201, 302, 400, 502, 800, 801, 802, 803].indexOf(answer.body.code) >
            -1
          ) {
            // 特殊状态码
            answer.status = 200
          }
        } catch (e) {
          // console.log(e)
          try {
            answer.body = JSON.parse(body.toString())
          } catch (err) {
            // console.log(err)
            // can't decrypt and can't parse directly
            answer.body = body
          }
          answer.status = res.status
        }

        answer.status =
          100 < answer.status && answer.status < 600 ? answer.status : 400
        if (answer.status === 200) resolve(answer)
        else reject(answer)
      })
      .catch((err) => {
        answer.status = 502
        answer.body = { code: 502, msg: err }
        reject(answer)
      })
  })
}

module.exports = createRequest

}, function(modId) { var map = {"./crypto":1665830430569,"../util/config.json":1665830430570}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430569, function(require, module, exports) {
const crypto = require('crypto')
const iv = Buffer.from('0102030405060708')
const presetKey = Buffer.from('0CoJUm6Qyw8W8jud')
const linuxapiKey = Buffer.from('rFgB&h#%2?^eDg:Q')
const base62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const publicKey =
  '-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB\n-----END PUBLIC KEY-----'
const eapiKey = 'e82ckenh8dichen8'

const aesEncrypt = (buffer, mode, key, iv) => {
  const cipher = crypto.createCipheriv('aes-128-' + mode, key, iv)
  return Buffer.concat([cipher.update(buffer), cipher.final()])
}

const rsaEncrypt = (buffer, key) => {
  buffer = Buffer.concat([Buffer.alloc(128 - buffer.length), buffer])
  return crypto.publicEncrypt(
    { key: key, padding: crypto.constants.RSA_NO_PADDING },
    buffer,
  )
}

const weapi = (object) => {
  const text = JSON.stringify(object)
  const secretKey = crypto
    .randomBytes(16)
    .map((n) => base62.charAt(n % 62).charCodeAt())
  return {
    params: aesEncrypt(
      Buffer.from(
        aesEncrypt(Buffer.from(text), 'cbc', presetKey, iv).toString('base64'),
      ),
      'cbc',
      secretKey,
      iv,
    ).toString('base64'),
    encSecKey: rsaEncrypt(secretKey.reverse(), publicKey).toString('hex'),
  }
}

const linuxapi = (object) => {
  const text = JSON.stringify(object)
  return {
    eparams: aesEncrypt(Buffer.from(text), 'ecb', linuxapiKey, '')
      .toString('hex')
      .toUpperCase(),
  }
}

const eapi = (url, object) => {
  const text = typeof object === 'object' ? JSON.stringify(object) : object
  const message = `nobody${url}use${text}md5forencrypt`
  const digest = crypto.createHash('md5').update(message).digest('hex')
  const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`
  return {
    params: aesEncrypt(Buffer.from(data), 'ecb', eapiKey, '')
      .toString('hex')
      .toUpperCase(),
  }
}

const decrypt = (cipherBuffer) => {
  const decipher = crypto.createDecipheriv('aes-128-ecb', eapiKey, '')
  return Buffer.concat([decipher.update(cipherBuffer), decipher.final()])
}

module.exports = { weapi, linuxapi, eapi, decrypt }

}, function(modId) { var map = {"crypto":1665830430569}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430570, function(require, module, exports) {
module.exports = {
  "anonymous_token": "bf8bfeabb1aa84f9c8c3906c04a04fb864322804c83f5d607e91a04eae463c9436bd1a17ec353cf780b396507a3f7464e8a60f4bbc019437993166e004087dd32d1490298caf655c2353e58daa0bc13cc7d5c198250968580b12c1b8817e3f5c807e650dd04abd3fb8130b7ae43fcc5b",
  "resourceTypeMap": {
    "0": "R_SO_4_",
    "1": "R_MV_5_",
    "2": "A_PL_0_",
    "3": "R_AL_3_",
    "4": "A_DJ_1_",
    "5": "R_VI_62_",
    "6": "A_EV_2_",
    "7": "A_DR_14_"
  }
}
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430571, function(require, module, exports) {
const fs = require('fs')
const path = require('path')
const express = require('express')
const request = require('./util/request')
const packageJSON = require('./package.json')
const exec = require('child_process').exec
const cache = require('./util/apicache').middleware
const { cookieToJson } = require('./util/index')
const fileUpload = require('express-fileupload')
const decode = require('safe-decode-uri-component')

/**
 * The version check result.
 * @readonly
 * @enum {number}
 */
const VERSION_CHECK_RESULT = {
  FAILED: -1,
  NOT_LATEST: 0,
  LATEST: 1,
}

/**
 * @typedef {{
 *   identifier?: string,
 *   route: string,
 *   module: any
 * }} ModuleDefinition
 */

/**
 * @typedef {{
 *   port?: number,
 *   host?: string,
 *   checkVersion?: boolean,
 *   moduleDefs?: ModuleDefinition[]
 * }} NcmApiOptions
 */

/**
 * @typedef {{
 *   status: VERSION_CHECK_RESULT,
 *   ourVersion?: string,
 *   npmVersion?: string,
 * }} VersionCheckResult
 */

/**
 * @typedef {{
 *  server?: import('http').Server,
 * }} ExpressExtension
 */

/**
 * Get the module definitions dynamically.
 *
 * @param {string} modulesPath The path to modules (JS).
 * @param {Record<string, string>} [specificRoute] The specific route of specific modules.
 * @param {boolean} [doRequire] If true, require() the module directly.
 * Otherwise, print out the module path. Default to true.
 * @returns {Promise<ModuleDefinition[]>} The module definitions.
 *
 * @example getModuleDefinitions("./module", {"album_new.js": "/album/create"})
 */
async function getModulesDefinitions(
  modulesPath,
  specificRoute,
  doRequire = true,
) {
  const files = await fs.promises.readdir(modulesPath)
  const parseRoute = (/** @type {string} */ fileName) =>
    specificRoute && fileName in specificRoute
      ? specificRoute[fileName]
      : `/${fileName.replace(/\.js$/i, '').replace(/_/g, '/')}`

  const modules = files
    .reverse()
    .filter((file) => file.endsWith('.js'))
    .map((file) => {
      const identifier = file.split('.').shift()
      const route = parseRoute(file)
      const modulePath = path.join(modulesPath, file)
      const module = doRequire ? require(modulePath) : modulePath

      return { identifier, route, module }
    })

  return modules
}

/**
 * Check if the version of this API is latest.
 *
 * @returns {Promise<VersionCheckResult>} If true, this API is up-to-date;
 * otherwise, this API should be upgraded and you would
 * need to notify users to upgrade it manually.
 */
async function checkVersion() {
  return new Promise((resolve) => {
    exec('npm info NeteaseCloudMusicApi version', (err, stdout) => {
      if (!err) {
        let version = stdout.trim()

        /**
         * @param {VERSION_CHECK_RESULT} status
         */
        const resolveStatus = (status) =>
          resolve({
            status,
            ourVersion: packageJSON.version,
            npmVersion: version,
          })

        resolveStatus(
          packageJSON.version < version
            ? VERSION_CHECK_RESULT.NOT_LATEST
            : VERSION_CHECK_RESULT.LATEST,
        )
      }
    })

    resolve({
      status: VERSION_CHECK_RESULT.FAILED,
    })
  })
}

/**
 * Construct the server of NCM API.
 *
 * @param {ModuleDefinition[]} [moduleDefs] Customized module definitions [advanced]
 * @returns {Promise<import("express").Express>} The server instance.
 */
async function consturctServer(moduleDefs) {
  const app = express()
  app.set('trust proxy', true)

  /**
   * CORS & Preflight request
   */
  app.use((req, res, next) => {
    if (req.path !== '/' && !req.path.includes('.')) {
      res.set({
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Origin': req.headers.origin || '*',
        'Access-Control-Allow-Headers': 'X-Requested-With,Content-Type',
        'Access-Control-Allow-Methods': 'PUT,POST,GET,DELETE,OPTIONS',
        'Content-Type': 'application/json; charset=utf-8',
      })
    }
    req.method === 'OPTIONS' ? res.status(204).end() : next()
  })

  /**
   * Cookie Parser
   */
  app.use((req, _, next) => {
    req.cookies = {}
    //;(req.headers.cookie || '').split(/\s*;\s*/).forEach((pair) => { //  Polynomial regular expression //
    ;(req.headers.cookie || '').split(/;\s+|(?<!\s)\s+$/g).forEach((pair) => {
      let crack = pair.indexOf('=')
      if (crack < 1 || crack == pair.length - 1) return
      req.cookies[decode(pair.slice(0, crack)).trim()] = decode(
        pair.slice(crack + 1),
      ).trim()
    })
    next()
  })

  /**
   * Body Parser and File Upload
   */
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))

  app.use(fileUpload())

  /**
   * Serving static files
   */
  app.use(express.static(path.join(__dirname, 'public')))

  /**
   * Cache
   */
  app.use(cache('2 minutes', (_, res) => res.statusCode === 200))

  /**
   * Special Routers
   */
  const special = {
    'daily_signin.js': '/daily_signin',
    'fm_trash.js': '/fm_trash',
    'personal_fm.js': '/personal_fm',
  }

  /**
   * Load every modules in this directory
   */
  const moduleDefinitions =
    moduleDefs ||
    (await getModulesDefinitions(path.join(__dirname, 'module'), special))

  for (const moduleDef of moduleDefinitions) {
    // Register the route.
    app.use(moduleDef.route, async (req, res) => {
      ;[req.query, req.body].forEach((item) => {
        if (typeof item.cookie === 'string') {
          item.cookie = cookieToJson(decode(item.cookie))
        }
      })

      let query = Object.assign(
        {},
        { cookie: req.cookies },
        req.query,
        req.body,
        req.files,
      )

      try {
        const moduleResponse = await moduleDef.module(query, (...params) => {
          // 参数注入客户端IP
          const obj = [...params]
          let ip = req.ip

          if (ip.substr(0, 7) == '::ffff:') {
            ip = ip.substr(7)
          }
          // console.log(ip)
          obj[3] = {
            ...obj[3],
            ip,
          }
          return request(...obj)
        })
        console.log('[OK]', decode(req.originalUrl))

        const cookies = moduleResponse.cookie
        if (Array.isArray(cookies) && cookies.length > 0) {
          if (req.protocol === 'https') {
            // Try to fix CORS SameSite Problem
            res.append(
              'Set-Cookie',
              cookies.map((cookie) => {
                return cookie + '; SameSite=None; Secure'
              }),
            )
          } else {
            res.append('Set-Cookie', cookies)
          }
        }
        res.status(moduleResponse.status).send(moduleResponse.body)
      } catch (/** @type {*} */ moduleResponse) {
        console.log('[ERR]', decode(req.originalUrl), {
          status: moduleResponse.status,
          body: moduleResponse.body,
        })
        if (!moduleResponse.body) {
          res.status(404).send({
            code: 404,
            data: null,
            msg: 'Not Found',
          })
          return
        }
        if (moduleResponse.body.code == '301')
          moduleResponse.body.msg = '需要登录'
        res.append('Set-Cookie', moduleResponse.cookie)
        res.status(moduleResponse.status).send(moduleResponse.body)
      }
    })
  }

  return app
}

/**
 * Serve the NCM API.
 * @param {NcmApiOptions} options
 * @returns {Promise<import('express').Express & ExpressExtension>}
 */
async function serveNcmApi(options) {
  const port = Number(options.port || process.env.PORT || '3000')
  const host = options.host || process.env.HOST || ''

  const checkVersionSubmission =
    options.checkVersion &&
    checkVersion().then(({ npmVersion, ourVersion, status }) => {
      if (status == VERSION_CHECK_RESULT.NOT_LATEST) {
        console.log(
          `最新版本: ${npmVersion}, 当前版本: ${ourVersion}, 请及时更新`,
        )
      }
    })
  const constructServerSubmission = consturctServer(options.moduleDefs)

  const [_, app] = await Promise.all([
    checkVersionSubmission,
    constructServerSubmission,
  ])

  /** @type {import('express').Express & ExpressExtension} */
  const appExt = app
  appExt.server = app.listen(port, host, () => {
    console.log(`server running @ http://${host ? host : 'localhost'}:${port}`)
  })

  return appExt
}

module.exports = {
  serveNcmApi,
  getModulesDefinitions,
}

}, function(modId) { var map = {"./util/request":1665830430568,"./package.json":1665830430572,"./util/apicache":1665830430573,"./util/index":1665830430567}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430572, function(require, module, exports) {
module.exports = {
  "name": "NeteaseCloudMusicApi",
  "version": "4.8.2",
  "description": "网易云音乐 NodeJS 版 API",
  "scripts": {
    "start": "node app.js",
    "test": "mocha -r intelli-espower-loader -t 30000 server.test.js main.test.js --exit",
    "lint": "eslint \"**/*.{js,ts}\"",
    "lint-fix": "eslint --fix \"**/*.{js,ts}\"",
    "prepare": "husky install",
    "pkgwin": "pkg . -t node14-win-x64 -o app",
    "pkglinux": "pkg . -t node14-linux-x64 -o app",
    "pkgmacos": "pkg . -t node14-macos-x64 -o app"
  },
  "bin": "./app.js",
  "pkg": {
    "scripts": "module/*.js",
    "assets": [
      "/node_modules/vm2/lib/contextify.js",
      "/public"
    ]
  },
  "keywords": [
    "网易云音乐",
    "网易云",
    "音乐",
    "网易云音乐nodejs"
  ],
  "main": "main.js",
  "types": "./interface.d.ts",
  "engines": {
    "node": ">=12"
  },
  "lint-staged": {
    "*.js": [
      "eslint --fix",
      "git add"
    ]
  },
  "author": "binaryify",
  "license": "MIT",
  "files": [
    "module",
    "util",
    "plugins",
    "main.d.ts",
    "interface.d.ts",
    "module_types",
    "server.js",
    "generateConfig.js",
    "public"
  ],
  "dependencies": {
    "axios": "^0.24.0",
    "express": "^4.17.1",
    "express-fileupload": "^1.1.9",
    "md5": "^2.3.0",
    "music-metadata": "^7.5.3",
    "pac-proxy-agent": "^5.0.0",
    "qrcode": "^1.4.4",
    "safe-decode-uri-component": "^1.2.1",
    "tunnel": "^0.0.6",
    "yargs": "^17.1.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.13",
    "@types/express-fileupload": "^1.2.2",
    "@types/mocha": "^9.1.0",
    "@types/node": "16.11.19",
    "@typescript-eslint/eslint-plugin": "5.0.0",
    "@typescript-eslint/parser": "5.0.0",
    "eslint": "8.7.0",
    "eslint-config-prettier": "8.5.0",
    "eslint-plugin-html": "6.2.0",
    "eslint-plugin-prettier": "4.0.0",
    "husky": "7.0.4",
    "intelli-espower-loader": "1.1.0",
    "lint-staged": "12.1.7",
    "mocha": "10.0.0",
    "power-assert": "1.6.1",
    "prettier": "2.7.1",
    "typescript": "4.5.2"
  }
}

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430573, function(require, module, exports) {
var url = require('url')
var MemoryCache = require('./memory-cache')

var t = {
  ms: 1,
  second: 1000,
  minute: 60000,
  hour: 3600000,
  day: 3600000 * 24,
  week: 3600000 * 24 * 7,
  month: 3600000 * 24 * 30,
}

var instances = []

var matches = function (a) {
  return function (b) {
    return a === b
  }
}

var doesntMatch = function (a) {
  return function (b) {
    return !matches(a)(b)
  }
}

var logDuration = function (d, prefix) {
  var str = d > 1000 ? (d / 1000).toFixed(2) + 'sec' : d + 'ms'
  return '\x1b[33m- ' + (prefix ? prefix + ' ' : '') + str + '\x1b[0m'
}

function getSafeHeaders(res) {
  return res.getHeaders ? res.getHeaders() : res._headers
}

function ApiCache() {
  var memCache = new MemoryCache()

  var globalOptions = {
    debug: false,
    defaultDuration: 3600000,
    enabled: true,
    appendKey: [],
    jsonp: false,
    redisClient: false,
    headerBlacklist: [],
    statusCodes: {
      include: [],
      exclude: [],
    },
    events: {
      expire: undefined,
    },
    headers: {
      // 'cache-control':  'no-cache' // example of header overwrite
    },
    trackPerformance: false,
  }

  var middlewareOptions = []
  var instance = this
  var index = null
  var timers = {}
  var performanceArray = [] // for tracking cache hit rate

  instances.push(this)
  this.id = instances.length

  function debug(a, b, c, d) {
    var arr = ['\x1b[36m[apicache]\x1b[0m', a, b, c, d].filter(function (arg) {
      return arg !== undefined
    })
    var debugEnv =
      process.env.DEBUG &&
      process.env.DEBUG.split(',').indexOf('apicache') !== -1

    return (globalOptions.debug || debugEnv) && console.log.apply(null, arr)
  }

  function shouldCacheResponse(request, response, toggle) {
    var opt = globalOptions
    var codes = opt.statusCodes

    if (!response) return false

    if (toggle && !toggle(request, response)) {
      return false
    }

    if (
      codes.exclude &&
      codes.exclude.length &&
      codes.exclude.indexOf(response.statusCode) !== -1
    )
      return false
    if (
      codes.include &&
      codes.include.length &&
      codes.include.indexOf(response.statusCode) === -1
    )
      return false

    return true
  }

  function addIndexEntries(key, req) {
    var groupName = req.apicacheGroup

    if (groupName) {
      debug('group detected "' + groupName + '"')
      var group = (index.groups[groupName] = index.groups[groupName] || [])
      group.unshift(key)
    }

    index.all.unshift(key)
  }

  function filterBlacklistedHeaders(headers) {
    return Object.keys(headers)
      .filter(function (key) {
        return globalOptions.headerBlacklist.indexOf(key) === -1
      })
      .reduce(function (acc, header) {
        acc[header] = headers[header]
        return acc
      }, {})
  }

  function createCacheObject(status, headers, data, encoding) {
    return {
      status: status,
      headers: filterBlacklistedHeaders(headers),
      data: data,
      encoding: encoding,
      timestamp: new Date().getTime() / 1000, // seconds since epoch.  This is used to properly decrement max-age headers in cached responses.
    }
  }

  function cacheResponse(key, value, duration) {
    var redis = globalOptions.redisClient
    var expireCallback = globalOptions.events.expire

    if (redis && redis.connected) {
      try {
        redis.hset(key, 'response', JSON.stringify(value))
        redis.hset(key, 'duration', duration)
        redis.expire(key, duration / 1000, expireCallback || function () {})
      } catch (err) {
        debug('[apicache] error in redis.hset()')
      }
    } else {
      memCache.add(key, value, duration, expireCallback)
    }

    // add automatic cache clearing from duration, includes max limit on setTimeout
    timers[key] = setTimeout(function () {
      instance.clear(key, true)
    }, Math.min(duration, 2147483647))
  }

  function accumulateContent(res, content) {
    if (content) {
      if (typeof content == 'string') {
        res._apicache.content = (res._apicache.content || '') + content
      } else if (Buffer.isBuffer(content)) {
        var oldContent = res._apicache.content

        if (typeof oldContent === 'string') {
          oldContent = !Buffer.from
            ? new Buffer(oldContent)
            : Buffer.from(oldContent)
        }

        if (!oldContent) {
          oldContent = !Buffer.alloc ? new Buffer(0) : Buffer.alloc(0)
        }

        res._apicache.content = Buffer.concat(
          [oldContent, content],
          oldContent.length + content.length,
        )
      } else {
        res._apicache.content = content
      }
    }
  }

  function makeResponseCacheable(
    req,
    res,
    next,
    key,
    duration,
    strDuration,
    toggle,
  ) {
    // monkeypatch res.end to create cache object
    res._apicache = {
      write: res.write,
      writeHead: res.writeHead,
      end: res.end,
      cacheable: true,
      content: undefined,
    }

    // append header overwrites if applicable
    Object.keys(globalOptions.headers).forEach(function (name) {
      res.setHeader(name, globalOptions.headers[name])
    })

    res.writeHead = function () {
      // add cache control headers
      if (!globalOptions.headers['cache-control']) {
        if (shouldCacheResponse(req, res, toggle)) {
          res.setHeader(
            'cache-control',
            'max-age=' + (duration / 1000).toFixed(0),
          )
        } else {
          res.setHeader('cache-control', 'no-cache, no-store, must-revalidate')
        }
      }

      res._apicache.headers = Object.assign({}, getSafeHeaders(res))
      return res._apicache.writeHead.apply(this, arguments)
    }

    // patch res.write
    res.write = function (content) {
      accumulateContent(res, content)
      return res._apicache.write.apply(this, arguments)
    }

    // patch res.end
    res.end = function (content, encoding) {
      if (shouldCacheResponse(req, res, toggle)) {
        accumulateContent(res, content)

        if (res._apicache.cacheable && res._apicache.content) {
          addIndexEntries(key, req)
          var headers = res._apicache.headers || getSafeHeaders(res)
          var cacheObject = createCacheObject(
            res.statusCode,
            headers,
            res._apicache.content,
            encoding,
          )
          cacheResponse(key, cacheObject, duration)

          // display log entry
          var elapsed = new Date() - req.apicacheTimer
          debug(
            'adding cache entry for "' + key + '" @ ' + strDuration,
            logDuration(elapsed),
          )
          debug('_apicache.headers: ', res._apicache.headers)
          debug('res.getHeaders(): ', getSafeHeaders(res))
          debug('cacheObject: ', cacheObject)
        }
      }

      return res._apicache.end.apply(this, arguments)
    }

    next()
  }

  function sendCachedResponse(
    request,
    response,
    cacheObject,
    toggle,
    next,
    duration,
  ) {
    if (toggle && !toggle(request, response)) {
      return next()
    }

    var headers = getSafeHeaders(response)

    Object.assign(
      headers,
      filterBlacklistedHeaders(cacheObject.headers || {}),
      {
        // set properly-decremented max-age header.  This ensures that max-age is in sync with the cache expiration.
        'cache-control':
          'max-age=' +
          Math.max(
            0,
            (
              duration / 1000 -
              (new Date().getTime() / 1000 - cacheObject.timestamp)
            ).toFixed(0),
          ),
      },
    )

    // only embed apicache headers when not in production environment

    // unstringify buffers
    var data = cacheObject.data
    if (data && data.type === 'Buffer') {
      data =
        typeof data.data === 'number'
          ? new Buffer.alloc(data.data)
          : new Buffer.from(data.data)
    }

    // test Etag against If-None-Match for 304
    var cachedEtag = cacheObject.headers.etag
    var requestEtag = request.headers['if-none-match']

    if (requestEtag && cachedEtag === requestEtag) {
      response.writeHead(304, headers)
      return response.end()
    }

    response.writeHead(cacheObject.status || 200, headers)

    return response.end(data, cacheObject.encoding)
  }

  function syncOptions() {
    for (var i in middlewareOptions) {
      Object.assign(
        middlewareOptions[i].options,
        globalOptions,
        middlewareOptions[i].localOptions,
      )
    }
  }

  this.clear = function (target, isAutomatic) {
    var group = index.groups[target]
    var redis = globalOptions.redisClient

    if (group) {
      debug('clearing group "' + target + '"')

      group.forEach(function (key) {
        debug('clearing cached entry for "' + key + '"')
        clearTimeout(timers[key])
        delete timers[key]
        if (!globalOptions.redisClient) {
          memCache.delete(key)
        } else {
          try {
            redis.del(key)
          } catch (err) {
            console.log('[apicache] error in redis.del("' + key + '")')
          }
        }
        index.all = index.all.filter(doesntMatch(key))
      })

      delete index.groups[target]
    } else if (target) {
      debug(
        'clearing ' +
          (isAutomatic ? 'expired' : 'cached') +
          ' entry for "' +
          target +
          '"',
      )
      clearTimeout(timers[target])
      delete timers[target]
      // clear actual cached entry
      if (!redis) {
        memCache.delete(target)
      } else {
        try {
          redis.del(target)
        } catch (err) {
          console.log('[apicache] error in redis.del("' + target + '")')
        }
      }

      // remove from global index
      index.all = index.all.filter(doesntMatch(target))

      // remove target from each group that it may exist in
      Object.keys(index.groups).forEach(function (groupName) {
        index.groups[groupName] = index.groups[groupName].filter(
          doesntMatch(target),
        )

        // delete group if now empty
        if (!index.groups[groupName].length) {
          delete index.groups[groupName]
        }
      })
    } else {
      debug('clearing entire index')

      if (!redis) {
        memCache.clear()
      } else {
        // clear redis keys one by one from internal index to prevent clearing non-apicache entries
        index.all.forEach(function (key) {
          clearTimeout(timers[key])
          delete timers[key]
          try {
            redis.del(key)
          } catch (err) {
            console.log('[apicache] error in redis.del("' + key + '")')
          }
        })
      }
      this.resetIndex()
    }

    return this.getIndex()
  }

  function parseDuration(duration, defaultDuration) {
    if (typeof duration === 'number') return duration

    if (typeof duration === 'string') {
      var split = duration.match(/^([\d\.,]+)\s?(\w+)$/)

      if (split.length === 3) {
        var len = parseFloat(split[1])
        var unit = split[2].replace(/s$/i, '').toLowerCase()
        if (unit === 'm') {
          unit = 'ms'
        }

        return (len || 1) * (t[unit] || 0)
      }
    }

    return defaultDuration
  }

  this.getDuration = function (duration) {
    return parseDuration(duration, globalOptions.defaultDuration)
  }

  /**
   * Return cache performance statistics (hit rate).  Suitable for putting into a route:
   * <code>
   * app.get('/api/cache/performance', (req, res) => {
   *    res.json(apicache.getPerformance())
   * })
   * </code>
   */
  this.getPerformance = function () {
    return performanceArray.map(function (p) {
      return p.report()
    })
  }

  this.getIndex = function (group) {
    if (group) {
      return index.groups[group]
    } else {
      return index
    }
  }

  this.middleware = function cache(
    strDuration,
    middlewareToggle,
    localOptions,
  ) {
    var duration = instance.getDuration(strDuration)
    var opt = {}

    middlewareOptions.push({
      options: opt,
    })

    var options = function (localOptions) {
      if (localOptions) {
        middlewareOptions.find(function (middleware) {
          return middleware.options === opt
        }).localOptions = localOptions
      }

      syncOptions()

      return opt
    }

    options(localOptions)

    /**
     * A Function for non tracking performance
     */
    function NOOPCachePerformance() {
      this.report = this.hit = this.miss = function () {} // noop;
    }

    /**
     * A function for tracking and reporting hit rate.  These statistics are returned by the getPerformance() call above.
     */
    function CachePerformance() {
      /**
       * Tracks the hit rate for the last 100 requests.
       * If there have been fewer than 100 requests, the hit rate just considers the requests that have happened.
       */
      this.hitsLast100 = new Uint8Array(100 / 4) // each hit is 2 bits

      /**
       * Tracks the hit rate for the last 1000 requests.
       * If there have been fewer than 1000 requests, the hit rate just considers the requests that have happened.
       */
      this.hitsLast1000 = new Uint8Array(1000 / 4) // each hit is 2 bits

      /**
       * Tracks the hit rate for the last 10000 requests.
       * If there have been fewer than 10000 requests, the hit rate just considers the requests that have happened.
       */
      this.hitsLast10000 = new Uint8Array(10000 / 4) // each hit is 2 bits

      /**
       * Tracks the hit rate for the last 100000 requests.
       * If there have been fewer than 100000 requests, the hit rate just considers the requests that have happened.
       */
      this.hitsLast100000 = new Uint8Array(100000 / 4) // each hit is 2 bits

      /**
       * The number of calls that have passed through the middleware since the server started.
       */
      this.callCount = 0

      /**
       * The total number of hits since the server started
       */
      this.hitCount = 0

      /**
       * The key from the last cache hit.  This is useful in identifying which route these statistics apply to.
       */
      this.lastCacheHit = null

      /**
       * The key from the last cache miss.  This is useful in identifying which route these statistics apply to.
       */
      this.lastCacheMiss = null

      /**
       * Return performance statistics
       */
      this.report = function () {
        return {
          lastCacheHit: this.lastCacheHit,
          lastCacheMiss: this.lastCacheMiss,
          callCount: this.callCount,
          hitCount: this.hitCount,
          missCount: this.callCount - this.hitCount,
          hitRate: this.callCount == 0 ? null : this.hitCount / this.callCount,
          hitRateLast100: this.hitRate(this.hitsLast100),
          hitRateLast1000: this.hitRate(this.hitsLast1000),
          hitRateLast10000: this.hitRate(this.hitsLast10000),
          hitRateLast100000: this.hitRate(this.hitsLast100000),
        }
      }

      /**
       * Computes a cache hit rate from an array of hits and misses.
       * @param {Uint8Array} array An array representing hits and misses.
       * @returns a number between 0 and 1, or null if the array has no hits or misses
       */
      this.hitRate = function (array) {
        var hits = 0
        var misses = 0
        for (var i = 0; i < array.length; i++) {
          var n8 = array[i]
          for (j = 0; j < 4; j++) {
            switch (n8 & 3) {
              case 1:
                hits++
                break
              case 2:
                misses++
                break
            }
            n8 >>= 2
          }
        }
        var total = hits + misses
        if (total == 0) return null
        return hits / total
      }

      /**
       * Record a hit or miss in the given array.  It will be recorded at a position determined
       * by the current value of the callCount variable.
       * @param {Uint8Array} array An array representing hits and misses.
       * @param {boolean} hit true for a hit, false for a miss
       * Each element in the array is 8 bits, and encodes 4 hit/miss records.
       * Each hit or miss is encoded as to bits as follows:
       * 00 means no hit or miss has been recorded in these bits
       * 01 encodes a hit
       * 10 encodes a miss
       */
      this.recordHitInArray = function (array, hit) {
        var arrayIndex = ~~(this.callCount / 4) % array.length
        var bitOffset = (this.callCount % 4) * 2 // 2 bits per record, 4 records per uint8 array element
        var clearMask = ~(3 << bitOffset)
        var record = (hit ? 1 : 2) << bitOffset
        array[arrayIndex] = (array[arrayIndex] & clearMask) | record
      }

      /**
       * Records the hit or miss in the tracking arrays and increments the call count.
       * @param {boolean} hit true records a hit, false records a miss
       */
      this.recordHit = function (hit) {
        this.recordHitInArray(this.hitsLast100, hit)
        this.recordHitInArray(this.hitsLast1000, hit)
        this.recordHitInArray(this.hitsLast10000, hit)
        this.recordHitInArray(this.hitsLast100000, hit)
        if (hit) this.hitCount++
        this.callCount++
      }

      /**
       * Records a hit event, setting lastCacheMiss to the given key
       * @param {string} key The key that had the cache hit
       */
      this.hit = function (key) {
        this.recordHit(true)
        this.lastCacheHit = key
      }

      /**
       * Records a miss event, setting lastCacheMiss to the given key
       * @param {string} key The key that had the cache miss
       */
      this.miss = function (key) {
        this.recordHit(false)
        this.lastCacheMiss = key
      }
    }

    var perf = globalOptions.trackPerformance
      ? new CachePerformance()
      : new NOOPCachePerformance()

    performanceArray.push(perf)

    var cache = function (req, res, next) {
      function bypass() {
        debug('bypass detected, skipping cache.')
        return next()
      }

      // initial bypass chances
      if (!opt.enabled) return bypass()
      if (
        req.headers['x-apicache-bypass'] ||
        req.headers['x-apicache-force-fetch']
      )
        return bypass()

      // REMOVED IN 0.11.1 TO CORRECT MIDDLEWARE TOGGLE EXECUTE ORDER
      // if (typeof middlewareToggle === 'function') {
      //   if (!middlewareToggle(req, res)) return bypass()
      // } else if (middlewareToggle !== undefined && !middlewareToggle) {
      //   return bypass()
      // }

      // embed timer
      req.apicacheTimer = new Date()

      // In Express 4.x the url is ambigious based on where a router is mounted.  originalUrl will give the full Url
      var key = req.originalUrl || req.url

      // Remove querystring from key if jsonp option is enabled
      if (opt.jsonp) {
        key = url.parse(key).pathname
      }

      // add appendKey (either custom function or response path)
      if (typeof opt.appendKey === 'function') {
        key += '$$appendKey=' + opt.appendKey(req, res)
      } else if (opt.appendKey.length > 0) {
        var appendKey = req

        for (var i = 0; i < opt.appendKey.length; i++) {
          appendKey = appendKey[opt.appendKey[i]]
        }
        key += '$$appendKey=' + appendKey
      }

      // attempt cache hit
      var redis = opt.redisClient
      var cached = !redis ? memCache.getValue(key) : null

      // send if cache hit from memory-cache
      if (cached) {
        var elapsed = new Date() - req.apicacheTimer
        debug(
          'sending cached (memory-cache) version of',
          key,
          logDuration(elapsed),
        )

        perf.hit(key)
        return sendCachedResponse(
          req,
          res,
          cached,
          middlewareToggle,
          next,
          duration,
        )
      }

      // send if cache hit from redis
      if (redis && redis.connected) {
        try {
          redis.hgetall(key, function (err, obj) {
            if (!err && obj && obj.response) {
              var elapsed = new Date() - req.apicacheTimer
              debug(
                'sending cached (redis) version of',
                key,
                logDuration(elapsed),
              )

              perf.hit(key)
              return sendCachedResponse(
                req,
                res,
                JSON.parse(obj.response),
                middlewareToggle,
                next,
                duration,
              )
            } else {
              perf.miss(key)
              return makeResponseCacheable(
                req,
                res,
                next,
                key,
                duration,
                strDuration,
                middlewareToggle,
              )
            }
          })
        } catch (err) {
          // bypass redis on error
          perf.miss(key)
          return makeResponseCacheable(
            req,
            res,
            next,
            key,
            duration,
            strDuration,
            middlewareToggle,
          )
        }
      } else {
        perf.miss(key)
        return makeResponseCacheable(
          req,
          res,
          next,
          key,
          duration,
          strDuration,
          middlewareToggle,
        )
      }
    }

    cache.options = options

    return cache
  }

  this.options = function (options) {
    if (options) {
      Object.assign(globalOptions, options)
      syncOptions()

      if ('defaultDuration' in options) {
        // Convert the default duration to a number in milliseconds (if needed)
        globalOptions.defaultDuration = parseDuration(
          globalOptions.defaultDuration,
          3600000,
        )
      }

      if (globalOptions.trackPerformance) {
        debug(
          'WARNING: using trackPerformance flag can cause high memory usage!',
        )
      }

      return this
    } else {
      return globalOptions
    }
  }

  this.resetIndex = function () {
    index = {
      all: [],
      groups: {},
    }
  }

  this.newInstance = function (config) {
    var instance = new ApiCache()

    if (config) {
      instance.options(config)
    }

    return instance
  }

  this.clone = function () {
    return this.newInstance(this.options())
  }

  // initialize index
  this.resetIndex()
}

module.exports = new ApiCache()

}, function(modId) { var map = {"./memory-cache":1665830430574}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430574, function(require, module, exports) {
function MemoryCache() {
  this.cache = {}
  this.size = 0
}

MemoryCache.prototype.add = function (key, value, time, timeoutCallback) {
  var old = this.cache[key]
  var instance = this

  var entry = {
    value: value,
    expire: time + Date.now(),
    timeout: setTimeout(function () {
      instance.delete(key)
      return (
        timeoutCallback &&
        typeof timeoutCallback === 'function' &&
        timeoutCallback(value, key)
      )
    }, time),
  }

  this.cache[key] = entry
  this.size = Object.keys(this.cache).length

  return entry
}

MemoryCache.prototype.delete = function (key) {
  var entry = this.cache[key]

  if (entry) {
    clearTimeout(entry.timeout)
  }

  delete this.cache[key]

  this.size = Object.keys(this.cache).length

  return null
}

MemoryCache.prototype.get = function (key) {
  var entry = this.cache[key]

  return entry
}

MemoryCache.prototype.getValue = function (key) {
  var entry = this.get(key)

  return entry && entry.value
}

MemoryCache.prototype.clear = function () {
  Object.keys(this.cache).forEach(function (key) {
    this.delete(key)
  }, this)

  return true
}

module.exports = MemoryCache

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1665830430566);
})()
//miniprogram-npm-outsideDeps=["fs","path","axios","pac-proxy-agent","http","https","tunnel","url","express","child_process","express-fileupload","safe-decode-uri-component"]
//# sourceMappingURL=index.js.map