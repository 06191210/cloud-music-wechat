module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1665830430325, function(require, module, exports) {


const path = require('path');
const processMultipart = require('./processMultipart');
const isEligibleRequest = require('./isEligibleRequest');
const { buildOptions, debugLog } = require('./utilities');
const busboy = require('busboy'); // eslint-disable-line no-unused-vars

const DEFAULT_OPTIONS = {
  debug: false,
  uploadTimeout: 60000,
  fileHandler: false,
  uriDecodeFileNames: false,
  safeFileNames: false,
  preserveExtension: false,
  abortOnLimit: false,
  responseOnLimit: 'File size limit has been reached',
  limitHandler: false,
  createParentPath: false,
  parseNested: false,
  useTempFiles: false,
  tempFileDir: path.join(process.cwd(), 'tmp')
};

/**
 * Expose the file upload middleware
 * @param {DEFAULT_OPTIONS & busboy.BusboyConfig} options - Middleware options.
 * @returns {Function} - express-fileupload middleware.
 */
module.exports = (options) => {
  const uploadOptions = buildOptions(DEFAULT_OPTIONS, options);
  return (req, res, next) => {
    if (!isEligibleRequest(req)) {
      debugLog(uploadOptions, 'Request is not eligible for file upload!');
      return next();
    }
    processMultipart(uploadOptions, req, res, next);
  };
};

}, function(modId) {var map = {"./processMultipart":1665830430326,"./isEligibleRequest":1665830430333,"./utilities":1665830430329}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430326, function(require, module, exports) {
const Busboy = require('busboy');
const UploadTimer = require('./uploadtimer');
const fileFactory = require('./fileFactory');
const memHandler = require('./memHandler');
const tempFileHandler = require('./tempFileHandler');
const processNested = require('./processNested');
const {
  isFunc,
  debugLog,
  buildFields,
  buildOptions,
  parseFileName
} = require('./utilities');

const waitFlushProperty = Symbol('wait flush property symbol');

/**
 * Processes multipart request
 * Builds a req.body object for fields
 * Builds a req.files object for files
 * @param  {Object}   options expressFileupload and Busboy options
 * @param  {Object}   req     Express request object
 * @param  {Object}   res     Express response object
 * @param  {Function} next    Express next method
 * @return {void}
 */
module.exports = (options, req, res, next) => {
  req.files = null;

  // Build busboy options and init busboy instance.
  const busboyOptions = buildOptions(options, { headers: req.headers });
  const busboy = Busboy(busboyOptions);

  // Close connection with specified reason and http code, default: 400 Bad Request.
  const closeConnection = (code, reason) => {
    req.unpipe(busboy);
    res.writeHead(code || 400, { Connection: 'close' });
    res.end(reason || 'Bad Request');
  };

  // Express proxies sometimes attach multipart data to a buffer
  if (req.body instanceof Buffer) {
    req.body = Object.create(null);
  }
  // Build multipart req.body fields
  busboy.on('field', (field, val) => req.body = buildFields(req.body, field, val));

  // Build req.files fields
  busboy.on('file', (field, file, info) => {
    // Parse file name(cutting huge names, decoding, etc..).
    const {filename:name, encoding, mimeType: mime} = info;
    const filename = parseFileName(options, name);
    // Define methods and handlers for upload process.
    const {
      dataHandler,
      getFilePath,
      getFileSize,
      getHash,
      complete,
      cleanup,
      getWritePromise
    } = options.useTempFiles
      ? tempFileHandler(options, field, filename) // Upload into temporary file.
      : memHandler(options, field, filename);     // Upload into RAM.

    const writePromise = options.useTempFiles
      ? getWritePromise().catch(err => {
        req.unpipe(busboy);
        req.resume();
        cleanup();
        next(err);
      }) : getWritePromise();

    // Define upload timer.
    const uploadTimer = new UploadTimer(options.uploadTimeout, () => {
      file.removeAllListeners('data');
      file.resume();
      // After destroy an error event will be emitted and file clean up will be done.
      file.destroy(new Error(`Upload timeout ${field}->${filename}, bytes:${getFileSize()}`));
    });

    file.on('limit', () => {
      debugLog(options, `Size limit reached for ${field}->${filename}, bytes:${getFileSize()}`);
      // Reset upload timer in case of file limit reached.
      uploadTimer.clear();
      // Run a user defined limit handler if it has been set.
      if (isFunc(options.limitHandler)) return options.limitHandler(req, res, next);
      // Close connection with 413 code and do cleanup if abortOnLimit set(default: false).
      if (options.abortOnLimit) {
        debugLog(options, `Aborting upload because of size limit ${field}->${filename}.`);
        !isFunc(options.limitHandler) ? closeConnection(413, options.responseOnLimit) : '';
        cleanup();
      }
    });

    file.on('data', (data) => {
      uploadTimer.set(); // Refresh upload timer each time new data chunk came.
      dataHandler(data); // Handle new piece of data.
    });

    file.on('end', () => {
      const size = getFileSize();
      // Debug logging for file upload ending.
      debugLog(options, `Upload finished ${field}->${filename}, bytes:${size}`);
      // Reset upload timer in case of end event.
      uploadTimer.clear();
      // See https://github.com/richardgirges/express-fileupload/issues/191
      // Do not add file instance to the req.files if original name and size are empty.
      // Empty name and zero size indicates empty file field in the posted form.
      if (!name && size === 0) {
        if (options.useTempFiles) {
          cleanup();
          debugLog(options, `Removing the empty file ${field}->${filename}`);
        }
        return debugLog(options, `Don't add file instance if original name and size are empty`);
      }
      req.files = buildFields(req.files, field, fileFactory({
        buffer: complete(),
        name: filename,
        tempFilePath: getFilePath(),
        hash: getHash(),
        size,
        encoding,
        truncated: file.truncated,
        mimetype: mime
      }, options));

      if (!req[waitFlushProperty]) {
        req[waitFlushProperty] = [];
      }
      req[waitFlushProperty].push(writePromise);
    });

    file.on('error', (err) => {
      uploadTimer.clear(); // Reset upload timer in case of errors.
      debugLog(options, err);
      cleanup();
      next();
    });

    // Debug logging for a new file upload.
    debugLog(options, `New upload started ${field}->${filename}, bytes:${getFileSize()}`);
    // Set new upload timeout for a new file.
    uploadTimer.set();
  });

  busboy.on('finish', () => {
    debugLog(options, `Busboy finished parsing request.`);
    if (options.parseNested) {
      req.body = processNested(req.body);
      req.files = processNested(req.files);
    }

    if (!req[waitFlushProperty]) return next();
    Promise.all(req[waitFlushProperty])
      .then(() => {
        delete req[waitFlushProperty];
        next();
      });
  });

  busboy.on('error', (err) => {
    debugLog(options, `Busboy error`);
    next(err);
  });

  req.pipe(busboy);
};

}, function(modId) { var map = {"./uploadtimer":1665830430327,"./fileFactory":1665830430328,"./memHandler":1665830430330,"./tempFileHandler":1665830430331,"./processNested":1665830430332,"./utilities":1665830430329}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430327, function(require, module, exports) {
class UploadTimer {
  /**
   * @constructor
   * @param {number} timeout - timer timeout in msecs. 
   * @param {Function} callback - callback to run when timeout reached.
   */
  constructor(timeout = 0, callback = () => {}) {
    this.timeout = timeout;
    this.callback = callback;
    this.timer = null;
  }

  clear() {
    clearTimeout(this.timer);
  }

  set() {
    // Do not start a timer if zero timeout or it hasn't been set. 
    if (!this.timeout) return false;
    this.clear();
    this.timer = setTimeout(this.callback, this.timeout);
    return true;
  }
}

module.exports = UploadTimer;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430328, function(require, module, exports) {


const {
  isFunc,
  debugLog,
  moveFile,
  promiseCallback,
  checkAndMakeDir,
  saveBufferToFile
} = require('./utilities');

/**
 * Returns Local function that moves the file to a different location on the filesystem
 * which takes two function arguments to make it compatible w/ Promise or Callback APIs
 * @param {String} filePath - destination file path.
 * @param {Object} options - file factory options.
 * @param {Object} fileUploadOptions - middleware options.
 * @returns {Function}
 */
const moveFromTemp = (filePath, options, fileUploadOptions) => (resolve, reject) => {
  debugLog(fileUploadOptions, `Moving temporary file ${options.tempFilePath} to ${filePath}`);
  moveFile(options.tempFilePath, filePath, promiseCallback(resolve, reject));
};

/**
 * Returns Local function that moves the file from buffer to a different location on the filesystem
 * which takes two function arguments to make it compatible w/ Promise or Callback APIs
 * @param {String} filePath - destination file path.
 * @param {Object} options - file factory options.
 * @param {Object} fileUploadOptions - middleware options.
 * @returns {Function}
 */
const moveFromBuffer = (filePath, options, fileUploadOptions) => (resolve, reject) => {
  debugLog(fileUploadOptions, `Moving uploaded buffer to ${filePath}`);
  saveBufferToFile(options.buffer, filePath, promiseCallback(resolve, reject));
};

module.exports = (options, fileUploadOptions = {}) => {
  // see: https://github.com/richardgirges/express-fileupload/issues/14
  // firefox uploads empty file in case of cache miss when f5ing page.
  // resulting in unexpected behavior. if there is no file data, the file is invalid.
  // if (!fileUploadOptions.useTempFiles && !options.buffer.length) return;
  
  // Create and return file object.
  return {
    name: options.name,
    data: options.buffer,
    size: options.size,
    encoding: options.encoding,
    tempFilePath: options.tempFilePath,
    truncated: options.truncated,
    mimetype: options.mimetype,
    md5: options.hash,
    mv: (filePath, callback) => {
      // Define a propper move function.
      const moveFunc = fileUploadOptions.useTempFiles
        ? moveFromTemp(filePath, options, fileUploadOptions)
        : moveFromBuffer(filePath, options, fileUploadOptions);
      // Create a folder for a file.
      checkAndMakeDir(fileUploadOptions, filePath);
      // If callback is passed in, use the callback API, otherwise return a promise.
      return isFunc(callback) ? moveFunc(callback) : new Promise(moveFunc);
    }
  };
};

}, function(modId) { var map = {"./utilities":1665830430329}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430329, function(require, module, exports) {


const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

// Parameters for safe file name parsing.
const SAFE_FILE_NAME_REGEX = /[^\w-]/g;
const MAX_EXTENSION_LENGTH = 3;

// Parameters to generate unique temporary file names:
const TEMP_COUNTER_MAX = 65536;
const TEMP_PREFIX = 'tmp';
let tempCounter = 0;

/**
 * Logs message to console if debug option set to true.
 * @param {Object} options - options object.
 * @param {string} msg - message to log.
 * @returns {boolean} - false if debug is off.
 */
const debugLog = (options, msg) => {
  const opts = options || {};
  if (!opts.debug) return false;
  console.log(`Express-file-upload: ${msg}`); // eslint-disable-line
  return true;
};

/**
 * Generates unique temporary file name. e.g. tmp-5000-156788789789.
 * @param {string} prefix - a prefix for generated unique file name.
 * @returns {string}
 */
const getTempFilename = (prefix = TEMP_PREFIX) => {
  tempCounter = tempCounter >= TEMP_COUNTER_MAX ? 1 : tempCounter + 1;
  return `${prefix}-${tempCounter}-${Date.now()}`;
};

/**
 * isFunc: Checks if argument is a function.
 * @returns {boolean} - Returns true if argument is a function.
 */
const isFunc = func => func && func.constructor && func.call && func.apply ? true: false;

/**
 * Set errorFunc to the same value as successFunc for callback mode.
 * @returns {Function}
 */
const errorFunc = (resolve, reject) => isFunc(reject) ? reject : resolve;

/**
 * Return a callback function for promise resole/reject args.
 * Ensures that callback is called only once.
 * @returns {Function}
 */
const promiseCallback = (resolve, reject) => {
  let hasFired = false;
  return (err) => {
    if (hasFired) {
      return;
    }

    hasFired = true;
    return err ? errorFunc(resolve, reject)(err) : resolve();
  };
};

/**
 * Builds instance options from arguments objects(can't be arrow function).
 * @returns {Object} - result options.
 */
const buildOptions = function() {
  const result = {};
  [...arguments].forEach(options => {
    if (!options || typeof options !== 'object') return;
    Object.keys(options).forEach(i => result[i] = options[i]);
  });
  return result;
};

// The default prototypes for both objects and arrays.
// Used by isSafeFromPollution
const OBJECT_PROTOTYPE_KEYS = Object.getOwnPropertyNames(Object.prototype);
const ARRAY_PROTOTYPE_KEYS = Object.getOwnPropertyNames(Array.prototype);

/**
 * Determines whether a key insertion into an object could result in a prototype pollution
 * @param {Object} base - The object whose insertion we are checking
 * @param {string} key - The key that will be inserted
 */
const isSafeFromPollution = (base, key) => {
  // We perform an instanceof check instead of Array.isArray as the former is more
  // permissive for cases in which the object as an Array prototype but was not constructed
  // via an Array constructor or literal.
  const TOUCHES_ARRAY_PROTOTYPE = (base instanceof Array) && ARRAY_PROTOTYPE_KEYS.includes(key);
  const TOUCHES_OBJECT_PROTOTYPE = OBJECT_PROTOTYPE_KEYS.includes(key);

  return !TOUCHES_ARRAY_PROTOTYPE && !TOUCHES_OBJECT_PROTOTYPE;
};

/**
 * Builds request fields (using to build req.body and req.files)
 * @param {Object} instance - request object.
 * @param {string} field - field name.
 * @param {any} value - field value.
 * @returns {Object}
 */
const buildFields = (instance, field, value) => {
  // Do nothing if value is not set.
  if (value === null || value === undefined) return instance;
  instance = instance || Object.create(null);

  if (!isSafeFromPollution(instance, field)) {
    return instance;
  }
  // Non-array fields
  if (!instance[field]) {
    instance[field] = value;
    return instance;
  }
  // Array fields
  if (instance[field] instanceof Array) {
    instance[field].push(value);
  } else {
    instance[field] = [instance[field], value];
  }
  return instance;
};

/**
 * Creates a folder for file specified in the path variable
 * @param {Object} fileUploadOptions
 * @param {string} filePath
 * @returns {boolean}
 */
const checkAndMakeDir = (fileUploadOptions, filePath) => {
  // Check upload options were set.
  if (!fileUploadOptions) return false;
  if (!fileUploadOptions.createParentPath) return false;
  // Check whether folder for the file exists.
  if (!filePath) return false;
  const parentPath = path.dirname(filePath);
  // Create folder if it doesn't exist.
  if (!fs.existsSync(parentPath)) fs.mkdirSync(parentPath, { recursive: true });
  // Checks folder again and return a results.
  return fs.existsSync(parentPath);
};

/**
 * Deletes a file.
 * @param {string} file - Path to the file to delete.
 * @param {Function} callback
 */
const deleteFile = (file, callback) => fs.unlink(file, callback);

/**
 * Copy file via streams
 * @param {string} src - Path to the source file
 * @param {string} dst - Path to the destination file.
 */
const copyFile = (src, dst, callback) => {
  // cbCalled flag and runCb helps to run cb only once.
  let cbCalled = false;
  let runCb = (err) => {
    if (cbCalled) return;
    cbCalled = true;
    callback(err);
  };
  // Create read stream
  let readable = fs.createReadStream(src);
  readable.on('error', runCb);
  // Create write stream
  let writable = fs.createWriteStream(dst);
  writable.on('error', (err)=>{
    readable.destroy();
    runCb(err);
  });
  writable.on('close', () => runCb());
  // Copy file via piping streams.
  readable.pipe(writable);
};

/**
 * moveFile: moves the file from src to dst.
 * Firstly trying to rename the file if no luck copying it to dst and then deleteing src.
 * @param {string} src - Path to the source file
 * @param {string} dst - Path to the destination file.
 * @param {Function} callback - A callback function.
 */
const moveFile = (src, dst, callback) => fs.rename(src, dst, err => (err
  ? copyFile(src, dst, err => err ? callback(err) : deleteFile(src, callback))
  : callback()
));

/**
 * Save buffer data to a file.
 * @param {Buffer} buffer - buffer to save to a file.
 * @param {string} filePath - path to a file.
 */
const saveBufferToFile = (buffer, filePath, callback) => {
  if (!Buffer.isBuffer(buffer)) {
    return callback(new Error('buffer variable should be type of Buffer!'));
  }
  // Setup readable stream from buffer.
  let streamData = buffer;
  let readStream = Readable();
  readStream._read = () => {
    readStream.push(streamData);
    streamData = null;
  };
  // Setup file system writable stream.
  let fstream = fs.createWriteStream(filePath);
  // console.log("Calling saveBuffer");
  fstream.on('error', err => {
    // console.log("err cb")
    callback(err);
  });
  fstream.on('close', () => {
    // console.log("close cb");
    callback();
  });
  // Copy file via piping streams.
  readStream.pipe(fstream);
};

/**
 * Decodes uriEncoded file names.
 * @param fileName {String} - file name to decode.
 * @returns {String}
 */
const uriDecodeFileName = (opts, fileName) => {
  return opts.uriDecodeFileNames ? decodeURIComponent(fileName) : fileName;
};

/**
 * Parses filename and extension and returns object {name, extension}.
 * @param {boolean|integer} preserveExtension - true/false or number of characters for extension.
 * @param {string} fileName - file name to parse.
 * @returns {Object} - { name, extension }.
 */
const parseFileNameExtension = (preserveExtension, fileName) => {
  const preserveExtensionLength = parseInt(preserveExtension);
  const result = {name: fileName, extension: ''};
  if (!preserveExtension && preserveExtensionLength !== 0) return result;
  // Define maximum extension length
  const maxExtLength = isNaN(preserveExtensionLength)
    ? MAX_EXTENSION_LENGTH
    : Math.abs(preserveExtensionLength);

  const nameParts = fileName.split('.');
  if (nameParts.length < 2) return result;

  let extension = nameParts.pop();
  if (
    extension.length > maxExtLength &&
    maxExtLength > 0
  ) {
    nameParts[nameParts.length - 1] +=
      '.' +
      extension.substr(0, extension.length - maxExtLength);
    extension = extension.substr(-maxExtLength);
  }

  result.extension = maxExtLength ? extension : '';
  result.name = nameParts.join('.');
  return result;
};

/**
 * Parse file name and extension.
 * @param {Object} opts - middleware options.
 * @param {string} fileName - Uploaded file name.
 * @returns {string}
 */
const parseFileName = (opts, fileName) => {
  // Check fileName argument
  if (!fileName || typeof fileName !== 'string') return getTempFilename();
  // Cut off file name if it's lenght more then 255.
  let parsedName = fileName.length <= 255 ? fileName : fileName.substr(0, 255);
  // Decode file name if uriDecodeFileNames option set true.
  parsedName = uriDecodeFileName(opts, parsedName);
  // Stop parsing file name if safeFileNames options hasn't been set.
  if (!opts.safeFileNames) return parsedName;
  // Set regular expression for the file name.
  const nameRegex = typeof opts.safeFileNames === 'object' && opts.safeFileNames instanceof RegExp
    ? opts.safeFileNames
    : SAFE_FILE_NAME_REGEX;
  // Parse file name extension.
  let {name, extension} = parseFileNameExtension(opts.preserveExtension, parsedName);
  if (extension.length) extension = '.' + extension.replace(nameRegex, '');

  return name.replace(nameRegex, '').concat(extension);
};

module.exports = {
  isFunc,
  debugLog,
  copyFile, // For testing purpose.
  moveFile,
  errorFunc,
  deleteFile, // For testing purpose.
  buildFields,
  buildOptions,
  parseFileName,
  getTempFilename,
  promiseCallback,
  checkAndMakeDir,
  saveBufferToFile,
  uriDecodeFileName,
  isSafeFromPollution
};

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430330, function(require, module, exports) {
const crypto = require('crypto');
const { debugLog } = require('./utilities');

/**
 * memHandler - In memory upload handler
 * @param {Object} options
 * @param {String} fieldname
 * @param {String} filename
 * @returns {Object}
 */
module.exports = (options, fieldname, filename) => {
  const buffers = [];
  const hash = crypto.createHash('md5');
  let fileSize = 0;
  let completed = false;

  const getBuffer = () => Buffer.concat(buffers, fileSize);

  return {
    dataHandler: (data) => {
      if (completed === true) {
        debugLog(options, `Error: got ${fieldname}->${filename} data chunk for completed upload!`);
        return;
      }
      buffers.push(data);
      hash.update(data);
      fileSize += data.length;
      debugLog(options, `Uploading ${fieldname}->${filename}, bytes:${fileSize}...`);
    },
    getBuffer: getBuffer,
    getFilePath: () => '',
    getFileSize: () => fileSize,
    getHash: () => hash.digest('hex'),
    complete: () => {
      debugLog(options, `Upload ${fieldname}->${filename} completed, bytes:${fileSize}.`);
      completed = true;
      return getBuffer();
    },
    cleanup: () => { completed = true; },
    getWritePromise: () => Promise.resolve()
  };
};

}, function(modId) { var map = {"./utilities":1665830430329}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430331, function(require, module, exports) {
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  debugLog,
  checkAndMakeDir,
  getTempFilename,
  deleteFile
} = require('./utilities');

module.exports = (options, fieldname, filename) => {
  const dir = path.normalize(options.tempFileDir);
  const tempFilePath = path.join(dir, getTempFilename());
  checkAndMakeDir({ createParentPath: true }, tempFilePath);

  debugLog(options, `Temporary file path is ${tempFilePath}`);
 
  const hash = crypto.createHash('md5');
  let fileSize = 0;
  let completed = false;

  debugLog(options, `Opening write stream for ${fieldname}->${filename}...`);
  const writeStream = fs.createWriteStream(tempFilePath);
  const writePromise = new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve());
    writeStream.on('error', (err) => {
      debugLog(options, `Error write temp file: ${err}`);
      reject(err);
    });
  });

  return {
    dataHandler: (data) => {
      if (completed === true) {
        debugLog(options, `Error: got ${fieldname}->${filename} data chunk for completed upload!`);
        return;
      }
      writeStream.write(data);
      hash.update(data);
      fileSize += data.length;
      debugLog(options, `Uploading ${fieldname}->${filename}, bytes:${fileSize}...`);
    },
    getFilePath: () => tempFilePath,
    getFileSize: () => fileSize,
    getHash: () => hash.digest('hex'),
    complete: () => {
      completed = true;
      debugLog(options, `Upload ${fieldname}->${filename} completed, bytes:${fileSize}.`);
      if (writeStream !== false) writeStream.end();
      // Return empty buff since data was uploaded into a temp file.
      return Buffer.concat([]);
    },
    cleanup: () => {
      completed = true;
      debugLog(options, `Cleaning up temporary file ${tempFilePath}...`);
      writeStream.end();
      deleteFile(tempFilePath, err => (err 
        ? debugLog(options, `Cleaning up temporary file ${tempFilePath} failed: ${err}`)
        : debugLog(options, `Cleaning up temporary file ${tempFilePath} done.`)
      ));
    },
    getWritePromise: () => writePromise
  };
};

}, function(modId) { var map = {"./utilities":1665830430329}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430332, function(require, module, exports) {
const { isSafeFromPollution } = require("./utilities");

module.exports = function(data){
  if (!data || data.length < 1) return Object.create(null);

  let d = Object.create(null),
    keys = Object.keys(data);

  for (let i = 0; i < keys.length; i++) {
    let key = keys[i],
      value = data[key],
      current = d,
      keyParts = key
        .replace(new RegExp(/\[/g), '.')
        .replace(new RegExp(/\]/g), '')
        .split('.');

    for (let index = 0; index < keyParts.length; index++){
      let k = keyParts[index];

      // Ensure we don't allow prototype pollution
      if (!isSafeFromPollution(current, k)) {
        continue;
      }

      if (index >= keyParts.length - 1){
        current[k] = value;
      } else {
        if (!current[k]) current[k] = !isNaN(keyParts[index + 1]) ? [] : Object.create(null);
        current = current[k];
      }
    }
  }
  return d;
};

}, function(modId) { var map = {"./utilities":1665830430329}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430333, function(require, module, exports) {
const ACCEPTABLE_CONTENT_TYPE = /^(multipart\/.+);(.*)$/i;
const UNACCEPTABLE_METHODS = ['GET', 'HEAD'];

/**
 * Ensures the request contains a content body
 * @param  {Object}  req Express req object
 * @returns {Boolean}
 */
const hasBody = (req) => {
  return ('transfer-encoding' in req.headers) ||
    ('content-length' in req.headers && req.headers['content-length'] !== '0');
};

/**
 * Ensures the request is not using a non-compliant multipart method
 * such as GET or HEAD
 * @param  {Object}  req Express req object
 * @returns {Boolean}
 */
const hasAcceptableMethod = req => !UNACCEPTABLE_METHODS.includes(req.method);

/**
 * Ensures that only multipart requests are processed by express-fileupload
 * @param  {Object}  req Express req object
 * @returns {Boolean}
 */
const hasAcceptableContentType = req => ACCEPTABLE_CONTENT_TYPE.test(req.headers['content-type']);

/**
 * Ensures that the request in question is eligible for file uploads
 * @param {Object} req Express req object
 * @returns {Boolean}
 */
module.exports = req => hasBody(req) && hasAcceptableMethod(req) && hasAcceptableContentType(req);

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1665830430325);
})()
//miniprogram-npm-outsideDeps=["path","busboy","fs","stream","crypto"]
//# sourceMappingURL=index.js.map