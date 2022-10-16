module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1665830430485, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.ratingToStars = exports.orderTags = exports.parseFile = exports.parseStream = exports.selectCover = exports.parseBuffer = exports.parseFromTokenizer = void 0;
const strtok3 = require("strtok3");
const Core = require("./core");
const ParserFactory_1 = require("./ParserFactory");
const debug_1 = require("debug");
const RandomFileReader_1 = require("./common/RandomFileReader");
const debug = (0, debug_1.default)("music-metadata:parser");
var core_1 = require("./core");
Object.defineProperty(exports, "parseFromTokenizer", { enumerable: true, get: function () { return core_1.parseFromTokenizer; } });
Object.defineProperty(exports, "parseBuffer", { enumerable: true, get: function () { return core_1.parseBuffer; } });
Object.defineProperty(exports, "selectCover", { enumerable: true, get: function () { return core_1.selectCover; } });
/**
 * Parse audio from Node Stream.Readable
 * @param stream - Stream to read the audio track from
 * @param fileInfo - File information object or MIME-type, e.g.: 'audio/mpeg'
 * @param options - Parsing options
 * @returns Metadata
 */
async function parseStream(stream, fileInfo, options = {}) {
    const tokenizer = await strtok3.fromStream(stream, typeof fileInfo === 'string' ? { mimeType: fileInfo } : fileInfo);
    return Core.parseFromTokenizer(tokenizer, options);
}
exports.parseStream = parseStream;
/**
 * Parse audio from Node file
 * @param filePath - Media file to read meta-data from
 * @param options - Parsing options
 * @returns Metadata
 */
async function parseFile(filePath, options = {}) {
    debug(`parseFile: ${filePath}`);
    const fileTokenizer = await strtok3.fromFile(filePath);
    const fileReader = await RandomFileReader_1.RandomFileReader.init(filePath, fileTokenizer.fileInfo.size);
    try {
        await Core.scanAppendingHeaders(fileReader, options);
    }
    finally {
        await fileReader.close();
    }
    try {
        const parserName = ParserFactory_1.ParserFactory.getParserIdForExtension(filePath);
        if (!parserName)
            debug(' Parser could not be determined by file extension');
        return await ParserFactory_1.ParserFactory.parse(fileTokenizer, parserName, options);
    }
    finally {
        await fileTokenizer.close();
    }
}
exports.parseFile = parseFile;
/**
 * Create a dictionary ordered by their tag id (key)
 * @param nativeTags - List of tags
 * @returns Tags indexed by id
 */
exports.orderTags = Core.orderTags;
/**
 * Convert rating to 1-5 star rating
 * @param rating - Normalized rating [0..1] (common.rating[n].rating)
 * @returns Number of stars: 1, 2, 3, 4 or 5 stars
 */
exports.ratingToStars = Core.ratingToStars;
/**
 * Define default module exports
 */
exports.default = {
    parseStream,
    parseFile,
    parseFromTokenizer: Core.parseFromTokenizer,
    parseBuffer: Core.parseBuffer,
    selectCover: Core.selectCover
};

}, function(modId) {var map = {"./core":1665830430486,"./ParserFactory":1665830430487,"./common/RandomFileReader":1665830430560}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430486, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.scanAppendingHeaders = exports.selectCover = exports.ratingToStars = exports.orderTags = exports.parseFromTokenizer = exports.parseBuffer = exports.parseStream = void 0;
const strtok3 = require("strtok3/lib/core");
const ParserFactory_1 = require("./ParserFactory");
const RandomUint8ArrayReader_1 = require("./common/RandomUint8ArrayReader");
const APEv2Parser_1 = require("./apev2/APEv2Parser");
const ID3v1Parser_1 = require("./id3v1/ID3v1Parser");
const Lyrics3_1 = require("./lyrics3/Lyrics3");
/**
 * Parse audio from Node Stream.Readable
 * @param stream - Stream to read the audio track from
 * @param options - Parsing options
 * @param fileInfo - File information object or MIME-type string
 * @returns Metadata
 */
function parseStream(stream, fileInfo, options = {}) {
    return parseFromTokenizer(strtok3.fromStream(stream, typeof fileInfo === 'string' ? { mimeType: fileInfo } : fileInfo), options);
}
exports.parseStream = parseStream;
/**
 * Parse audio from Node Buffer
 * @param uint8Array - Uint8Array holding audio data
 * @param fileInfo - File information object or MIME-type string
 * @param options - Parsing options
 * @returns Metadata
 * Ref: https://github.com/Borewit/strtok3/blob/e6938c81ff685074d5eb3064a11c0b03ca934c1d/src/index.ts#L15
 */
async function parseBuffer(uint8Array, fileInfo, options = {}) {
    const bufferReader = new RandomUint8ArrayReader_1.RandomUint8ArrayReader(uint8Array);
    await scanAppendingHeaders(bufferReader, options);
    const tokenizer = strtok3.fromBuffer(uint8Array, typeof fileInfo === 'string' ? { mimeType: fileInfo } : fileInfo);
    return parseFromTokenizer(tokenizer, options);
}
exports.parseBuffer = parseBuffer;
/**
 * Parse audio from ITokenizer source
 * @param tokenizer - Audio source implementing the tokenizer interface
 * @param options - Parsing options
 * @returns Metadata
 */
function parseFromTokenizer(tokenizer, options) {
    return ParserFactory_1.ParserFactory.parseOnContentType(tokenizer, options);
}
exports.parseFromTokenizer = parseFromTokenizer;
/**
 * Create a dictionary ordered by their tag id (key)
 * @param nativeTags list of tags
 * @returns tags indexed by id
 */
function orderTags(nativeTags) {
    const tags = {};
    for (const tag of nativeTags) {
        (tags[tag.id] = (tags[tag.id] || [])).push(tag.value);
    }
    return tags;
}
exports.orderTags = orderTags;
/**
 * Convert rating to 1-5 star rating
 * @param rating: Normalized rating [0..1] (common.rating[n].rating)
 * @returns Number of stars: 1, 2, 3, 4 or 5 stars
 */
function ratingToStars(rating) {
    return rating === undefined ? 0 : 1 + Math.round(rating * 4);
}
exports.ratingToStars = ratingToStars;
/**
 * Select most likely cover image.
 * @param pictures Usually metadata.common.picture
 * @return Cover image, if any, otherwise null
 */
function selectCover(pictures) {
    return pictures ? pictures.reduce((acc, cur) => {
        if (cur.name && cur.name.toLowerCase() in ['front', 'cover', 'cover (front)'])
            return cur;
        return acc;
    }) : null;
}
exports.selectCover = selectCover;
async function scanAppendingHeaders(randomReader, options = {}) {
    let apeOffset = randomReader.fileSize;
    if (await (0, ID3v1Parser_1.hasID3v1Header)(randomReader)) {
        apeOffset -= 128;
        const lyricsLen = await (0, Lyrics3_1.getLyricsHeaderLength)(randomReader);
        apeOffset -= lyricsLen;
    }
    options.apeHeader = await APEv2Parser_1.APEv2Parser.findApeFooterOffset(randomReader, apeOffset);
}
exports.scanAppendingHeaders = scanAppendingHeaders;

}, function(modId) { var map = {"./ParserFactory":1665830430487,"./common/RandomUint8ArrayReader":1665830430558,"./apev2/APEv2Parser":1665830430512,"./id3v1/ID3v1Parser":1665830430510,"./lyrics3/Lyrics3":1665830430559}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430487, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserFactory = exports.parseHttpContentType = void 0;
const FileType = require("file-type/core");
const ContentType = require("content-type");
const MimeType = require("media-typer");
const debug_1 = require("debug");
const MetadataCollector_1 = require("./common/MetadataCollector");
const AiffParser_1 = require("./aiff/AiffParser");
const APEv2Parser_1 = require("./apev2/APEv2Parser");
const AsfParser_1 = require("./asf/AsfParser");
const FlacParser_1 = require("./flac/FlacParser");
const MP4Parser_1 = require("./mp4/MP4Parser");
const MpegParser_1 = require("./mpeg/MpegParser");
const musepack_1 = require("./musepack");
const OggParser_1 = require("./ogg/OggParser");
const WaveParser_1 = require("./wav/WaveParser");
const WavPackParser_1 = require("./wavpack/WavPackParser");
const DsfParser_1 = require("./dsf/DsfParser");
const DsdiffParser_1 = require("./dsdiff/DsdiffParser");
const MatroskaParser_1 = require("./matroska/MatroskaParser");
const debug = (0, debug_1.default)('music-metadata:parser:factory');
function parseHttpContentType(contentType) {
    const type = ContentType.parse(contentType);
    const mime = MimeType.parse(type.type);
    return {
        type: mime.type,
        subtype: mime.subtype,
        suffix: mime.suffix,
        parameters: type.parameters
    };
}
exports.parseHttpContentType = parseHttpContentType;
async function parse(tokenizer, parserId, opts = {}) {
    // Parser found, execute parser
    const parser = await ParserFactory.loadParser(parserId);
    const metadata = new MetadataCollector_1.MetadataCollector(opts);
    await parser.init(metadata, tokenizer, opts).parse();
    return metadata.toCommonMetadata();
}
class ParserFactory {
    /**
     * Parse metadata from tokenizer
     * @param tokenizer - Tokenizer
     * @param opts - Options
     * @returns Native metadata
     */
    static async parseOnContentType(tokenizer, opts) {
        const { mimeType, path, url } = await tokenizer.fileInfo;
        // Resolve parser based on MIME-type or file extension
        const parserId = ParserFactory.getParserIdForMimeType(mimeType) || ParserFactory.getParserIdForExtension(path) || ParserFactory.getParserIdForExtension(url);
        if (!parserId) {
            debug('No parser found for MIME-type / extension: ' + mimeType);
        }
        return this.parse(tokenizer, parserId, opts);
    }
    static async parse(tokenizer, parserId, opts) {
        if (!parserId) {
            // Parser could not be determined on MIME-type or extension
            debug('Guess parser on content...');
            const buf = Buffer.alloc(4100);
            await tokenizer.peekBuffer(buf, { mayBeLess: true });
            if (tokenizer.fileInfo.path) {
                parserId = this.getParserIdForExtension(tokenizer.fileInfo.path);
            }
            if (!parserId) {
                const guessedType = await FileType.fromBuffer(buf);
                if (!guessedType) {
                    throw new Error('Failed to determine audio format');
                }
                debug(`Guessed file type is mime=${guessedType.mime}, extension=${guessedType.ext}`);
                parserId = ParserFactory.getParserIdForMimeType(guessedType.mime);
                if (!parserId) {
                    throw new Error('Guessed MIME-type not supported: ' + guessedType.mime);
                }
            }
        }
        // Parser found, execute parser
        return parse(tokenizer, parserId, opts);
    }
    /**
     * @param filePath - Path, filename or extension to audio file
     * @return Parser sub-module name
     */
    static getParserIdForExtension(filePath) {
        if (!filePath)
            return;
        const extension = this.getExtension(filePath).toLocaleLowerCase() || filePath;
        switch (extension) {
            case '.mp2':
            case '.mp3':
            case '.m2a':
            case '.aac': // Assume it is ADTS-container
                return 'mpeg';
            case '.ape':
                return 'apev2';
            case '.mp4':
            case '.m4a':
            case '.m4b':
            case '.m4pa':
            case '.m4v':
            case '.m4r':
            case '.3gp':
                return 'mp4';
            case '.wma':
            case '.wmv':
            case '.asf':
                return 'asf';
            case '.flac':
                return 'flac';
            case '.ogg':
            case '.ogv':
            case '.oga':
            case '.ogm':
            case '.ogx':
            case '.opus': // recommended filename extension for Ogg Opus
            case '.spx': // recommended filename extension for Ogg Speex
                return 'ogg';
            case '.aif':
            case '.aiff':
            case '.aifc':
                return 'aiff';
            case '.wav':
            case '.bwf': // Broadcast Wave Format
                return 'riff';
            case '.wv':
            case '.wvp':
                return 'wavpack';
            case '.mpc':
                return 'musepack';
            case '.dsf':
                return 'dsf';
            case '.dff':
                return 'dsdiff';
            case '.mka':
            case '.mkv':
            case '.mk3d':
            case '.mks':
            case '.webm':
                return 'matroska';
        }
    }
    static async loadParser(moduleName) {
        switch (moduleName) {
            case 'aiff': return new AiffParser_1.AIFFParser();
            case 'adts':
            case 'mpeg':
                return new MpegParser_1.MpegParser();
            case 'apev2': return new APEv2Parser_1.APEv2Parser();
            case 'asf': return new AsfParser_1.AsfParser();
            case 'dsf': return new DsfParser_1.DsfParser();
            case 'dsdiff': return new DsdiffParser_1.DsdiffParser();
            case 'flac': return new FlacParser_1.FlacParser();
            case 'mp4': return new MP4Parser_1.MP4Parser();
            case 'musepack': return new musepack_1.default();
            case 'ogg': return new OggParser_1.OggParser();
            case 'riff': return new WaveParser_1.WaveParser();
            case 'wavpack': return new WavPackParser_1.WavPackParser();
            case 'matroska': return new MatroskaParser_1.MatroskaParser();
            default:
                throw new Error(`Unknown parser type: ${moduleName}`);
        }
    }
    static getExtension(fname) {
        const i = fname.lastIndexOf('.');
        return i === -1 ? '' : fname.slice(i);
    }
    /**
     * @param httpContentType - HTTP Content-Type, extension, path or filename
     * @returns Parser sub-module name
     */
    static getParserIdForMimeType(httpContentType) {
        let mime;
        try {
            mime = parseHttpContentType(httpContentType);
        }
        catch (err) {
            debug(`Invalid HTTP Content-Type header value: ${httpContentType}`);
            return;
        }
        const subType = mime.subtype.indexOf('x-') === 0 ? mime.subtype.substring(2) : mime.subtype;
        switch (mime.type) {
            case 'audio':
                switch (subType) {
                    case 'mp3': // Incorrect MIME-type, Chrome, in Web API File object
                    case 'mpeg':
                        return 'mpeg';
                    case 'aac':
                    case 'aacp':
                        return 'adts';
                    case 'flac':
                        return 'flac';
                    case 'ape':
                    case 'monkeys-audio':
                        return 'apev2';
                    case 'mp4':
                    case 'm4a':
                        return 'mp4';
                    case 'ogg': // RFC 7845
                    case 'opus': // RFC 6716
                    case 'speex': // RFC 5574
                        return 'ogg';
                    case 'ms-wma':
                    case 'ms-wmv':
                    case 'ms-asf':
                        return 'asf';
                    case 'aiff':
                    case 'aif':
                    case 'aifc':
                        return 'aiff';
                    case 'vnd.wave':
                    case 'wav':
                    case 'wave':
                        return 'riff';
                    case 'wavpack':
                        return 'wavpack';
                    case 'musepack':
                        return 'musepack';
                    case 'matroska':
                    case 'webm':
                        return 'matroska';
                    case 'dsf':
                        return 'dsf';
                }
                break;
            case 'video':
                switch (subType) {
                    case 'ms-asf':
                    case 'ms-wmv':
                        return 'asf';
                    case 'm4v':
                    case 'mp4':
                        return 'mp4';
                    case 'ogg':
                        return 'ogg';
                    case 'matroska':
                    case 'webm':
                        return 'matroska';
                }
                break;
            case 'application':
                switch (subType) {
                    case 'vnd.ms-asf':
                        return 'asf';
                    case 'ogg':
                        return 'ogg';
                }
                break;
        }
    }
}
exports.ParserFactory = ParserFactory;

}, function(modId) { var map = {"./common/MetadataCollector":1665830430488,"./aiff/AiffParser":1665830430506,"./apev2/APEv2Parser":1665830430512,"./asf/AsfParser":1665830430517,"./flac/FlacParser":1665830430521,"./mp4/MP4Parser":1665830430526,"./mpeg/MpegParser":1665830430529,"./musepack":1665830430533,"./ogg/OggParser":1665830430539,"./wav/WaveParser":1665830430546,"./wavpack/WavPackParser":1665830430550,"./dsf/DsfParser":1665830430552,"./dsdiff/DsdiffParser":1665830430554,"./matroska/MatroskaParser":1665830430556}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430488, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.joinArtists = exports.MetadataCollector = void 0;
const type_1 = require("../type");
const debug_1 = require("debug");
const GenericTagTypes_1 = require("./GenericTagTypes");
const CombinedTagMapper_1 = require("./CombinedTagMapper");
const GenericTagMapper_1 = require("./GenericTagMapper");
const Util_1 = require("./Util");
const FileType = require("file-type/core");
const debug = (0, debug_1.default)('music-metadata:collector');
const TagPriority = ['matroska', 'APEv2', 'vorbis', 'ID3v2.4', 'ID3v2.3', 'ID3v2.2', 'exif', 'asf', 'iTunes', 'AIFF', 'ID3v1'];
/**
 * Provided to the parser to uodate the metadata result.
 * Responsible for triggering async updates
 */
class MetadataCollector {
    constructor(opts) {
        this.opts = opts;
        this.format = {
            tagTypes: [],
            trackInfo: []
        };
        this.native = {};
        this.common = {
            track: { no: null, of: null },
            disk: { no: null, of: null },
            movementIndex: {}
        };
        this.quality = {
            warnings: []
        };
        /**
         * Keeps track of origin priority for each mapped id
         */
        this.commonOrigin = {};
        /**
         * Maps a tag type to a priority
         */
        this.originPriority = {};
        this.tagMapper = new CombinedTagMapper_1.CombinedTagMapper();
        let priority = 1;
        for (const tagType of TagPriority) {
            this.originPriority[tagType] = priority++;
        }
        this.originPriority.artificial = 500; // Filled using alternative tags
        this.originPriority.id3v1 = 600; // Consider as the worst because of the field length limit
    }
    /**
     * @returns {boolean} true if one or more tags have been found
     */
    hasAny() {
        return Object.keys(this.native).length > 0;
    }
    addStreamInfo(streamInfo) {
        debug(`streamInfo: type=${type_1.TrackType[streamInfo.type]}, codec=${streamInfo.codecName}`);
        this.format.trackInfo.push(streamInfo);
    }
    setFormat(key, value) {
        debug(`format: ${key} = ${value}`);
        this.format[key] = value; // as any to override readonly
        if (this.opts.observer) {
            this.opts.observer({ metadata: this, tag: { type: 'format', id: key, value } });
        }
    }
    addTag(tagType, tagId, value) {
        debug(`tag ${tagType}.${tagId} = ${value}`);
        if (!this.native[tagType]) {
            this.format.tagTypes.push(tagType);
            this.native[tagType] = [];
        }
        this.native[tagType].push({ id: tagId, value });
        this.toCommon(tagType, tagId, value);
    }
    addWarning(warning) {
        this.quality.warnings.push({ message: warning });
    }
    postMap(tagType, tag) {
        // Common tag (alias) found
        // check if we need to do something special with common tag
        // if the event has been aliased then we need to clean it before
        // it is emitted to the user. e.g. genre (20) -> Electronic
        switch (tag.id) {
            case 'artist':
                if (this.commonOrigin.artist === this.originPriority[tagType]) {
                    // Assume the artist field is used as artists
                    return this.postMap('artificial', { id: 'artists', value: tag.value });
                }
                if (!this.common.artists) {
                    // Fill artists using artist source
                    this.setGenericTag('artificial', { id: 'artists', value: tag.value });
                }
                break;
            case 'artists':
                if (!this.common.artist || this.commonOrigin.artist === this.originPriority.artificial) {
                    if (!this.common.artists || this.common.artists.indexOf(tag.value) === -1) {
                        // Fill artist using artists source
                        const artists = (this.common.artists || []).concat([tag.value]);
                        const value = joinArtists(artists);
                        const artistTag = { id: 'artist', value };
                        this.setGenericTag('artificial', artistTag);
                    }
                }
                break;
            case 'picture':
                this.postFixPicture(tag.value).then(picture => {
                    if (picture !== null) {
                        tag.value = picture;
                        this.setGenericTag(tagType, tag);
                    }
                });
                return;
            case 'totaltracks':
                this.common.track.of = GenericTagMapper_1.CommonTagMapper.toIntOrNull(tag.value);
                return;
            case 'totaldiscs':
                this.common.disk.of = GenericTagMapper_1.CommonTagMapper.toIntOrNull(tag.value);
                return;
            case 'movementTotal':
                this.common.movementIndex.of = GenericTagMapper_1.CommonTagMapper.toIntOrNull(tag.value);
                return;
            case 'track':
            case 'disk':
            case 'movementIndex':
                const of = this.common[tag.id].of; // store of value, maybe maybe overwritten
                this.common[tag.id] = GenericTagMapper_1.CommonTagMapper.normalizeTrack(tag.value);
                this.common[tag.id].of = of != null ? of : this.common[tag.id].of;
                return;
            case 'bpm':
            case 'year':
            case 'originalyear':
                tag.value = parseInt(tag.value, 10);
                break;
            case 'date':
                // ToDo: be more strict on 'YYYY...'
                const year = parseInt(tag.value.substr(0, 4), 10);
                if (!isNaN(year)) {
                    this.common.year = year;
                }
                break;
            case 'discogs_label_id':
            case 'discogs_release_id':
            case 'discogs_master_release_id':
            case 'discogs_artist_id':
            case 'discogs_votes':
                tag.value = typeof tag.value === 'string' ? parseInt(tag.value, 10) : tag.value;
                break;
            case 'replaygain_track_gain':
            case 'replaygain_track_peak':
            case 'replaygain_album_gain':
            case 'replaygain_album_peak':
                tag.value = (0, Util_1.toRatio)(tag.value);
                break;
            case 'replaygain_track_minmax':
                tag.value = tag.value.split(',').map(v => parseInt(v, 10));
                break;
            case 'replaygain_undo':
                const minMix = tag.value.split(',').map(v => parseInt(v, 10));
                tag.value = {
                    leftChannel: minMix[0],
                    rightChannel: minMix[1]
                };
                break;
            case 'gapless': // iTunes gap-less flag
            case 'compilation':
            case 'podcast':
            case 'showMovement':
                tag.value = tag.value === '1' || tag.value === 1; // boolean
                break;
            case 'isrc': // Only keep unique values
                if (this.common[tag.id] && this.common[tag.id].indexOf(tag.value) !== -1)
                    return;
                break;
            default:
            // nothing to do
        }
        if (tag.value !== null) {
            this.setGenericTag(tagType, tag);
        }
    }
    /**
     * Convert native tags to common tags
     * @returns {IAudioMetadata} Native + common tags
     */
    toCommonMetadata() {
        return {
            format: this.format,
            native: this.native,
            quality: this.quality,
            common: this.common
        };
    }
    /**
     * Fix some common issues with picture object
     * @param picture Picture
     */
    async postFixPicture(picture) {
        if (picture.data && picture.data.length > 0) {
            if (!picture.format) {
                const fileType = await FileType.fromBuffer(picture.data);
                if (fileType) {
                    picture.format = fileType.mime;
                }
                else {
                    return null;
                }
            }
            picture.format = picture.format.toLocaleLowerCase();
            switch (picture.format) {
                case 'image/jpg':
                    picture.format = 'image/jpeg'; // ToDo: register warning
            }
            return picture;
        }
        this.addWarning(`Empty picture tag found`);
        return null;
    }
    /**
     * Convert native tag to common tags
     */
    toCommon(tagType, tagId, value) {
        const tag = { id: tagId, value };
        const genericTag = this.tagMapper.mapTag(tagType, tag, this);
        if (genericTag) {
            this.postMap(tagType, genericTag);
        }
    }
    /**
     * Set generic tag
     */
    setGenericTag(tagType, tag) {
        debug(`common.${tag.id} = ${tag.value}`);
        const prio0 = this.commonOrigin[tag.id] || 1000;
        const prio1 = this.originPriority[tagType];
        if ((0, GenericTagTypes_1.isSingleton)(tag.id)) {
            if (prio1 <= prio0) {
                this.common[tag.id] = tag.value;
                this.commonOrigin[tag.id] = prio1;
            }
            else {
                return debug(`Ignore native tag (singleton): ${tagType}.${tag.id} = ${tag.value}`);
            }
        }
        else {
            if (prio1 === prio0) {
                if (!(0, GenericTagTypes_1.isUnique)(tag.id) || this.common[tag.id].indexOf(tag.value) === -1) {
                    this.common[tag.id].push(tag.value);
                }
                else {
                    debug(`Ignore duplicate value: ${tagType}.${tag.id} = ${tag.value}`);
                }
                // no effect? this.commonOrigin[tag.id] = prio1;
            }
            else if (prio1 < prio0) {
                this.common[tag.id] = [tag.value];
                this.commonOrigin[tag.id] = prio1;
            }
            else {
                return debug(`Ignore native tag (list): ${tagType}.${tag.id} = ${tag.value}`);
            }
        }
        if (this.opts.observer) {
            this.opts.observer({ metadata: this, tag: { type: 'common', id: tag.id, value: tag.value } });
        }
        // ToDo: trigger metadata event
    }
}
exports.MetadataCollector = MetadataCollector;
function joinArtists(artists) {
    if (artists.length > 2) {
        return artists.slice(0, artists.length - 1).join(', ') + ' & ' + artists[artists.length - 1];
    }
    return artists.join(' & ');
}
exports.joinArtists = joinArtists;
//# sourceMappingURL=MetadataCollector.js.map
}, function(modId) { var map = {"../type":1665830430489,"./GenericTagTypes":1665830430491,"./CombinedTagMapper":1665830430492,"./GenericTagMapper":1665830430494,"./Util":1665830430497}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430489, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackType = void 0;
var types_1 = require("./matroska/types");
Object.defineProperty(exports, "TrackType", { enumerable: true, get: function () { return types_1.TrackType; } });
//# sourceMappingURL=type.js.map
}, function(modId) { var map = {"./matroska/types":1665830430490}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430490, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackType = exports.TargetType = exports.DataType = void 0;
var DataType;
(function (DataType) {
    DataType[DataType["string"] = 0] = "string";
    DataType[DataType["uint"] = 1] = "uint";
    DataType[DataType["uid"] = 2] = "uid";
    DataType[DataType["bool"] = 3] = "bool";
    DataType[DataType["binary"] = 4] = "binary";
    DataType[DataType["float"] = 5] = "float";
})(DataType = exports.DataType || (exports.DataType = {}));
var TargetType;
(function (TargetType) {
    TargetType[TargetType["shot"] = 10] = "shot";
    TargetType[TargetType["scene"] = 20] = "scene";
    TargetType[TargetType["track"] = 30] = "track";
    TargetType[TargetType["part"] = 40] = "part";
    TargetType[TargetType["album"] = 50] = "album";
    TargetType[TargetType["edition"] = 60] = "edition";
    TargetType[TargetType["collection"] = 70] = "collection";
})(TargetType = exports.TargetType || (exports.TargetType = {}));
var TrackType;
(function (TrackType) {
    TrackType[TrackType["video"] = 1] = "video";
    TrackType[TrackType["audio"] = 2] = "audio";
    TrackType[TrackType["complex"] = 3] = "complex";
    TrackType[TrackType["logo"] = 4] = "logo";
    TrackType[TrackType["subtitle"] = 17] = "subtitle";
    TrackType[TrackType["button"] = 18] = "button";
    TrackType[TrackType["control"] = 32] = "control";
})(TrackType = exports.TrackType || (exports.TrackType = {}));
//# sourceMappingURL=types.js.map
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430491, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.isUnique = exports.isSingleton = exports.commonTags = void 0;
exports.commonTags = {
    year: { multiple: false },
    track: { multiple: false },
    disk: { multiple: false },
    title: { multiple: false },
    artist: { multiple: false },
    artists: { multiple: true, unique: true },
    albumartist: { multiple: false },
    album: { multiple: false },
    date: { multiple: false },
    originaldate: { multiple: false },
    originalyear: { multiple: false },
    comment: { multiple: true, unique: false },
    genre: { multiple: true, unique: true },
    picture: { multiple: true, unique: true },
    composer: { multiple: true, unique: true },
    lyrics: { multiple: true, unique: false },
    albumsort: { multiple: false, unique: true },
    titlesort: { multiple: false, unique: true },
    work: { multiple: false, unique: true },
    artistsort: { multiple: false, unique: true },
    albumartistsort: { multiple: false, unique: true },
    composersort: { multiple: false, unique: true },
    lyricist: { multiple: true, unique: true },
    writer: { multiple: true, unique: true },
    conductor: { multiple: true, unique: true },
    remixer: { multiple: true, unique: true },
    arranger: { multiple: true, unique: true },
    engineer: { multiple: true, unique: true },
    producer: { multiple: true, unique: true },
    technician: { multiple: true, unique: true },
    djmixer: { multiple: true, unique: true },
    mixer: { multiple: true, unique: true },
    label: { multiple: true, unique: true },
    grouping: { multiple: false },
    subtitle: { multiple: true },
    discsubtitle: { multiple: false },
    totaltracks: { multiple: false },
    totaldiscs: { multiple: false },
    compilation: { multiple: false },
    rating: { multiple: true },
    bpm: { multiple: false },
    mood: { multiple: false },
    media: { multiple: false },
    catalognumber: { multiple: true, unique: true },
    tvShow: { multiple: false },
    tvShowSort: { multiple: false },
    tvSeason: { multiple: false },
    tvEpisode: { multiple: false },
    tvEpisodeId: { multiple: false },
    tvNetwork: { multiple: false },
    podcast: { multiple: false },
    podcasturl: { multiple: false },
    releasestatus: { multiple: false },
    releasetype: { multiple: true },
    releasecountry: { multiple: false },
    script: { multiple: false },
    language: { multiple: false },
    copyright: { multiple: false },
    license: { multiple: false },
    encodedby: { multiple: false },
    encodersettings: { multiple: false },
    gapless: { multiple: false },
    barcode: { multiple: false },
    isrc: { multiple: true },
    asin: { multiple: false },
    musicbrainz_recordingid: { multiple: false },
    musicbrainz_trackid: { multiple: false },
    musicbrainz_albumid: { multiple: false },
    musicbrainz_artistid: { multiple: true },
    musicbrainz_albumartistid: { multiple: true },
    musicbrainz_releasegroupid: { multiple: false },
    musicbrainz_workid: { multiple: false },
    musicbrainz_trmid: { multiple: false },
    musicbrainz_discid: { multiple: false },
    acoustid_id: { multiple: false },
    acoustid_fingerprint: { multiple: false },
    musicip_puid: { multiple: false },
    musicip_fingerprint: { multiple: false },
    website: { multiple: false },
    'performer:instrument': { multiple: true, unique: true },
    averageLevel: { multiple: false },
    peakLevel: { multiple: false },
    notes: { multiple: true, unique: false },
    key: { multiple: false },
    originalalbum: { multiple: false },
    originalartist: { multiple: false },
    discogs_artist_id: { multiple: true, unique: true },
    discogs_release_id: { multiple: false },
    discogs_label_id: { multiple: false },
    discogs_master_release_id: { multiple: false },
    discogs_votes: { multiple: false },
    discogs_rating: { multiple: false },
    replaygain_track_peak: { multiple: false },
    replaygain_track_gain: { multiple: false },
    replaygain_album_peak: { multiple: false },
    replaygain_album_gain: { multiple: false },
    replaygain_track_minmax: { multiple: false },
    replaygain_album_minmax: { multiple: false },
    replaygain_undo: { multiple: false },
    description: { multiple: true },
    longDescription: { multiple: false },
    category: { multiple: true },
    hdVideo: { multiple: false },
    keywords: { multiple: true },
    movement: { multiple: false },
    movementIndex: { multiple: false },
    movementTotal: { multiple: false },
    podcastId: { multiple: false },
    showMovement: { multiple: false },
    stik: { multiple: false }
};
/**
 * @param alias Name of common tag
 * @returns {boolean|*} true if given alias is mapped as a singleton', otherwise false
 */
function isSingleton(alias) {
    return exports.commonTags.hasOwnProperty(alias) && !exports.commonTags[alias].multiple;
}
exports.isSingleton = isSingleton;
/**
 * @param alias Common (generic) tag
 * @returns {boolean|*} true if given alias is a singleton or explicitly marked as unique
 */
function isUnique(alias) {
    return !exports.commonTags[alias].multiple || exports.commonTags[alias].unique;
}
exports.isUnique = isUnique;
//# sourceMappingURL=GenericTagTypes.js.map
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430492, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.CombinedTagMapper = void 0;
const ID3v1TagMap_1 = require("../id3v1/ID3v1TagMap");
const ID3v24TagMapper_1 = require("../id3v2/ID3v24TagMapper");
const AsfTagMapper_1 = require("../asf/AsfTagMapper");
const ID3v22TagMapper_1 = require("../id3v2/ID3v22TagMapper");
const APEv2TagMapper_1 = require("../apev2/APEv2TagMapper");
const MP4TagMapper_1 = require("../mp4/MP4TagMapper");
const VorbisTagMapper_1 = require("../ogg/vorbis/VorbisTagMapper");
const RiffInfoTagMap_1 = require("../riff/RiffInfoTagMap");
const MatroskaTagMapper_1 = require("../matroska/MatroskaTagMapper");
const AiffTagMap_1 = require("../aiff/AiffTagMap");
class CombinedTagMapper {
    constructor() {
        this.tagMappers = {};
        [
            new ID3v1TagMap_1.ID3v1TagMapper(),
            new ID3v22TagMapper_1.ID3v22TagMapper(),
            new ID3v24TagMapper_1.ID3v24TagMapper(),
            new MP4TagMapper_1.MP4TagMapper(),
            new MP4TagMapper_1.MP4TagMapper(),
            new VorbisTagMapper_1.VorbisTagMapper(),
            new APEv2TagMapper_1.APEv2TagMapper(),
            new AsfTagMapper_1.AsfTagMapper(),
            new RiffInfoTagMap_1.RiffInfoTagMapper(),
            new MatroskaTagMapper_1.MatroskaTagMapper(),
            new AiffTagMap_1.AiffTagMapper()
        ].forEach(mapper => {
            this.registerTagMapper(mapper);
        });
    }
    /**
     * Convert native to generic (common) tags
     * @param tagType Originating tag format
     * @param tag     Native tag to map to a generic tag id
     * @param warnings
     * @return Generic tag result (output of this function)
     */
    mapTag(tagType, tag, warnings) {
        const tagMapper = this.tagMappers[tagType];
        if (tagMapper) {
            return this.tagMappers[tagType].mapGenericTag(tag, warnings);
        }
        throw new Error('No generic tag mapper defined for tag-format: ' + tagType);
    }
    registerTagMapper(genericTagMapper) {
        for (const tagType of genericTagMapper.tagTypes) {
            this.tagMappers[tagType] = genericTagMapper;
        }
    }
}
exports.CombinedTagMapper = CombinedTagMapper;
//# sourceMappingURL=CombinedTagMapper.js.map
}, function(modId) { var map = {"../id3v1/ID3v1TagMap":1665830430493,"../id3v2/ID3v24TagMapper":1665830430495,"../asf/AsfTagMapper":1665830430498,"../id3v2/ID3v22TagMapper":1665830430499,"../apev2/APEv2TagMapper":1665830430500,"../mp4/MP4TagMapper":1665830430501,"../ogg/vorbis/VorbisTagMapper":1665830430502,"../riff/RiffInfoTagMap":1665830430503,"../matroska/MatroskaTagMapper":1665830430504,"../aiff/AiffTagMap":1665830430505}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430493, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.ID3v1TagMapper = void 0;
const GenericTagMapper_1 = require("../common/GenericTagMapper");
/**
 * ID3v1 tag mappings
 */
const id3v1TagMap = {
    title: 'title',
    artist: 'artist',
    album: 'album',
    year: 'year',
    comment: 'comment',
    track: 'track',
    genre: 'genre'
};
class ID3v1TagMapper extends GenericTagMapper_1.CommonTagMapper {
    constructor() {
        super(['ID3v1'], id3v1TagMap);
    }
}
exports.ID3v1TagMapper = ID3v1TagMapper;
//# sourceMappingURL=ID3v1TagMap.js.map
}, function(modId) { var map = {"../common/GenericTagMapper":1665830430494}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430494, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonTagMapper = void 0;
class CommonTagMapper {
    constructor(tagTypes, tagMap) {
        this.tagTypes = tagTypes;
        this.tagMap = tagMap;
    }
    static toIntOrNull(str) {
        const cleaned = parseInt(str, 10);
        return isNaN(cleaned) ? null : cleaned;
    }
    // TODO: a string of 1of1 would fail to be converted
    // converts 1/10 to no : 1, of : 10
    // or 1 to no : 1, of : 0
    static normalizeTrack(origVal) {
        const split = origVal.toString().split('/');
        return {
            no: parseInt(split[0], 10) || null,
            of: parseInt(split[1], 10) || null
        };
    }
    /**
     * Process and set common tags
     * write common tags to
     * @param tag Native tag
     * @param warnings Register warnings
     * @return common name
     */
    mapGenericTag(tag, warnings) {
        tag = { id: tag.id, value: tag.value }; // clone object
        this.postMap(tag, warnings);
        // Convert native tag event to generic 'alias' tag
        const id = this.getCommonName(tag.id);
        return id ? { id, value: tag.value } : null;
    }
    /**
     * Convert native tag key to common tag key
     * @tag  Native header tag
     * @return common tag name (alias)
     */
    getCommonName(tag) {
        return this.tagMap[tag];
    }
    /**
     * Handle post mapping exceptions / correction
     * @param tag Tag e.g. {"©alb", "Buena Vista Social Club")
     * @param warnings Used to register warnings
     */
    postMap(tag, warnings) {
        return;
    }
}
exports.CommonTagMapper = CommonTagMapper;
CommonTagMapper.maxRatingScore = 1;
//# sourceMappingURL=GenericTagMapper.js.map
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430495, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.ID3v24TagMapper = void 0;
const GenericTagMapper_1 = require("../common/GenericTagMapper");
const CaseInsensitiveTagMap_1 = require("../common/CaseInsensitiveTagMap");
const util = require("../common/Util");
/**
 * ID3v2.3/ID3v2.4 tag mappings
 */
const id3v24TagMap = {
    // id3v2.3
    TIT2: 'title',
    TPE1: 'artist',
    'TXXX:Artists': 'artists',
    TPE2: 'albumartist',
    TALB: 'album',
    TDRV: 'date',
    /**
     * Original release year
     */
    TORY: 'originalyear',
    TPOS: 'disk',
    TCON: 'genre',
    APIC: 'picture',
    TCOM: 'composer',
    'USLT:description': 'lyrics',
    TSOA: 'albumsort',
    TSOT: 'titlesort',
    TOAL: 'originalalbum',
    TSOP: 'artistsort',
    TSO2: 'albumartistsort',
    TSOC: 'composersort',
    TEXT: 'lyricist',
    'TXXX:Writer': 'writer',
    TPE3: 'conductor',
    // 'IPLS:instrument': 'performer:instrument', // ToDo
    TPE4: 'remixer',
    'IPLS:arranger': 'arranger',
    'IPLS:engineer': 'engineer',
    'IPLS:producer': 'producer',
    'IPLS:DJ-mix': 'djmixer',
    'IPLS:mix': 'mixer',
    TPUB: 'label',
    TIT1: 'grouping',
    TIT3: 'subtitle',
    TRCK: 'track',
    TCMP: 'compilation',
    POPM: 'rating',
    TBPM: 'bpm',
    TMED: 'media',
    'TXXX:CATALOGNUMBER': 'catalognumber',
    'TXXX:MusicBrainz Album Status': 'releasestatus',
    'TXXX:MusicBrainz Album Type': 'releasetype',
    /**
     * Release country as documented: https://picard.musicbrainz.org/docs/mappings/#cite_note-0
     */
    'TXXX:MusicBrainz Album Release Country': 'releasecountry',
    /**
     * Release country as implemented // ToDo: report
     */
    'TXXX:RELEASECOUNTRY': 'releasecountry',
    'TXXX:SCRIPT': 'script',
    TLAN: 'language',
    TCOP: 'copyright',
    WCOP: 'license',
    TENC: 'encodedby',
    TSSE: 'encodersettings',
    'TXXX:BARCODE': 'barcode',
    'TXXX:ISRC': 'isrc',
    TSRC: 'isrc',
    'TXXX:ASIN': 'asin',
    'TXXX:originalyear': 'originalyear',
    'UFID:http://musicbrainz.org': 'musicbrainz_recordingid',
    'TXXX:MusicBrainz Release Track Id': 'musicbrainz_trackid',
    'TXXX:MusicBrainz Album Id': 'musicbrainz_albumid',
    'TXXX:MusicBrainz Artist Id': 'musicbrainz_artistid',
    'TXXX:MusicBrainz Album Artist Id': 'musicbrainz_albumartistid',
    'TXXX:MusicBrainz Release Group Id': 'musicbrainz_releasegroupid',
    'TXXX:MusicBrainz Work Id': 'musicbrainz_workid',
    'TXXX:MusicBrainz TRM Id': 'musicbrainz_trmid',
    'TXXX:MusicBrainz Disc Id': 'musicbrainz_discid',
    'TXXX:ACOUSTID_ID': 'acoustid_id',
    'TXXX:Acoustid Id': 'acoustid_id',
    'TXXX:Acoustid Fingerprint': 'acoustid_fingerprint',
    'TXXX:MusicIP PUID': 'musicip_puid',
    'TXXX:MusicMagic Fingerprint': 'musicip_fingerprint',
    WOAR: 'website',
    // id3v2.4
    // ToDo: In same sequence as defined at http://id3.org/id3v2.4.0-frames
    TDRC: 'date',
    TYER: 'year',
    TDOR: 'originaldate',
    // 'TMCL:instrument': 'performer:instrument',
    'TIPL:arranger': 'arranger',
    'TIPL:engineer': 'engineer',
    'TIPL:producer': 'producer',
    'TIPL:DJ-mix': 'djmixer',
    'TIPL:mix': 'mixer',
    TMOO: 'mood',
    // additional mappings:
    SYLT: 'lyrics',
    TSST: 'discsubtitle',
    TKEY: 'key',
    COMM: 'comment',
    TOPE: 'originalartist',
    // Windows Media Player
    'PRIV:AverageLevel': 'averageLevel',
    'PRIV:PeakLevel': 'peakLevel',
    // Discogs
    'TXXX:DISCOGS_ARTIST_ID': 'discogs_artist_id',
    'TXXX:DISCOGS_ARTISTS': 'artists',
    'TXXX:DISCOGS_ARTIST_NAME': 'artists',
    'TXXX:DISCOGS_ALBUM_ARTISTS': 'albumartist',
    'TXXX:DISCOGS_CATALOG': 'catalognumber',
    'TXXX:DISCOGS_COUNTRY': 'releasecountry',
    'TXXX:DISCOGS_DATE': 'originaldate',
    'TXXX:DISCOGS_LABEL': 'label',
    'TXXX:DISCOGS_LABEL_ID': 'discogs_label_id',
    'TXXX:DISCOGS_MASTER_RELEASE_ID': 'discogs_master_release_id',
    'TXXX:DISCOGS_RATING': 'discogs_rating',
    'TXXX:DISCOGS_RELEASED': 'date',
    'TXXX:DISCOGS_RELEASE_ID': 'discogs_release_id',
    'TXXX:DISCOGS_VOTES': 'discogs_votes',
    'TXXX:CATALOGID': 'catalognumber',
    'TXXX:STYLE': 'genre',
    'TXXX:REPLAYGAIN_TRACK_PEAK': 'replaygain_track_peak',
    'TXXX:REPLAYGAIN_TRACK_GAIN': 'replaygain_track_gain',
    'TXXX:REPLAYGAIN_ALBUM_PEAK': 'replaygain_album_peak',
    'TXXX:REPLAYGAIN_ALBUM_GAIN': 'replaygain_album_gain',
    'TXXX:MP3GAIN_MINMAX': 'replaygain_track_minmax',
    'TXXX:MP3GAIN_ALBUM_MINMAX': 'replaygain_album_minmax',
    'TXXX:MP3GAIN_UNDO': 'replaygain_undo',
    MVNM: 'movement',
    MVIN: 'movementIndex',
    PCST: 'podcast',
    TCAT: 'category',
    TDES: 'description',
    TDRL: 'date',
    TGID: 'podcastId',
    TKWD: 'keywords',
    WFED: 'podcasturl'
};
class ID3v24TagMapper extends CaseInsensitiveTagMap_1.CaseInsensitiveTagMap {
    static toRating(popm) {
        return {
            source: popm.email,
            rating: popm.rating > 0 ? (popm.rating - 1) / 254 * GenericTagMapper_1.CommonTagMapper.maxRatingScore : undefined
        };
    }
    constructor() {
        super(['ID3v2.3', 'ID3v2.4'], id3v24TagMap);
    }
    /**
     * Handle post mapping exceptions / correction
     * @param tag to post map
     * @param warnings Wil be used to register (collect) warnings
     * @return Common value e.g. "Buena Vista Social Club"
     */
    postMap(tag, warnings) {
        switch (tag.id) {
            case 'UFID': // decode MusicBrainz Recording Id
                if (tag.value.owner_identifier === 'http://musicbrainz.org') {
                    tag.id += ':' + tag.value.owner_identifier;
                    tag.value = util.decodeString(tag.value.identifier, 'latin1'); // latin1 == iso-8859-1
                }
                break;
            case 'PRIV':
                switch (tag.value.owner_identifier) {
                    // decode Windows Media Player
                    case 'AverageLevel':
                    case 'PeakValue':
                        tag.id += ':' + tag.value.owner_identifier;
                        tag.value = tag.value.data.length === 4 ? tag.value.data.readUInt32LE(0) : null;
                        if (tag.value === null) {
                            warnings.addWarning(`Failed to parse PRIV:PeakValue`);
                        }
                        break;
                    default:
                        warnings.addWarning(`Unknown PRIV owner-identifier: ${tag.value.owner_identifier}`);
                }
                break;
            case 'COMM':
                tag.value = tag.value ? tag.value.text : null;
                break;
            case 'POPM':
                tag.value = ID3v24TagMapper.toRating(tag.value);
                break;
            default:
                break;
        }
    }
}
exports.ID3v24TagMapper = ID3v24TagMapper;
//# sourceMappingURL=ID3v24TagMapper.js.map
}, function(modId) { var map = {"../common/GenericTagMapper":1665830430494,"../common/CaseInsensitiveTagMap":1665830430496,"../common/Util":1665830430497}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430496, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseInsensitiveTagMap = void 0;
const GenericTagMapper_1 = require("./GenericTagMapper");
class CaseInsensitiveTagMap extends GenericTagMapper_1.CommonTagMapper {
    constructor(tagTypes, tagMap) {
        const upperCaseMap = {};
        for (const tag of Object.keys(tagMap)) {
            upperCaseMap[tag.toUpperCase()] = tagMap[tag];
        }
        super(tagTypes, upperCaseMap);
    }
    /**
     * @tag  Native header tag
     * @return common tag name (alias)
     */
    getCommonName(tag) {
        return this.tagMap[tag.toUpperCase()];
    }
}
exports.CaseInsensitiveTagMap = CaseInsensitiveTagMap;
//# sourceMappingURL=CaseInsensitiveTagMap.js.map
}, function(modId) { var map = {"./GenericTagMapper":1665830430494}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430497, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.toRatio = exports.dbToRatio = exports.ratioToDb = exports.a2hex = exports.isBitSet = exports.getBitAllignedNumber = exports.stripNulls = exports.decodeString = exports.trimRightNull = exports.findZero = exports.getBit = void 0;
function getBit(buf, off, bit) {
    return (buf[off] & (1 << bit)) !== 0;
}
exports.getBit = getBit;
/**
 * Found delimiting zero in uint8Array
 * @param uint8Array Uint8Array to find the zero delimiter in
 * @param start Offset in uint8Array
 * @param end Last position to parse in uint8Array
 * @param encoding The string encoding used
 * @return Absolute position on uint8Array where zero found
 */
function findZero(uint8Array, start, end, encoding) {
    let i = start;
    if (encoding === 'utf16le') {
        while (uint8Array[i] !== 0 || uint8Array[i + 1] !== 0) {
            if (i >= end)
                return end;
            i += 2;
        }
        return i;
    }
    else {
        while (uint8Array[i] !== 0) {
            if (i >= end)
                return end;
            i++;
        }
        return i;
    }
}
exports.findZero = findZero;
function trimRightNull(x) {
    const pos0 = x.indexOf('\0');
    return pos0 === -1 ? x : x.substr(0, pos0);
}
exports.trimRightNull = trimRightNull;
function swapBytes(uint8Array) {
    const l = uint8Array.length;
    if ((l & 1) !== 0)
        throw new Error('Buffer length must be even');
    for (let i = 0; i < l; i += 2) {
        const a = uint8Array[i];
        uint8Array[i] = uint8Array[i + 1];
        uint8Array[i + 1] = a;
    }
    return uint8Array;
}
/**
 * Decode string
 */
function decodeString(uint8Array, encoding) {
    // annoying workaround for a double BOM issue
    // https://github.com/leetreveil/musicmetadata/issues/84
    if (uint8Array[0] === 0xFF && uint8Array[1] === 0xFE) { // little endian
        return decodeString(uint8Array.subarray(2), encoding);
    }
    else if (encoding === 'utf16le' && uint8Array[0] === 0xFE && uint8Array[1] === 0xFF) {
        // BOM, indicating big endian decoding
        if ((uint8Array.length & 1) !== 0)
            throw new Error('Expected even number of octets for 16-bit unicode string');
        return decodeString(swapBytes(uint8Array), encoding);
    }
    return Buffer.from(uint8Array).toString(encoding);
}
exports.decodeString = decodeString;
function stripNulls(str) {
    str = str.replace(/^\x00+/g, '');
    str = str.replace(/\x00+$/g, '');
    return str;
}
exports.stripNulls = stripNulls;
/**
 * Read bit-aligned number start from buffer
 * Total offset in bits = byteOffset * 8 + bitOffset
 * @param source Byte buffer
 * @param byteOffset Starting offset in bytes
 * @param bitOffset Starting offset in bits: 0 = lsb
 * @param len Length of number in bits
 * @return Decoded bit aligned number
 */
function getBitAllignedNumber(source, byteOffset, bitOffset, len) {
    const byteOff = byteOffset + ~~(bitOffset / 8);
    const bitOff = bitOffset % 8;
    let value = source[byteOff];
    value &= 0xff >> bitOff;
    const bitsRead = 8 - bitOff;
    const bitsLeft = len - bitsRead;
    if (bitsLeft < 0) {
        value >>= (8 - bitOff - len);
    }
    else if (bitsLeft > 0) {
        value <<= bitsLeft;
        value |= getBitAllignedNumber(source, byteOffset, bitOffset + bitsRead, bitsLeft);
    }
    return value;
}
exports.getBitAllignedNumber = getBitAllignedNumber;
/**
 * Read bit-aligned number start from buffer
 * Total offset in bits = byteOffset * 8 + bitOffset
 * @param source Byte Uint8Array
 * @param byteOffset Starting offset in bytes
 * @param bitOffset Starting offset in bits: 0 = most significant bit, 7 is the least significant bit
 * @return True if bit is set
 */
function isBitSet(source, byteOffset, bitOffset) {
    return getBitAllignedNumber(source, byteOffset, bitOffset, 1) === 1;
}
exports.isBitSet = isBitSet;
function a2hex(str) {
    const arr = [];
    for (let i = 0, l = str.length; i < l; i++) {
        const hex = Number(str.charCodeAt(i)).toString(16);
        arr.push(hex.length === 1 ? '0' + hex : hex);
    }
    return arr.join(' ');
}
exports.a2hex = a2hex;
/**
 * Convert power ratio to DB
 * ratio: [0..1]
 */
function ratioToDb(ratio) {
    return 10 * Math.log10(ratio);
}
exports.ratioToDb = ratioToDb;
/**
 * Convert dB to ratio
 * db Decibels
 */
function dbToRatio(dB) {
    return Math.pow(10, dB / 10);
}
exports.dbToRatio = dbToRatio;
/**
 * Convert replay gain to ratio and Decibel
 * @param value string holding a ratio like '0.034' or '-7.54 dB'
 */
function toRatio(value) {
    const ps = value.split(' ').map(p => p.trim().toLowerCase());
    // @ts-ignore
    if (ps.length >= 1) {
        const v = parseFloat(ps[0]);
        return ps.length === 2 && ps[1] === 'db' ? {
            dB: v,
            ratio: dbToRatio(v)
        } : {
            dB: ratioToDb(v),
            ratio: v
        };
    }
}
exports.toRatio = toRatio;
//# sourceMappingURL=Util.js.map
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430498, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.AsfTagMapper = void 0;
const GenericTagMapper_1 = require("../common/GenericTagMapper");
/**
 * ASF Metadata tag mappings.
 * See http://msdn.microsoft.com/en-us/library/ms867702.aspx
 */
const asfTagMap = {
    Title: 'title',
    Author: 'artist',
    'WM/AlbumArtist': 'albumartist',
    'WM/AlbumTitle': 'album',
    'WM/Year': 'date',
    'WM/OriginalReleaseTime': 'originaldate',
    'WM/OriginalReleaseYear': 'originalyear',
    Description: 'comment',
    'WM/TrackNumber': 'track',
    'WM/PartOfSet': 'disk',
    'WM/Genre': 'genre',
    'WM/Composer': 'composer',
    'WM/Lyrics': 'lyrics',
    'WM/AlbumSortOrder': 'albumsort',
    'WM/TitleSortOrder': 'titlesort',
    'WM/ArtistSortOrder': 'artistsort',
    'WM/AlbumArtistSortOrder': 'albumartistsort',
    'WM/ComposerSortOrder': 'composersort',
    'WM/Writer': 'lyricist',
    'WM/Conductor': 'conductor',
    'WM/ModifiedBy': 'remixer',
    'WM/Engineer': 'engineer',
    'WM/Producer': 'producer',
    'WM/DJMixer': 'djmixer',
    'WM/Mixer': 'mixer',
    'WM/Publisher': 'label',
    'WM/ContentGroupDescription': 'grouping',
    'WM/SubTitle': 'subtitle',
    'WM/SetSubTitle': 'discsubtitle',
    // 'WM/PartOfSet': 'totaldiscs',
    'WM/IsCompilation': 'compilation',
    'WM/SharedUserRating': 'rating',
    'WM/BeatsPerMinute': 'bpm',
    'WM/Mood': 'mood',
    'WM/Media': 'media',
    'WM/CatalogNo': 'catalognumber',
    'MusicBrainz/Album Status': 'releasestatus',
    'MusicBrainz/Album Type': 'releasetype',
    'MusicBrainz/Album Release Country': 'releasecountry',
    'WM/Script': 'script',
    'WM/Language': 'language',
    Copyright: 'copyright',
    LICENSE: 'license',
    'WM/EncodedBy': 'encodedby',
    'WM/EncodingSettings': 'encodersettings',
    'WM/Barcode': 'barcode',
    'WM/ISRC': 'isrc',
    'MusicBrainz/Track Id': 'musicbrainz_recordingid',
    'MusicBrainz/Release Track Id': 'musicbrainz_trackid',
    'MusicBrainz/Album Id': 'musicbrainz_albumid',
    'MusicBrainz/Artist Id': 'musicbrainz_artistid',
    'MusicBrainz/Album Artist Id': 'musicbrainz_albumartistid',
    'MusicBrainz/Release Group Id': 'musicbrainz_releasegroupid',
    'MusicBrainz/Work Id': 'musicbrainz_workid',
    'MusicBrainz/TRM Id': 'musicbrainz_trmid',
    'MusicBrainz/Disc Id': 'musicbrainz_discid',
    'Acoustid/Id': 'acoustid_id',
    'Acoustid/Fingerprint': 'acoustid_fingerprint',
    'MusicIP/PUID': 'musicip_puid',
    'WM/ARTISTS': 'artists',
    'WM/InitialKey': 'key',
    ASIN: 'asin',
    'WM/Work': 'work',
    'WM/AuthorURL': 'website',
    'WM/Picture': 'picture'
};
class AsfTagMapper extends GenericTagMapper_1.CommonTagMapper {
    static toRating(rating) {
        return {
            rating: parseFloat(rating + 1) / 5
        };
    }
    constructor() {
        super(['asf'], asfTagMap);
    }
    postMap(tag) {
        switch (tag.id) {
            case 'WM/SharedUserRating':
                const keys = tag.id.split(':');
                tag.value = AsfTagMapper.toRating(tag.value);
                tag.id = keys[0];
                break;
        }
    }
}
exports.AsfTagMapper = AsfTagMapper;
//# sourceMappingURL=AsfTagMapper.js.map
}, function(modId) { var map = {"../common/GenericTagMapper":1665830430494}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430499, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.ID3v22TagMapper = exports.id3v22TagMap = void 0;
const CaseInsensitiveTagMap_1 = require("../common/CaseInsensitiveTagMap");
/**
 * ID3v2.2 tag mappings
 */
exports.id3v22TagMap = {
    TT2: 'title',
    TP1: 'artist',
    TP2: 'albumartist',
    TAL: 'album',
    TYE: 'year',
    COM: 'comment',
    TRK: 'track',
    TPA: 'disk',
    TCO: 'genre',
    PIC: 'picture',
    TCM: 'composer',
    TOR: 'originaldate',
    TOT: 'originalalbum',
    TXT: 'lyricist',
    TP3: 'conductor',
    TPB: 'label',
    TT1: 'grouping',
    TT3: 'subtitle',
    TLA: 'language',
    TCR: 'copyright',
    WCP: 'license',
    TEN: 'encodedby',
    TSS: 'encodersettings',
    WAR: 'website',
    'COM:iTunPGAP': 'gapless'
    /* ToDo: iTunes tags:
    'COM:iTunNORM': ,
    'COM:iTunSMPB': 'encoder delay',
    'COM:iTunes_CDDB_IDs'
    */ ,
    PCS: 'podcast',
    TCP: "compilation",
    TDR: 'date',
    TS2: 'albumartistsort',
    TSA: 'albumsort',
    TSC: 'composersort',
    TSP: 'artistsort',
    TST: 'titlesort',
    WFD: 'podcasturl',
    TBP: 'bpm'
};
class ID3v22TagMapper extends CaseInsensitiveTagMap_1.CaseInsensitiveTagMap {
    constructor() {
        super(['ID3v2.2'], exports.id3v22TagMap);
    }
}
exports.ID3v22TagMapper = ID3v22TagMapper;
//# sourceMappingURL=ID3v22TagMapper.js.map
}, function(modId) { var map = {"../common/CaseInsensitiveTagMap":1665830430496}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430500, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.APEv2TagMapper = void 0;
const CaseInsensitiveTagMap_1 = require("../common/CaseInsensitiveTagMap");
/**
 * ID3v2.2 tag mappings
 */
const apev2TagMap = {
    Title: 'title',
    Artist: 'artist',
    Artists: 'artists',
    'Album Artist': 'albumartist',
    Album: 'album',
    Year: 'date',
    Originalyear: 'originalyear',
    Originaldate: 'originaldate',
    Comment: 'comment',
    Track: 'track',
    Disc: 'disk',
    DISCNUMBER: 'disk',
    Genre: 'genre',
    'Cover Art (Front)': 'picture',
    'Cover Art (Back)': 'picture',
    Composer: 'composer',
    Lyrics: 'lyrics',
    ALBUMSORT: 'albumsort',
    TITLESORT: 'titlesort',
    WORK: 'work',
    ARTISTSORT: 'artistsort',
    ALBUMARTISTSORT: 'albumartistsort',
    COMPOSERSORT: 'composersort',
    Lyricist: 'lyricist',
    Writer: 'writer',
    Conductor: 'conductor',
    // 'Performer=artist (instrument)': 'performer:instrument',
    MixArtist: 'remixer',
    Arranger: 'arranger',
    Engineer: 'engineer',
    Producer: 'producer',
    DJMixer: 'djmixer',
    Mixer: 'mixer',
    Label: 'label',
    Grouping: 'grouping',
    Subtitle: 'subtitle',
    DiscSubtitle: 'discsubtitle',
    Compilation: 'compilation',
    BPM: 'bpm',
    Mood: 'mood',
    Media: 'media',
    CatalogNumber: 'catalognumber',
    MUSICBRAINZ_ALBUMSTATUS: 'releasestatus',
    MUSICBRAINZ_ALBUMTYPE: 'releasetype',
    RELEASECOUNTRY: 'releasecountry',
    Script: 'script',
    Language: 'language',
    Copyright: 'copyright',
    LICENSE: 'license',
    EncodedBy: 'encodedby',
    EncoderSettings: 'encodersettings',
    Barcode: 'barcode',
    ISRC: 'isrc',
    ASIN: 'asin',
    musicbrainz_trackid: 'musicbrainz_recordingid',
    musicbrainz_releasetrackid: 'musicbrainz_trackid',
    MUSICBRAINZ_ALBUMID: 'musicbrainz_albumid',
    MUSICBRAINZ_ARTISTID: 'musicbrainz_artistid',
    MUSICBRAINZ_ALBUMARTISTID: 'musicbrainz_albumartistid',
    MUSICBRAINZ_RELEASEGROUPID: 'musicbrainz_releasegroupid',
    MUSICBRAINZ_WORKID: 'musicbrainz_workid',
    MUSICBRAINZ_TRMID: 'musicbrainz_trmid',
    MUSICBRAINZ_DISCID: 'musicbrainz_discid',
    Acoustid_Id: 'acoustid_id',
    ACOUSTID_FINGERPRINT: 'acoustid_fingerprint',
    MUSICIP_PUID: 'musicip_puid',
    Weblink: 'website',
    REPLAYGAIN_TRACK_GAIN: 'replaygain_track_gain',
    REPLAYGAIN_TRACK_PEAK: 'replaygain_track_peak',
    MP3GAIN_MINMAX: 'replaygain_track_minmax',
    MP3GAIN_UNDO: 'replaygain_undo'
};
class APEv2TagMapper extends CaseInsensitiveTagMap_1.CaseInsensitiveTagMap {
    constructor() {
        super(['APEv2'], apev2TagMap);
    }
}
exports.APEv2TagMapper = APEv2TagMapper;
//# sourceMappingURL=APEv2TagMapper.js.map
}, function(modId) { var map = {"../common/CaseInsensitiveTagMap":1665830430496}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430501, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.MP4TagMapper = exports.tagType = void 0;
const CaseInsensitiveTagMap_1 = require("../common/CaseInsensitiveTagMap");
/**
 * Ref: https://github.com/sergiomb2/libmp4v2/wiki/iTunesMetadata
 */
const mp4TagMap = {
    '©nam': 'title',
    '©ART': 'artist',
    aART: 'albumartist',
    /**
     * ToDo: Album artist seems to be stored here while Picard documentation says: aART
     */
    '----:com.apple.iTunes:Band': 'albumartist',
    '©alb': 'album',
    '©day': 'date',
    '©cmt': 'comment',
    '©com': 'comment',
    trkn: 'track',
    disk: 'disk',
    '©gen': 'genre',
    covr: 'picture',
    '©wrt': 'composer',
    '©lyr': 'lyrics',
    soal: 'albumsort',
    sonm: 'titlesort',
    soar: 'artistsort',
    soaa: 'albumartistsort',
    soco: 'composersort',
    '----:com.apple.iTunes:LYRICIST': 'lyricist',
    '----:com.apple.iTunes:CONDUCTOR': 'conductor',
    '----:com.apple.iTunes:REMIXER': 'remixer',
    '----:com.apple.iTunes:ENGINEER': 'engineer',
    '----:com.apple.iTunes:PRODUCER': 'producer',
    '----:com.apple.iTunes:DJMIXER': 'djmixer',
    '----:com.apple.iTunes:MIXER': 'mixer',
    '----:com.apple.iTunes:LABEL': 'label',
    '©grp': 'grouping',
    '----:com.apple.iTunes:SUBTITLE': 'subtitle',
    '----:com.apple.iTunes:DISCSUBTITLE': 'discsubtitle',
    cpil: 'compilation',
    tmpo: 'bpm',
    '----:com.apple.iTunes:MOOD': 'mood',
    '----:com.apple.iTunes:MEDIA': 'media',
    '----:com.apple.iTunes:CATALOGNUMBER': 'catalognumber',
    tvsh: 'tvShow',
    tvsn: 'tvSeason',
    tves: 'tvEpisode',
    sosn: 'tvShowSort',
    tven: 'tvEpisodeId',
    tvnn: 'tvNetwork',
    pcst: 'podcast',
    purl: 'podcasturl',
    '----:com.apple.iTunes:MusicBrainz Album Status': 'releasestatus',
    '----:com.apple.iTunes:MusicBrainz Album Type': 'releasetype',
    '----:com.apple.iTunes:MusicBrainz Album Release Country': 'releasecountry',
    '----:com.apple.iTunes:SCRIPT': 'script',
    '----:com.apple.iTunes:LANGUAGE': 'language',
    cprt: 'copyright',
    '©cpy': 'copyright',
    '----:com.apple.iTunes:LICENSE': 'license',
    '©too': 'encodedby',
    pgap: 'gapless',
    '----:com.apple.iTunes:BARCODE': 'barcode',
    '----:com.apple.iTunes:ISRC': 'isrc',
    '----:com.apple.iTunes:ASIN': 'asin',
    '----:com.apple.iTunes:NOTES': 'comment',
    '----:com.apple.iTunes:MusicBrainz Track Id': 'musicbrainz_recordingid',
    '----:com.apple.iTunes:MusicBrainz Release Track Id': 'musicbrainz_trackid',
    '----:com.apple.iTunes:MusicBrainz Album Id': 'musicbrainz_albumid',
    '----:com.apple.iTunes:MusicBrainz Artist Id': 'musicbrainz_artistid',
    '----:com.apple.iTunes:MusicBrainz Album Artist Id': 'musicbrainz_albumartistid',
    '----:com.apple.iTunes:MusicBrainz Release Group Id': 'musicbrainz_releasegroupid',
    '----:com.apple.iTunes:MusicBrainz Work Id': 'musicbrainz_workid',
    '----:com.apple.iTunes:MusicBrainz TRM Id': 'musicbrainz_trmid',
    '----:com.apple.iTunes:MusicBrainz Disc Id': 'musicbrainz_discid',
    '----:com.apple.iTunes:Acoustid Id': 'acoustid_id',
    '----:com.apple.iTunes:Acoustid Fingerprint': 'acoustid_fingerprint',
    '----:com.apple.iTunes:MusicIP PUID': 'musicip_puid',
    '----:com.apple.iTunes:fingerprint': 'musicip_fingerprint',
    '----:com.apple.iTunes:replaygain_track_gain': 'replaygain_track_gain',
    '----:com.apple.iTunes:replaygain_track_peak': 'replaygain_track_peak',
    '----:com.apple.iTunes:replaygain_album_gain': 'replaygain_album_gain',
    '----:com.apple.iTunes:replaygain_album_peak': 'replaygain_album_peak',
    '----:com.apple.iTunes:replaygain_track_minmax': 'replaygain_track_minmax',
    '----:com.apple.iTunes:replaygain_album_minmax': 'replaygain_album_minmax',
    '----:com.apple.iTunes:replaygain_undo': 'replaygain_undo',
    // Additional mappings:
    gnre: 'genre',
    '----:com.apple.iTunes:ALBUMARTISTSORT': 'albumartistsort',
    '----:com.apple.iTunes:ARTISTS': 'artists',
    '----:com.apple.iTunes:ORIGINALDATE': 'originaldate',
    '----:com.apple.iTunes:ORIGINALYEAR': 'originalyear',
    // '----:com.apple.iTunes:PERFORMER': 'performer'
    desc: 'description',
    ldes: 'longDescription',
    '©mvn': 'movement',
    '©mvi': 'movementIndex',
    '©mvc': 'movementTotal',
    '©wrk': 'work',
    catg: 'category',
    egid: 'podcastId',
    hdvd: 'hdVideo',
    keyw: 'keywords',
    shwm: 'showMovement',
    stik: 'stik'
};
exports.tagType = 'iTunes';
class MP4TagMapper extends CaseInsensitiveTagMap_1.CaseInsensitiveTagMap {
    constructor() {
        super([exports.tagType], mp4TagMap);
    }
}
exports.MP4TagMapper = MP4TagMapper;
//# sourceMappingURL=MP4TagMapper.js.map
}, function(modId) { var map = {"../common/CaseInsensitiveTagMap":1665830430496}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430502, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.VorbisTagMapper = void 0;
const GenericTagMapper_1 = require("../../common/GenericTagMapper");
/**
 * Vorbis tag mappings
 *
 * Mapping from native header format to one or possibly more 'common' entries
 * The common entries aim to read the same information from different media files
 * independent of the underlying format
 */
const vorbisTagMap = {
    TITLE: 'title',
    ARTIST: 'artist',
    ARTISTS: 'artists',
    ALBUMARTIST: 'albumartist',
    'ALBUM ARTIST': 'albumartist',
    ALBUM: 'album',
    DATE: 'date',
    ORIGINALDATE: 'originaldate',
    ORIGINALYEAR: 'originalyear',
    COMMENT: 'comment',
    TRACKNUMBER: 'track',
    DISCNUMBER: 'disk',
    GENRE: 'genre',
    METADATA_BLOCK_PICTURE: 'picture',
    COMPOSER: 'composer',
    LYRICS: 'lyrics',
    ALBUMSORT: 'albumsort',
    TITLESORT: 'titlesort',
    WORK: 'work',
    ARTISTSORT: 'artistsort',
    ALBUMARTISTSORT: 'albumartistsort',
    COMPOSERSORT: 'composersort',
    LYRICIST: 'lyricist',
    WRITER: 'writer',
    CONDUCTOR: 'conductor',
    // 'PERFORMER=artist (instrument)': 'performer:instrument', // ToDo
    REMIXER: 'remixer',
    ARRANGER: 'arranger',
    ENGINEER: 'engineer',
    PRODUCER: 'producer',
    DJMIXER: 'djmixer',
    MIXER: 'mixer',
    LABEL: 'label',
    GROUPING: 'grouping',
    SUBTITLE: 'subtitle',
    DISCSUBTITLE: 'discsubtitle',
    TRACKTOTAL: 'totaltracks',
    DISCTOTAL: 'totaldiscs',
    COMPILATION: 'compilation',
    RATING: 'rating',
    BPM: 'bpm',
    KEY: 'key',
    MOOD: 'mood',
    MEDIA: 'media',
    CATALOGNUMBER: 'catalognumber',
    RELEASESTATUS: 'releasestatus',
    RELEASETYPE: 'releasetype',
    RELEASECOUNTRY: 'releasecountry',
    SCRIPT: 'script',
    LANGUAGE: 'language',
    COPYRIGHT: 'copyright',
    LICENSE: 'license',
    ENCODEDBY: 'encodedby',
    ENCODERSETTINGS: 'encodersettings',
    BARCODE: 'barcode',
    ISRC: 'isrc',
    ASIN: 'asin',
    MUSICBRAINZ_TRACKID: 'musicbrainz_recordingid',
    MUSICBRAINZ_RELEASETRACKID: 'musicbrainz_trackid',
    MUSICBRAINZ_ALBUMID: 'musicbrainz_albumid',
    MUSICBRAINZ_ARTISTID: 'musicbrainz_artistid',
    MUSICBRAINZ_ALBUMARTISTID: 'musicbrainz_albumartistid',
    MUSICBRAINZ_RELEASEGROUPID: 'musicbrainz_releasegroupid',
    MUSICBRAINZ_WORKID: 'musicbrainz_workid',
    MUSICBRAINZ_TRMID: 'musicbrainz_trmid',
    MUSICBRAINZ_DISCID: 'musicbrainz_discid',
    ACOUSTID_ID: 'acoustid_id',
    ACOUSTID_ID_FINGERPRINT: 'acoustid_fingerprint',
    MUSICIP_PUID: 'musicip_puid',
    // 'FINGERPRINT=MusicMagic Fingerprint {fingerprint}': 'musicip_fingerprint', // ToDo
    WEBSITE: 'website',
    NOTES: 'notes',
    TOTALTRACKS: 'totaltracks',
    TOTALDISCS: 'totaldiscs',
    // Discogs
    DISCOGS_ARTIST_ID: 'discogs_artist_id',
    DISCOGS_ARTISTS: 'artists',
    DISCOGS_ARTIST_NAME: 'artists',
    DISCOGS_ALBUM_ARTISTS: 'albumartist',
    DISCOGS_CATALOG: 'catalognumber',
    DISCOGS_COUNTRY: 'releasecountry',
    DISCOGS_DATE: 'originaldate',
    DISCOGS_LABEL: 'label',
    DISCOGS_LABEL_ID: 'discogs_label_id',
    DISCOGS_MASTER_RELEASE_ID: 'discogs_master_release_id',
    DISCOGS_RATING: 'discogs_rating',
    DISCOGS_RELEASED: 'date',
    DISCOGS_RELEASE_ID: 'discogs_release_id',
    DISCOGS_VOTES: 'discogs_votes',
    CATALOGID: 'catalognumber',
    STYLE: 'genre',
    //
    REPLAYGAIN_TRACK_GAIN: 'replaygain_track_gain',
    REPLAYGAIN_TRACK_PEAK: 'replaygain_track_peak',
    REPLAYGAIN_ALBUM_GAIN: 'replaygain_album_gain',
    REPLAYGAIN_ALBUM_PEAK: 'replaygain_album_peak',
    // To Sure if these (REPLAYGAIN_MINMAX, REPLAYGAIN_ALBUM_MINMAX & REPLAYGAIN_UNDO) are used for Vorbis:
    REPLAYGAIN_MINMAX: 'replaygain_track_minmax',
    REPLAYGAIN_ALBUM_MINMAX: 'replaygain_album_minmax',
    REPLAYGAIN_UNDO: 'replaygain_undo'
};
class VorbisTagMapper extends GenericTagMapper_1.CommonTagMapper {
    static toRating(email, rating) {
        return {
            source: email ? email.toLowerCase() : email,
            rating: parseFloat(rating) * GenericTagMapper_1.CommonTagMapper.maxRatingScore
        };
    }
    constructor() {
        super(['vorbis'], vorbisTagMap);
    }
    postMap(tag) {
        if (tag.id.indexOf('RATING:') === 0) {
            const keys = tag.id.split(':');
            tag.value = VorbisTagMapper.toRating(keys[1], tag.value);
            tag.id = keys[0];
        }
    }
}
exports.VorbisTagMapper = VorbisTagMapper;
//# sourceMappingURL=VorbisTagMapper.js.map
}, function(modId) { var map = {"../../common/GenericTagMapper":1665830430494}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430503, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.RiffInfoTagMapper = exports.riffInfoTagMap = void 0;
const GenericTagMapper_1 = require("../common/GenericTagMapper");
/**
 * RIFF Info Tags; part of the EXIF 2.3
 * Ref: http://owl.phy.queensu.ca/~phil/exiftool/TagNames/RIFF.html#Info
 */
exports.riffInfoTagMap = {
    IART: 'artist',
    ICRD: 'date',
    INAM: 'title',
    TITL: 'title',
    IPRD: 'album',
    ITRK: 'track',
    COMM: 'comment',
    ICMT: 'comment',
    ICNT: 'releasecountry',
    GNRE: 'genre',
    IWRI: 'writer',
    RATE: 'rating',
    YEAR: 'year',
    ISFT: 'encodedby',
    CODE: 'encodedby',
    TURL: 'website',
    IGNR: 'genre',
    IENG: 'engineer',
    ITCH: 'technician',
    IMED: 'media',
    IRPD: 'album' // Product, where the file was intended for
};
class RiffInfoTagMapper extends GenericTagMapper_1.CommonTagMapper {
    constructor() {
        super(['exif'], exports.riffInfoTagMap);
    }
}
exports.RiffInfoTagMapper = RiffInfoTagMapper;
//# sourceMappingURL=RiffInfoTagMap.js.map
}, function(modId) { var map = {"../common/GenericTagMapper":1665830430494}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430504, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.MatroskaTagMapper = void 0;
const CaseInsensitiveTagMap_1 = require("../common/CaseInsensitiveTagMap");
/**
 * EBML Tag map
 */
const ebmlTagMap = {
    'segment:title': 'title',
    'album:ARTIST': 'albumartist',
    'album:ARTISTSORT': 'albumartistsort',
    'album:TITLE': 'album',
    'album:DATE_RECORDED': 'originaldate',
    'album:PART_NUMBER': 'disk',
    'album:TOTAL_PARTS': 'totaltracks',
    'track:ARTIST': 'artist',
    'track:ARTISTSORT': 'artistsort',
    'track:TITLE': 'title',
    'track:PART_NUMBER': 'track',
    'track:MUSICBRAINZ_TRACKID': 'musicbrainz_recordingid',
    'track:MUSICBRAINZ_ALBUMID': 'musicbrainz_albumid',
    'track:MUSICBRAINZ_ARTISTID': 'musicbrainz_artistid',
    'track:PUBLISHER': 'label',
    'track:GENRE': 'genre',
    'track:ENCODER': 'encodedby',
    'track:ENCODER_OPTIONS': 'encodersettings',
    'edition:TOTAL_PARTS': 'totaldiscs',
    picture: 'picture'
};
class MatroskaTagMapper extends CaseInsensitiveTagMap_1.CaseInsensitiveTagMap {
    constructor() {
        super(['matroska'], ebmlTagMap);
    }
}
exports.MatroskaTagMapper = MatroskaTagMapper;
//# sourceMappingURL=MatroskaTagMapper.js.map
}, function(modId) { var map = {"../common/CaseInsensitiveTagMap":1665830430496}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430505, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.AiffTagMapper = void 0;
const GenericTagMapper_js_1 = require("../common/GenericTagMapper.js");
/**
 * ID3v1 tag mappings
 */
const tagMap = {
    NAME: 'title',
    AUTH: 'artist',
    '(c) ': 'copyright',
    ANNO: 'comment'
};
class AiffTagMapper extends GenericTagMapper_js_1.CommonTagMapper {
    constructor() {
        super(['AIFF'], tagMap);
    }
}
exports.AiffTagMapper = AiffTagMapper;
//# sourceMappingURL=AiffTagMap.js.map
}, function(modId) { var map = {"../common/GenericTagMapper.js":1665830430494}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430506, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.AIFFParser = void 0;
const Token = require("token-types");
const debug_1 = require("debug");
const strtok3 = require("strtok3/lib/core");
const ID3v2Parser_1 = require("../id3v2/ID3v2Parser");
const FourCC_1 = require("../common/FourCC");
const BasicParser_1 = require("../common/BasicParser");
const AiffToken = require("./AiffToken");
const iff = require("../iff");
const debug = (0, debug_1.default)('music-metadata:parser:aiff');
const compressionTypes = {
    NONE: 'not compressed	PCM	Apple Computer',
    sowt: 'PCM (byte swapped)',
    fl32: '32-bit floating point IEEE 32-bit float',
    fl64: '64-bit floating point IEEE 64-bit float	Apple Computer',
    alaw: 'ALaw 2:1	8-bit ITU-T G.711 A-law',
    ulaw: 'µLaw 2:1	8-bit ITU-T G.711 µ-law	Apple Computer',
    ULAW: 'CCITT G.711 u-law 8-bit ITU-T G.711 µ-law',
    ALAW: 'CCITT G.711 A-law 8-bit ITU-T G.711 A-law',
    FL32: 'Float 32	IEEE 32-bit float '
};
/**
 * AIFF - Audio Interchange File Format
 *
 * Ref:
 * - http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/AIFF/AIFF.html
 * - http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/AIFF/Docs/AIFF-1.3.pdf
 */
class AIFFParser extends BasicParser_1.BasicParser {
    async parse() {
        const header = await this.tokenizer.readToken(iff.Header);
        if (header.chunkID !== 'FORM')
            throw new Error('Invalid Chunk-ID, expected \'FORM\''); // Not AIFF format
        const type = await this.tokenizer.readToken(FourCC_1.FourCcToken);
        switch (type) {
            case 'AIFF':
                this.metadata.setFormat('container', type);
                this.isCompressed = false;
                break;
            case 'AIFC':
                this.metadata.setFormat('container', 'AIFF-C');
                this.isCompressed = true;
                break;
            default:
                throw Error('Unsupported AIFF type: ' + type);
        }
        this.metadata.setFormat('lossless', !this.isCompressed);
        try {
            while (!this.tokenizer.fileInfo.size || this.tokenizer.fileInfo.size - this.tokenizer.position >= iff.Header.len) {
                debug('Reading AIFF chunk at offset=' + this.tokenizer.position);
                const chunkHeader = await this.tokenizer.readToken(iff.Header);
                const nextChunk = 2 * Math.round(chunkHeader.chunkSize / 2);
                const bytesRead = await this.readData(chunkHeader);
                await this.tokenizer.ignore(nextChunk - bytesRead);
            }
        }
        catch (err) {
            if (err instanceof strtok3.EndOfStreamError) {
                debug(`End-of-stream`);
            }
            else {
                throw err;
            }
        }
    }
    async readData(header) {
        var _a;
        switch (header.chunkID) {
            case 'COMM': // The Common Chunk
                const common = await this.tokenizer.readToken(new AiffToken.Common(header, this.isCompressed));
                this.metadata.setFormat('bitsPerSample', common.sampleSize);
                this.metadata.setFormat('sampleRate', common.sampleRate);
                this.metadata.setFormat('numberOfChannels', common.numChannels);
                this.metadata.setFormat('numberOfSamples', common.numSampleFrames);
                this.metadata.setFormat('duration', common.numSampleFrames / common.sampleRate);
                this.metadata.setFormat('codec', (_a = common.compressionName) !== null && _a !== void 0 ? _a : compressionTypes[common.compressionType]);
                return header.chunkSize;
            case 'ID3 ': // ID3-meta-data
                const id3_data = await this.tokenizer.readToken(new Token.Uint8ArrayType(header.chunkSize));
                const rst = strtok3.fromBuffer(id3_data);
                await new ID3v2Parser_1.ID3v2Parser().parse(this.metadata, rst, this.options);
                return header.chunkSize;
            case 'SSND': // Sound Data Chunk
                if (this.metadata.format.duration) {
                    this.metadata.setFormat('bitrate', 8 * header.chunkSize / this.metadata.format.duration);
                }
                return 0;
            case 'NAME': // Sample name chunk
            case 'AUTH': // Author chunk
            case '(c) ': // Copyright chunk
            case 'ANNO': // Annotation chunk
                return this.readTextChunk(header);
            default:
                debug(`Ignore chunk id=${header.chunkID}, size=${header.chunkSize}`);
                return 0;
        }
    }
    async readTextChunk(header) {
        const value = await this.tokenizer.readToken(new Token.StringType(header.chunkSize, 'ascii'));
        value.split('\0').map(v => v.trim()).filter(v => v && v.length > 0).forEach(v => {
            this.metadata.addTag('AIFF', header.chunkID, v.trim());
        });
        return header.chunkSize;
    }
}
exports.AIFFParser = AIFFParser;

}, function(modId) { var map = {"../id3v2/ID3v2Parser":1665830430507,"../common/FourCC":1665830430514,"../common/BasicParser":1665830430511,"./AiffToken":1665830430515,"../iff":1665830430516}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430507, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.ID3v2Parser = void 0;
const Token = require("token-types");
const util = require("../common/Util");
const FrameParser_1 = require("./FrameParser");
const ID3v2Token_1 = require("./ID3v2Token");
class ID3v2Parser {
    static removeUnsyncBytes(buffer) {
        let readI = 0;
        let writeI = 0;
        while (readI < buffer.length - 1) {
            if (readI !== writeI) {
                buffer[writeI] = buffer[readI];
            }
            readI += (buffer[readI] === 0xFF && buffer[readI + 1] === 0) ? 2 : 1;
            writeI++;
        }
        if (readI < buffer.length) {
            buffer[writeI++] = buffer[readI];
        }
        return buffer.slice(0, writeI);
    }
    static getFrameHeaderLength(majorVer) {
        switch (majorVer) {
            case 2:
                return 6;
            case 3:
            case 4:
                return 10;
            default:
                throw new Error('header versionIndex is incorrect');
        }
    }
    static readFrameFlags(b) {
        return {
            status: {
                tag_alter_preservation: util.getBit(b, 0, 6),
                file_alter_preservation: util.getBit(b, 0, 5),
                read_only: util.getBit(b, 0, 4)
            },
            format: {
                grouping_identity: util.getBit(b, 1, 7),
                compression: util.getBit(b, 1, 3),
                encryption: util.getBit(b, 1, 2),
                unsynchronisation: util.getBit(b, 1, 1),
                data_length_indicator: util.getBit(b, 1, 0)
            }
        };
    }
    static readFrameData(uint8Array, frameHeader, majorVer, includeCovers, warningCollector) {
        const frameParser = new FrameParser_1.FrameParser(majorVer, warningCollector);
        switch (majorVer) {
            case 2:
                return frameParser.readData(uint8Array, frameHeader.id, includeCovers);
            case 3:
            case 4:
                if (frameHeader.flags.format.unsynchronisation) {
                    uint8Array = ID3v2Parser.removeUnsyncBytes(uint8Array);
                }
                if (frameHeader.flags.format.data_length_indicator) {
                    uint8Array = uint8Array.slice(4, uint8Array.length);
                }
                return frameParser.readData(uint8Array, frameHeader.id, includeCovers);
            default:
                throw new Error('Unexpected majorVer: ' + majorVer);
        }
    }
    /**
     * Create a combined tag key, of tag & description
     * @param tag e.g.: COM
     * @param description e.g. iTunPGAP
     * @returns string e.g. COM:iTunPGAP
     */
    static makeDescriptionTagName(tag, description) {
        return tag + (description ? ':' + description : '');
    }
    async parse(metadata, tokenizer, options) {
        this.tokenizer = tokenizer;
        this.metadata = metadata;
        this.options = options;
        const id3Header = await this.tokenizer.readToken(ID3v2Token_1.ID3v2Header);
        if (id3Header.fileIdentifier !== 'ID3') {
            throw new Error('expected ID3-header file-identifier \'ID3\' was not found');
        }
        this.id3Header = id3Header;
        this.headerType = ('ID3v2.' + id3Header.version.major);
        return id3Header.flags.isExtendedHeader ? this.parseExtendedHeader() : this.parseId3Data(id3Header.size);
    }
    async parseExtendedHeader() {
        const extendedHeader = await this.tokenizer.readToken(ID3v2Token_1.ExtendedHeader);
        const dataRemaining = extendedHeader.size - ID3v2Token_1.ExtendedHeader.len;
        return dataRemaining > 0 ? this.parseExtendedHeaderData(dataRemaining, extendedHeader.size) : this.parseId3Data(this.id3Header.size - extendedHeader.size);
    }
    async parseExtendedHeaderData(dataRemaining, extendedHeaderSize) {
        await this.tokenizer.ignore(dataRemaining);
        return this.parseId3Data(this.id3Header.size - extendedHeaderSize);
    }
    async parseId3Data(dataLen) {
        const uint8Array = await this.tokenizer.readToken(new Token.Uint8ArrayType(dataLen));
        for (const tag of this.parseMetadata(uint8Array)) {
            if (tag.id === 'TXXX') {
                if (tag.value) {
                    for (const text of tag.value.text) {
                        this.addTag(ID3v2Parser.makeDescriptionTagName(tag.id, tag.value.description), text);
                    }
                }
            }
            else if (tag.id === 'COM') {
                for (const value of tag.value) {
                    this.addTag(ID3v2Parser.makeDescriptionTagName(tag.id, value.description), value.text);
                }
            }
            else if (tag.id === 'COMM') {
                for (const value of tag.value) {
                    this.addTag(ID3v2Parser.makeDescriptionTagName(tag.id, value.description), value);
                }
            }
            else if (Array.isArray(tag.value)) {
                for (const value of tag.value) {
                    this.addTag(tag.id, value);
                }
            }
            else {
                this.addTag(tag.id, tag.value);
            }
        }
    }
    addTag(id, value) {
        this.metadata.addTag(this.headerType, id, value);
    }
    parseMetadata(data) {
        let offset = 0;
        const tags = [];
        while (true) {
            if (offset === data.length)
                break;
            const frameHeaderLength = ID3v2Parser.getFrameHeaderLength(this.id3Header.version.major);
            if (offset + frameHeaderLength > data.length) {
                this.metadata.addWarning('Illegal ID3v2 tag length');
                break;
            }
            const frameHeaderBytes = data.slice(offset, offset += frameHeaderLength);
            const frameHeader = this.readFrameHeader(frameHeaderBytes, this.id3Header.version.major);
            const frameDataBytes = data.slice(offset, offset += frameHeader.length);
            const values = ID3v2Parser.readFrameData(frameDataBytes, frameHeader, this.id3Header.version.major, !this.options.skipCovers, this.metadata);
            if (values) {
                tags.push({ id: frameHeader.id, value: values });
            }
        }
        return tags;
    }
    readFrameHeader(uint8Array, majorVer) {
        let header;
        switch (majorVer) {
            case 2:
                header = {
                    id: Buffer.from(uint8Array.slice(0, 3)).toString('ascii'),
                    length: Token.UINT24_BE.get(uint8Array, 3)
                };
                if (!header.id.match(/[A-Z0-9]{3}/g)) {
                    this.metadata.addWarning(`Invalid ID3v2.${this.id3Header.version.major} frame-header-ID: ${header.id}`);
                }
                break;
            case 3:
            case 4:
                header = {
                    id: Buffer.from(uint8Array.slice(0, 4)).toString('ascii'),
                    length: (majorVer === 4 ? ID3v2Token_1.UINT32SYNCSAFE : Token.UINT32_BE).get(uint8Array, 4),
                    flags: ID3v2Parser.readFrameFlags(uint8Array.slice(8, 10))
                };
                if (!header.id.match(/[A-Z0-9]{4}/g)) {
                    this.metadata.addWarning(`Invalid ID3v2.${this.id3Header.version.major} frame-header-ID: ${header.id}`);
                }
                break;
            default:
                throw new Error('Unexpected majorVer: ' + majorVer);
        }
        return header;
    }
}
exports.ID3v2Parser = ID3v2Parser;

}, function(modId) { var map = {"../common/Util":1665830430497,"./FrameParser":1665830430508,"./ID3v2Token":1665830430509}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430508, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.FrameParser = exports.parseGenre = void 0;
const debug_1 = require("debug");
const Token = require("token-types");
const util = require("../common/Util");
const ID3v2Token_1 = require("./ID3v2Token");
const ID3v1Parser_1 = require("../id3v1/ID3v1Parser");
const debug = (0, debug_1.default)('music-metadata:id3v2:frame-parser');
const defaultEnc = 'latin1'; // latin1 == iso-8859-1;
function parseGenre(origVal) {
    // match everything inside parentheses
    const genres = [];
    let code;
    let word = '';
    for (const c of origVal) {
        if (typeof code === 'string') {
            if (c === '(' && code === '') {
                word += '(';
                code = undefined;
            }
            else if (c === ')') {
                if (word !== '') {
                    genres.push(word);
                    word = '';
                }
                const genre = parseGenreCode(code);
                if (genre) {
                    genres.push(genre);
                }
                code = undefined;
            }
            else
                code += c;
        }
        else if (c === '(') {
            code = '';
        }
        else {
            word += c;
        }
    }
    if (word) {
        if (genres.length === 0 && word.match(/^\d*$/)) {
            word = ID3v1Parser_1.Genres[word];
        }
        genres.push(word);
    }
    return genres;
}
exports.parseGenre = parseGenre;
function parseGenreCode(code) {
    if (code === 'RX')
        return 'Remix';
    if (code === 'CR')
        return 'Cover';
    if (code.match(/^\d*$/)) {
        return ID3v1Parser_1.Genres[code];
    }
}
class FrameParser {
    /**
     * Create id3v2 frame parser
     * @param major - Major version, e.g. (4) for  id3v2.4
     * @param warningCollector - Used to collect decode issue
     */
    constructor(major, warningCollector) {
        this.major = major;
        this.warningCollector = warningCollector;
    }
    readData(uint8Array, type, includeCovers) {
        if (uint8Array.length === 0) {
            this.warningCollector.addWarning(`id3v2.${this.major} header has empty tag type=${type}`);
            return;
        }
        const { encoding, bom } = ID3v2Token_1.TextEncodingToken.get(uint8Array, 0);
        const length = uint8Array.length;
        let offset = 0;
        let output = []; // ToDo
        const nullTerminatorLength = FrameParser.getNullTerminatorLength(encoding);
        let fzero;
        const out = {};
        debug(`Parsing tag type=${type}, encoding=${encoding}, bom=${bom}`);
        switch (type !== 'TXXX' && type[0] === 'T' ? 'T*' : type) {
            case 'T*': // 4.2.1. Text information frames - details
            case 'IPLS': // v2.3: Involved people list
            case 'MVIN':
            case 'MVNM':
            case 'PCS':
            case 'PCST':
                let text;
                try {
                    text = util.decodeString(uint8Array.slice(1), encoding).replace(/\x00+$/, '');
                }
                catch (error) {
                    this.warningCollector.addWarning(`id3v2.${this.major} type=${type} header has invalid string value: ${error.message}`);
                }
                switch (type) {
                    case 'TMCL': // Musician credits list
                    case 'TIPL': // Involved people list
                    case 'IPLS': // Involved people list
                        output = this.splitValue(type, text);
                        output = FrameParser.functionList(output);
                        break;
                    case 'TRK':
                    case 'TRCK':
                    case 'TPOS':
                        output = text;
                        break;
                    case 'TCOM':
                    case 'TEXT':
                    case 'TOLY':
                    case 'TOPE':
                    case 'TPE1':
                    case 'TSRC':
                        // id3v2.3 defines that TCOM, TEXT, TOLY, TOPE & TPE1 values are separated by /
                        output = this.splitValue(type, text);
                        break;
                    case 'TCO':
                    case 'TCON':
                        output = this.splitValue(type, text).map(v => parseGenre(v)).reduce((acc, val) => acc.concat(val), []);
                        break;
                    case 'PCS':
                    case 'PCST':
                        // TODO: Why `default` not results `1` but `''`?
                        output = this.major >= 4 ? this.splitValue(type, text) : [text];
                        output = (Array.isArray(output) && output[0] === '') ? 1 : 0;
                        break;
                    default:
                        output = this.major >= 4 ? this.splitValue(type, text) : [text];
                }
                break;
            case 'TXXX':
                output = FrameParser.readIdentifierAndData(uint8Array, offset + 1, length, encoding);
                output = {
                    description: output.id,
                    text: this.splitValue(type, util.decodeString(output.data, encoding).replace(/\x00+$/, ''))
                };
                break;
            case 'PIC':
            case 'APIC':
                if (includeCovers) {
                    const pic = {};
                    offset += 1;
                    switch (this.major) {
                        case 2:
                            pic.format = util.decodeString(uint8Array.slice(offset, offset + 3), 'latin1'); // 'latin1'; // latin1 == iso-8859-1;
                            offset += 3;
                            break;
                        case 3:
                        case 4:
                            fzero = util.findZero(uint8Array, offset, length, defaultEnc);
                            pic.format = util.decodeString(uint8Array.slice(offset, fzero), defaultEnc);
                            offset = fzero + 1;
                            break;
                        default:
                            throw new Error('Warning: unexpected major versionIndex: ' + this.major);
                    }
                    pic.format = FrameParser.fixPictureMimeType(pic.format);
                    pic.type = ID3v2Token_1.AttachedPictureType[uint8Array[offset]];
                    offset += 1;
                    fzero = util.findZero(uint8Array, offset, length, encoding);
                    pic.description = util.decodeString(uint8Array.slice(offset, fzero), encoding);
                    offset = fzero + nullTerminatorLength;
                    pic.data = Buffer.from(uint8Array.slice(offset, length));
                    output = pic;
                }
                break;
            case 'CNT':
            case 'PCNT':
                output = Token.UINT32_BE.get(uint8Array, 0);
                break;
            case 'SYLT':
                // skip text encoding (1 byte),
                //      language (3 bytes),
                //      time stamp format (1 byte),
                //      content tagTypes (1 byte),
                //      content descriptor (1 byte)
                offset += 7;
                output = [];
                while (offset < length) {
                    const txt = uint8Array.slice(offset, offset = util.findZero(uint8Array, offset, length, encoding));
                    offset += 5; // push offset forward one +  4 byte timestamp
                    output.push(util.decodeString(txt, encoding));
                }
                break;
            case 'ULT':
            case 'USLT':
            case 'COM':
            case 'COMM':
                offset += 1;
                out.language = util.decodeString(uint8Array.slice(offset, offset + 3), defaultEnc);
                offset += 3;
                fzero = util.findZero(uint8Array, offset, length, encoding);
                out.description = util.decodeString(uint8Array.slice(offset, fzero), encoding);
                offset = fzero + nullTerminatorLength;
                out.text = util.decodeString(uint8Array.slice(offset, length), encoding).replace(/\x00+$/, '');
                output = [out];
                break;
            case 'UFID':
                output = FrameParser.readIdentifierAndData(uint8Array, offset, length, defaultEnc);
                output = { owner_identifier: output.id, identifier: output.data };
                break;
            case 'PRIV': // private frame
                output = FrameParser.readIdentifierAndData(uint8Array, offset, length, defaultEnc);
                output = { owner_identifier: output.id, data: output.data };
                break;
            case 'POPM': // Popularimeter
                fzero = util.findZero(uint8Array, offset, length, defaultEnc);
                const email = util.decodeString(uint8Array.slice(offset, fzero), defaultEnc);
                offset = fzero + 1;
                const dataLen = length - offset;
                output = {
                    email,
                    rating: Token.UINT8.get(uint8Array, offset),
                    counter: dataLen >= 5 ? Token.UINT32_BE.get(uint8Array, offset + 1) : undefined
                };
                break;
            case 'GEOB': { // General encapsulated object
                fzero = util.findZero(uint8Array, offset + 1, length, encoding);
                const mimeType = util.decodeString(uint8Array.slice(offset + 1, fzero), defaultEnc);
                offset = fzero + 1;
                fzero = util.findZero(uint8Array, offset, length - offset, encoding);
                const filename = util.decodeString(uint8Array.slice(offset, fzero), defaultEnc);
                offset = fzero + 1;
                fzero = util.findZero(uint8Array, offset, length - offset, encoding);
                const description = util.decodeString(uint8Array.slice(offset, fzero), defaultEnc);
                output = {
                    type: mimeType,
                    filename,
                    description,
                    data: uint8Array.slice(offset + 1, length)
                };
                break;
            }
            // W-Frames:
            case 'WCOM':
            case 'WCOP':
            case 'WOAF':
            case 'WOAR':
            case 'WOAS':
            case 'WORS':
            case 'WPAY':
            case 'WPUB':
                // Decode URL
                output = util.decodeString(uint8Array.slice(offset, fzero), defaultEnc);
                break;
            case 'WXXX': {
                // Decode URL
                fzero = util.findZero(uint8Array, offset + 1, length, encoding);
                const description = util.decodeString(uint8Array.slice(offset + 1, fzero), encoding);
                offset = fzero + (encoding === 'utf16le' ? 2 : 1);
                output = { description, url: util.decodeString(uint8Array.slice(offset, length), defaultEnc) };
                break;
            }
            case 'WFD':
            case 'WFED':
                output = util.decodeString(uint8Array.slice(offset + 1, util.findZero(uint8Array, offset + 1, length, encoding)), encoding);
                break;
            case 'MCDI': {
                // Music CD identifier
                output = uint8Array.slice(0, length);
                break;
            }
            default:
                debug('Warning: unsupported id3v2-tag-type: ' + type);
                break;
        }
        return output;
    }
    static fixPictureMimeType(pictureType) {
        pictureType = pictureType.toLocaleLowerCase();
        switch (pictureType) {
            case 'jpg':
                return 'image/jpeg';
            case 'png':
                return 'image/png';
        }
        return pictureType;
    }
    /**
     * Converts TMCL (Musician credits list) or TIPL (Involved people list)
     * @param entries
     */
    static functionList(entries) {
        const res = {};
        for (let i = 0; i + 1 < entries.length; i += 2) {
            const names = entries[i + 1].split(',');
            res[entries[i]] = res.hasOwnProperty(entries[i]) ? res[entries[i]].concat(names) : names;
        }
        return res;
    }
    /**
     * id3v2.4 defines that multiple T* values are separated by 0x00
     * id3v2.3 defines that TCOM, TEXT, TOLY, TOPE & TPE1 values are separated by /
     * @param tag - Tag name
     * @param text - Concatenated tag value
     * @returns Split tag value
     */
    splitValue(tag, text) {
        let values;
        if (this.major < 4) {
            values = text.split(/\x00/g);
            if (values.length > 1) {
                this.warningCollector.addWarning(`ID3v2.${this.major} ${tag} uses non standard null-separator.`);
            }
            else {
                values = text.split(/\//g);
            }
        }
        else {
            values = text.split(/\x00/g);
        }
        return FrameParser.trimArray(values);
    }
    static trimArray(values) {
        return values.map(value => value.replace(/\x00+$/, '').trim());
    }
    static readIdentifierAndData(uint8Array, offset, length, encoding) {
        const fzero = util.findZero(uint8Array, offset, length, encoding);
        const id = util.decodeString(uint8Array.slice(offset, fzero), encoding);
        offset = fzero + FrameParser.getNullTerminatorLength(encoding);
        return { id, data: uint8Array.slice(offset, length) };
    }
    static getNullTerminatorLength(enc) {
        return enc === 'utf16le' ? 2 : 1;
    }
}
exports.FrameParser = FrameParser;

}, function(modId) { var map = {"../common/Util":1665830430497,"./ID3v2Token":1665830430509,"../id3v1/ID3v1Parser":1665830430510}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430509, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.TextEncodingToken = exports.ExtendedHeader = exports.ID3v2Header = exports.UINT32SYNCSAFE = exports.AttachedPictureType = void 0;
const Token = require("token-types");
const util = require("../common/Util");
/**
 * The picture type according to the ID3v2 APIC frame
 * Ref: http://id3.org/id3v2.3.0#Attached_picture
 */
var AttachedPictureType;
(function (AttachedPictureType) {
    AttachedPictureType[AttachedPictureType["Other"] = 0] = "Other";
    AttachedPictureType[AttachedPictureType["32x32 pixels 'file icon' (PNG only)"] = 1] = "32x32 pixels 'file icon' (PNG only)";
    AttachedPictureType[AttachedPictureType["Other file icon"] = 2] = "Other file icon";
    AttachedPictureType[AttachedPictureType["Cover (front)"] = 3] = "Cover (front)";
    AttachedPictureType[AttachedPictureType["Cover (back)"] = 4] = "Cover (back)";
    AttachedPictureType[AttachedPictureType["Leaflet page"] = 5] = "Leaflet page";
    AttachedPictureType[AttachedPictureType["Media (e.g. label side of CD)"] = 6] = "Media (e.g. label side of CD)";
    AttachedPictureType[AttachedPictureType["Lead artist/lead performer/soloist"] = 7] = "Lead artist/lead performer/soloist";
    AttachedPictureType[AttachedPictureType["Artist/performer"] = 8] = "Artist/performer";
    AttachedPictureType[AttachedPictureType["Conductor"] = 9] = "Conductor";
    AttachedPictureType[AttachedPictureType["Band/Orchestra"] = 10] = "Band/Orchestra";
    AttachedPictureType[AttachedPictureType["Composer"] = 11] = "Composer";
    AttachedPictureType[AttachedPictureType["Lyricist/text writer"] = 12] = "Lyricist/text writer";
    AttachedPictureType[AttachedPictureType["Recording Location"] = 13] = "Recording Location";
    AttachedPictureType[AttachedPictureType["During recording"] = 14] = "During recording";
    AttachedPictureType[AttachedPictureType["During performance"] = 15] = "During performance";
    AttachedPictureType[AttachedPictureType["Movie/video screen capture"] = 16] = "Movie/video screen capture";
    AttachedPictureType[AttachedPictureType["A bright coloured fish"] = 17] = "A bright coloured fish";
    AttachedPictureType[AttachedPictureType["Illustration"] = 18] = "Illustration";
    AttachedPictureType[AttachedPictureType["Band/artist logotype"] = 19] = "Band/artist logotype";
    AttachedPictureType[AttachedPictureType["Publisher/Studio logotype"] = 20] = "Publisher/Studio logotype";
})(AttachedPictureType = exports.AttachedPictureType || (exports.AttachedPictureType = {}));
/**
 * 28 bits (representing up to 256MB) integer, the msb is 0 to avoid 'false syncsignals'.
 * 4 * %0xxxxxxx
 */
exports.UINT32SYNCSAFE = {
    get: (buf, off) => {
        return buf[off + 3] & 0x7f | ((buf[off + 2]) << 7) |
            ((buf[off + 1]) << 14) | ((buf[off]) << 21);
    },
    len: 4
};
/**
 * ID3v2 header
 * Ref: http://id3.org/id3v2.3.0#ID3v2_header
 * ToDo
 */
exports.ID3v2Header = {
    len: 10,
    get: (buf, off) => {
        return {
            // ID3v2/file identifier   "ID3"
            fileIdentifier: new Token.StringType(3, 'ascii').get(buf, off),
            // ID3v2 versionIndex
            version: {
                major: Token.INT8.get(buf, off + 3),
                revision: Token.INT8.get(buf, off + 4)
            },
            // ID3v2 flags
            flags: {
                // Unsynchronisation
                unsynchronisation: util.getBit(buf, off + 5, 7),
                // Extended header
                isExtendedHeader: util.getBit(buf, off + 5, 6),
                // Experimental indicator
                expIndicator: util.getBit(buf, off + 5, 5),
                footer: util.getBit(buf, off + 5, 4)
            },
            size: exports.UINT32SYNCSAFE.get(buf, off + 6)
        };
    }
};
exports.ExtendedHeader = {
    len: 10,
    get: (buf, off) => {
        return {
            // Extended header size
            size: Token.UINT32_BE.get(buf, off),
            // Extended Flags
            extendedFlags: Token.UINT16_BE.get(buf, off + 4),
            // Size of padding
            sizeOfPadding: Token.UINT32_BE.get(buf, off + 6),
            // CRC data present
            crcDataPresent: util.getBit(buf, off + 4, 31)
        };
    }
};
exports.TextEncodingToken = {
    len: 1,
    get: (uint8Array, off) => {
        switch (uint8Array[off]) {
            case 0x00:
                return { encoding: 'latin1' }; // binary
            case 0x01:
                return { encoding: 'utf16le', bom: true };
            case 0x02:
                return { encoding: 'utf16le', bom: false };
            case 0x03:
                return { encoding: 'utf8', bom: false };
            default:
                return { encoding: 'utf8', bom: false };
        }
    }
};

}, function(modId) { var map = {"../common/Util":1665830430497}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430510, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.hasID3v1Header = exports.ID3v1Parser = exports.Genres = void 0;
const debug_1 = require("debug");
const token_types_1 = require("token-types");
const util = require("../common/Util");
const BasicParser_1 = require("../common/BasicParser");
const APEv2Parser_1 = require("../apev2/APEv2Parser");
const debug = (0, debug_1.default)('music-metadata:parser:ID3v1');
/**
 * ID3v1 Genre mappings
 * Ref: https://de.wikipedia.org/wiki/Liste_der_ID3v1-Genres
 */
exports.Genres = [
    'Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk', 'Grunge', 'Hip-Hop',
    'Jazz', 'Metal', 'New Age', 'Oldies', 'Other', 'Pop', 'R&B', 'Rap', 'Reggae', 'Rock',
    'Techno', 'Industrial', 'Alternative', 'Ska', 'Death Metal', 'Pranks', 'Soundtrack',
    'Euro-Techno', 'Ambient', 'Trip-Hop', 'Vocal', 'Jazz+Funk', 'Fusion', 'Trance',
    'Classical', 'Instrumental', 'Acid', 'House', 'Game', 'Sound Clip', 'Gospel', 'Noise',
    'Alt. Rock', 'Bass', 'Soul', 'Punk', 'Space', 'Meditative', 'Instrumental Pop',
    'Instrumental Rock', 'Ethnic', 'Gothic', 'Darkwave', 'Techno-Industrial',
    'Electronic', 'Pop-Folk', 'Eurodance', 'Dream', 'Southern Rock', 'Comedy', 'Cult',
    'Gangsta Rap', 'Top 40', 'Christian Rap', 'Pop/Funk', 'Jungle', 'Native American',
    'Cabaret', 'New Wave', 'Psychedelic', 'Rave', 'Showtunes', 'Trailer', 'Lo-Fi', 'Tribal',
    'Acid Punk', 'Acid Jazz', 'Polka', 'Retro', 'Musical', 'Rock & Roll', 'Hard Rock',
    'Folk', 'Folk/Rock', 'National Folk', 'Swing', 'Fast-Fusion', 'Bebob', 'Latin', 'Revival',
    'Celtic', 'Bluegrass', 'Avantgarde', 'Gothic Rock', 'Progressive Rock', 'Psychedelic Rock',
    'Symphonic Rock', 'Slow Rock', 'Big Band', 'Chorus', 'Easy Listening', 'Acoustic', 'Humour',
    'Speech', 'Chanson', 'Opera', 'Chamber Music', 'Sonata', 'Symphony', 'Booty Bass', 'Primus',
    'Porn Groove', 'Satire', 'Slow Jam', 'Club', 'Tango', 'Samba', 'Folklore',
    'Ballad', 'Power Ballad', 'Rhythmic Soul', 'Freestyle', 'Duet', 'Punk Rock', 'Drum Solo',
    'A Cappella', 'Euro-House', 'Dance Hall', 'Goa', 'Drum & Bass', 'Club-House',
    'Hardcore', 'Terror', 'Indie', 'BritPop', 'Negerpunk', 'Polsk Punk', 'Beat',
    'Christian Gangsta Rap', 'Heavy Metal', 'Black Metal', 'Crossover', 'Contemporary Christian',
    'Christian Rock', 'Merengue', 'Salsa', 'Thrash Metal', 'Anime', 'JPop', 'Synthpop',
    'Abstract', 'Art Rock', 'Baroque', 'Bhangra', 'Big Beat', 'Breakbeat', 'Chillout',
    'Downtempo', 'Dub', 'EBM', 'Eclectic', 'Electro', 'Electroclash', 'Emo', 'Experimental',
    'Garage', 'Global', 'IDM', 'Illbient', 'Industro-Goth', 'Jam Band', 'Krautrock',
    'Leftfield', 'Lounge', 'Math Rock', 'New Romantic', 'Nu-Breakz', 'Post-Punk', 'Post-Rock',
    'Psytrance', 'Shoegaze', 'Space Rock', 'Trop Rock', 'World Music', 'Neoclassical', 'Audiobook',
    'Audio Theatre', 'Neue Deutsche Welle', 'Podcast', 'Indie Rock', 'G-Funk', 'Dubstep',
    'Garage Rock', 'Psybient'
];
/**
 * Spec: http://id3.org/ID3v1
 * Wiki: https://en.wikipedia.org/wiki/ID3
 */
const Iid3v1Token = {
    len: 128,
    /**
     * @param buf Buffer possibly holding the 128 bytes ID3v1.1 metadata header
     * @param off Offset in buffer in bytes
     * @returns ID3v1.1 header if first 3 bytes equals 'TAG', otherwise null is returned
     */
    get: (buf, off) => {
        const header = new Id3v1StringType(3).get(buf, off);
        return header === 'TAG' ? {
            header,
            title: new Id3v1StringType(30).get(buf, off + 3),
            artist: new Id3v1StringType(30).get(buf, off + 33),
            album: new Id3v1StringType(30).get(buf, off + 63),
            year: new Id3v1StringType(4).get(buf, off + 93),
            comment: new Id3v1StringType(28).get(buf, off + 97),
            // ID3v1.1 separator for track
            zeroByte: token_types_1.UINT8.get(buf, off + 127),
            // track: ID3v1.1 field added by Michael Mutschler
            track: token_types_1.UINT8.get(buf, off + 126),
            genre: token_types_1.UINT8.get(buf, off + 127)
        } : null;
    }
};
class Id3v1StringType extends token_types_1.StringType {
    constructor(len) {
        super(len, 'binary');
    }
    get(buf, off) {
        let value = super.get(buf, off);
        value = util.trimRightNull(value);
        value = value.trim();
        return value.length > 0 ? value : undefined;
    }
}
class ID3v1Parser extends BasicParser_1.BasicParser {
    static getGenre(genreIndex) {
        if (genreIndex < exports.Genres.length) {
            return exports.Genres[genreIndex];
        }
        return undefined; // ToDO: generate warning
    }
    async parse() {
        if (!this.tokenizer.fileInfo.size) {
            debug('Skip checking for ID3v1 because the file-size is unknown');
            return;
        }
        if (this.options.apeHeader) {
            this.tokenizer.ignore(this.options.apeHeader.offset - this.tokenizer.position);
            const apeParser = new APEv2Parser_1.APEv2Parser();
            apeParser.init(this.metadata, this.tokenizer, this.options);
            await apeParser.parseTags(this.options.apeHeader.footer);
        }
        const offset = this.tokenizer.fileInfo.size - Iid3v1Token.len;
        if (this.tokenizer.position > offset) {
            debug('Already consumed the last 128 bytes');
            return;
        }
        const header = await this.tokenizer.readToken(Iid3v1Token, offset);
        if (header) {
            debug('ID3v1 header found at: pos=%s', this.tokenizer.fileInfo.size - Iid3v1Token.len);
            for (const id of ['title', 'artist', 'album', 'comment', 'track', 'year']) {
                if (header[id] && header[id] !== '')
                    this.addTag(id, header[id]);
            }
            const genre = ID3v1Parser.getGenre(header.genre);
            if (genre)
                this.addTag('genre', genre);
        }
        else {
            debug('ID3v1 header not found at: pos=%s', this.tokenizer.fileInfo.size - Iid3v1Token.len);
        }
    }
    addTag(id, value) {
        this.metadata.addTag('ID3v1', id, value);
    }
}
exports.ID3v1Parser = ID3v1Parser;
async function hasID3v1Header(reader) {
    if (reader.fileSize >= 128) {
        const tag = Buffer.alloc(3);
        await reader.randomRead(tag, 0, tag.length, reader.fileSize - 128);
        return tag.toString('binary') === 'TAG';
    }
    return false;
}
exports.hasID3v1Header = hasID3v1Header;

}, function(modId) { var map = {"../common/Util":1665830430497,"../common/BasicParser":1665830430511,"../apev2/APEv2Parser":1665830430512}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430511, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.BasicParser = void 0;
class BasicParser {
    /**
     * Initialize parser with output (metadata), input (tokenizer) & parsing options (options).
     * @param {INativeMetadataCollector} metadata Output
     * @param {ITokenizer} tokenizer Input
     * @param {IOptions} options Parsing options
     */
    init(metadata, tokenizer, options) {
        this.metadata = metadata;
        this.tokenizer = tokenizer;
        this.options = options;
        return this;
    }
}
exports.BasicParser = BasicParser;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430512, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.APEv2Parser = void 0;
const debug_1 = require("debug");
const strtok3 = require("strtok3/lib/core");
const token_types_1 = require("token-types");
const util = require("../common/Util");
const BasicParser_1 = require("../common/BasicParser");
const APEv2Token_1 = require("./APEv2Token");
const debug = (0, debug_1.default)('music-metadata:parser:APEv2');
const tagFormat = 'APEv2';
const preamble = 'APETAGEX';
class APEv2Parser extends BasicParser_1.BasicParser {
    constructor() {
        super(...arguments);
        this.ape = {};
    }
    static tryParseApeHeader(metadata, tokenizer, options) {
        const apeParser = new APEv2Parser();
        apeParser.init(metadata, tokenizer, options);
        return apeParser.tryParseApeHeader();
    }
    /**
     * Calculate the media file duration
     * @param ah ApeHeader
     * @return {number} duration in seconds
     */
    static calculateDuration(ah) {
        let duration = ah.totalFrames > 1 ? ah.blocksPerFrame * (ah.totalFrames - 1) : 0;
        duration += ah.finalFrameBlocks;
        return duration / ah.sampleRate;
    }
    /**
     * Calculates the APEv1 / APEv2 first field offset
     * @param reader
     * @param offset
     */
    static async findApeFooterOffset(reader, offset) {
        // Search for APE footer header at the end of the file
        const apeBuf = Buffer.alloc(APEv2Token_1.TagFooter.len);
        await reader.randomRead(apeBuf, 0, APEv2Token_1.TagFooter.len, offset - APEv2Token_1.TagFooter.len);
        const tagFooter = APEv2Token_1.TagFooter.get(apeBuf, 0);
        if (tagFooter.ID === 'APETAGEX') {
            debug(`APE footer header at offset=${offset}`);
            return { footer: tagFooter, offset: offset - tagFooter.size };
        }
    }
    static parseTagFooter(metadata, buffer, options) {
        const footer = APEv2Token_1.TagFooter.get(buffer, buffer.length - APEv2Token_1.TagFooter.len);
        if (footer.ID !== preamble)
            throw new Error('Unexpected APEv2 Footer ID preamble value.');
        strtok3.fromBuffer(buffer);
        const apeParser = new APEv2Parser();
        apeParser.init(metadata, strtok3.fromBuffer(buffer), options);
        return apeParser.parseTags(footer);
    }
    /**
     * Parse APEv1 / APEv2 header if header signature found
     */
    async tryParseApeHeader() {
        if (this.tokenizer.fileInfo.size && this.tokenizer.fileInfo.size - this.tokenizer.position < APEv2Token_1.TagFooter.len) {
            debug(`No APEv2 header found, end-of-file reached`);
            return;
        }
        const footer = await this.tokenizer.peekToken(APEv2Token_1.TagFooter);
        if (footer.ID === preamble) {
            await this.tokenizer.ignore(APEv2Token_1.TagFooter.len);
            return this.parseTags(footer);
        }
        else {
            debug(`APEv2 header not found at offset=${this.tokenizer.position}`);
            if (this.tokenizer.fileInfo.size) {
                // Try to read the APEv2 header using just the footer-header
                const remaining = this.tokenizer.fileInfo.size - this.tokenizer.position; // ToDo: take ID3v1 into account
                const buffer = Buffer.alloc(remaining);
                await this.tokenizer.readBuffer(buffer);
                return APEv2Parser.parseTagFooter(this.metadata, buffer, this.options);
            }
        }
    }
    async parse() {
        const descriptor = await this.tokenizer.readToken(APEv2Token_1.DescriptorParser);
        if (descriptor.ID !== 'MAC ')
            throw new Error('Unexpected descriptor ID');
        this.ape.descriptor = descriptor;
        const lenExp = descriptor.descriptorBytes - APEv2Token_1.DescriptorParser.len;
        const header = await (lenExp > 0 ? this.parseDescriptorExpansion(lenExp) : this.parseHeader());
        await this.tokenizer.ignore(header.forwardBytes);
        return this.tryParseApeHeader();
    }
    async parseTags(footer) {
        const keyBuffer = Buffer.alloc(256); // maximum tag key length
        let bytesRemaining = footer.size - APEv2Token_1.TagFooter.len;
        debug(`Parse APE tags at offset=${this.tokenizer.position}, size=${bytesRemaining}`);
        for (let i = 0; i < footer.fields; i++) {
            if (bytesRemaining < APEv2Token_1.TagItemHeader.len) {
                this.metadata.addWarning(`APEv2 Tag-header: ${footer.fields - i} items remaining, but no more tag data to read.`);
                break;
            }
            // Only APEv2 tag has tag item headers
            const tagItemHeader = await this.tokenizer.readToken(APEv2Token_1.TagItemHeader);
            bytesRemaining -= APEv2Token_1.TagItemHeader.len + tagItemHeader.size;
            await this.tokenizer.peekBuffer(keyBuffer, { length: Math.min(keyBuffer.length, bytesRemaining) });
            let zero = util.findZero(keyBuffer, 0, keyBuffer.length);
            const key = await this.tokenizer.readToken(new token_types_1.StringType(zero, 'ascii'));
            await this.tokenizer.ignore(1);
            bytesRemaining -= key.length + 1;
            switch (tagItemHeader.flags.dataType) {
                case APEv2Token_1.DataType.text_utf8: { // utf-8 text-string
                    const value = await this.tokenizer.readToken(new token_types_1.StringType(tagItemHeader.size, 'utf8'));
                    const values = value.split(/\x00/g);
                    for (const val of values) {
                        this.metadata.addTag(tagFormat, key, val);
                    }
                    break;
                }
                case APEv2Token_1.DataType.binary: // binary (probably artwork)
                    if (this.options.skipCovers) {
                        await this.tokenizer.ignore(tagItemHeader.size);
                    }
                    else {
                        const picData = Buffer.alloc(tagItemHeader.size);
                        await this.tokenizer.readBuffer(picData);
                        zero = util.findZero(picData, 0, picData.length);
                        const description = picData.toString('utf8', 0, zero);
                        const data = Buffer.from(picData.slice(zero + 1));
                        this.metadata.addTag(tagFormat, key, {
                            description,
                            data
                        });
                    }
                    break;
                case APEv2Token_1.DataType.external_info:
                    debug(`Ignore external info ${key}`);
                    await this.tokenizer.ignore(tagItemHeader.size);
                    break;
                case APEv2Token_1.DataType.reserved:
                    debug(`Ignore external info ${key}`);
                    this.metadata.addWarning(`APEv2 header declares a reserved datatype for "${key}"`);
                    await this.tokenizer.ignore(tagItemHeader.size);
                    break;
            }
        }
    }
    async parseDescriptorExpansion(lenExp) {
        await this.tokenizer.ignore(lenExp);
        return this.parseHeader();
    }
    async parseHeader() {
        const header = await this.tokenizer.readToken(APEv2Token_1.Header);
        // ToDo before
        this.metadata.setFormat('lossless', true);
        this.metadata.setFormat('container', 'Monkey\'s Audio');
        this.metadata.setFormat('bitsPerSample', header.bitsPerSample);
        this.metadata.setFormat('sampleRate', header.sampleRate);
        this.metadata.setFormat('numberOfChannels', header.channel);
        this.metadata.setFormat('duration', APEv2Parser.calculateDuration(header));
        return {
            forwardBytes: this.ape.descriptor.seekTableBytes + this.ape.descriptor.headerDataBytes +
                this.ape.descriptor.apeFrameDataBytes + this.ape.descriptor.terminatingDataBytes
        };
    }
}
exports.APEv2Parser = APEv2Parser;

}, function(modId) { var map = {"../common/Util":1665830430497,"../common/BasicParser":1665830430511,"./APEv2Token":1665830430513}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430513, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.isBitSet = exports.parseTagFlags = exports.TagField = exports.TagItemHeader = exports.TagFooter = exports.Header = exports.DescriptorParser = exports.DataType = void 0;
const Token = require("token-types");
const FourCC_1 = require("../common/FourCC");
var DataType;
(function (DataType) {
    DataType[DataType["text_utf8"] = 0] = "text_utf8";
    DataType[DataType["binary"] = 1] = "binary";
    DataType[DataType["external_info"] = 2] = "external_info";
    DataType[DataType["reserved"] = 3] = "reserved";
})(DataType = exports.DataType || (exports.DataType = {}));
/**
 * APE_DESCRIPTOR: defines the sizes (and offsets) of all the pieces, as well as the MD5 checksum
 */
exports.DescriptorParser = {
    len: 52,
    get: (buf, off) => {
        return {
            // should equal 'MAC '
            ID: FourCC_1.FourCcToken.get(buf, off),
            // versionIndex number * 1000 (3.81 = 3810) (remember that 4-byte alignment causes this to take 4-bytes)
            version: Token.UINT32_LE.get(buf, off + 4) / 1000,
            // the number of descriptor bytes (allows later expansion of this header)
            descriptorBytes: Token.UINT32_LE.get(buf, off + 8),
            // the number of header APE_HEADER bytes
            headerBytes: Token.UINT32_LE.get(buf, off + 12),
            // the number of header APE_HEADER bytes
            seekTableBytes: Token.UINT32_LE.get(buf, off + 16),
            // the number of header data bytes (from original file)
            headerDataBytes: Token.UINT32_LE.get(buf, off + 20),
            // the number of bytes of APE frame data
            apeFrameDataBytes: Token.UINT32_LE.get(buf, off + 24),
            // the high order number of APE frame data bytes
            apeFrameDataBytesHigh: Token.UINT32_LE.get(buf, off + 28),
            // the terminating data of the file (not including tag data)
            terminatingDataBytes: Token.UINT32_LE.get(buf, off + 32),
            // the MD5 hash of the file (see notes for usage... it's a little tricky)
            fileMD5: new Token.Uint8ArrayType(16).get(buf, off + 36)
        };
    }
};
/**
 * APE_HEADER: describes all of the necessary information about the APE file
 */
exports.Header = {
    len: 24,
    get: (buf, off) => {
        return {
            // the compression level (see defines I.E. COMPRESSION_LEVEL_FAST)
            compressionLevel: Token.UINT16_LE.get(buf, off),
            // any format flags (for future use)
            formatFlags: Token.UINT16_LE.get(buf, off + 2),
            // the number of audio blocks in one frame
            blocksPerFrame: Token.UINT32_LE.get(buf, off + 4),
            // the number of audio blocks in the final frame
            finalFrameBlocks: Token.UINT32_LE.get(buf, off + 8),
            // the total number of frames
            totalFrames: Token.UINT32_LE.get(buf, off + 12),
            // the bits per sample (typically 16)
            bitsPerSample: Token.UINT16_LE.get(buf, off + 16),
            // the number of channels (1 or 2)
            channel: Token.UINT16_LE.get(buf, off + 18),
            // the sample rate (typically 44100)
            sampleRate: Token.UINT32_LE.get(buf, off + 20)
        };
    }
};
/**
 * APE Tag Header/Footer Version 2.0
 * TAG: describes all the properties of the file [optional]
 */
exports.TagFooter = {
    len: 32,
    get: (buf, off) => {
        return {
            // should equal 'APETAGEX'
            ID: new Token.StringType(8, 'ascii').get(buf, off),
            // equals CURRENT_APE_TAG_VERSION
            version: Token.UINT32_LE.get(buf, off + 8),
            // the complete size of the tag, including this footer (excludes header)
            size: Token.UINT32_LE.get(buf, off + 12),
            // the number of fields in the tag
            fields: Token.UINT32_LE.get(buf, off + 16),
            // reserved for later use (must be zero),
            flags: parseTagFlags(Token.UINT32_LE.get(buf, off + 20))
        };
    }
};
/**
 * APE Tag v2.0 Item Header
 */
exports.TagItemHeader = {
    len: 8,
    get: (buf, off) => {
        return {
            // Length of assigned value in bytes
            size: Token.UINT32_LE.get(buf, off),
            // reserved for later use (must be zero),
            flags: parseTagFlags(Token.UINT32_LE.get(buf, off + 4))
        };
    }
};
const TagField = footer => {
    return new Token.Uint8ArrayType(footer.size - exports.TagFooter.len);
};
exports.TagField = TagField;
function parseTagFlags(flags) {
    return {
        containsHeader: isBitSet(flags, 31),
        containsFooter: isBitSet(flags, 30),
        isHeader: isBitSet(flags, 31),
        readOnly: isBitSet(flags, 0),
        dataType: (flags & 6) >> 1
    };
}
exports.parseTagFlags = parseTagFlags;
/**
 * @param num {number}
 * @param bit 0 is least significant bit (LSB)
 * @return {boolean} true if bit is 1; otherwise false
 */
function isBitSet(num, bit) {
    return (num & 1 << bit) !== 0;
}
exports.isBitSet = isBitSet;
//# sourceMappingURL=APEv2Token.js.map
}, function(modId) { var map = {"../common/FourCC":1665830430514}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430514, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.FourCcToken = void 0;
const util = require("./Util");
const validFourCC = /^[\x21-\x7e©][\x20-\x7e\x00()]{3}/;
/**
 * Token for read FourCC
 * Ref: https://en.wikipedia.org/wiki/FourCC
 */
exports.FourCcToken = {
    len: 4,
    get: (buf, off) => {
        const id = buf.toString('binary', off, off + exports.FourCcToken.len);
        if (!id.match(validFourCC)) {
            throw new Error(`FourCC contains invalid characters: ${util.a2hex(id)} "${id}"`);
        }
        return id;
    },
    put: (buffer, offset, id) => {
        const str = Buffer.from(id, 'binary');
        if (str.length !== 4)
            throw new Error('Invalid length');
        return str.copy(buffer, offset);
    }
};
//# sourceMappingURL=FourCC.js.map
}, function(modId) { var map = {"./Util":1665830430497}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430515, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.Common = void 0;
const Token = require("token-types");
const FourCC_1 = require("../common/FourCC");
class Common {
    constructor(header, isAifc) {
        this.isAifc = isAifc;
        const minimumChunkSize = isAifc ? 22 : 18;
        if (header.chunkSize < minimumChunkSize)
            throw new Error(`COMMON CHUNK size should always be at least ${minimumChunkSize}`);
        this.len = header.chunkSize;
    }
    get(buf, off) {
        // see: https://cycling74.com/forums/aiffs-80-bit-sample-rate-value
        const shift = buf.readUInt16BE(off + 8) - 16398;
        const baseSampleRate = buf.readUInt16BE(off + 8 + 2);
        const res = {
            numChannels: buf.readUInt16BE(off),
            numSampleFrames: buf.readUInt32BE(off + 2),
            sampleSize: buf.readUInt16BE(off + 6),
            sampleRate: shift < 0 ? baseSampleRate >> Math.abs(shift) : baseSampleRate << shift
        };
        if (this.isAifc) {
            res.compressionType = FourCC_1.FourCcToken.get(buf, off + 18);
            if (this.len > 22) {
                const strLen = buf.readInt8(off + 22);
                if (strLen > 0) {
                    const padding = (strLen + 1) % 2;
                    if (23 + strLen + padding === this.len) {
                        res.compressionName = new Token.StringType(strLen, 'binary').get(buf, off + 23);
                    }
                    else {
                        throw new Error('Illegal pstring length');
                    }
                }
                else {
                    res.compressionName = undefined;
                }
            }
        }
        else {
            res.compressionName = 'PCM';
        }
        return res;
    }
}
exports.Common = Common;

}, function(modId) { var map = {"../common/FourCC":1665830430514}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430516, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.Header = void 0;
const Token = require("token-types");
const FourCC_1 = require("../common/FourCC");
/**
 * Common AIFF chunk header
 */
exports.Header = {
    len: 8,
    get: (buf, off) => {
        return {
            // Chunk type ID
            chunkID: FourCC_1.FourCcToken.get(buf, off),
            // Chunk size
            chunkSize: Number(BigInt(Token.UINT32_BE.get(buf, off + 4)))
        };
    }
};

}, function(modId) { var map = {"../common/FourCC":1665830430514}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430517, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.AsfParser = void 0;
const debug_1 = require("debug");
const type_1 = require("../type");
const GUID_1 = require("./GUID");
const AsfObject = require("./AsfObject");
const BasicParser_1 = require("../common/BasicParser");
const debug = (0, debug_1.default)('music-metadata:parser:ASF');
const headerType = 'asf';
/**
 * Windows Media Metadata Usage Guidelines
 * - Ref: https://msdn.microsoft.com/en-us/library/ms867702.aspx
 *
 * Ref:
 * - https://tools.ietf.org/html/draft-fleischman-asf-01
 * - https://hwiegman.home.xs4all.nl/fileformats/asf/ASF_Specification.pdf
 * - http://drang.s4.xrea.com/program/tips/id3tag/wmp/index.html
 * - https://msdn.microsoft.com/en-us/library/windows/desktop/ee663575(v=vs.85).aspx
 */
class AsfParser extends BasicParser_1.BasicParser {
    async parse() {
        const header = await this.tokenizer.readToken(AsfObject.TopLevelHeaderObjectToken);
        if (!header.objectId.equals(GUID_1.default.HeaderObject)) {
            throw new Error('expected asf header; but was not found; got: ' + header.objectId.str);
        }
        try {
            await this.parseObjectHeader(header.numberOfHeaderObjects);
        }
        catch (err) {
            debug('Error while parsing ASF: %s', err);
        }
    }
    async parseObjectHeader(numberOfObjectHeaders) {
        let tags;
        do {
            // Parse common header of the ASF Object (3.1)
            const header = await this.tokenizer.readToken(AsfObject.HeaderObjectToken);
            // Parse data part of the ASF Object
            debug('header GUID=%s', header.objectId.str);
            switch (header.objectId.str) {
                case AsfObject.FilePropertiesObject.guid.str: // 3.2
                    const fpo = await this.tokenizer.readToken(new AsfObject.FilePropertiesObject(header));
                    this.metadata.setFormat('duration', Number(fpo.playDuration / BigInt(1000)) / 10000 - Number(fpo.preroll) / 1000);
                    this.metadata.setFormat('bitrate', fpo.maximumBitrate);
                    break;
                case AsfObject.StreamPropertiesObject.guid.str: // 3.3
                    const spo = await this.tokenizer.readToken(new AsfObject.StreamPropertiesObject(header));
                    this.metadata.setFormat('container', 'ASF/' + spo.streamType);
                    break;
                case AsfObject.HeaderExtensionObject.guid.str: // 3.4
                    const extHeader = await this.tokenizer.readToken(new AsfObject.HeaderExtensionObject());
                    await this.parseExtensionObject(extHeader.extensionDataSize);
                    break;
                case AsfObject.ContentDescriptionObjectState.guid.str: // 3.10
                    tags = await this.tokenizer.readToken(new AsfObject.ContentDescriptionObjectState(header));
                    this.addTags(tags);
                    break;
                case AsfObject.ExtendedContentDescriptionObjectState.guid.str: // 3.11
                    tags = await this.tokenizer.readToken(new AsfObject.ExtendedContentDescriptionObjectState(header));
                    this.addTags(tags);
                    break;
                case GUID_1.default.CodecListObject.str:
                    const codecs = await AsfObject.readCodecEntries(this.tokenizer);
                    codecs.forEach(codec => {
                        this.metadata.addStreamInfo({
                            type: codec.type.videoCodec ? type_1.TrackType.video : type_1.TrackType.audio,
                            codecName: codec.codecName
                        });
                    });
                    const audioCodecs = codecs.filter(codec => codec.type.audioCodec).map(codec => codec.codecName).join('/');
                    this.metadata.setFormat('codec', audioCodecs);
                    break;
                case GUID_1.default.StreamBitratePropertiesObject.str:
                    // ToDo?
                    await this.tokenizer.ignore(header.objectSize - AsfObject.HeaderObjectToken.len);
                    break;
                case GUID_1.default.PaddingObject.str:
                    // ToDo: register bytes pad
                    debug('Padding: %s bytes', header.objectSize - AsfObject.HeaderObjectToken.len);
                    await this.tokenizer.ignore(header.objectSize - AsfObject.HeaderObjectToken.len);
                    break;
                default:
                    this.metadata.addWarning('Ignore ASF-Object-GUID: ' + header.objectId.str);
                    debug('Ignore ASF-Object-GUID: %s', header.objectId.str);
                    await this.tokenizer.readToken(new AsfObject.IgnoreObjectState(header));
            }
        } while (--numberOfObjectHeaders);
        // done
    }
    addTags(tags) {
        tags.forEach(tag => {
            this.metadata.addTag(headerType, tag.id, tag.value);
        });
    }
    async parseExtensionObject(extensionSize) {
        do {
            // Parse common header of the ASF Object (3.1)
            const header = await this.tokenizer.readToken(AsfObject.HeaderObjectToken);
            const remaining = header.objectSize - AsfObject.HeaderObjectToken.len;
            // Parse data part of the ASF Object
            switch (header.objectId.str) {
                case AsfObject.ExtendedStreamPropertiesObjectState.guid.str: // 4.1
                    // ToDo: extended stream header properties are ignored
                    await this.tokenizer.readToken(new AsfObject.ExtendedStreamPropertiesObjectState(header));
                    break;
                case AsfObject.MetadataObjectState.guid.str: // 4.7
                    const moTags = await this.tokenizer.readToken(new AsfObject.MetadataObjectState(header));
                    this.addTags(moTags);
                    break;
                case AsfObject.MetadataLibraryObjectState.guid.str: // 4.8
                    const mlTags = await this.tokenizer.readToken(new AsfObject.MetadataLibraryObjectState(header));
                    this.addTags(mlTags);
                    break;
                case GUID_1.default.PaddingObject.str:
                    // ToDo: register bytes pad
                    await this.tokenizer.ignore(remaining);
                    break;
                case GUID_1.default.CompatibilityObject.str:
                    this.tokenizer.ignore(remaining);
                    break;
                case GUID_1.default.ASF_Index_Placeholder_Object.str:
                    await this.tokenizer.ignore(remaining);
                    break;
                default:
                    this.metadata.addWarning('Ignore ASF-Object-GUID: ' + header.objectId.str);
                    // console.log("Ignore ASF-Object-GUID: %s", header.objectId.str);
                    await this.tokenizer.readToken(new AsfObject.IgnoreObjectState(header));
                    break;
            }
            extensionSize -= header.objectSize;
        } while (extensionSize > 0);
    }
}
exports.AsfParser = AsfParser;

}, function(modId) { var map = {"../type":1665830430489,"./GUID":1665830430518,"./AsfObject":1665830430519,"../common/BasicParser":1665830430511}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430518, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Ref:
 * - https://tools.ietf.org/html/draft-fleischman-asf-01, Appendix A: ASF GUIDs
 * - http://drang.s4.xrea.com/program/tips/id3tag/wmp/10_asf_guids.html
 * - http://drang.s4.xrea.com/program/tips/id3tag/wmp/index.html
 * - http://drang.s4.xrea.com/program/tips/id3tag/wmp/10_asf_guids.html
 *
 * ASF File Structure:
 * - https://msdn.microsoft.com/en-us/library/windows/desktop/ee663575(v=vs.85).aspx
 *
 * ASF GUIDs:
 * - http://drang.s4.xrea.com/program/tips/id3tag/wmp/10_asf_guids.html
 * - https://github.com/dji-sdk/FFmpeg/blob/master/libavformat/asf.c
 */
class GUID {
    constructor(str) {
        this.str = str;
    }
    static fromBin(bin, offset = 0) {
        return new GUID(this.decode(bin, offset));
    }
    /**
     * Decode GUID in format like "B503BF5F-2EA9-CF11-8EE3-00C00C205365"
     * @param objectId Binary GUID
     * @param offset Read offset in bytes, default 0
     * @returns GUID as dashed hexadecimal representation
     */
    static decode(objectId, offset = 0) {
        const guid = objectId.readUInt32LE(offset).toString(16) + "-" +
            objectId.readUInt16LE(offset + 4).toString(16) + "-" +
            objectId.readUInt16LE(offset + 6).toString(16) + "-" +
            objectId.readUInt16BE(offset + 8).toString(16) + "-" +
            objectId.slice(offset + 10, offset + 16).toString('hex');
        return guid.toUpperCase();
    }
    /**
     * Decode stream type
     * @param mediaType Media type GUID
     * @returns Media type
     */
    static decodeMediaType(mediaType) {
        switch (mediaType.str) {
            case GUID.AudioMedia.str: return 'audio';
            case GUID.VideoMedia.str: return 'video';
            case GUID.CommandMedia.str: return 'command';
            case GUID.Degradable_JPEG_Media.str: return 'degradable-jpeg';
            case GUID.FileTransferMedia.str: return 'file-transfer';
            case GUID.BinaryMedia.str: return 'binary';
        }
    }
    /**
     * Encode GUID
     * @param guid GUID like: "B503BF5F-2EA9-CF11-8EE3-00C00C205365"
     * @returns Encoded Binary GUID
     */
    static encode(str) {
        const bin = Buffer.alloc(16);
        bin.writeUInt32LE(parseInt(str.slice(0, 8), 16), 0);
        bin.writeUInt16LE(parseInt(str.slice(9, 13), 16), 4);
        bin.writeUInt16LE(parseInt(str.slice(14, 18), 16), 6);
        Buffer.from(str.slice(19, 23), "hex").copy(bin, 8);
        Buffer.from(str.slice(24), "hex").copy(bin, 10);
        return bin;
    }
    equals(guid) {
        return this.str === guid.str;
    }
    toBin() {
        return GUID.encode(this.str);
    }
}
exports.default = GUID;
// 10.1 Top-level ASF object GUIDs
GUID.HeaderObject = new GUID("75B22630-668E-11CF-A6D9-00AA0062CE6C");
GUID.DataObject = new GUID("75B22636-668E-11CF-A6D9-00AA0062CE6C");
GUID.SimpleIndexObject = new GUID("33000890-E5B1-11CF-89F4-00A0C90349CB");
GUID.IndexObject = new GUID("D6E229D3-35DA-11D1-9034-00A0C90349BE");
GUID.MediaObjectIndexObject = new GUID("FEB103F8-12AD-4C64-840F-2A1D2F7AD48C");
GUID.TimecodeIndexObject = new GUID("3CB73FD0-0C4A-4803-953D-EDF7B6228F0C");
// 10.2 Header Object GUIDs
GUID.FilePropertiesObject = new GUID("8CABDCA1-A947-11CF-8EE4-00C00C205365");
GUID.StreamPropertiesObject = new GUID("B7DC0791-A9B7-11CF-8EE6-00C00C205365");
GUID.HeaderExtensionObject = new GUID("5FBF03B5-A92E-11CF-8EE3-00C00C205365");
GUID.CodecListObject = new GUID("86D15240-311D-11D0-A3A4-00A0C90348F6");
GUID.ScriptCommandObject = new GUID("1EFB1A30-0B62-11D0-A39B-00A0C90348F6");
GUID.MarkerObject = new GUID("F487CD01-A951-11CF-8EE6-00C00C205365");
GUID.BitrateMutualExclusionObject = new GUID("D6E229DC-35DA-11D1-9034-00A0C90349BE");
GUID.ErrorCorrectionObject = new GUID("75B22635-668E-11CF-A6D9-00AA0062CE6C");
GUID.ContentDescriptionObject = new GUID("75B22633-668E-11CF-A6D9-00AA0062CE6C");
GUID.ExtendedContentDescriptionObject = new GUID("D2D0A440-E307-11D2-97F0-00A0C95EA850");
GUID.ContentBrandingObject = new GUID("2211B3FA-BD23-11D2-B4B7-00A0C955FC6E");
GUID.StreamBitratePropertiesObject = new GUID("7BF875CE-468D-11D1-8D82-006097C9A2B2");
GUID.ContentEncryptionObject = new GUID("2211B3FB-BD23-11D2-B4B7-00A0C955FC6E");
GUID.ExtendedContentEncryptionObject = new GUID("298AE614-2622-4C17-B935-DAE07EE9289C");
GUID.DigitalSignatureObject = new GUID("2211B3FC-BD23-11D2-B4B7-00A0C955FC6E");
GUID.PaddingObject = new GUID("1806D474-CADF-4509-A4BA-9AABCB96AAE8");
// 10.3 Header Extension Object GUIDs
GUID.ExtendedStreamPropertiesObject = new GUID("14E6A5CB-C672-4332-8399-A96952065B5A");
GUID.AdvancedMutualExclusionObject = new GUID("A08649CF-4775-4670-8A16-6E35357566CD");
GUID.GroupMutualExclusionObject = new GUID("D1465A40-5A79-4338-B71B-E36B8FD6C249");
GUID.StreamPrioritizationObject = new GUID("D4FED15B-88D3-454F-81F0-ED5C45999E24");
GUID.BandwidthSharingObject = new GUID("A69609E6-517B-11D2-B6AF-00C04FD908E9");
GUID.LanguageListObject = new GUID("7C4346A9-EFE0-4BFC-B229-393EDE415C85");
GUID.MetadataObject = new GUID("C5F8CBEA-5BAF-4877-8467-AA8C44FA4CCA");
GUID.MetadataLibraryObject = new GUID("44231C94-9498-49D1-A141-1D134E457054");
GUID.IndexParametersObject = new GUID("D6E229DF-35DA-11D1-9034-00A0C90349BE");
GUID.MediaObjectIndexParametersObject = new GUID("6B203BAD-3F11-48E4-ACA8-D7613DE2CFA7");
GUID.TimecodeIndexParametersObject = new GUID("F55E496D-9797-4B5D-8C8B-604DFE9BFB24");
GUID.CompatibilityObject = new GUID("26F18B5D-4584-47EC-9F5F-0E651F0452C9");
GUID.AdvancedContentEncryptionObject = new GUID("43058533-6981-49E6-9B74-AD12CB86D58C");
// 10.4 Stream Properties Object Stream Type GUIDs
GUID.AudioMedia = new GUID("F8699E40-5B4D-11CF-A8FD-00805F5C442B");
GUID.VideoMedia = new GUID("BC19EFC0-5B4D-11CF-A8FD-00805F5C442B");
GUID.CommandMedia = new GUID("59DACFC0-59E6-11D0-A3AC-00A0C90348F6");
GUID.JFIF_Media = new GUID("B61BE100-5B4E-11CF-A8FD-00805F5C442B");
GUID.Degradable_JPEG_Media = new GUID("35907DE0-E415-11CF-A917-00805F5C442B");
GUID.FileTransferMedia = new GUID("91BD222C-F21C-497A-8B6D-5AA86BFC0185");
GUID.BinaryMedia = new GUID("3AFB65E2-47EF-40F2-AC2C-70A90D71D343");
GUID.ASF_Index_Placeholder_Object = new GUID("D9AADE20-7C17-4F9C-BC28-8555DD98E2A2");

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430519, function(require, module, exports) {

// ASF Objects
Object.defineProperty(exports, "__esModule", { value: true });
exports.WmPictureToken = exports.MetadataLibraryObjectState = exports.MetadataObjectState = exports.ExtendedStreamPropertiesObjectState = exports.ExtendedContentDescriptionObjectState = exports.ContentDescriptionObjectState = exports.readCodecEntries = exports.HeaderExtensionObject = exports.StreamPropertiesObject = exports.FilePropertiesObject = exports.IgnoreObjectState = exports.State = exports.HeaderObjectToken = exports.TopLevelHeaderObjectToken = exports.DataType = void 0;
const util = require("../common/Util");
const Token = require("token-types");
const GUID_1 = require("./GUID");
const AsfUtil_1 = require("./AsfUtil");
const ID3v2Token_1 = require("../id3v2/ID3v2Token");
/**
 * Data Type: Specifies the type of information being stored. The following values are recognized.
 */
var DataType;
(function (DataType) {
    /**
     * Unicode string. The data consists of a sequence of Unicode characters.
     */
    DataType[DataType["UnicodeString"] = 0] = "UnicodeString";
    /**
     * BYTE array. The type of data is implementation-specific.
     */
    DataType[DataType["ByteArray"] = 1] = "ByteArray";
    /**
     * BOOL. The data is 2 bytes long and should be interpreted as a 16-bit unsigned integer. Only 0x0000 or 0x0001 are permitted values.
     */
    DataType[DataType["Bool"] = 2] = "Bool";
    /**
     * DWORD. The data is 4 bytes long and should be interpreted as a 32-bit unsigned integer.
     */
    DataType[DataType["DWord"] = 3] = "DWord";
    /**
     * QWORD. The data is 8 bytes long and should be interpreted as a 64-bit unsigned integer.
     */
    DataType[DataType["QWord"] = 4] = "QWord";
    /**
     * WORD. The data is 2 bytes long and should be interpreted as a 16-bit unsigned integer.
     */
    DataType[DataType["Word"] = 5] = "Word";
})(DataType = exports.DataType || (exports.DataType = {}));
/**
 * Token for: 3. ASF top-level Header Object
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3
 */
exports.TopLevelHeaderObjectToken = {
    len: 30,
    get: (buf, off) => {
        return {
            objectId: GUID_1.default.fromBin(new Token.BufferType(16).get(buf, off)),
            objectSize: Number(Token.UINT64_LE.get(buf, off + 16)),
            numberOfHeaderObjects: Token.UINT32_LE.get(buf, off + 24)
            // Reserved: 2 bytes
        };
    }
};
/**
 * Token for: 3.1 Header Object (mandatory, one only)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_1
 */
exports.HeaderObjectToken = {
    len: 24,
    get: (buf, off) => {
        return {
            objectId: GUID_1.default.fromBin(new Token.BufferType(16).get(buf, off)),
            objectSize: Number(Token.UINT64_LE.get(buf, off + 16))
        };
    }
};
class State {
    constructor(header) {
        this.len = Number(header.objectSize) - exports.HeaderObjectToken.len;
    }
    postProcessTag(tags, name, valueType, data) {
        if (name === 'WM/Picture') {
            tags.push({ id: name, value: WmPictureToken.fromBuffer(data) });
        }
        else {
            const parseAttr = AsfUtil_1.AsfUtil.getParserForAttr(valueType);
            if (!parseAttr) {
                throw new Error('unexpected value headerType: ' + valueType);
            }
            tags.push({ id: name, value: parseAttr(data) });
        }
    }
}
exports.State = State;
// ToDo: use ignore type
class IgnoreObjectState extends State {
    constructor(header) {
        super(header);
    }
    get(buf, off) {
        return null;
    }
}
exports.IgnoreObjectState = IgnoreObjectState;
/**
 * Token for: 3.2: File Properties Object (mandatory, one only)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_2
 */
class FilePropertiesObject extends State {
    constructor(header) {
        super(header);
    }
    get(buf, off) {
        return {
            fileId: GUID_1.default.fromBin(buf, off),
            fileSize: Token.UINT64_LE.get(buf, off + 16),
            creationDate: Token.UINT64_LE.get(buf, off + 24),
            dataPacketsCount: Token.UINT64_LE.get(buf, off + 32),
            playDuration: Token.UINT64_LE.get(buf, off + 40),
            sendDuration: Token.UINT64_LE.get(buf, off + 48),
            preroll: Token.UINT64_LE.get(buf, off + 56),
            flags: {
                broadcast: util.getBit(buf, off + 64, 24),
                seekable: util.getBit(buf, off + 64, 25)
            },
            // flagsNumeric: Token.UINT32_LE.get(buf, off + 64),
            minimumDataPacketSize: Token.UINT32_LE.get(buf, off + 68),
            maximumDataPacketSize: Token.UINT32_LE.get(buf, off + 72),
            maximumBitrate: Token.UINT32_LE.get(buf, off + 76)
        };
    }
}
exports.FilePropertiesObject = FilePropertiesObject;
FilePropertiesObject.guid = GUID_1.default.FilePropertiesObject;
/**
 * Token for: 3.3 Stream Properties Object (mandatory, one per stream)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_3
 */
class StreamPropertiesObject extends State {
    constructor(header) {
        super(header);
    }
    get(buf, off) {
        return {
            streamType: GUID_1.default.decodeMediaType(GUID_1.default.fromBin(buf, off)),
            errorCorrectionType: GUID_1.default.fromBin(buf, off + 8)
            // ToDo
        };
    }
}
exports.StreamPropertiesObject = StreamPropertiesObject;
StreamPropertiesObject.guid = GUID_1.default.StreamPropertiesObject;
/**
 * 3.4: Header Extension Object (mandatory, one only)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_4
 */
class HeaderExtensionObject {
    constructor() {
        this.len = 22;
    }
    get(buf, off) {
        return {
            reserved1: GUID_1.default.fromBin(buf, off),
            reserved2: buf.readUInt16LE(off + 16),
            extensionDataSize: buf.readUInt32LE(off + 18)
        };
    }
}
exports.HeaderExtensionObject = HeaderExtensionObject;
HeaderExtensionObject.guid = GUID_1.default.HeaderExtensionObject;
/**
 * 3.5: The Codec List Object provides user-friendly information about the codecs and formats used to encode the content found in the ASF file.
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_5
 */
const CodecListObjectHeader = {
    len: 20,
    get: (buf, off) => {
        return {
            entryCount: buf.readUInt16LE(off + 16)
        };
    }
};
async function readString(tokenizer) {
    const length = await tokenizer.readNumber(Token.UINT16_LE);
    return (await tokenizer.readToken(new Token.StringType(length * 2, 'utf16le'))).replace('\0', '');
}
/**
 * 3.5: Read the Codec-List-Object, which provides user-friendly information about the codecs and formats used to encode the content found in the ASF file.
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_5
 */
async function readCodecEntries(tokenizer) {
    const codecHeader = await tokenizer.readToken(CodecListObjectHeader);
    const entries = [];
    for (let i = 0; i < codecHeader.entryCount; ++i) {
        entries.push(await readCodecEntry(tokenizer));
    }
    return entries;
}
exports.readCodecEntries = readCodecEntries;
async function readInformation(tokenizer) {
    const length = await tokenizer.readNumber(Token.UINT16_LE);
    const buf = Buffer.alloc(length);
    await tokenizer.readBuffer(buf);
    return buf;
}
/**
 * Read Codec-Entries
 * @param tokenizer
 */
async function readCodecEntry(tokenizer) {
    const type = await tokenizer.readNumber(Token.UINT16_LE);
    return {
        type: {
            videoCodec: (type & 0x0001) === 0x0001,
            audioCodec: (type & 0x0002) === 0x0002
        },
        codecName: await readString(tokenizer),
        description: await readString(tokenizer),
        information: await readInformation(tokenizer)
    };
}
/**
 * 3.10 Content Description Object (optional, one only)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_10
 */
class ContentDescriptionObjectState extends State {
    constructor(header) {
        super(header);
    }
    get(buf, off) {
        const tags = [];
        let pos = off + 10;
        for (let i = 0; i < ContentDescriptionObjectState.contentDescTags.length; ++i) {
            const length = buf.readUInt16LE(off + i * 2);
            if (length > 0) {
                const tagName = ContentDescriptionObjectState.contentDescTags[i];
                const end = pos + length;
                tags.push({ id: tagName, value: AsfUtil_1.AsfUtil.parseUnicodeAttr(buf.slice(pos, end)) });
                pos = end;
            }
        }
        return tags;
    }
}
exports.ContentDescriptionObjectState = ContentDescriptionObjectState;
ContentDescriptionObjectState.guid = GUID_1.default.ContentDescriptionObject;
ContentDescriptionObjectState.contentDescTags = ['Title', 'Author', 'Copyright', 'Description', 'Rating'];
/**
 * 3.11 Extended Content Description Object (optional, one only)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/03_asf_top_level_header_object.html#3_11
 */
class ExtendedContentDescriptionObjectState extends State {
    constructor(header) {
        super(header);
    }
    get(buf, off) {
        const tags = [];
        const attrCount = buf.readUInt16LE(off);
        let pos = off + 2;
        for (let i = 0; i < attrCount; i += 1) {
            const nameLen = buf.readUInt16LE(pos);
            pos += 2;
            const name = AsfUtil_1.AsfUtil.parseUnicodeAttr(buf.slice(pos, pos + nameLen));
            pos += nameLen;
            const valueType = buf.readUInt16LE(pos);
            pos += 2;
            const valueLen = buf.readUInt16LE(pos);
            pos += 2;
            const value = buf.slice(pos, pos + valueLen);
            pos += valueLen;
            this.postProcessTag(tags, name, valueType, value);
        }
        return tags;
    }
}
exports.ExtendedContentDescriptionObjectState = ExtendedContentDescriptionObjectState;
ExtendedContentDescriptionObjectState.guid = GUID_1.default.ExtendedContentDescriptionObject;
/**
 * 4.1 Extended Stream Properties Object (optional, 1 per media stream)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/04_objects_in_the_asf_header_extension_object.html#4_1
 */
class ExtendedStreamPropertiesObjectState extends State {
    constructor(header) {
        super(header);
    }
    get(buf, off) {
        return {
            startTime: Token.UINT64_LE.get(buf, off),
            endTime: Token.UINT64_LE.get(buf, off + 8),
            dataBitrate: buf.readInt32LE(off + 12),
            bufferSize: buf.readInt32LE(off + 16),
            initialBufferFullness: buf.readInt32LE(off + 20),
            alternateDataBitrate: buf.readInt32LE(off + 24),
            alternateBufferSize: buf.readInt32LE(off + 28),
            alternateInitialBufferFullness: buf.readInt32LE(off + 32),
            maximumObjectSize: buf.readInt32LE(off + 36),
            flags: {
                reliableFlag: util.getBit(buf, off + 40, 0),
                seekableFlag: util.getBit(buf, off + 40, 1),
                resendLiveCleanpointsFlag: util.getBit(buf, off + 40, 2)
            },
            // flagsNumeric: Token.UINT32_LE.get(buf, off + 64),
            streamNumber: buf.readInt16LE(off + 42),
            streamLanguageId: buf.readInt16LE(off + 44),
            averageTimePerFrame: buf.readInt32LE(off + 52),
            streamNameCount: buf.readInt32LE(off + 54),
            payloadExtensionSystems: buf.readInt32LE(off + 56),
            streamNames: [],
            streamPropertiesObject: null
        };
    }
}
exports.ExtendedStreamPropertiesObjectState = ExtendedStreamPropertiesObjectState;
ExtendedStreamPropertiesObjectState.guid = GUID_1.default.ExtendedStreamPropertiesObject;
/**
 * 4.7  Metadata Object (optional, 0 or 1)
 * Ref: http://drang.s4.xrea.com/program/tips/id3tag/wmp/04_objects_in_the_asf_header_extension_object.html#4_7
 */
class MetadataObjectState extends State {
    constructor(header) {
        super(header);
    }
    get(uint8Array, off) {
        const tags = [];
        const buf = Buffer.from(uint8Array);
        const descriptionRecordsCount = buf.readUInt16LE(off);
        let pos = off + 2;
        for (let i = 0; i < descriptionRecordsCount; i += 1) {
            pos += 4;
            const nameLen = buf.readUInt16LE(pos);
            pos += 2;
            const dataType = buf.readUInt16LE(pos);
            pos += 2;
            const dataLen = buf.readUInt32LE(pos);
            pos += 4;
            const name = AsfUtil_1.AsfUtil.parseUnicodeAttr(buf.slice(pos, pos + nameLen));
            pos += nameLen;
            const data = buf.slice(pos, pos + dataLen);
            pos += dataLen;
            this.postProcessTag(tags, name, dataType, data);
        }
        return tags;
    }
}
exports.MetadataObjectState = MetadataObjectState;
MetadataObjectState.guid = GUID_1.default.MetadataObject;
// 4.8	Metadata Library Object (optional, 0 or 1)
class MetadataLibraryObjectState extends MetadataObjectState {
    constructor(header) {
        super(header);
    }
}
exports.MetadataLibraryObjectState = MetadataLibraryObjectState;
MetadataLibraryObjectState.guid = GUID_1.default.MetadataLibraryObject;
/**
 * Ref: https://msdn.microsoft.com/en-us/library/windows/desktop/dd757977(v=vs.85).aspx
 */
class WmPictureToken {
    constructor(len) {
        this.len = len;
    }
    static fromBase64(base64str) {
        return this.fromBuffer(Buffer.from(base64str, 'base64'));
    }
    static fromBuffer(buffer) {
        const pic = new WmPictureToken(buffer.length);
        return pic.get(buffer, 0);
    }
    get(buffer, offset) {
        const typeId = buffer.readUInt8(offset++);
        const size = buffer.readInt32LE(offset);
        let index = 5;
        while (buffer.readUInt16BE(index) !== 0) {
            index += 2;
        }
        const format = buffer.slice(5, index).toString('utf16le');
        while (buffer.readUInt16BE(index) !== 0) {
            index += 2;
        }
        const description = buffer.slice(5, index).toString('utf16le');
        return {
            type: ID3v2Token_1.AttachedPictureType[typeId],
            format,
            description,
            size,
            data: buffer.slice(index + 4)
        };
    }
}
exports.WmPictureToken = WmPictureToken;

}, function(modId) { var map = {"../common/Util":1665830430497,"./GUID":1665830430518,"./AsfUtil":1665830430520,"../id3v2/ID3v2Token":1665830430509}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430520, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.AsfUtil = void 0;
const Token = require("token-types");
const util = require("../common/Util");
class AsfUtil {
    static getParserForAttr(i) {
        return AsfUtil.attributeParsers[i];
    }
    static parseUnicodeAttr(uint8Array) {
        return util.stripNulls(util.decodeString(uint8Array, 'utf16le'));
    }
    static parseByteArrayAttr(buf) {
        return Buffer.from(buf);
    }
    static parseBoolAttr(buf, offset = 0) {
        return AsfUtil.parseWordAttr(buf, offset) === 1;
    }
    static parseDWordAttr(buf, offset = 0) {
        return buf.readUInt32LE(offset);
    }
    static parseQWordAttr(buf, offset = 0) {
        return Token.UINT64_LE.get(buf, offset);
    }
    static parseWordAttr(buf, offset = 0) {
        return buf.readUInt16LE(offset);
    }
}
exports.AsfUtil = AsfUtil;
AsfUtil.attributeParsers = [
    AsfUtil.parseUnicodeAttr,
    AsfUtil.parseByteArrayAttr,
    AsfUtil.parseBoolAttr,
    AsfUtil.parseDWordAttr,
    AsfUtil.parseQWordAttr,
    AsfUtil.parseWordAttr,
    AsfUtil.parseByteArrayAttr
];

}, function(modId) { var map = {"../common/Util":1665830430497}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430521, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.FlacParser = void 0;
const token_types_1 = require("token-types");
const debug_1 = require("debug");
const util = require("../common/Util");
const Vorbis_1 = require("../ogg/vorbis/Vorbis");
const AbstractID3Parser_1 = require("../id3v2/AbstractID3Parser");
const FourCC_1 = require("../common/FourCC");
const VorbisParser_1 = require("../ogg/vorbis/VorbisParser");
const VorbisDecoder_1 = require("../ogg/vorbis/VorbisDecoder");
const debug = (0, debug_1.default)('music-metadata:parser:FLAC');
/**
 * FLAC supports up to 128 kinds of metadata blocks; currently the following are defined:
 * ref: https://xiph.org/flac/format.html#metadata_block
 */
var BlockType;
(function (BlockType) {
    BlockType[BlockType["STREAMINFO"] = 0] = "STREAMINFO";
    BlockType[BlockType["PADDING"] = 1] = "PADDING";
    BlockType[BlockType["APPLICATION"] = 2] = "APPLICATION";
    BlockType[BlockType["SEEKTABLE"] = 3] = "SEEKTABLE";
    BlockType[BlockType["VORBIS_COMMENT"] = 4] = "VORBIS_COMMENT";
    BlockType[BlockType["CUESHEET"] = 5] = "CUESHEET";
    BlockType[BlockType["PICTURE"] = 6] = "PICTURE";
})(BlockType || (BlockType = {}));
class FlacParser extends AbstractID3Parser_1.AbstractID3Parser {
    constructor() {
        super(...arguments);
        this.padding = 0;
    }
    /**
     * Initialize parser with output (metadata), input (tokenizer) & parsing options (options).
     * @param {INativeMetadataCollector} metadata Output
     * @param {ITokenizer} tokenizer Input
     * @param {IOptions} options Parsing options
     */
    init(metadata, tokenizer, options) {
        super.init(metadata, tokenizer, options);
        this.vorbisParser = new VorbisParser_1.VorbisParser(metadata, options);
        return this;
    }
    async postId3v2Parse() {
        const fourCC = await this.tokenizer.readToken(FourCC_1.FourCcToken);
        if (fourCC.toString() !== 'fLaC') {
            throw new Error('Invalid FLAC preamble');
        }
        let blockHeader;
        do {
            // Read block header
            blockHeader = await this.tokenizer.readToken(Metadata.BlockHeader);
            // Parse block data
            await this.parseDataBlock(blockHeader);
        } while (!blockHeader.lastBlock);
        if (this.tokenizer.fileInfo.size && this.metadata.format.duration) {
            const dataSize = this.tokenizer.fileInfo.size - this.tokenizer.position;
            this.metadata.setFormat('bitrate', 8 * dataSize / this.metadata.format.duration);
        }
    }
    parseDataBlock(blockHeader) {
        debug(`blockHeader type=${blockHeader.type}, length=${blockHeader.length}`);
        switch (blockHeader.type) {
            case BlockType.STREAMINFO:
                return this.parseBlockStreamInfo(blockHeader.length);
            case BlockType.PADDING:
                this.padding += blockHeader.length;
                break;
            case BlockType.APPLICATION:
                break;
            case BlockType.SEEKTABLE:
                break;
            case BlockType.VORBIS_COMMENT:
                return this.parseComment(blockHeader.length);
            case BlockType.CUESHEET:
                break;
            case BlockType.PICTURE:
                return this.parsePicture(blockHeader.length).then();
            default:
                this.metadata.addWarning('Unknown block type: ' + blockHeader.type);
        }
        // Ignore data block
        return this.tokenizer.ignore(blockHeader.length).then();
    }
    /**
     * Parse STREAMINFO
     */
    async parseBlockStreamInfo(dataLen) {
        if (dataLen !== Metadata.BlockStreamInfo.len)
            throw new Error('Unexpected block-stream-info length');
        const streamInfo = await this.tokenizer.readToken(Metadata.BlockStreamInfo);
        this.metadata.setFormat('container', 'FLAC');
        this.metadata.setFormat('codec', 'FLAC');
        this.metadata.setFormat('lossless', true);
        this.metadata.setFormat('numberOfChannels', streamInfo.channels);
        this.metadata.setFormat('bitsPerSample', streamInfo.bitsPerSample);
        this.metadata.setFormat('sampleRate', streamInfo.sampleRate);
        if (streamInfo.totalSamples > 0) {
            this.metadata.setFormat('duration', streamInfo.totalSamples / streamInfo.sampleRate);
        }
    }
    /**
     * Parse VORBIS_COMMENT
     * Ref: https://www.xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-640004.2.3
     */
    async parseComment(dataLen) {
        const data = await this.tokenizer.readToken(new token_types_1.Uint8ArrayType(dataLen));
        const decoder = new VorbisDecoder_1.VorbisDecoder(data, 0);
        decoder.readStringUtf8(); // vendor (skip)
        const commentListLength = decoder.readInt32();
        for (let i = 0; i < commentListLength; i++) {
            const tag = decoder.parseUserComment();
            this.vorbisParser.addTag(tag.key, tag.value);
        }
    }
    async parsePicture(dataLen) {
        if (this.options.skipCovers) {
            return this.tokenizer.ignore(dataLen);
        }
        else {
            const picture = await this.tokenizer.readToken(new Vorbis_1.VorbisPictureToken(dataLen));
            this.vorbisParser.addTag('METADATA_BLOCK_PICTURE', picture);
        }
    }
}
exports.FlacParser = FlacParser;
class Metadata {
}
Metadata.BlockHeader = {
    len: 4,
    get: (buf, off) => {
        return {
            lastBlock: util.getBit(buf, off, 7),
            type: util.getBitAllignedNumber(buf, off, 1, 7),
            length: token_types_1.UINT24_BE.get(buf, off + 1)
        };
    }
};
/**
 * METADATA_BLOCK_DATA
 * Ref: https://xiph.org/flac/format.html#metadata_block_streaminfo
 */
Metadata.BlockStreamInfo = {
    len: 34,
    get: (buf, off) => {
        return {
            // The minimum block size (in samples) used in the stream.
            minimumBlockSize: token_types_1.UINT16_BE.get(buf, off),
            // The maximum block size (in samples) used in the stream.
            // (Minimum blocksize == maximum blocksize) implies a fixed-blocksize stream.
            maximumBlockSize: token_types_1.UINT16_BE.get(buf, off + 2) / 1000,
            // The minimum frame size (in bytes) used in the stream.
            // May be 0 to imply the value is not known.
            minimumFrameSize: token_types_1.UINT24_BE.get(buf, off + 4),
            // The maximum frame size (in bytes) used in the stream.
            // May be 0 to imply the value is not known.
            maximumFrameSize: token_types_1.UINT24_BE.get(buf, off + 7),
            // Sample rate in Hz. Though 20 bits are available,
            // the maximum sample rate is limited by the structure of frame headers to 655350Hz.
            // Also, a value of 0 is invalid.
            sampleRate: token_types_1.UINT24_BE.get(buf, off + 10) >> 4,
            // probably slower: sampleRate: common.getBitAllignedNumber(buf, off + 10, 0, 20),
            // (number of channels)-1. FLAC supports from 1 to 8 channels
            channels: util.getBitAllignedNumber(buf, off + 12, 4, 3) + 1,
            // bits per sample)-1.
            // FLAC supports from 4 to 32 bits per sample. Currently the reference encoder and decoders only support up to 24 bits per sample.
            bitsPerSample: util.getBitAllignedNumber(buf, off + 12, 7, 5) + 1,
            // Total samples in stream.
            // 'Samples' means inter-channel sample, i.e. one second of 44.1Khz audio will have 44100 samples regardless of the number of channels.
            // A value of zero here means the number of total samples is unknown.
            totalSamples: util.getBitAllignedNumber(buf, off + 13, 4, 36),
            // the MD5 hash of the file (see notes for usage... it's a littly tricky)
            fileMD5: new token_types_1.Uint8ArrayType(16).get(buf, off + 18)
        };
    }
};

}, function(modId) { var map = {"../common/Util":1665830430497,"../ogg/vorbis/Vorbis":1665830430522,"../id3v2/AbstractID3Parser":1665830430523,"../common/FourCC":1665830430514,"../ogg/vorbis/VorbisParser":1665830430524,"../ogg/vorbis/VorbisDecoder":1665830430525}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430522, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentificationHeader = exports.CommonHeader = exports.VorbisPictureToken = void 0;
const Token = require("token-types");
const ID3v2Token_1 = require("../../id3v2/ID3v2Token");
/**
 * Parse the METADATA_BLOCK_PICTURE
 * Ref: https://wiki.xiph.org/VorbisComment#METADATA_BLOCK_PICTURE
 * Ref: https://xiph.org/flac/format.html#metadata_block_picture
 * // ToDo: move to ID3 / APIC?
 */
class VorbisPictureToken {
    constructor(len) {
        this.len = len;
    }
    static fromBase64(base64str) {
        return this.fromBuffer(Buffer.from(base64str, 'base64'));
    }
    static fromBuffer(buffer) {
        const pic = new VorbisPictureToken(buffer.length);
        return pic.get(buffer, 0);
    }
    get(buffer, offset) {
        const type = ID3v2Token_1.AttachedPictureType[Token.UINT32_BE.get(buffer, offset)];
        const mimeLen = Token.UINT32_BE.get(buffer, offset += 4);
        const format = buffer.toString('utf-8', offset += 4, offset + mimeLen);
        const descLen = Token.UINT32_BE.get(buffer, offset += mimeLen);
        const description = buffer.toString('utf-8', offset += 4, offset + descLen);
        const width = Token.UINT32_BE.get(buffer, offset += descLen);
        const height = Token.UINT32_BE.get(buffer, offset += 4);
        const colour_depth = Token.UINT32_BE.get(buffer, offset += 4);
        const indexed_color = Token.UINT32_BE.get(buffer, offset += 4);
        const picDataLen = Token.UINT32_BE.get(buffer, offset += 4);
        const data = Buffer.from(buffer.slice(offset += 4, offset + picDataLen));
        return {
            type,
            format,
            description,
            width,
            height,
            colour_depth,
            indexed_color,
            data
        };
    }
}
exports.VorbisPictureToken = VorbisPictureToken;
/**
 * Comment header decoder
 * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-620004.2.1
 */
exports.CommonHeader = {
    len: 7,
    get: (buf, off) => {
        return {
            packetType: buf.readUInt8(off),
            vorbis: new Token.StringType(6, 'ascii').get(buf, off + 1)
        };
    }
};
/**
 * Identification header decoder
 * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-630004.2.2
 */
exports.IdentificationHeader = {
    len: 23,
    get: (uint8Array, off) => {
        const dataView = new DataView(uint8Array.buffer, uint8Array.byteOffset);
        return {
            version: dataView.getUint32(off + 0, true),
            channelMode: dataView.getUint8(off + 4),
            sampleRate: dataView.getUint32(off + 5, true),
            bitrateMax: dataView.getUint32(off + 9, true),
            bitrateNominal: dataView.getUint32(off + 13, true),
            bitrateMin: dataView.getUint32(off + 17, true)
        };
    }
};

}, function(modId) { var map = {"../../id3v2/ID3v2Token":1665830430509}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430523, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractID3Parser = void 0;
const core_1 = require("strtok3/lib/core");
const debug_1 = require("debug");
const ID3v2Token_1 = require("./ID3v2Token");
const ID3v2Parser_1 = require("./ID3v2Parser");
const ID3v1Parser_1 = require("../id3v1/ID3v1Parser");
const BasicParser_1 = require("../common/BasicParser");
const debug = (0, debug_1.default)('music-metadata:parser:ID3');
/**
 * Abstract parser which tries take ID3v2 and ID3v1 headers.
 */
class AbstractID3Parser extends BasicParser_1.BasicParser {
    constructor() {
        super(...arguments);
        this.id3parser = new ID3v2Parser_1.ID3v2Parser();
    }
    static async startsWithID3v2Header(tokenizer) {
        return (await tokenizer.peekToken(ID3v2Token_1.ID3v2Header)).fileIdentifier === 'ID3';
    }
    async parse() {
        try {
            await this.parseID3v2();
        }
        catch (err) {
            if (err instanceof core_1.EndOfStreamError) {
                debug(`End-of-stream`);
            }
            else {
                throw err;
            }
        }
    }
    finalize() {
        return;
    }
    async parseID3v2() {
        await this.tryReadId3v2Headers();
        debug('End of ID3v2 header, go to MPEG-parser: pos=%s', this.tokenizer.position);
        await this.postId3v2Parse();
        if (this.options.skipPostHeaders && this.metadata.hasAny()) {
            this.finalize();
        }
        else {
            const id3v1parser = new ID3v1Parser_1.ID3v1Parser();
            await id3v1parser.init(this.metadata, this.tokenizer, this.options).parse();
            this.finalize();
        }
    }
    async tryReadId3v2Headers() {
        const id3Header = await this.tokenizer.peekToken(ID3v2Token_1.ID3v2Header);
        if (id3Header.fileIdentifier === 'ID3') {
            debug('Found ID3v2 header, pos=%s', this.tokenizer.position);
            await this.id3parser.parse(this.metadata, this.tokenizer, this.options);
            return this.tryReadId3v2Headers();
        }
    }
}
exports.AbstractID3Parser = AbstractID3Parser;

}, function(modId) { var map = {"./ID3v2Token":1665830430509,"./ID3v2Parser":1665830430507,"../id3v1/ID3v1Parser":1665830430510,"../common/BasicParser":1665830430511}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430524, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.VorbisParser = void 0;
const Token = require("token-types");
const debug_1 = require("debug");
const VorbisDecoder_1 = require("./VorbisDecoder");
const Vorbis_1 = require("./Vorbis");
const debug = (0, debug_1.default)('music-metadata:parser:ogg:vorbis1');
/**
 * Vorbis 1 Parser.
 * Used by OggParser
 */
class VorbisParser {
    constructor(metadata, options) {
        this.metadata = metadata;
        this.options = options;
        this.pageSegments = [];
    }
    /**
     * Vorbis 1 parser
     * @param header Ogg Page Header
     * @param pageData Page data
     */
    parsePage(header, pageData) {
        if (header.headerType.firstPage) {
            this.parseFirstPage(header, pageData);
        }
        else {
            if (header.headerType.continued) {
                if (this.pageSegments.length === 0) {
                    throw new Error("Cannot continue on previous page");
                }
                this.pageSegments.push(pageData);
            }
            if (header.headerType.lastPage || !header.headerType.continued) {
                // Flush page segments
                if (this.pageSegments.length > 0) {
                    const fullPage = Buffer.concat(this.pageSegments);
                    this.parseFullPage(fullPage);
                }
                // Reset page segments
                this.pageSegments = header.headerType.lastPage ? [] : [pageData];
            }
        }
        if (header.headerType.lastPage) {
            this.calculateDuration(header);
        }
    }
    flush() {
        this.parseFullPage(Buffer.concat(this.pageSegments));
    }
    parseUserComment(pageData, offset) {
        const decoder = new VorbisDecoder_1.VorbisDecoder(pageData, offset);
        const tag = decoder.parseUserComment();
        this.addTag(tag.key, tag.value);
        return tag.len;
    }
    addTag(id, value) {
        if (id === 'METADATA_BLOCK_PICTURE' && (typeof value === 'string')) {
            if (this.options.skipCovers) {
                debug(`Ignore picture`);
                return;
            }
            value = Vorbis_1.VorbisPictureToken.fromBase64(value);
            debug(`Push picture: id=${id}, format=${value.format}`);
        }
        else {
            debug(`Push tag: id=${id}, value=${value}`);
        }
        this.metadata.addTag('vorbis', id, value);
    }
    calculateDuration(header) {
        if (this.metadata.format.sampleRate && header.absoluteGranulePosition >= 0) {
            // Calculate duration
            this.metadata.setFormat('numberOfSamples', header.absoluteGranulePosition);
            this.metadata.setFormat('duration', this.metadata.format.numberOfSamples / this.metadata.format.sampleRate);
        }
    }
    /**
     * Parse first Ogg/Vorbis page
     * @param {IPageHeader} header
     * @param {Buffer} pageData
     */
    parseFirstPage(header, pageData) {
        this.metadata.setFormat('codec', 'Vorbis I');
        debug("Parse first page");
        // Parse  Vorbis common header
        const commonHeader = Vorbis_1.CommonHeader.get(pageData, 0);
        if (commonHeader.vorbis !== 'vorbis')
            throw new Error('Metadata does not look like Vorbis');
        if (commonHeader.packetType === 1) {
            const idHeader = Vorbis_1.IdentificationHeader.get(pageData, Vorbis_1.CommonHeader.len);
            this.metadata.setFormat('sampleRate', idHeader.sampleRate);
            this.metadata.setFormat('bitrate', idHeader.bitrateNominal);
            this.metadata.setFormat('numberOfChannels', idHeader.channelMode);
            debug("sample-rate=%s[hz], bitrate=%s[b/s], channel-mode=%s", idHeader.sampleRate, idHeader.bitrateNominal, idHeader.channelMode);
        }
        else
            throw new Error('First Ogg page should be type 1: the identification header');
    }
    parseFullPage(pageData) {
        // New page
        const commonHeader = Vorbis_1.CommonHeader.get(pageData, 0);
        debug("Parse full page: type=%s, byteLength=%s", commonHeader.packetType, pageData.byteLength);
        switch (commonHeader.packetType) {
            case 3: //  type 3: comment header
                return this.parseUserCommentList(pageData, Vorbis_1.CommonHeader.len);
            case 1: // type 1: the identification header
            case 5: // type 5: setup header type
                break; // ignore
        }
    }
    /**
     * Ref: https://xiph.org/vorbis/doc/Vorbis_I_spec.html#x1-840005.2
     */
    parseUserCommentList(pageData, offset) {
        const strLen = Token.UINT32_LE.get(pageData, offset);
        offset += 4;
        // const vendorString = new Token.StringType(strLen, 'utf-8').get(pageData, offset);
        offset += strLen;
        let userCommentListLength = Token.UINT32_LE.get(pageData, offset);
        offset += 4;
        while (userCommentListLength-- > 0) {
            offset += this.parseUserComment(pageData, offset);
        }
    }
}
exports.VorbisParser = VorbisParser;

}, function(modId) { var map = {"./VorbisDecoder":1665830430525,"./Vorbis":1665830430522}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430525, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.VorbisDecoder = void 0;
const Token = require("token-types");
class VorbisDecoder {
    constructor(data, offset) {
        this.data = data;
        this.offset = offset;
    }
    readInt32() {
        const value = Token.UINT32_LE.get(this.data, this.offset);
        this.offset += 4;
        return value;
    }
    readStringUtf8() {
        const len = this.readInt32();
        const value = Buffer.from(this.data).toString('utf-8', this.offset, this.offset + len);
        this.offset += len;
        return value;
    }
    parseUserComment() {
        const offset0 = this.offset;
        const v = this.readStringUtf8();
        const idx = v.indexOf('=');
        return {
            key: v.slice(0, idx).toUpperCase(),
            value: v.slice(idx + 1),
            len: this.offset - offset0
        };
    }
}
exports.VorbisDecoder = VorbisDecoder;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430526, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.MP4Parser = void 0;
const debug_1 = require("debug");
const Token = require("token-types");
const BasicParser_1 = require("../common/BasicParser");
const ID3v1Parser_1 = require("../id3v1/ID3v1Parser");
const type_1 = require("../type");
const Atom_1 = require("./Atom");
const AtomToken = require("./AtomToken");
const debug = (0, debug_1.default)('music-metadata:parser:MP4');
const tagFormat = 'iTunes';
const encoderDict = {
    raw: {
        lossy: false,
        format: 'raw'
    },
    MAC3: {
        lossy: true,
        format: 'MACE 3:1'
    },
    MAC6: {
        lossy: true,
        format: 'MACE 6:1'
    },
    ima4: {
        lossy: true,
        format: 'IMA 4:1'
    },
    ulaw: {
        lossy: true,
        format: 'uLaw 2:1'
    },
    alaw: {
        lossy: true,
        format: 'uLaw 2:1'
    },
    Qclp: {
        lossy: true,
        format: 'QUALCOMM PureVoice'
    },
    '.mp3': {
        lossy: true,
        format: 'MPEG-1 layer 3'
    },
    alac: {
        lossy: false,
        format: 'ALAC'
    },
    'ac-3': {
        lossy: true,
        format: 'AC-3'
    },
    mp4a: {
        lossy: true,
        format: 'MPEG-4/AAC'
    },
    mp4s: {
        lossy: true,
        format: 'MP4S'
    },
    // Closed Captioning Media, https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap3/qtff3.html#//apple_ref/doc/uid/TP40000939-CH205-SW87
    c608: {
        lossy: true,
        format: 'CEA-608'
    },
    c708: {
        lossy: true,
        format: 'CEA-708'
    }
};
function distinct(value, index, self) {
    return self.indexOf(value) === index;
}
/*
 * Parser for the MP4 (MPEG-4 Part 14) container format
 * Standard: ISO/IEC 14496-14
 * supporting:
 * - QuickTime container
 * - MP4 File Format
 * - 3GPP file format
 * - 3GPP2 file format
 *
 * MPEG-4 Audio / Part 3 (.m4a)& MPEG 4 Video (m4v, mp4) extension.
 * Support for Apple iTunes tags as found in a M4A/M4V files.
 * Ref:
 *   https://en.wikipedia.org/wiki/ISO_base_media_file_format
 *   https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/Metadata/Metadata.html
 *   http://atomicparsley.sourceforge.net/mpeg-4files.html
 *   https://github.com/sergiomb2/libmp4v2/wiki/iTunesMetadata
 *   https://wiki.multimedia.cx/index.php/QuickTime_container
 */
class MP4Parser extends BasicParser_1.BasicParser {
    constructor() {
        super(...arguments);
        this.atomParsers = {
            /**
             * Parse movie header (mvhd) atom
             * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-56313
             */
            mvhd: async (len) => {
                const mvhd = await this.tokenizer.readToken(new AtomToken.MvhdAtom(len));
                this.metadata.setFormat('creationTime', mvhd.creationTime);
                this.metadata.setFormat('modificationTime', mvhd.modificationTime);
            },
            /**
             * Parse media header (mdhd) atom
             * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25615
             */
            mdhd: async (len) => {
                const mdhd_data = await this.tokenizer.readToken(new AtomToken.MdhdAtom(len));
                // this.parse_mxhd(mdhd_data, this.currentTrack);
                const td = this.getTrackDescription();
                td.creationTime = mdhd_data.creationTime;
                td.modificationTime = mdhd_data.modificationTime;
                td.timeScale = mdhd_data.timeScale;
                td.duration = mdhd_data.duration;
            },
            chap: async (len) => {
                const td = this.getTrackDescription();
                const trackIds = [];
                while (len >= Token.UINT32_BE.len) {
                    trackIds.push(await this.tokenizer.readNumber(Token.UINT32_BE));
                    len -= Token.UINT32_BE.len;
                }
                td.chapterList = trackIds;
            },
            tkhd: async (len) => {
                const track = (await this.tokenizer.readToken(new AtomToken.TrackHeaderAtom(len)));
                this.tracks.push(track);
            },
            /**
             * Parse mdat atom.
             * Will scan for chapters
             */
            mdat: async (len) => {
                this.audioLengthInBytes = len;
                this.calculateBitRate();
                if (this.options.includeChapters) {
                    const trackWithChapters = this.tracks.filter(track => track.chapterList);
                    if (trackWithChapters.length === 1) {
                        const chapterTrackIds = trackWithChapters[0].chapterList;
                        const chapterTracks = this.tracks.filter(track => chapterTrackIds.indexOf(track.trackId) !== -1);
                        if (chapterTracks.length === 1) {
                            return this.parseChapterTrack(chapterTracks[0], trackWithChapters[0], len);
                        }
                    }
                }
                await this.tokenizer.ignore(len);
            },
            ftyp: async (len) => {
                const types = [];
                while (len > 0) {
                    const ftype = await this.tokenizer.readToken(AtomToken.ftyp);
                    len -= AtomToken.ftyp.len;
                    const value = ftype.type.replace(/\W/g, '');
                    if (value.length > 0) {
                        types.push(value); // unshift for backward compatibility
                    }
                }
                debug(`ftyp: ${types.join('/')}`);
                const x = types.filter(distinct).join('/');
                this.metadata.setFormat('container', x);
            },
            /**
             * Parse sample description atom
             */
            stsd: async (len) => {
                const stsd = await this.tokenizer.readToken(new AtomToken.StsdAtom(len));
                const trackDescription = this.getTrackDescription();
                trackDescription.soundSampleDescription = stsd.table.map(dfEntry => this.parseSoundSampleDescription(dfEntry));
            },
            /**
             * sample-to-Chunk Atoms
             */
            stsc: async (len) => {
                const stsc = await this.tokenizer.readToken(new AtomToken.StscAtom(len));
                this.getTrackDescription().sampleToChunkTable = stsc.entries;
            },
            /**
             * time to sample
             */
            stts: async (len) => {
                const stts = await this.tokenizer.readToken(new AtomToken.SttsAtom(len));
                this.getTrackDescription().timeToSampleTable = stts.entries;
            },
            /**
             * Parse sample-sizes atom ('stsz')
             */
            stsz: async (len) => {
                const stsz = await this.tokenizer.readToken(new AtomToken.StszAtom(len));
                const td = this.getTrackDescription();
                td.sampleSize = stsz.sampleSize;
                td.sampleSizeTable = stsz.entries;
            },
            /**
             * Parse chunk-offset atom ('stco')
             */
            stco: async (len) => {
                const stco = await this.tokenizer.readToken(new AtomToken.StcoAtom(len));
                this.getTrackDescription().chunkOffsetTable = stco.entries; // remember chunk offsets
            },
            date: async (len) => {
                const date = await this.tokenizer.readToken(new Token.StringType(len, 'utf-8'));
                this.addTag('date', date);
            }
        };
    }
    static read_BE_Integer(array, signed) {
        const integerType = (signed ? 'INT' : 'UINT') + array.length * 8 + (array.length > 1 ? '_BE' : '');
        const token = Token[integerType];
        if (!token) {
            throw new Error('Token for integer type not found: "' + integerType + '"');
        }
        return Number(token.get(array, 0));
    }
    async parse() {
        this.tracks = [];
        let remainingFileSize = this.tokenizer.fileInfo.size;
        while (!this.tokenizer.fileInfo.size || remainingFileSize > 0) {
            try {
                const token = await this.tokenizer.peekToken(AtomToken.Header);
                if (token.name === '\0\0\0\0') {
                    const errMsg = `Error at offset=${this.tokenizer.position}: box.id=0`;
                    debug(errMsg);
                    this.addWarning(errMsg);
                    break;
                }
            }
            catch (error) {
                const errMsg = `Error at offset=${this.tokenizer.position}: ${error.message}`;
                debug(errMsg);
                this.addWarning(errMsg);
                break;
            }
            const rootAtom = await Atom_1.Atom.readAtom(this.tokenizer, (atom, remaining) => this.handleAtom(atom, remaining), null, remainingFileSize);
            remainingFileSize -= rootAtom.header.length === BigInt(0) ? remainingFileSize : Number(rootAtom.header.length);
        }
        // Post process metadata
        const formatList = [];
        this.tracks.forEach(track => {
            const trackFormats = [];
            track.soundSampleDescription.forEach(ssd => {
                const streamInfo = {};
                const encoderInfo = encoderDict[ssd.dataFormat];
                if (encoderInfo) {
                    trackFormats.push(encoderInfo.format);
                    streamInfo.codecName = encoderInfo.format;
                }
                else {
                    streamInfo.codecName = `<${ssd.dataFormat}>`;
                }
                if (ssd.description) {
                    const { description } = ssd;
                    if (description.sampleRate > 0) {
                        streamInfo.type = type_1.TrackType.audio;
                        streamInfo.audio = {
                            samplingFrequency: description.sampleRate,
                            bitDepth: description.sampleSize,
                            channels: description.numAudioChannels
                        };
                    }
                }
                this.metadata.addStreamInfo(streamInfo);
            });
            if (trackFormats.length >= 1) {
                formatList.push(trackFormats.join('/'));
            }
        });
        if (formatList.length > 0) {
            this.metadata.setFormat('codec', formatList.filter(distinct).join('+'));
        }
        const audioTracks = this.tracks.filter(track => {
            return track.soundSampleDescription.length >= 1 && track.soundSampleDescription[0].description && track.soundSampleDescription[0].description.numAudioChannels > 0;
        });
        if (audioTracks.length >= 1) {
            const audioTrack = audioTracks[0];
            const duration = audioTrack.duration / audioTrack.timeScale;
            this.metadata.setFormat('duration', duration); // calculate duration in seconds
            const ssd = audioTrack.soundSampleDescription[0];
            if (ssd.description) {
                this.metadata.setFormat('sampleRate', ssd.description.sampleRate);
                this.metadata.setFormat('bitsPerSample', ssd.description.sampleSize);
                this.metadata.setFormat('numberOfChannels', ssd.description.numAudioChannels);
            }
            const encoderInfo = encoderDict[ssd.dataFormat];
            if (encoderInfo) {
                this.metadata.setFormat('lossless', !encoderInfo.lossy);
            }
            this.calculateBitRate();
        }
    }
    async handleAtom(atom, remaining) {
        if (atom.parent) {
            switch (atom.parent.header.name) {
                case 'ilst':
                case '<id>':
                    return this.parseMetadataItemData(atom);
            }
        }
        // const payloadLength = atom.getPayloadLength(remaining);
        if (this.atomParsers[atom.header.name]) {
            return this.atomParsers[atom.header.name](remaining);
        }
        else {
            debug(`No parser for atom path=${atom.atomPath}, payload-len=${remaining}, ignoring atom`);
            await this.tokenizer.ignore(remaining);
        }
    }
    getTrackDescription() {
        return this.tracks[this.tracks.length - 1];
    }
    calculateBitRate() {
        if (this.audioLengthInBytes && this.metadata.format.duration) {
            this.metadata.setFormat('bitrate', 8 * this.audioLengthInBytes / this.metadata.format.duration);
        }
    }
    addTag(id, value) {
        this.metadata.addTag(tagFormat, id, value);
    }
    addWarning(message) {
        debug('Warning: ' + message);
        this.metadata.addWarning(message);
    }
    /**
     * Parse data of Meta-item-list-atom (item of 'ilst' atom)
     * @param metaAtom
     * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW8
     */
    parseMetadataItemData(metaAtom) {
        let tagKey = metaAtom.header.name;
        return metaAtom.readAtoms(this.tokenizer, async (child, remaining) => {
            const payLoadLength = child.getPayloadLength(remaining);
            switch (child.header.name) {
                case 'data': // value atom
                    return this.parseValueAtom(tagKey, child);
                case 'name': // name atom (optional)
                    const name = await this.tokenizer.readToken(new AtomToken.NameAtom(payLoadLength));
                    tagKey += ':' + name.name;
                    break;
                case 'mean': // name atom (optional)
                    const mean = await this.tokenizer.readToken(new AtomToken.NameAtom(payLoadLength));
                    // console.log("  %s[%s] = %s", tagKey, header.name, mean.name);
                    tagKey += ':' + mean.name;
                    break;
                default:
                    const dataAtom = await this.tokenizer.readToken(new Token.BufferType(payLoadLength));
                    this.addWarning('Unsupported meta-item: ' + tagKey + '[' + child.header.name + '] => value=' + dataAtom.toString('hex') + ' ascii=' + dataAtom.toString('ascii'));
            }
        }, metaAtom.getPayloadLength(0));
    }
    async parseValueAtom(tagKey, metaAtom) {
        const dataAtom = await this.tokenizer.readToken(new AtomToken.DataAtom(Number(metaAtom.header.length) - AtomToken.Header.len));
        if (dataAtom.type.set !== 0) {
            throw new Error('Unsupported type-set != 0: ' + dataAtom.type.set);
        }
        // Use well-known-type table
        // Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW35
        switch (dataAtom.type.type) {
            case 0: // reserved: Reserved for use where no type needs to be indicated
                switch (tagKey) {
                    case 'trkn':
                    case 'disk':
                        const num = Token.UINT8.get(dataAtom.value, 3);
                        const of = Token.UINT8.get(dataAtom.value, 5);
                        // console.log("  %s[data] = %s/%s", tagKey, num, of);
                        this.addTag(tagKey, num + '/' + of);
                        break;
                    case 'gnre':
                        const genreInt = Token.UINT8.get(dataAtom.value, 1);
                        const genreStr = ID3v1Parser_1.Genres[genreInt - 1];
                        // console.log("  %s[data] = %s", tagKey, genreStr);
                        this.addTag(tagKey, genreStr);
                        break;
                    default:
                    // console.log("  reserved-data: name=%s, len=%s, set=%s, type=%s, locale=%s, value{ hex=%s, ascii=%s }",
                    // header.name, header.length, dataAtom.type.set, dataAtom.type.type, dataAtom.locale, dataAtom.value.toString('hex'), dataAtom.value.toString('ascii'));
                }
                break;
            case 1: // UTF-8: Without any count or NULL terminator
            case 18: // Unknown: Found in m4b in combination with a '©gen' tag
                this.addTag(tagKey, dataAtom.value.toString('utf-8'));
                break;
            case 13: // JPEG
                if (this.options.skipCovers)
                    break;
                this.addTag(tagKey, {
                    format: 'image/jpeg',
                    data: Buffer.from(dataAtom.value)
                });
                break;
            case 14: // PNG
                if (this.options.skipCovers)
                    break;
                this.addTag(tagKey, {
                    format: 'image/png',
                    data: Buffer.from(dataAtom.value)
                });
                break;
            case 21: // BE Signed Integer
                this.addTag(tagKey, MP4Parser.read_BE_Integer(dataAtom.value, true));
                break;
            case 22: // BE Unsigned Integer
                this.addTag(tagKey, MP4Parser.read_BE_Integer(dataAtom.value, false));
                break;
            case 65: // An 8-bit signed integer
                this.addTag(tagKey, dataAtom.value.readInt8(0));
                break;
            case 66: // A big-endian 16-bit signed integer
                this.addTag(tagKey, dataAtom.value.readInt16BE(0));
                break;
            case 67: // A big-endian 32-bit signed integer
                this.addTag(tagKey, dataAtom.value.readInt32BE(0));
                break;
            default:
                this.addWarning(`atom key=${tagKey}, has unknown well-known-type (data-type): ${dataAtom.type.type}`);
        }
    }
    /**
     * @param sampleDescription
     * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap3/qtff3.html#//apple_ref/doc/uid/TP40000939-CH205-128916
     */
    parseSoundSampleDescription(sampleDescription) {
        const ssd = {
            dataFormat: sampleDescription.dataFormat,
            dataReferenceIndex: sampleDescription.dataReferenceIndex
        };
        let offset = 0;
        const version = AtomToken.SoundSampleDescriptionVersion.get(sampleDescription.description, offset);
        offset += AtomToken.SoundSampleDescriptionVersion.len;
        if (version.version === 0 || version.version === 1) {
            // Sound Sample Description (Version 0)
            ssd.description = AtomToken.SoundSampleDescriptionV0.get(sampleDescription.description, offset);
        }
        else {
            debug(`Warning: sound-sample-description ${version} not implemented`);
        }
        return ssd;
    }
    async parseChapterTrack(chapterTrack, track, len) {
        if (!chapterTrack.sampleSize) {
            if (chapterTrack.chunkOffsetTable.length !== chapterTrack.sampleSizeTable.length)
                throw new Error('Expected equal chunk-offset-table & sample-size-table length.');
        }
        const chapters = [];
        for (let i = 0; i < chapterTrack.chunkOffsetTable.length && len > 0; ++i) {
            const chunkOffset = chapterTrack.chunkOffsetTable[i];
            const nextChunkLen = chunkOffset - this.tokenizer.position;
            const sampleSize = chapterTrack.sampleSize > 0 ? chapterTrack.sampleSize : chapterTrack.sampleSizeTable[i];
            len -= nextChunkLen + sampleSize;
            if (len < 0)
                throw new Error('Chapter chunk exceeding token length');
            await this.tokenizer.ignore(nextChunkLen);
            const title = await this.tokenizer.readToken(new AtomToken.ChapterText(sampleSize));
            debug(`Chapter ${i + 1}: ${title}`);
            const chapter = {
                title,
                sampleOffset: this.findSampleOffset(track, this.tokenizer.position)
            };
            debug(`Chapter title=${chapter.title}, offset=${chapter.sampleOffset}/${this.tracks[0].duration}`);
            chapters.push(chapter);
        }
        this.metadata.setFormat('chapters', chapters);
        await this.tokenizer.ignore(len);
    }
    findSampleOffset(track, chapterOffset) {
        let totalDuration = 0;
        track.timeToSampleTable.forEach(e => {
            totalDuration += e.count * e.duration;
        });
        debug(`Total duration=${totalDuration}`);
        let chunkIndex = 0;
        while (chunkIndex < track.chunkOffsetTable.length && track.chunkOffsetTable[chunkIndex] < chapterOffset) {
            ++chunkIndex;
        }
        return this.getChunkDuration(chunkIndex + 1, track);
    }
    getChunkDuration(chunkId, track) {
        let ttsi = 0;
        let ttsc = track.timeToSampleTable[ttsi].count;
        let ttsd = track.timeToSampleTable[ttsi].duration;
        let curChunkId = 1;
        let samplesPerChunk = this.getSamplesPerChunk(curChunkId, track.sampleToChunkTable);
        let totalDuration = 0;
        while (curChunkId < chunkId) {
            const nrOfSamples = Math.min(ttsc, samplesPerChunk);
            totalDuration += nrOfSamples * ttsd;
            ttsc -= nrOfSamples;
            samplesPerChunk -= nrOfSamples;
            if (samplesPerChunk === 0) {
                ++curChunkId;
                samplesPerChunk = this.getSamplesPerChunk(curChunkId, track.sampleToChunkTable);
            }
            else {
                ++ttsi;
                ttsc = track.timeToSampleTable[ttsi].count;
                ttsd = track.timeToSampleTable[ttsi].duration;
            }
        }
        return totalDuration;
    }
    getSamplesPerChunk(chunkId, stcTable) {
        for (let i = 0; i < stcTable.length - 1; ++i) {
            if (chunkId >= stcTable[i].firstChunk && chunkId < stcTable[i + 1].firstChunk) {
                return stcTable[i].samplesPerChunk;
            }
        }
        return stcTable[stcTable.length - 1].samplesPerChunk;
    }
}
exports.MP4Parser = MP4Parser;

}, function(modId) { var map = {"../common/BasicParser":1665830430511,"../id3v1/ID3v1Parser":1665830430510,"../type":1665830430489,"./Atom":1665830430527,"./AtomToken":1665830430528}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430527, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.Atom = void 0;
const debug_1 = require("debug");
const AtomToken = require("./AtomToken");
const debug = (0, debug_1.default)('music-metadata:parser:MP4:Atom');
class Atom {
    constructor(header, extended, parent) {
        this.header = header;
        this.extended = extended;
        this.parent = parent;
        this.children = [];
        this.atomPath = (this.parent ? this.parent.atomPath + '.' : '') + this.header.name;
    }
    static async readAtom(tokenizer, dataHandler, parent, remaining) {
        // Parse atom header
        const offset = tokenizer.position;
        // debug(`Reading next token on offset=${offset}...`); //  buf.toString('ascii')
        const header = await tokenizer.readToken(AtomToken.Header);
        const extended = header.length === BigInt(1);
        if (extended) {
            header.length = await tokenizer.readToken(AtomToken.ExtendedSize);
        }
        const atomBean = new Atom(header, header.length === BigInt(1), parent);
        const payloadLength = atomBean.getPayloadLength(remaining);
        debug(`parse atom name=${atomBean.atomPath}, extended=${atomBean.extended}, offset=${offset}, len=${atomBean.header.length}`); //  buf.toString('ascii')
        await atomBean.readData(tokenizer, dataHandler, payloadLength);
        return atomBean;
    }
    getHeaderLength() {
        return this.extended ? 16 : 8;
    }
    getPayloadLength(remaining) {
        return (this.header.length === BigInt(0) ? remaining : Number(this.header.length)) - this.getHeaderLength();
    }
    async readAtoms(tokenizer, dataHandler, size) {
        while (size > 0) {
            const atomBean = await Atom.readAtom(tokenizer, dataHandler, this, size);
            this.children.push(atomBean);
            size -= atomBean.header.length === BigInt(0) ? size : Number(atomBean.header.length);
        }
    }
    async readData(tokenizer, dataHandler, remaining) {
        switch (this.header.name) {
            // "Container" atoms, contains nested atoms
            case 'moov': // The Movie Atom: contains other atoms
            case 'udta': // User defined atom
            case 'trak':
            case 'mdia': // Media atom
            case 'minf': // Media Information Atom
            case 'stbl': // The Sample Table Atom
            case '<id>':
            case 'ilst':
            case 'tref':
                return this.readAtoms(tokenizer, dataHandler, this.getPayloadLength(remaining));
            case 'meta': // Metadata Atom, ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW8
                // meta has 4 bytes of padding, ignore
                await tokenizer.ignore(4);
                return this.readAtoms(tokenizer, dataHandler, this.getPayloadLength(remaining) - 4);
            case 'mdhd': // Media header atom
            case 'mvhd': // 'movie' => 'mvhd': movie header atom; child of Movie Atom
            case 'tkhd':
            case 'stsz':
            case 'mdat':
            default:
                return dataHandler(this, remaining);
        }
    }
}
exports.Atom = Atom;

}, function(modId) { var map = {"./AtomToken":1665830430528}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430528, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.ChapterText = exports.StcoAtom = exports.StszAtom = exports.StscAtom = exports.SampleToChunkToken = exports.SttsAtom = exports.TimeToSampleToken = exports.SoundSampleDescriptionV0 = exports.SoundSampleDescriptionVersion = exports.StsdAtom = exports.TrackHeaderAtom = exports.NameAtom = exports.DataAtom = exports.MvhdAtom = exports.MdhdAtom = exports.FixedLengthAtom = exports.mhdr = exports.tkhd = exports.ftyp = exports.ExtendedSize = exports.Header = void 0;
const Token = require("token-types");
const debug_1 = require("debug");
const FourCC_1 = require("../common/FourCC");
const debug = (0, debug_1.default)('music-metadata:parser:MP4:atom');
exports.Header = {
    len: 8,
    get: (buf, off) => {
        const length = Token.UINT32_BE.get(buf, off);
        if (length < 0)
            throw new Error('Invalid atom header length');
        return {
            length: BigInt(length),
            name: new Token.StringType(4, 'binary').get(buf, off + 4)
        };
    },
    put: (buf, off, hdr) => {
        Token.UINT32_BE.put(buf, off, Number(hdr.length));
        return FourCC_1.FourCcToken.put(buf, off + 4, hdr.name);
    }
};
/**
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap1/qtff1.html#//apple_ref/doc/uid/TP40000939-CH203-38190
 */
exports.ExtendedSize = Token.UINT64_BE;
exports.ftyp = {
    len: 4,
    get: (buf, off) => {
        return {
            type: new Token.StringType(4, 'ascii').get(buf, off)
        };
    }
};
exports.tkhd = {
    len: 4,
    get: (buf, off) => {
        return {
            type: new Token.StringType(4, 'ascii').get(buf, off)
        };
    }
};
/**
 * Token: Movie Header Atom
 */
exports.mhdr = {
    len: 8,
    get: (buf, off) => {
        return {
            version: Token.UINT8.get(buf, off),
            flags: Token.UINT24_BE.get(buf, off + 1),
            nextItemID: Token.UINT32_BE.get(buf, off + 4)
        };
    }
};
/**
 * Base class for 'fixed' length atoms.
 * In some cases these atoms are longer then the sum of the described fields.
 * Issue: https://github.com/Borewit/music-metadata/issues/120
 */
class FixedLengthAtom {
    /**
     *
     * @param {number} len Length as specified in the size field
     * @param {number} expLen Total length of sum of specified fields in the standard
     */
    constructor(len, expLen, atomId) {
        this.len = len;
        if (len < expLen) {
            throw new Error(`Atom ${atomId} expected to be ${expLen}, but specifies ${len} bytes long.`);
        }
        else if (len > expLen) {
            debug(`Warning: atom ${atomId} expected to be ${expLen}, but was actually ${len} bytes long.`);
        }
    }
}
exports.FixedLengthAtom = FixedLengthAtom;
/**
 * Timestamp stored in seconds since Mac Epoch (1 January 1904)
 */
const SecondsSinceMacEpoch = {
    len: 4,
    get: (buf, off) => {
        const secondsSinceUnixEpoch = Token.UINT32_BE.get(buf, off) - 2082844800;
        return new Date(secondsSinceUnixEpoch * 1000);
    }
};
/**
 * Token: Media Header Atom
 * Ref:
 * - https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-SW34
 * - https://wiki.multimedia.cx/index.php/QuickTime_container#mdhd
 */
class MdhdAtom extends FixedLengthAtom {
    constructor(len) {
        super(len, 24, 'mdhd');
        this.len = len;
    }
    get(buf, off) {
        return {
            version: Token.UINT8.get(buf, off + 0),
            flags: Token.UINT24_BE.get(buf, off + 1),
            creationTime: SecondsSinceMacEpoch.get(buf, off + 4),
            modificationTime: SecondsSinceMacEpoch.get(buf, off + 8),
            timeScale: Token.UINT32_BE.get(buf, off + 12),
            duration: Token.UINT32_BE.get(buf, off + 16),
            language: Token.UINT16_BE.get(buf, off + 20),
            quality: Token.UINT16_BE.get(buf, off + 22)
        };
    }
}
exports.MdhdAtom = MdhdAtom;
/**
 * Token: Movie Header Atom
 */
class MvhdAtom extends FixedLengthAtom {
    constructor(len) {
        super(len, 100, 'mvhd');
        this.len = len;
    }
    get(buf, off) {
        return {
            version: Token.UINT8.get(buf, off),
            flags: Token.UINT24_BE.get(buf, off + 1),
            creationTime: SecondsSinceMacEpoch.get(buf, off + 4),
            modificationTime: SecondsSinceMacEpoch.get(buf, off + 8),
            timeScale: Token.UINT32_BE.get(buf, off + 12),
            duration: Token.UINT32_BE.get(buf, off + 16),
            preferredRate: Token.UINT32_BE.get(buf, off + 20),
            preferredVolume: Token.UINT16_BE.get(buf, off + 24),
            // ignore reserver: 10 bytes
            // ignore matrix structure: 36 bytes
            previewTime: Token.UINT32_BE.get(buf, off + 72),
            previewDuration: Token.UINT32_BE.get(buf, off + 76),
            posterTime: Token.UINT32_BE.get(buf, off + 80),
            selectionTime: Token.UINT32_BE.get(buf, off + 84),
            selectionDuration: Token.UINT32_BE.get(buf, off + 88),
            currentTime: Token.UINT32_BE.get(buf, off + 92),
            nextTrackID: Token.UINT32_BE.get(buf, off + 96)
        };
    }
}
exports.MvhdAtom = MvhdAtom;
/**
 * Data Atom Structure
 */
class DataAtom {
    constructor(len) {
        this.len = len;
    }
    get(buf, off) {
        return {
            type: {
                set: Token.UINT8.get(buf, off + 0),
                type: Token.UINT24_BE.get(buf, off + 1)
            },
            locale: Token.UINT24_BE.get(buf, off + 4),
            value: Buffer.from(new Token.Uint8ArrayType(this.len - 8).get(buf, off + 8))
        };
    }
}
exports.DataAtom = DataAtom;
/**
 * Data Atom Structure
 * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW31
 */
class NameAtom {
    constructor(len) {
        this.len = len;
    }
    get(buf, off) {
        return {
            version: Token.UINT8.get(buf, off),
            flags: Token.UINT24_BE.get(buf, off + 1),
            name: new Token.StringType(this.len - 4, 'utf-8').get(buf, off + 4)
        };
    }
}
exports.NameAtom = NameAtom;
/**
 * Track Header Atoms structure
 * Ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25550
 */
class TrackHeaderAtom {
    constructor(len) {
        this.len = len;
    }
    get(buf, off) {
        return {
            version: Token.UINT8.get(buf, off),
            flags: Token.UINT24_BE.get(buf, off + 1),
            creationTime: SecondsSinceMacEpoch.get(buf, off + 4),
            modificationTime: SecondsSinceMacEpoch.get(buf, off + 8),
            trackId: Token.UINT32_BE.get(buf, off + 12),
            // reserved 4 bytes
            duration: Token.UINT32_BE.get(buf, off + 20),
            layer: Token.UINT16_BE.get(buf, off + 24),
            alternateGroup: Token.UINT16_BE.get(buf, off + 26),
            volume: Token.UINT16_BE.get(buf, off + 28) // ToDo: fixed point
            // ToDo: add remaining fields
        };
    }
}
exports.TrackHeaderAtom = TrackHeaderAtom;
/**
 * Atom: Sample Description Atom ('stsd')
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25691
 */
const stsdHeader = {
    len: 8,
    get: (buf, off) => {
        return {
            version: Token.UINT8.get(buf, off),
            flags: Token.UINT24_BE.get(buf, off + 1),
            numberOfEntries: Token.UINT32_BE.get(buf, off + 4)
        };
    }
};
/**
 * Atom: Sample Description Atom ('stsd')
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25691
 */
class SampleDescriptionTable {
    constructor(len) {
        this.len = len;
    }
    get(buf, off) {
        return {
            dataFormat: FourCC_1.FourCcToken.get(buf, off),
            dataReferenceIndex: Token.UINT16_BE.get(buf, off + 10),
            description: new Token.Uint8ArrayType(this.len - 12).get(buf, off + 12)
        };
    }
}
/**
 * Atom: Sample-description Atom ('stsd')
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25691
 */
class StsdAtom {
    constructor(len) {
        this.len = len;
    }
    get(buf, off) {
        const header = stsdHeader.get(buf, off);
        off += stsdHeader.len;
        const table = [];
        for (let n = 0; n < header.numberOfEntries; ++n) {
            const size = Token.UINT32_BE.get(buf, off); // Sample description size
            off += Token.UINT32_BE.len;
            table.push(new SampleDescriptionTable(size).get(buf, off));
            off += size;
        }
        return {
            header,
            table
        };
    }
}
exports.StsdAtom = StsdAtom;
/**
 * Common Sound Sample Description (version & revision)
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap3/qtff3.html#//apple_ref/doc/uid/TP40000939-CH205-57317
 */
exports.SoundSampleDescriptionVersion = {
    len: 8,
    get(buf, off) {
        return {
            version: Token.INT16_BE.get(buf, off),
            revision: Token.INT16_BE.get(buf, off + 2),
            vendor: Token.INT32_BE.get(buf, off + 4)
        };
    }
};
/**
 * Sound Sample Description (Version 0)
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap3/qtff3.html#//apple_ref/doc/uid/TP40000939-CH205-130736
 */
exports.SoundSampleDescriptionV0 = {
    len: 12,
    get(buf, off) {
        return {
            numAudioChannels: Token.INT16_BE.get(buf, off + 0),
            sampleSize: Token.INT16_BE.get(buf, off + 2),
            compressionId: Token.INT16_BE.get(buf, off + 4),
            packetSize: Token.INT16_BE.get(buf, off + 6),
            sampleRate: Token.UINT16_BE.get(buf, off + 8) + Token.UINT16_BE.get(buf, off + 10) / 10000
        };
    }
};
class SimpleTableAtom {
    constructor(len, token) {
        this.len = len;
        this.token = token;
    }
    get(buf, off) {
        const nrOfEntries = Token.INT32_BE.get(buf, off + 4);
        return {
            version: Token.INT8.get(buf, off + 0),
            flags: Token.INT24_BE.get(buf, off + 1),
            numberOfEntries: nrOfEntries,
            entries: readTokenTable(buf, this.token, off + 8, this.len - 8, nrOfEntries)
        };
    }
}
exports.TimeToSampleToken = {
    len: 8,
    get(buf, off) {
        return {
            count: Token.INT32_BE.get(buf, off + 0),
            duration: Token.INT32_BE.get(buf, off + 4)
        };
    }
};
/**
 * Time-to-sample('stts') atom.
 * Store duration information for a media’s samples.
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25696
 */
class SttsAtom extends SimpleTableAtom {
    constructor(len) {
        super(len, exports.TimeToSampleToken);
        this.len = len;
    }
}
exports.SttsAtom = SttsAtom;
exports.SampleToChunkToken = {
    len: 12,
    get(buf, off) {
        return {
            firstChunk: Token.INT32_BE.get(buf, off),
            samplesPerChunk: Token.INT32_BE.get(buf, off + 4),
            sampleDescriptionId: Token.INT32_BE.get(buf, off + 8)
        };
    }
};
/**
 * Sample-to-Chunk ('stsc') atom interface
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25706
 */
class StscAtom extends SimpleTableAtom {
    constructor(len) {
        super(len, exports.SampleToChunkToken);
        this.len = len;
    }
}
exports.StscAtom = StscAtom;
/**
 * Sample-size ('stsz') atom
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25710
 */
class StszAtom {
    constructor(len) {
        this.len = len;
    }
    get(buf, off) {
        const nrOfEntries = Token.INT32_BE.get(buf, off + 8);
        return {
            version: Token.INT8.get(buf, off),
            flags: Token.INT24_BE.get(buf, off + 1),
            sampleSize: Token.INT32_BE.get(buf, off + 4),
            numberOfEntries: nrOfEntries,
            entries: readTokenTable(buf, Token.INT32_BE, off + 12, this.len - 12, nrOfEntries)
        };
    }
}
exports.StszAtom = StszAtom;
/**
 * Chunk offset atom, 'stco'
 * Ref: https://developer.apple.com/library/archive/documentation/QuickTime/QTFF/QTFFChap2/qtff2.html#//apple_ref/doc/uid/TP40000939-CH204-25715
 */
class StcoAtom extends SimpleTableAtom {
    constructor(len) {
        super(len, Token.INT32_BE);
        this.len = len;
    }
}
exports.StcoAtom = StcoAtom;
/**
 * Token used to decode text-track from 'mdat' atom (raw data stream)
 */
class ChapterText {
    constructor(len) {
        this.len = len;
    }
    get(buf, off) {
        const titleLen = Token.INT16_BE.get(buf, off + 0);
        const str = new Token.StringType(titleLen, 'utf-8');
        return str.get(buf, off + 2);
    }
}
exports.ChapterText = ChapterText;
function readTokenTable(buf, token, off, remainingLen, numberOfEntries) {
    debug(`remainingLen=${remainingLen}, numberOfEntries=${numberOfEntries} * token-len=${token.len}`);
    if (remainingLen === 0)
        return [];
    if (remainingLen !== numberOfEntries * token.len)
        throw new Error('mismatch number-of-entries with remaining atom-length');
    const entries = [];
    // parse offset-table
    for (let n = 0; n < numberOfEntries; ++n) {
        entries.push(token.get(buf, off));
        off += token.len;
    }
    return entries;
}

}, function(modId) { var map = {"../common/FourCC":1665830430514}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430529, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.MpegParser = void 0;
const Token = require("token-types");
const core_1 = require("strtok3/lib/core");
const debug_1 = require("debug");
const common = require("../common/Util");
const AbstractID3Parser_1 = require("../id3v2/AbstractID3Parser");
const XingTag_1 = require("./XingTag");
const debug = (0, debug_1.default)('music-metadata:parser:mpeg');
/**
 * Cache buffer size used for searching synchronization preabmle
 */
const maxPeekLen = 1024;
/**
 * MPEG-4 Audio definitions
 * Ref:  https://wiki.multimedia.cx/index.php/MPEG-4_Audio
 */
const MPEG4 = {
    /**
     * Audio Object Types
     */
    AudioObjectTypes: [
        'AAC Main',
        'AAC LC',
        'AAC SSR',
        'AAC LTP' // Long Term Prediction
    ],
    /**
     * Sampling Frequencies
     * https://wiki.multimedia.cx/index.php/MPEG-4_Audio#Sampling_Frequencies
     */
    SamplingFrequencies: [
        96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350, undefined, undefined, -1
    ]
    /**
     * Channel Configurations
     */
};
const MPEG4_ChannelConfigurations = [
    undefined,
    ['front-center'],
    ['front-left', 'front-right'],
    ['front-center', 'front-left', 'front-right'],
    ['front-center', 'front-left', 'front-right', 'back-center'],
    ['front-center', 'front-left', 'front-right', 'back-left', 'back-right'],
    ['front-center', 'front-left', 'front-right', 'back-left', 'back-right', 'LFE-channel'],
    ['front-center', 'front-left', 'front-right', 'side-left', 'side-right', 'back-left', 'back-right', 'LFE-channel']
];
/**
 * MPEG Audio Layer I/II/III frame header
 * Ref: https://www.mp3-tech.org/programmer/frame_header.html
 * Bit layout: AAAAAAAA AAABBCCD EEEEFFGH IIJJKLMM
 * Ref: https://wiki.multimedia.cx/index.php/ADTS
 */
class MpegFrameHeader {
    constructor(buf, off) {
        // B(20,19): MPEG Audio versionIndex ID
        this.versionIndex = common.getBitAllignedNumber(buf, off + 1, 3, 2);
        // C(18,17): Layer description
        this.layer = MpegFrameHeader.LayerDescription[common.getBitAllignedNumber(buf, off + 1, 5, 2)];
        if (this.versionIndex > 1 && this.layer === 0) {
            this.parseAdtsHeader(buf, off); // Audio Data Transport Stream (ADTS)
        }
        else {
            this.parseMpegHeader(buf, off); // Conventional MPEG header
        }
        // D(16): Protection bit (if true 16-bit CRC follows header)
        this.isProtectedByCRC = !common.isBitSet(buf, off + 1, 7);
    }
    calcDuration(numFrames) {
        return numFrames * this.calcSamplesPerFrame() / this.samplingRate;
    }
    calcSamplesPerFrame() {
        return MpegFrameHeader.samplesInFrameTable[this.version === 1 ? 0 : 1][this.layer];
    }
    calculateSideInfoLength() {
        if (this.layer !== 3)
            return 2;
        if (this.channelModeIndex === 3) {
            // mono
            if (this.version === 1) {
                return 17;
            }
            else if (this.version === 2 || this.version === 2.5) {
                return 9;
            }
        }
        else {
            if (this.version === 1) {
                return 32;
            }
            else if (this.version === 2 || this.version === 2.5) {
                return 17;
            }
        }
    }
    calcSlotSize() {
        return [null, 4, 1, 1][this.layer];
    }
    parseMpegHeader(buf, off) {
        this.container = 'MPEG';
        // E(15,12): Bitrate index
        this.bitrateIndex = common.getBitAllignedNumber(buf, off + 2, 0, 4);
        // F(11,10): Sampling rate frequency index
        this.sampRateFreqIndex = common.getBitAllignedNumber(buf, off + 2, 4, 2);
        // G(9): Padding bit
        this.padding = common.isBitSet(buf, off + 2, 6);
        // H(8): Private bit
        this.privateBit = common.isBitSet(buf, off + 2, 7);
        // I(7,6): Channel Mode
        this.channelModeIndex = common.getBitAllignedNumber(buf, off + 3, 0, 2);
        // J(5,4): Mode extension (Only used in Joint stereo)
        this.modeExtension = common.getBitAllignedNumber(buf, off + 3, 2, 2);
        // K(3): Copyright
        this.isCopyrighted = common.isBitSet(buf, off + 3, 4);
        // L(2): Original
        this.isOriginalMedia = common.isBitSet(buf, off + 3, 5);
        // M(3): The original bit indicates, if it is set, that the frame is located on its original media.
        this.emphasis = common.getBitAllignedNumber(buf, off + 3, 7, 2);
        this.version = MpegFrameHeader.VersionID[this.versionIndex];
        this.channelMode = MpegFrameHeader.ChannelMode[this.channelModeIndex];
        this.codec = `MPEG ${this.version} Layer ${this.layer}`;
        // Calculate bitrate
        const bitrateInKbps = this.calcBitrate();
        if (!bitrateInKbps) {
            throw new Error('Cannot determine bit-rate');
        }
        this.bitrate = bitrateInKbps * 1000;
        // Calculate sampling rate
        this.samplingRate = this.calcSamplingRate();
        if (this.samplingRate == null) {
            throw new Error('Cannot determine sampling-rate');
        }
    }
    parseAdtsHeader(buf, off) {
        debug(`layer=0 => ADTS`);
        this.version = this.versionIndex === 2 ? 4 : 2;
        this.container = 'ADTS/MPEG-' + this.version;
        const profileIndex = common.getBitAllignedNumber(buf, off + 2, 0, 2);
        this.codec = 'AAC';
        this.codecProfile = MPEG4.AudioObjectTypes[profileIndex];
        debug(`MPEG-4 audio-codec=${this.codec}`);
        const samplingFrequencyIndex = common.getBitAllignedNumber(buf, off + 2, 2, 4);
        this.samplingRate = MPEG4.SamplingFrequencies[samplingFrequencyIndex];
        debug(`sampling-rate=${this.samplingRate}`);
        const channelIndex = common.getBitAllignedNumber(buf, off + 2, 7, 3);
        this.mp4ChannelConfig = MPEG4_ChannelConfigurations[channelIndex];
        debug(`channel-config=${this.mp4ChannelConfig.join('+')}`);
        this.frameLength = common.getBitAllignedNumber(buf, off + 3, 6, 2) << 11;
    }
    calcBitrate() {
        if (this.bitrateIndex === 0x00 || // free
            this.bitrateIndex === 0x0F) { // reserved
            return;
        }
        const codecIndex = `${Math.floor(this.version)}${this.layer}`;
        return MpegFrameHeader.bitrate_index[this.bitrateIndex][codecIndex];
    }
    calcSamplingRate() {
        if (this.sampRateFreqIndex === 0x03)
            return null; // 'reserved'
        return MpegFrameHeader.sampling_rate_freq_index[this.version][this.sampRateFreqIndex];
    }
}
MpegFrameHeader.SyncByte1 = 0xFF;
MpegFrameHeader.SyncByte2 = 0xE0;
MpegFrameHeader.VersionID = [2.5, null, 2, 1];
MpegFrameHeader.LayerDescription = [0, 3, 2, 1];
MpegFrameHeader.ChannelMode = ['stereo', 'joint_stereo', 'dual_channel', 'mono'];
MpegFrameHeader.bitrate_index = {
    0x01: { 11: 32, 12: 32, 13: 32, 21: 32, 22: 8, 23: 8 },
    0x02: { 11: 64, 12: 48, 13: 40, 21: 48, 22: 16, 23: 16 },
    0x03: { 11: 96, 12: 56, 13: 48, 21: 56, 22: 24, 23: 24 },
    0x04: { 11: 128, 12: 64, 13: 56, 21: 64, 22: 32, 23: 32 },
    0x05: { 11: 160, 12: 80, 13: 64, 21: 80, 22: 40, 23: 40 },
    0x06: { 11: 192, 12: 96, 13: 80, 21: 96, 22: 48, 23: 48 },
    0x07: { 11: 224, 12: 112, 13: 96, 21: 112, 22: 56, 23: 56 },
    0x08: { 11: 256, 12: 128, 13: 112, 21: 128, 22: 64, 23: 64 },
    0x09: { 11: 288, 12: 160, 13: 128, 21: 144, 22: 80, 23: 80 },
    0x0A: { 11: 320, 12: 192, 13: 160, 21: 160, 22: 96, 23: 96 },
    0x0B: { 11: 352, 12: 224, 13: 192, 21: 176, 22: 112, 23: 112 },
    0x0C: { 11: 384, 12: 256, 13: 224, 21: 192, 22: 128, 23: 128 },
    0x0D: { 11: 416, 12: 320, 13: 256, 21: 224, 22: 144, 23: 144 },
    0x0E: { 11: 448, 12: 384, 13: 320, 21: 256, 22: 160, 23: 160 }
};
MpegFrameHeader.sampling_rate_freq_index = {
    1: { 0x00: 44100, 0x01: 48000, 0x02: 32000 },
    2: { 0x00: 22050, 0x01: 24000, 0x02: 16000 },
    2.5: { 0x00: 11025, 0x01: 12000, 0x02: 8000 }
};
MpegFrameHeader.samplesInFrameTable = [
    /* Layer   I    II   III */
    [0, 384, 1152, 1152],
    [0, 384, 1152, 576] // MPEG-2(.5
];
/**
 * MPEG Audio Layer I/II/III
 */
const FrameHeader = {
    len: 4,
    get: (buf, off) => {
        return new MpegFrameHeader(buf, off);
    }
};
function getVbrCodecProfile(vbrScale) {
    return 'V' + Math.floor((100 - vbrScale) / 10);
}
class MpegParser extends AbstractID3Parser_1.AbstractID3Parser {
    constructor() {
        super(...arguments);
        this.frameCount = 0;
        this.syncFrameCount = -1;
        this.countSkipFrameData = 0;
        this.totalDataLength = 0;
        this.bitrates = [];
        this.calculateEofDuration = false;
        this.buf_frame_header = Buffer.alloc(4);
        this.syncPeek = {
            buf: Buffer.alloc(maxPeekLen),
            len: 0
        };
    }
    /**
     * Called after ID3 headers have been parsed
     */
    async postId3v2Parse() {
        this.metadata.setFormat('lossless', false);
        try {
            let quit = false;
            while (!quit) {
                await this.sync();
                quit = await this.parseCommonMpegHeader();
            }
        }
        catch (err) {
            if (err instanceof core_1.EndOfStreamError) {
                debug(`End-of-stream`);
                if (this.calculateEofDuration) {
                    const numberOfSamples = this.frameCount * this.samplesPerFrame;
                    this.metadata.setFormat('numberOfSamples', numberOfSamples);
                    const duration = numberOfSamples / this.metadata.format.sampleRate;
                    debug(`Calculate duration at EOF: ${duration} sec.`, duration);
                    this.metadata.setFormat('duration', duration);
                }
            }
            else {
                throw err;
            }
        }
    }
    /**
     * Called after file has been fully parsed, this allows, if present, to exclude the ID3v1.1 header length
     */
    finalize() {
        const format = this.metadata.format;
        const hasID3v1 = this.metadata.native.hasOwnProperty('ID3v1');
        if (format.duration && this.tokenizer.fileInfo.size) {
            const mpegSize = this.tokenizer.fileInfo.size - this.mpegOffset - (hasID3v1 ? 128 : 0);
            if (format.codecProfile && format.codecProfile[0] === 'V') {
                this.metadata.setFormat('bitrate', mpegSize * 8 / format.duration);
            }
        }
        else if (this.tokenizer.fileInfo.size && format.codecProfile === 'CBR') {
            const mpegSize = this.tokenizer.fileInfo.size - this.mpegOffset - (hasID3v1 ? 128 : 0);
            const numberOfSamples = Math.round(mpegSize / this.frame_size) * this.samplesPerFrame;
            this.metadata.setFormat('numberOfSamples', numberOfSamples);
            const duration = numberOfSamples / format.sampleRate;
            debug("Calculate CBR duration based on file size: %s", duration);
            this.metadata.setFormat('duration', duration);
        }
    }
    async sync() {
        let gotFirstSync = false;
        while (true) {
            let bo = 0;
            this.syncPeek.len = await this.tokenizer.peekBuffer(this.syncPeek.buf, { length: maxPeekLen, mayBeLess: true });
            if (this.syncPeek.len <= 163) {
                throw new core_1.EndOfStreamError();
            }
            while (true) {
                if (gotFirstSync && (this.syncPeek.buf[bo] & 0xE0) === 0xE0) {
                    this.buf_frame_header[0] = MpegFrameHeader.SyncByte1;
                    this.buf_frame_header[1] = this.syncPeek.buf[bo];
                    await this.tokenizer.ignore(bo);
                    debug(`Sync at offset=${this.tokenizer.position - 1}, frameCount=${this.frameCount}`);
                    if (this.syncFrameCount === this.frameCount) {
                        debug(`Re-synced MPEG stream, frameCount=${this.frameCount}`);
                        this.frameCount = 0;
                        this.frame_size = 0;
                    }
                    this.syncFrameCount = this.frameCount;
                    return; // sync
                }
                else {
                    gotFirstSync = false;
                    bo = this.syncPeek.buf.indexOf(MpegFrameHeader.SyncByte1, bo);
                    if (bo === -1) {
                        if (this.syncPeek.len < this.syncPeek.buf.length) {
                            throw new core_1.EndOfStreamError();
                        }
                        await this.tokenizer.ignore(this.syncPeek.len);
                        break; // continue with next buffer
                    }
                    else {
                        ++bo;
                        gotFirstSync = true;
                    }
                }
            }
        }
    }
    /**
     * Combined ADTS & MPEG (MP2 & MP3) header handling
     * @return {Promise<boolean>} true if parser should quit
     */
    async parseCommonMpegHeader() {
        if (this.frameCount === 0) {
            this.mpegOffset = this.tokenizer.position - 1;
        }
        await this.tokenizer.peekBuffer(this.buf_frame_header, { offset: 1, length: 3 });
        let header;
        try {
            header = FrameHeader.get(this.buf_frame_header, 0);
        }
        catch (err) {
            await this.tokenizer.ignore(1);
            this.metadata.addWarning('Parse error: ' + err.message);
            return false; // sync
        }
        await this.tokenizer.ignore(3);
        this.metadata.setFormat('container', header.container);
        this.metadata.setFormat('codec', header.codec);
        this.metadata.setFormat('lossless', false);
        this.metadata.setFormat('sampleRate', header.samplingRate);
        this.frameCount++;
        return header.version >= 2 && header.layer === 0 ? this.parseAdts(header) : this.parseAudioFrameHeader(header);
    }
    /**
     * @return {Promise<boolean>} true if parser should quit
     */
    async parseAudioFrameHeader(header) {
        this.metadata.setFormat('numberOfChannels', header.channelMode === 'mono' ? 1 : 2);
        this.metadata.setFormat('bitrate', header.bitrate);
        if (this.frameCount < 20 * 10000) {
            debug('offset=%s MP%s bitrate=%s sample-rate=%s', this.tokenizer.position - 4, header.layer, header.bitrate, header.samplingRate);
        }
        const slot_size = header.calcSlotSize();
        if (slot_size === null) {
            throw new Error('invalid slot_size');
        }
        const samples_per_frame = header.calcSamplesPerFrame();
        debug(`samples_per_frame=${samples_per_frame}`);
        const bps = samples_per_frame / 8.0;
        const fsize = (bps * header.bitrate / header.samplingRate) +
            ((header.padding) ? slot_size : 0);
        this.frame_size = Math.floor(fsize);
        this.audioFrameHeader = header;
        this.bitrates.push(header.bitrate);
        // xtra header only exists in first frame
        if (this.frameCount === 1) {
            this.offset = FrameHeader.len;
            await this.skipSideInformation();
            return false;
        }
        if (this.frameCount === 3) {
            // the stream is CBR if the first 3 frame bitrates are the same
            if (this.areAllSame(this.bitrates)) {
                // Actual calculation will be done in finalize
                this.samplesPerFrame = samples_per_frame;
                this.metadata.setFormat('codecProfile', 'CBR');
                if (this.tokenizer.fileInfo.size)
                    return true; // Will calculate duration based on the file size
            }
            else if (this.metadata.format.duration) {
                return true; // We already got the duration, stop processing MPEG stream any further
            }
            if (!this.options.duration) {
                return true; // Enforce duration not enabled, stop processing entire stream
            }
        }
        // once we know the file is VBR attach listener to end of
        // stream so we can do the duration calculation when we
        // have counted all the frames
        if (this.options.duration && this.frameCount === 4) {
            this.samplesPerFrame = samples_per_frame;
            this.calculateEofDuration = true;
        }
        this.offset = 4;
        if (header.isProtectedByCRC) {
            await this.parseCrc();
            return false;
        }
        else {
            await this.skipSideInformation();
            return false;
        }
    }
    async parseAdts(header) {
        const buf = Buffer.alloc(3);
        await this.tokenizer.readBuffer(buf);
        header.frameLength += common.getBitAllignedNumber(buf, 0, 0, 11);
        this.totalDataLength += header.frameLength;
        this.samplesPerFrame = 1024;
        const framesPerSec = header.samplingRate / this.samplesPerFrame;
        const bytesPerFrame = this.frameCount === 0 ? 0 : this.totalDataLength / this.frameCount;
        const bitrate = 8 * bytesPerFrame * framesPerSec + 0.5;
        this.metadata.setFormat('bitrate', bitrate);
        debug(`frame-count=${this.frameCount}, size=${header.frameLength} bytes, bit-rate=${bitrate}`);
        await this.tokenizer.ignore(header.frameLength > 7 ? header.frameLength - 7 : 1);
        // Consume remaining header and frame data
        if (this.frameCount === 3) {
            this.metadata.setFormat('codecProfile', header.codecProfile);
            if (header.mp4ChannelConfig) {
                this.metadata.setFormat('numberOfChannels', header.mp4ChannelConfig.length);
            }
            if (this.options.duration) {
                this.calculateEofDuration = true;
            }
            else {
                return true; // Stop parsing after the third frame
            }
        }
        return false;
    }
    async parseCrc() {
        this.crc = await this.tokenizer.readNumber(Token.INT16_BE);
        this.offset += 2;
        return this.skipSideInformation();
    }
    async skipSideInformation() {
        const sideinfo_length = this.audioFrameHeader.calculateSideInfoLength();
        // side information
        await this.tokenizer.readToken(new Token.Uint8ArrayType(sideinfo_length));
        this.offset += sideinfo_length;
        await this.readXtraInfoHeader();
        return;
    }
    async readXtraInfoHeader() {
        const headerTag = await this.tokenizer.readToken(XingTag_1.InfoTagHeaderTag);
        this.offset += XingTag_1.InfoTagHeaderTag.len; // 12
        switch (headerTag) {
            case 'Info':
                this.metadata.setFormat('codecProfile', 'CBR');
                return this.readXingInfoHeader();
            case 'Xing':
                const infoTag = await this.readXingInfoHeader();
                const codecProfile = getVbrCodecProfile(infoTag.vbrScale);
                this.metadata.setFormat('codecProfile', codecProfile);
                return null;
            case 'Xtra':
                // ToDo: ???
                break;
            case 'LAME':
                const version = await this.tokenizer.readToken(XingTag_1.LameEncoderVersion);
                if (this.frame_size >= this.offset + XingTag_1.LameEncoderVersion.len) {
                    this.offset += XingTag_1.LameEncoderVersion.len;
                    this.metadata.setFormat('tool', 'LAME ' + version);
                    await this.skipFrameData(this.frame_size - this.offset);
                    return null;
                }
                else {
                    this.metadata.addWarning('Corrupt LAME header');
                    break;
                }
            // ToDo: ???
        }
        // ToDo: promise duration???
        const frameDataLeft = this.frame_size - this.offset;
        if (frameDataLeft < 0) {
            this.metadata.addWarning('Frame ' + this.frameCount + 'corrupt: negative frameDataLeft');
        }
        else {
            await this.skipFrameData(frameDataLeft);
        }
        return null;
    }
    /**
     * Ref: http://gabriel.mp3-tech.org/mp3infotag.html
     * @returns {Promise<string>}
     */
    async readXingInfoHeader() {
        const offset = this.tokenizer.position;
        const infoTag = await (0, XingTag_1.readXingHeader)(this.tokenizer);
        this.offset += this.tokenizer.position - offset;
        if (infoTag.lame) {
            this.metadata.setFormat('tool', 'LAME ' + common.stripNulls(infoTag.lame.version));
            if (infoTag.lame.extended) {
                // this.metadata.setFormat('trackGain', infoTag.lame.extended.track_gain);
                this.metadata.setFormat('trackPeakLevel', infoTag.lame.extended.track_peak);
                if (infoTag.lame.extended.track_gain) {
                    this.metadata.setFormat('trackGain', infoTag.lame.extended.track_gain.adjustment);
                }
                if (infoTag.lame.extended.album_gain) {
                    this.metadata.setFormat('albumGain', infoTag.lame.extended.album_gain.adjustment);
                }
                this.metadata.setFormat('duration', infoTag.lame.extended.music_length / 1000);
            }
        }
        if (infoTag.streamSize) {
            const duration = this.audioFrameHeader.calcDuration(infoTag.numFrames);
            this.metadata.setFormat('duration', duration);
            debug('Get duration from Xing header: %s', this.metadata.format.duration);
            return infoTag;
        }
        // frames field is not present
        const frameDataLeft = this.frame_size - this.offset;
        await this.skipFrameData(frameDataLeft);
        return infoTag;
    }
    async skipFrameData(frameDataLeft) {
        if (frameDataLeft < 0)
            throw new Error('frame-data-left cannot be negative');
        await this.tokenizer.ignore(frameDataLeft);
        this.countSkipFrameData += frameDataLeft;
    }
    areAllSame(array) {
        const first = array[0];
        return array.every(element => {
            return element === first;
        });
    }
}
exports.MpegParser = MpegParser;

}, function(modId) { var map = {"../common/Util":1665830430497,"../id3v2/AbstractID3Parser":1665830430523,"./XingTag":1665830430530}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430530, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.readXingHeader = exports.XingHeaderFlags = exports.LameEncoderVersion = exports.InfoTagHeaderTag = void 0;
const Token = require("token-types");
const util = require("../common/Util");
const ExtendedLameHeader_1 = require("./ExtendedLameHeader");
/**
 * Info Tag: Xing, LAME
 */
exports.InfoTagHeaderTag = new Token.StringType(4, 'ascii');
/**
 * LAME TAG value
 * Did not find any official documentation for this
 * Value e.g.: "3.98.4"
 */
exports.LameEncoderVersion = new Token.StringType(6, 'ascii');
/**
 * Info Tag
 * Ref: http://gabriel.mp3-tech.org/mp3infotag.html
 */
exports.XingHeaderFlags = {
    len: 4,
    get: (buf, off) => {
        return {
            frames: util.isBitSet(buf, off, 31),
            bytes: util.isBitSet(buf, off, 30),
            toc: util.isBitSet(buf, off, 29),
            vbrScale: util.isBitSet(buf, off, 28)
        };
    }
};
// /**
//  * XING Header Tag
//  * Ref: http://gabriel.mp3-tech.org/mp3infotag.html
//  */
async function readXingHeader(tokenizer) {
    const flags = await tokenizer.readToken(exports.XingHeaderFlags);
    const xingInfoTag = {};
    if (flags.frames) {
        xingInfoTag.numFrames = await tokenizer.readToken(Token.UINT32_BE);
    }
    if (flags.bytes) {
        xingInfoTag.streamSize = await tokenizer.readToken(Token.UINT32_BE);
    }
    if (flags.toc) {
        xingInfoTag.toc = Buffer.alloc(100);
        await tokenizer.readBuffer(xingInfoTag.toc);
    }
    if (flags.vbrScale) {
        xingInfoTag.vbrScale = await tokenizer.readToken(Token.UINT32_BE);
    }
    const lameTag = await tokenizer.peekToken(new Token.StringType(4, 'ascii'));
    if (lameTag === 'LAME') {
        await tokenizer.ignore(4);
        xingInfoTag.lame = {
            version: await tokenizer.readToken(new Token.StringType(5, 'ascii'))
        };
        const match = xingInfoTag.lame.version.match(/\d+.\d+/g);
        if (match) {
            const majorMinorVersion = xingInfoTag.lame.version.match(/\d+.\d+/g)[0]; // e.g. 3.97
            const version = majorMinorVersion.split('.').map(n => parseInt(n, 10));
            if (version[0] >= 3 && version[1] >= 90) {
                xingInfoTag.lame.extended = await tokenizer.readToken(ExtendedLameHeader_1.ExtendedLameHeader);
            }
        }
    }
    return xingInfoTag;
}
exports.readXingHeader = readXingHeader;

}, function(modId) { var map = {"../common/Util":1665830430497,"./ExtendedLameHeader":1665830430531}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430531, function(require, module, exports) {

/**
 * Extended Lame Header
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtendedLameHeader = void 0;
const Token = require("token-types");
const common = require("../common/Util");
const ReplayGainDataFormat_1 = require("./ReplayGainDataFormat");
/**
 * Info Tag
 * @link http://gabriel.mp3-tech.org/mp3infotag.html
 * @link https://github.com/quodlibet/mutagen/blob/abd58ee58772224334a18817c3fb31103572f70e/mutagen/mp3/_util.py#L112
 */
exports.ExtendedLameHeader = {
    len: 27,
    get: (buf, off) => {
        const track_peak = Token.UINT32_BE.get(buf, off + 2);
        return {
            revision: common.getBitAllignedNumber(buf, off, 0, 4),
            vbr_method: common.getBitAllignedNumber(buf, off, 4, 4),
            lowpass_filter: 100 * Token.UINT8.get(buf, off + 1),
            track_peak: track_peak === 0 ? undefined : track_peak / Math.pow(2, 23),
            track_gain: ReplayGainDataFormat_1.ReplayGain.get(buf, 6),
            album_gain: ReplayGainDataFormat_1.ReplayGain.get(buf, 8),
            music_length: Token.UINT32_BE.get(buf, off + 20),
            music_crc: Token.UINT8.get(buf, off + 24),
            header_crc: Token.UINT16_BE.get(buf, off + 24)
        };
    }
};

}, function(modId) { var map = {"../common/Util":1665830430497,"./ReplayGainDataFormat":1665830430532}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430532, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayGain = void 0;
const common = require("../common/Util");
/**
 * https://github.com/Borewit/music-metadata/wiki/Replay-Gain-Data-Format#name-code
 */
var NameCode;
(function (NameCode) {
    /**
     * not set
     */
    NameCode[NameCode["not_set"] = 0] = "not_set";
    /**
     * Radio Gain Adjustment
     */
    NameCode[NameCode["radio"] = 1] = "radio";
    /**
     * Audiophile Gain Adjustment
     */
    NameCode[NameCode["audiophile"] = 2] = "audiophile";
})(NameCode || (NameCode = {}));
/**
 * https://github.com/Borewit/music-metadata/wiki/Replay-Gain-Data-Format#originator-code
 */
var ReplayGainOriginator;
(function (ReplayGainOriginator) {
    /**
     * Replay Gain unspecified
     */
    ReplayGainOriginator[ReplayGainOriginator["unspecified"] = 0] = "unspecified";
    /**
     * Replay Gain pre-set by artist/producer/mastering engineer
     */
    ReplayGainOriginator[ReplayGainOriginator["engineer"] = 1] = "engineer";
    /**
     * Replay Gain set by user
     */
    ReplayGainOriginator[ReplayGainOriginator["user"] = 2] = "user";
    /**
     * Replay Gain determined automatically, as described on this site
     */
    ReplayGainOriginator[ReplayGainOriginator["automatic"] = 3] = "automatic";
    /**
     * Set by simple RMS average
     */
    ReplayGainOriginator[ReplayGainOriginator["rms_average"] = 4] = "rms_average";
})(ReplayGainOriginator || (ReplayGainOriginator = {}));
/**
 * Replay Gain Data Format
 *
 * https://github.com/Borewit/music-metadata/wiki/Replay-Gain-Data-Format
 */
exports.ReplayGain = {
    len: 2,
    get: (buf, off) => {
        const gain_type = common.getBitAllignedNumber(buf, off, 0, 3);
        const sign = common.getBitAllignedNumber(buf, off, 6, 1);
        const gain_adj = common.getBitAllignedNumber(buf, off, 7, 9) / 10.0;
        if (gain_type > 0) {
            return {
                type: common.getBitAllignedNumber(buf, off, 0, 3),
                origin: common.getBitAllignedNumber(buf, off, 3, 3),
                adjustment: (sign ? -gain_adj : gain_adj)
            };
        }
        return undefined;
    }
};

}, function(modId) { var map = {"../common/Util":1665830430497}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430533, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = require("debug");
const Token = require("token-types");
const AbstractID3Parser_1 = require("../id3v2/AbstractID3Parser");
const MpcSv8Parser_1 = require("./sv8/MpcSv8Parser");
const MpcSv7Parser_1 = require("./sv7/MpcSv7Parser");
const debug = (0, debug_1.default)('music-metadata:parser:musepack');
class MusepackParser extends AbstractID3Parser_1.AbstractID3Parser {
    async postId3v2Parse() {
        const signature = await this.tokenizer.peekToken(new Token.StringType(3, 'binary'));
        let mpcParser;
        switch (signature) {
            case 'MP+': {
                debug('Musepack stream-version 7');
                mpcParser = new MpcSv7Parser_1.MpcSv7Parser();
                break;
            }
            case 'MPC': {
                debug('Musepack stream-version 8');
                mpcParser = new MpcSv8Parser_1.MpcSv8Parser();
                break;
            }
            default: {
                throw new Error('Invalid Musepack signature prefix');
            }
        }
        mpcParser.init(this.metadata, this.tokenizer, this.options);
        return mpcParser.parse();
    }
}
exports.default = MusepackParser;

}, function(modId) { var map = {"../id3v2/AbstractID3Parser":1665830430523,"./sv8/MpcSv8Parser":1665830430534,"./sv7/MpcSv7Parser":1665830430536}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430534, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.MpcSv8Parser = void 0;
const debug_1 = require("debug");
const BasicParser_1 = require("../../common/BasicParser");
const APEv2Parser_1 = require("../../apev2/APEv2Parser");
const FourCC_1 = require("../../common/FourCC");
const SV8 = require("./StreamVersion8");
const debug = (0, debug_1.default)('music-metadata:parser:musepack');
class MpcSv8Parser extends BasicParser_1.BasicParser {
    constructor() {
        super(...arguments);
        this.audioLength = 0;
    }
    async parse() {
        const signature = await this.tokenizer.readToken(FourCC_1.FourCcToken);
        if (signature !== 'MPCK')
            throw new Error('Invalid Magic number');
        this.metadata.setFormat('container', 'Musepack, SV8');
        return this.parsePacket();
    }
    async parsePacket() {
        const sv8reader = new SV8.StreamReader(this.tokenizer);
        do {
            const header = await sv8reader.readPacketHeader();
            debug(`packet-header key=${header.key}, payloadLength=${header.payloadLength}`);
            switch (header.key) {
                case 'SH': // Stream Header
                    const sh = await sv8reader.readStreamHeader(header.payloadLength);
                    this.metadata.setFormat('numberOfSamples', sh.sampleCount);
                    this.metadata.setFormat('sampleRate', sh.sampleFrequency);
                    this.metadata.setFormat('duration', sh.sampleCount / sh.sampleFrequency);
                    this.metadata.setFormat('numberOfChannels', sh.channelCount);
                    break;
                case 'AP': // Audio Packet
                    this.audioLength += header.payloadLength;
                    await this.tokenizer.ignore(header.payloadLength);
                    break;
                case 'RG': // Replaygain
                case 'EI': // Encoder Info
                case 'SO': // Seek Table Offset
                case 'ST': // Seek Table
                case 'CT': // Chapter-Tag
                    await this.tokenizer.ignore(header.payloadLength);
                    break;
                case 'SE': // Stream End
                    this.metadata.setFormat('bitrate', this.audioLength * 8 / this.metadata.format.duration);
                    return APEv2Parser_1.APEv2Parser.tryParseApeHeader(this.metadata, this.tokenizer, this.options);
                default:
                    throw new Error(`Unexpected header: ${header.key}`);
            }
        } while (true);
    }
}
exports.MpcSv8Parser = MpcSv8Parser;

}, function(modId) { var map = {"../../common/BasicParser":1665830430511,"../../apev2/APEv2Parser":1665830430512,"../../common/FourCC":1665830430514,"./StreamVersion8":1665830430535}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430535, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamReader = void 0;
const Token = require("token-types");
const debug_1 = require("debug");
const util = require("../../common/Util");
const debug = (0, debug_1.default)('music-metadata:parser:musepack:sv8');
const PacketKey = new Token.StringType(2, 'binary');
/**
 * Stream Header Packet part 1
 * Ref: http://trac.musepack.net/musepack/wiki/SV8Specification#StreamHeaderPacket
 */
const SH_part1 = {
    len: 5,
    get: (buf, off) => {
        return {
            crc: Token.UINT32_LE.get(buf, off),
            streamVersion: Token.UINT8.get(buf, off + 4)
        };
    }
};
/**
 * Stream Header Packet part 3
 * Ref: http://trac.musepack.net/musepack/wiki/SV8Specification#StreamHeaderPacket
 */
const SH_part3 = {
    len: 2,
    get: (buf, off) => {
        return {
            sampleFrequency: [44100, 48000, 37800, 32000][util.getBitAllignedNumber(buf, off, 0, 3)],
            maxUsedBands: util.getBitAllignedNumber(buf, off, 3, 5),
            channelCount: util.getBitAllignedNumber(buf, off + 1, 0, 4) + 1,
            msUsed: util.isBitSet(buf, off + 1, 4),
            audioBlockFrames: util.getBitAllignedNumber(buf, off + 1, 5, 3)
        };
    }
};
class StreamReader {
    constructor(tokenizer) {
        this.tokenizer = tokenizer;
    }
    async readPacketHeader() {
        const key = await this.tokenizer.readToken(PacketKey);
        const size = await this.readVariableSizeField();
        return {
            key,
            payloadLength: size.value - 2 - size.len
        };
    }
    async readStreamHeader(size) {
        const streamHeader = {};
        debug(`Reading SH at offset=${this.tokenizer.position}`);
        const part1 = await this.tokenizer.readToken(SH_part1);
        size -= SH_part1.len;
        Object.assign(streamHeader, part1);
        debug(`SH.streamVersion = ${part1.streamVersion}`);
        const sampleCount = await this.readVariableSizeField();
        size -= sampleCount.len;
        streamHeader.sampleCount = sampleCount.value;
        const bs = await this.readVariableSizeField();
        size -= bs.len;
        streamHeader.beginningOfSilence = bs.value;
        const part3 = await this.tokenizer.readToken(SH_part3);
        size -= SH_part3.len;
        Object.assign(streamHeader, part3);
        // assert.equal(size, 0);
        await this.tokenizer.ignore(size);
        return streamHeader;
    }
    async readVariableSizeField(len = 1, hb = 0) {
        let n = await this.tokenizer.readNumber(Token.UINT8);
        if ((n & 0x80) === 0) {
            return { len, value: hb + n };
        }
        n &= 0x7F;
        n += hb;
        return this.readVariableSizeField(len + 1, n << 7);
    }
}
exports.StreamReader = StreamReader;

}, function(modId) { var map = {"../../common/Util":1665830430497}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430536, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.MpcSv7Parser = void 0;
const debug_1 = require("debug");
const BasicParser_1 = require("../../common/BasicParser");
const APEv2Parser_1 = require("../../apev2/APEv2Parser");
const BitReader_1 = require("./BitReader");
const SV7 = require("./StreamVersion7");
const debug = (0, debug_1.default)('music-metadata:parser:musepack');
class MpcSv7Parser extends BasicParser_1.BasicParser {
    constructor() {
        super(...arguments);
        this.audioLength = 0;
    }
    async parse() {
        const header = await this.tokenizer.readToken(SV7.Header);
        if (header.signature !== 'MP+')
            throw new Error('Unexpected magic number');
        debug(`stream-version=${header.streamMajorVersion}.${header.streamMinorVersion}`);
        this.metadata.setFormat('container', 'Musepack, SV7');
        this.metadata.setFormat('sampleRate', header.sampleFrequency);
        const numberOfSamples = 1152 * (header.frameCount - 1) + header.lastFrameLength;
        this.metadata.setFormat('numberOfSamples', numberOfSamples);
        this.duration = numberOfSamples / header.sampleFrequency;
        this.metadata.setFormat('duration', this.duration);
        this.bitreader = new BitReader_1.BitReader(this.tokenizer);
        this.metadata.setFormat('numberOfChannels', header.midSideStereo || header.intensityStereo ? 2 : 1);
        const version = await this.bitreader.read(8);
        this.metadata.setFormat('codec', (version / 100).toFixed(2));
        await this.skipAudioData(header.frameCount);
        debug(`End of audio stream, switching to APEv2, offset=${this.tokenizer.position}`);
        return APEv2Parser_1.APEv2Parser.tryParseApeHeader(this.metadata, this.tokenizer, this.options);
    }
    async skipAudioData(frameCount) {
        while (frameCount-- > 0) {
            const frameLength = await this.bitreader.read(20);
            this.audioLength += 20 + frameLength;
            await this.bitreader.ignore(frameLength);
        }
        // last frame
        const lastFrameLength = await this.bitreader.read(11);
        this.audioLength += lastFrameLength;
        this.metadata.setFormat('bitrate', this.audioLength / this.duration);
    }
}
exports.MpcSv7Parser = MpcSv7Parser;

}, function(modId) { var map = {"../../common/BasicParser":1665830430511,"../../apev2/APEv2Parser":1665830430512,"./BitReader":1665830430537,"./StreamVersion7":1665830430538}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430537, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.BitReader = void 0;
const Token = require("token-types");
class BitReader {
    constructor(tokenizer) {
        this.tokenizer = tokenizer;
        this.pos = 0;
        this.dword = undefined;
    }
    /**
     *
     * @param bits 1..30 bits
     */
    async read(bits) {
        while (this.dword === undefined) {
            this.dword = await this.tokenizer.readToken(Token.UINT32_LE);
        }
        let out = this.dword;
        this.pos += bits;
        if (this.pos < 32) {
            out >>>= (32 - this.pos);
            return out & ((1 << bits) - 1);
        }
        else {
            this.pos -= 32;
            if (this.pos === 0) {
                this.dword = undefined;
                return out & ((1 << bits) - 1);
            }
            else {
                this.dword = await this.tokenizer.readToken(Token.UINT32_LE);
                if (this.pos) {
                    out <<= this.pos;
                    out |= this.dword >>> (32 - this.pos);
                }
                return out & ((1 << bits) - 1);
            }
        }
    }
    async ignore(bits) {
        if (this.pos > 0) {
            const remaining = 32 - this.pos;
            this.dword = undefined;
            bits -= remaining;
            this.pos = 0;
        }
        const remainder = bits % 32;
        const numOfWords = (bits - remainder) / 32;
        await this.tokenizer.ignore(numOfWords * 4);
        return this.read(remainder);
    }
}
exports.BitReader = BitReader;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430538, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.Header = void 0;
const Token = require("token-types");
const util = require("../../common/Util");
/**
 * BASIC STRUCTURE
 */
exports.Header = {
    len: 6 * 4,
    get: (buf, off) => {
        const header = {
            // word 0
            signature: Buffer.from(buf).toString('latin1', off, off + 3),
            // versionIndex number * 1000 (3.81 = 3810) (remember that 4-byte alignment causes this to take 4-bytes)
            streamMinorVersion: util.getBitAllignedNumber(buf, off + 3, 0, 4),
            streamMajorVersion: util.getBitAllignedNumber(buf, off + 3, 4, 4),
            // word 1
            frameCount: Token.UINT32_LE.get(buf, off + 4),
            // word 2
            maxLevel: Token.UINT16_LE.get(buf, off + 8),
            sampleFrequency: [44100, 48000, 37800, 32000][util.getBitAllignedNumber(buf, off + 10, 0, 2)],
            link: util.getBitAllignedNumber(buf, off + 10, 2, 2),
            profile: util.getBitAllignedNumber(buf, off + 10, 4, 4),
            maxBand: util.getBitAllignedNumber(buf, off + 11, 0, 6),
            intensityStereo: util.isBitSet(buf, off + 11, 6),
            midSideStereo: util.isBitSet(buf, off + 11, 7),
            // word 3
            titlePeak: Token.UINT16_LE.get(buf, off + 12),
            titleGain: Token.UINT16_LE.get(buf, off + 14),
            // word 4
            albumPeak: Token.UINT16_LE.get(buf, off + 16),
            albumGain: Token.UINT16_LE.get(buf, off + 18),
            // word
            lastFrameLength: (Token.UINT32_LE.get(buf, off + 20) >>> 20) & 0x7FF,
            trueGapless: util.isBitSet(buf, off + 23, 0)
        };
        header.lastFrameLength = header.trueGapless ? (Token.UINT32_LE.get(buf, 20) >>> 20) & 0x7FF : 0;
        return header;
    }
};

}, function(modId) { var map = {"../../common/Util":1665830430497}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430539, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.OggParser = exports.SegmentTable = void 0;
const Token = require("token-types");
const core_1 = require("strtok3/lib/core");
const debug_1 = require("debug");
const util = require("../common/Util");
const FourCC_1 = require("../common/FourCC");
const BasicParser_1 = require("../common/BasicParser");
const VorbisParser_1 = require("./vorbis/VorbisParser");
const OpusParser_1 = require("./opus/OpusParser");
const SpeexParser_1 = require("./speex/SpeexParser");
const TheoraParser_1 = require("./theora/TheoraParser");
const debug = (0, debug_1.default)('music-metadata:parser:ogg');
class SegmentTable {
    constructor(header) {
        this.len = header.page_segments;
    }
    static sum(buf, off, len) {
        let s = 0;
        for (let i = off; i < off + len; ++i) {
            s += buf[i];
        }
        return s;
    }
    get(buf, off) {
        return {
            totalPageSize: SegmentTable.sum(buf, off, this.len)
        };
    }
}
exports.SegmentTable = SegmentTable;
/**
 * Parser for Ogg logical bitstream framing
 */
class OggParser extends BasicParser_1.BasicParser {
    /**
     * Parse page
     * @returns {Promise<void>}
     */
    async parse() {
        debug('pos=%s, parsePage()', this.tokenizer.position);
        try {
            let header;
            do {
                header = await this.tokenizer.readToken(OggParser.Header);
                if (header.capturePattern !== 'OggS')
                    throw new Error('Invalid Ogg capture pattern');
                this.metadata.setFormat('container', 'Ogg');
                this.header = header;
                this.pageNumber = header.pageSequenceNo;
                debug('page#=%s, Ogg.id=%s', header.pageSequenceNo, header.capturePattern);
                const segmentTable = await this.tokenizer.readToken(new SegmentTable(header));
                debug('totalPageSize=%s', segmentTable.totalPageSize);
                const pageData = await this.tokenizer.readToken(new Token.Uint8ArrayType(segmentTable.totalPageSize));
                debug('firstPage=%s, lastPage=%s, continued=%s', header.headerType.firstPage, header.headerType.lastPage, header.headerType.continued);
                if (header.headerType.firstPage) {
                    const id = new Token.StringType(7, 'ascii').get(Buffer.from(pageData), 0);
                    switch (id) {
                        case '\x01vorbis': // Ogg/Vorbis
                            debug('Set page consumer to Ogg/Vorbis');
                            this.pageConsumer = new VorbisParser_1.VorbisParser(this.metadata, this.options);
                            break;
                        case 'OpusHea': // Ogg/Opus
                            debug('Set page consumer to Ogg/Opus');
                            this.pageConsumer = new OpusParser_1.OpusParser(this.metadata, this.options, this.tokenizer);
                            break;
                        case 'Speex  ': // Ogg/Speex
                            debug('Set page consumer to Ogg/Speex');
                            this.pageConsumer = new SpeexParser_1.SpeexParser(this.metadata, this.options, this.tokenizer);
                            break;
                        case 'fishead':
                        case '\x00theora': // Ogg/Theora
                            debug('Set page consumer to Ogg/Theora');
                            this.pageConsumer = new TheoraParser_1.TheoraParser(this.metadata, this.options, this.tokenizer);
                            break;
                        default:
                            throw new Error('gg audio-codec not recognized (id=' + id + ')');
                    }
                }
                this.pageConsumer.parsePage(header, pageData);
            } while (!header.headerType.lastPage);
        }
        catch (err) {
            if (err instanceof core_1.EndOfStreamError) {
                this.metadata.addWarning('Last OGG-page is not marked with last-page flag');
                debug(`End-of-stream`);
                this.metadata.addWarning('Last OGG-page is not marked with last-page flag');
                if (this.header) {
                    this.pageConsumer.calculateDuration(this.header);
                }
            }
            else if (err.message.startsWith('FourCC')) {
                if (this.pageNumber > 0) {
                    // ignore this error: work-around if last OGG-page is not marked with last-page flag
                    this.metadata.addWarning('Invalid FourCC ID, maybe last OGG-page is not marked with last-page flag');
                    this.pageConsumer.flush();
                }
            }
            else {
                throw err;
            }
        }
    }
}
exports.OggParser = OggParser;
OggParser.Header = {
    len: 27,
    get: (buf, off) => {
        return {
            capturePattern: FourCC_1.FourCcToken.get(buf, off),
            version: Token.UINT8.get(buf, off + 4),
            headerType: {
                continued: util.getBit(buf, off + 5, 0),
                firstPage: util.getBit(buf, off + 5, 1),
                lastPage: util.getBit(buf, off + 5, 2)
            },
            // packet_flag: buf.readUInt8(off + 5),
            absoluteGranulePosition: Number(Token.UINT64_LE.get(buf, off + 6)),
            streamSerialNumber: Token.UINT32_LE.get(buf, off + 14),
            pageSequenceNo: Token.UINT32_LE.get(buf, off + 18),
            pageChecksum: Token.UINT32_LE.get(buf, off + 22),
            page_segments: Token.UINT8.get(buf, off + 26)
        };
    }
};

}, function(modId) { var map = {"../common/Util":1665830430497,"../common/FourCC":1665830430514,"../common/BasicParser":1665830430511,"./vorbis/VorbisParser":1665830430524,"./opus/OpusParser":1665830430540,"./speex/SpeexParser":1665830430542,"./theora/TheoraParser":1665830430544}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430540, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.OpusParser = void 0;
const Token = require("token-types");
const VorbisParser_1 = require("../vorbis/VorbisParser");
const Opus = require("./Opus");
/**
 * Opus parser
 * Internet Engineering Task Force (IETF) - RFC 6716
 * Used by OggParser
 */
class OpusParser extends VorbisParser_1.VorbisParser {
    constructor(metadata, options, tokenizer) {
        super(metadata, options);
        this.tokenizer = tokenizer;
        this.lastPos = -1;
    }
    /**
     * Parse first Opus Ogg page
     * @param {IPageHeader} header
     * @param {Buffer} pageData
     */
    parseFirstPage(header, pageData) {
        this.metadata.setFormat('codec', 'Opus');
        // Parse Opus ID Header
        this.idHeader = new Opus.IdHeader(pageData.length).get(pageData, 0);
        if (this.idHeader.magicSignature !== "OpusHead")
            throw new Error("Illegal ogg/Opus magic-signature");
        this.metadata.setFormat('sampleRate', this.idHeader.inputSampleRate);
        this.metadata.setFormat('numberOfChannels', this.idHeader.channelCount);
    }
    parseFullPage(pageData) {
        const magicSignature = new Token.StringType(8, 'ascii').get(pageData, 0);
        switch (magicSignature) {
            case 'OpusTags':
                this.parseUserCommentList(pageData, 8);
                this.lastPos = this.tokenizer.position - pageData.length;
                break;
            default:
                break;
        }
    }
    calculateDuration(header) {
        if (this.metadata.format.sampleRate && header.absoluteGranulePosition >= 0) {
            // Calculate duration
            const pos_48bit = header.absoluteGranulePosition - this.idHeader.preSkip;
            this.metadata.setFormat('numberOfSamples', pos_48bit);
            this.metadata.setFormat('duration', pos_48bit / 48000);
            if (this.lastPos !== -1 && this.tokenizer.fileInfo.size && this.metadata.format.duration) {
                const dataSize = this.tokenizer.fileInfo.size - this.lastPos;
                this.metadata.setFormat('bitrate', 8 * dataSize / this.metadata.format.duration);
            }
        }
    }
}
exports.OpusParser = OpusParser;

}, function(modId) { var map = {"../vorbis/VorbisParser":1665830430524,"./Opus":1665830430541}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430541, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.IdHeader = void 0;
const Token = require("token-types");
/**
 * Opus ID Header parser
 * Ref: https://wiki.xiph.org/OggOpus#ID_Header
 */
class IdHeader {
    constructor(len) {
        this.len = len;
        if (len < 19) {
            throw new Error("ID-header-page 0 should be at least 19 bytes long");
        }
    }
    get(buf, off) {
        return {
            magicSignature: new Token.StringType(8, 'ascii').get(buf, off + 0),
            version: buf.readUInt8(off + 8),
            channelCount: buf.readUInt8(off + 9),
            preSkip: buf.readInt16LE(off + 10),
            inputSampleRate: buf.readInt32LE(off + 12),
            outputGain: buf.readInt16LE(off + 16),
            channelMapping: buf.readUInt8(off + 18)
        };
    }
}
exports.IdHeader = IdHeader;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430542, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeexParser = void 0;
const debug_1 = require("debug");
const VorbisParser_1 = require("../vorbis/VorbisParser");
const Speex = require("./Speex");
const debug = (0, debug_1.default)('music-metadata:parser:ogg:speex');
/**
 * Speex, RFC 5574
 * Ref:
 * - https://www.speex.org/docs/manual/speex-manual/
 * - https://tools.ietf.org/html/rfc5574
 */
class SpeexParser extends VorbisParser_1.VorbisParser {
    constructor(metadata, options, tokenizer) {
        super(metadata, options);
        this.tokenizer = tokenizer;
    }
    /**
     * Parse first Speex Ogg page
     * @param {IPageHeader} header
     * @param {Buffer} pageData
     */
    parseFirstPage(header, pageData) {
        debug('First Ogg/Speex page');
        const speexHeader = Speex.Header.get(pageData, 0);
        this.metadata.setFormat('codec', `Speex ${speexHeader.version}`);
        this.metadata.setFormat('numberOfChannels', speexHeader.nb_channels);
        this.metadata.setFormat('sampleRate', speexHeader.rate);
        if (speexHeader.bitrate !== -1) {
            this.metadata.setFormat('bitrate', speexHeader.bitrate);
        }
    }
}
exports.SpeexParser = SpeexParser;

}, function(modId) { var map = {"../vorbis/VorbisParser":1665830430524,"./Speex":1665830430543}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430543, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.Header = void 0;
const Token = require("token-types");
const util = require("../../common/Util");
/**
 * Speex Header Packet
 * Ref: https://www.speex.org/docs/manual/speex-manual/node8.html#SECTION00830000000000000000
 */
exports.Header = {
    len: 80,
    get: (buf, off) => {
        return {
            speex: new Token.StringType(8, 'ascii').get(buf, off + 0),
            version: util.trimRightNull(new Token.StringType(20, 'ascii').get(buf, off + 8)),
            version_id: buf.readInt32LE(off + 28),
            header_size: buf.readInt32LE(off + 32),
            rate: buf.readInt32LE(off + 36),
            mode: buf.readInt32LE(off + 40),
            mode_bitstream_version: buf.readInt32LE(off + 44),
            nb_channels: buf.readInt32LE(off + 48),
            bitrate: buf.readInt32LE(off + 52),
            frame_size: buf.readInt32LE(off + 56),
            vbr: buf.readInt32LE(off + 60),
            frames_per_packet: buf.readInt32LE(off + 64),
            extra_headers: buf.readInt32LE(off + 68),
            reserved1: buf.readInt32LE(off + 72),
            reserved2: buf.readInt32LE(off + 76)
        };
    }
};

}, function(modId) { var map = {"../../common/Util":1665830430497}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430544, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.TheoraParser = void 0;
const debug_1 = require("debug");
const Theora_1 = require("./Theora");
const debug = (0, debug_1.default)('music-metadata:parser:ogg:theora');
/**
 * Ref:
 * - https://theora.org/doc/Theora.pdf
 */
class TheoraParser {
    constructor(metadata, options, tokenizer) {
        this.metadata = metadata;
        this.tokenizer = tokenizer;
    }
    /**
     * Vorbis 1 parser
     * @param header Ogg Page Header
     * @param pageData Page data
     */
    parsePage(header, pageData) {
        if (header.headerType.firstPage) {
            this.parseFirstPage(header, pageData);
        }
    }
    flush() {
        debug('flush');
    }
    calculateDuration(header) {
        debug('duration calculation not implemented');
    }
    /**
     * Parse first Theora Ogg page. the initial identification header packet
     * @param {IPageHeader} header
     * @param {Buffer} pageData
     */
    parseFirstPage(header, pageData) {
        debug('First Ogg/Theora page');
        this.metadata.setFormat('codec', 'Theora');
        const idHeader = Theora_1.IdentificationHeader.get(pageData, 0);
        this.metadata.setFormat('bitrate', idHeader.nombr);
    }
}
exports.TheoraParser = TheoraParser;

}, function(modId) { var map = {"./Theora":1665830430545}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430545, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentificationHeader = void 0;
const Token = require("token-types");
/**
 * 6.2 Identification Header
 * Ref: https://theora.org/doc/Theora.pdf: 6.2 Identification Header Decode
 */
exports.IdentificationHeader = {
    len: 42,
    get: (buf, off) => {
        return {
            id: new Token.StringType(7, 'ascii').get(buf, off),
            vmaj: buf.readUInt8(off + 7),
            vmin: buf.readUInt8(off + 8),
            vrev: buf.readUInt8(off + 9),
            vmbw: buf.readUInt16BE(off + 10),
            vmbh: buf.readUInt16BE(off + 17),
            nombr: Token.UINT24_BE.get(buf, off + 37),
            nqual: buf.readUInt8(off + 40)
        };
    }
};

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430546, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.WaveParser = void 0;
const strtok3 = require("strtok3/lib/core");
const Token = require("token-types");
const debug_1 = require("debug");
const riff = require("../riff/RiffChunk");
const WaveChunk = require("./../wav/WaveChunk");
const ID3v2Parser_1 = require("../id3v2/ID3v2Parser");
const util = require("../common/Util");
const FourCC_1 = require("../common/FourCC");
const BasicParser_1 = require("../common/BasicParser");
const BwfChunk_1 = require("../wav/BwfChunk");
const debug = (0, debug_1.default)('music-metadata:parser:RIFF');
/**
 * Resource Interchange File Format (RIFF) Parser
 *
 * WAVE PCM soundfile format
 *
 * Ref:
 * - http://www.johnloomis.org/cpe102/asgn/asgn1/riff.html
 * - http://soundfile.sapp.org/doc/WaveFormat
 *
 * ToDo: Split WAVE part from RIFF parser
 */
class WaveParser extends BasicParser_1.BasicParser {
    async parse() {
        const riffHeader = await this.tokenizer.readToken(riff.Header);
        debug(`pos=${this.tokenizer.position}, parse: chunkID=${riffHeader.chunkID}`);
        if (riffHeader.chunkID !== 'RIFF')
            return; // Not RIFF format
        return this.parseRiffChunk(riffHeader.chunkSize).catch(err => {
            if (!(err instanceof strtok3.EndOfStreamError)) {
                throw err;
            }
        });
    }
    async parseRiffChunk(chunkSize) {
        const type = await this.tokenizer.readToken(FourCC_1.FourCcToken);
        this.metadata.setFormat('container', type);
        switch (type) {
            case 'WAVE':
                return this.readWaveChunk(chunkSize - FourCC_1.FourCcToken.len);
            default:
                throw new Error(`Unsupported RIFF format: RIFF/${type}`);
        }
    }
    async readWaveChunk(remaining) {
        while (remaining >= riff.Header.len) {
            const header = await this.tokenizer.readToken(riff.Header);
            remaining -= riff.Header.len + header.chunkSize;
            if (header.chunkSize > remaining) {
                this.metadata.addWarning('Data chunk size exceeds file size');
            }
            this.header = header;
            debug(`pos=${this.tokenizer.position}, readChunk: chunkID=RIFF/WAVE/${header.chunkID}`);
            switch (header.chunkID) {
                case 'LIST':
                    await this.parseListTag(header);
                    break;
                case 'fact': // extended Format chunk,
                    this.metadata.setFormat('lossless', false);
                    this.fact = await this.tokenizer.readToken(new WaveChunk.FactChunk(header));
                    break;
                case 'fmt ': // The Util Chunk, non-PCM Formats
                    const fmt = await this.tokenizer.readToken(new WaveChunk.Format(header));
                    let subFormat = WaveChunk.WaveFormat[fmt.wFormatTag];
                    if (!subFormat) {
                        debug('WAVE/non-PCM format=' + fmt.wFormatTag);
                        subFormat = 'non-PCM (' + fmt.wFormatTag + ')';
                    }
                    this.metadata.setFormat('codec', subFormat);
                    this.metadata.setFormat('bitsPerSample', fmt.wBitsPerSample);
                    this.metadata.setFormat('sampleRate', fmt.nSamplesPerSec);
                    this.metadata.setFormat('numberOfChannels', fmt.nChannels);
                    this.metadata.setFormat('bitrate', fmt.nBlockAlign * fmt.nSamplesPerSec * 8);
                    this.blockAlign = fmt.nBlockAlign;
                    break;
                case 'id3 ': // The way Picard, FooBar currently stores, ID3 meta-data
                case 'ID3 ': // The way Mp3Tags stores ID3 meta-data
                    const id3_data = await this.tokenizer.readToken(new Token.Uint8ArrayType(header.chunkSize));
                    const rst = strtok3.fromBuffer(id3_data);
                    await new ID3v2Parser_1.ID3v2Parser().parse(this.metadata, rst, this.options);
                    break;
                case 'data': // PCM-data
                    if (this.metadata.format.lossless !== false) {
                        this.metadata.setFormat('lossless', true);
                    }
                    let chunkSize = header.chunkSize;
                    if (this.tokenizer.fileInfo.size) {
                        const calcRemaining = this.tokenizer.fileInfo.size - this.tokenizer.position;
                        if (calcRemaining < chunkSize) {
                            this.metadata.addWarning('data chunk length exceeding file length');
                            chunkSize = calcRemaining;
                        }
                    }
                    const numberOfSamples = this.fact ? this.fact.dwSampleLength : (chunkSize === 0xffffffff ? undefined : chunkSize / this.blockAlign);
                    if (numberOfSamples) {
                        this.metadata.setFormat('numberOfSamples', numberOfSamples);
                        this.metadata.setFormat('duration', numberOfSamples / this.metadata.format.sampleRate);
                    }
                    this.metadata.setFormat('bitrate', this.metadata.format.numberOfChannels * this.blockAlign * this.metadata.format.sampleRate); // ToDo: check me
                    await this.tokenizer.ignore(header.chunkSize);
                    break;
                case 'bext': // Broadcast Audio Extension chunk	https://tech.ebu.ch/docs/tech/tech3285.pdf
                    const bext = await this.tokenizer.readToken(BwfChunk_1.BroadcastAudioExtensionChunk);
                    Object.keys(bext).forEach(key => {
                        this.metadata.addTag('exif', 'bext.' + key, bext[key]);
                    });
                    const bextRemaining = header.chunkSize - BwfChunk_1.BroadcastAudioExtensionChunk.len;
                    await this.tokenizer.ignore(bextRemaining);
                    break;
                case '\x00\x00\x00\x00': // padding ??
                    debug(`Ignore padding chunk: RIFF/${header.chunkID} of ${header.chunkSize} bytes`);
                    this.metadata.addWarning('Ignore chunk: RIFF/' + header.chunkID);
                    await this.tokenizer.ignore(header.chunkSize);
                    break;
                default:
                    debug(`Ignore chunk: RIFF/${header.chunkID} of ${header.chunkSize} bytes`);
                    this.metadata.addWarning('Ignore chunk: RIFF/' + header.chunkID);
                    await this.tokenizer.ignore(header.chunkSize);
            }
            if (this.header.chunkSize % 2 === 1) {
                debug('Read odd padding byte'); // https://wiki.multimedia.cx/index.php/RIFF
                await this.tokenizer.ignore(1);
            }
        }
    }
    async parseListTag(listHeader) {
        const listType = await this.tokenizer.readToken(new Token.StringType(4, 'binary'));
        debug('pos=%s, parseListTag: chunkID=RIFF/WAVE/LIST/%s', this.tokenizer.position, listType);
        switch (listType) {
            case 'INFO':
                return this.parseRiffInfoTags(listHeader.chunkSize - 4);
            case 'adtl':
            default:
                this.metadata.addWarning('Ignore chunk: RIFF/WAVE/LIST/' + listType);
                debug('Ignoring chunkID=RIFF/WAVE/LIST/' + listType);
                return this.tokenizer.ignore(listHeader.chunkSize - 4).then();
        }
    }
    async parseRiffInfoTags(chunkSize) {
        while (chunkSize >= 8) {
            const header = await this.tokenizer.readToken(riff.Header);
            const valueToken = new riff.ListInfoTagValue(header);
            const value = await this.tokenizer.readToken(valueToken);
            this.addTag(header.chunkID, util.stripNulls(value));
            chunkSize -= (8 + valueToken.len);
        }
        if (chunkSize !== 0) {
            throw Error('Illegal remaining size: ' + chunkSize);
        }
    }
    addTag(id, value) {
        this.metadata.addTag('exif', id, value);
    }
}
exports.WaveParser = WaveParser;

}, function(modId) { var map = {"../riff/RiffChunk":1665830430547,"./../wav/WaveChunk":1665830430548,"../id3v2/ID3v2Parser":1665830430507,"../common/Util":1665830430497,"../common/FourCC":1665830430514,"../common/BasicParser":1665830430511,"../wav/BwfChunk":1665830430549}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430547, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.ListInfoTagValue = exports.Header = void 0;
const Token = require("token-types");
/**
 * Common RIFF chunk header
 */
exports.Header = {
    len: 8,
    get: (buf, off) => {
        return {
            // Group-ID
            chunkID: buf.toString('binary', off, off + 4),
            // Size
            chunkSize: Token.UINT32_LE.get(buf, 4)
        };
    }
};
/**
 * Token to parse RIFF-INFO tag value
 */
class ListInfoTagValue {
    constructor(tagHeader) {
        this.tagHeader = tagHeader;
        this.len = tagHeader.chunkSize;
        this.len += this.len & 1; // if it is an odd length, round up to even
    }
    get(buf, off) {
        return new Token.StringType(this.tagHeader.chunkSize, 'ascii').get(buf, off);
    }
}
exports.ListInfoTagValue = ListInfoTagValue;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430548, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.FactChunk = exports.Format = exports.WaveFormat = void 0;
/**
 * Ref: https://msdn.microsoft.com/en-us/library/windows/desktop/dd317599(v=vs.85).aspx
 */
var WaveFormat;
(function (WaveFormat) {
    WaveFormat[WaveFormat["PCM"] = 1] = "PCM";
    // MPEG-4 and AAC Audio Types
    WaveFormat[WaveFormat["ADPCM"] = 2] = "ADPCM";
    WaveFormat[WaveFormat["IEEE_FLOAT"] = 3] = "IEEE_FLOAT";
    WaveFormat[WaveFormat["MPEG_ADTS_AAC"] = 5632] = "MPEG_ADTS_AAC";
    WaveFormat[WaveFormat["MPEG_LOAS"] = 5634] = "MPEG_LOAS";
    WaveFormat[WaveFormat["RAW_AAC1"] = 255] = "RAW_AAC1";
    // Dolby Audio Types
    WaveFormat[WaveFormat["DOLBY_AC3_SPDIF"] = 146] = "DOLBY_AC3_SPDIF";
    WaveFormat[WaveFormat["DVM"] = 8192] = "DVM";
    WaveFormat[WaveFormat["RAW_SPORT"] = 576] = "RAW_SPORT";
    WaveFormat[WaveFormat["ESST_AC3"] = 577] = "ESST_AC3";
    WaveFormat[WaveFormat["DRM"] = 9] = "DRM";
    WaveFormat[WaveFormat["DTS2"] = 8193] = "DTS2";
    WaveFormat[WaveFormat["MPEG"] = 80] = "MPEG";
})(WaveFormat = exports.WaveFormat || (exports.WaveFormat = {}));
/**
 * format chunk; chunk-id is "fmt "
 * http://soundfile.sapp.org/doc/WaveFormat/
 */
class Format {
    constructor(header) {
        if (header.chunkSize < 16)
            throw new Error('Invalid chunk size');
        this.len = header.chunkSize;
    }
    get(buf, off) {
        return {
            wFormatTag: buf.readUInt16LE(off),
            nChannels: buf.readUInt16LE(off + 2),
            nSamplesPerSec: buf.readUInt32LE(off + 4),
            nAvgBytesPerSec: buf.readUInt32LE(off + 8),
            nBlockAlign: buf.readUInt16LE(off + 12),
            wBitsPerSample: buf.readUInt16LE(off + 14)
        };
    }
}
exports.Format = Format;
/**
 * Fact chunk; chunk-id is "fact"
 * http://www-mmsp.ece.mcgill.ca/Documents/AudioFormats/WAVE/WAVE.html
 * http://www.recordingblogs.com/wiki/fact-chunk-of-a-wave-file
 */
class FactChunk {
    constructor(header) {
        if (header.chunkSize < 4) {
            throw new Error('Invalid fact chunk size.');
        }
        this.len = header.chunkSize;
    }
    get(buf, off) {
        return {
            dwSampleLength: buf.readUInt32LE(off)
        };
    }
}
exports.FactChunk = FactChunk;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430549, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastAudioExtensionChunk = void 0;
const Token = require("token-types");
const Util_1 = require("../common/Util");
/**
 * Broadcast Audio Extension Chunk
 * Ref: https://tech.ebu.ch/docs/tech/tech3285.pdf
 */
exports.BroadcastAudioExtensionChunk = {
    len: 420,
    get: (uint8array, off) => {
        return {
            description: (0, Util_1.stripNulls)(new Token.StringType(256, 'ascii').get(uint8array, off)).trim(),
            originator: (0, Util_1.stripNulls)(new Token.StringType(32, 'ascii').get(uint8array, off + 256)).trim(),
            originatorReference: (0, Util_1.stripNulls)(new Token.StringType(32, 'ascii').get(uint8array, off + 288)).trim(),
            originationDate: (0, Util_1.stripNulls)(new Token.StringType(10, 'ascii').get(uint8array, off + 320)).trim(),
            originationTime: (0, Util_1.stripNulls)(new Token.StringType(8, 'ascii').get(uint8array, off + 330)).trim(),
            timeReferenceLow: Token.UINT32_LE.get(uint8array, off + 338),
            timeReferenceHigh: Token.UINT32_LE.get(uint8array, off + 342),
            version: Token.UINT16_LE.get(uint8array, off + 346),
            umid: new Token.Uint8ArrayType(64).get(uint8array, off + 348),
            loudnessValue: Token.UINT16_LE.get(uint8array, off + 412),
            maxTruePeakLevel: Token.UINT16_LE.get(uint8array, off + 414),
            maxMomentaryLoudness: Token.UINT16_LE.get(uint8array, off + 416),
            maxShortTermLoudness: Token.UINT16_LE.get(uint8array, off + 418)
        };
    }
};

}, function(modId) { var map = {"../common/Util":1665830430497}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430550, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.WavPackParser = void 0;
const Token = require("token-types");
const APEv2Parser_1 = require("../apev2/APEv2Parser");
const FourCC_1 = require("../common/FourCC");
const BasicParser_1 = require("../common/BasicParser");
const WavPackToken_1 = require("./WavPackToken");
const debug_1 = require("debug");
const debug = (0, debug_1.default)('music-metadata:parser:WavPack');
/**
 * WavPack Parser
 */
class WavPackParser extends BasicParser_1.BasicParser {
    async parse() {
        this.audioDataSize = 0;
        // First parse all WavPack blocks
        await this.parseWavPackBlocks();
        // try to parse APEv2 header
        return APEv2Parser_1.APEv2Parser.tryParseApeHeader(this.metadata, this.tokenizer, this.options);
    }
    async parseWavPackBlocks() {
        do {
            const blockId = await this.tokenizer.peekToken(FourCC_1.FourCcToken);
            if (blockId !== 'wvpk')
                break;
            const header = await this.tokenizer.readToken(WavPackToken_1.WavPack.BlockHeaderToken);
            if (header.BlockID !== 'wvpk')
                throw new Error('Invalid WavPack Block-ID');
            debug(`WavPack header blockIndex=${header.blockIndex}, len=${WavPackToken_1.WavPack.BlockHeaderToken.len}`);
            if (header.blockIndex === 0 && !this.metadata.format.container) {
                this.metadata.setFormat('container', 'WavPack');
                this.metadata.setFormat('lossless', !header.flags.isHybrid);
                // tagTypes: this.type,
                this.metadata.setFormat('bitsPerSample', header.flags.bitsPerSample);
                if (!header.flags.isDSD) {
                    // In case isDSD, these values will ne set in ID_DSD_BLOCK
                    this.metadata.setFormat('sampleRate', header.flags.samplingRate);
                    this.metadata.setFormat('duration', header.totalSamples / header.flags.samplingRate);
                }
                this.metadata.setFormat('numberOfChannels', header.flags.isMono ? 1 : 2);
                this.metadata.setFormat('numberOfSamples', header.totalSamples);
                this.metadata.setFormat('codec', header.flags.isDSD ? 'DSD' : 'PCM');
            }
            const ignoreBytes = header.blockSize - (WavPackToken_1.WavPack.BlockHeaderToken.len - 8);
            await (header.blockIndex === 0 ? this.parseMetadataSubBlock(header, ignoreBytes) : this.tokenizer.ignore(ignoreBytes));
            if (header.blockSamples > 0) {
                this.audioDataSize += header.blockSize; // Count audio data for bit-rate calculation
            }
        } while (!this.tokenizer.fileInfo.size || this.tokenizer.fileInfo.size - this.tokenizer.position >= WavPackToken_1.WavPack.BlockHeaderToken.len);
        this.metadata.setFormat('bitrate', this.audioDataSize * 8 / this.metadata.format.duration);
    }
    /**
     * Ref: http://www.wavpack.com/WavPack5FileFormat.pdf, 3.0 Metadata Sub-blocks
     * @param remainingLength
     */
    async parseMetadataSubBlock(header, remainingLength) {
        while (remainingLength > WavPackToken_1.WavPack.MetadataIdToken.len) {
            const id = await this.tokenizer.readToken(WavPackToken_1.WavPack.MetadataIdToken);
            const dataSizeInWords = await this.tokenizer.readNumber(id.largeBlock ? Token.UINT24_LE : Token.UINT8);
            const data = Buffer.alloc(dataSizeInWords * 2 - (id.isOddSize ? 1 : 0));
            await this.tokenizer.readBuffer(data);
            debug(`Metadata Sub-Blocks functionId=0x${id.functionId.toString(16)}, id.largeBlock=${id.largeBlock},data-size=${data.length}`);
            switch (id.functionId) {
                case 0x0: // ID_DUMMY: could be used to pad WavPack blocks
                    break;
                case 0xe: // ID_DSD_BLOCK
                    debug('ID_DSD_BLOCK');
                    // https://github.com/dbry/WavPack/issues/71#issuecomment-483094813
                    const mp = 1 << data.readUInt8(0);
                    const samplingRate = header.flags.samplingRate * mp * 8; // ToDo: second factor should be read from DSD-metadata block https://github.com/dbry/WavPack/issues/71#issuecomment-483094813
                    if (!header.flags.isDSD)
                        throw new Error('Only expect DSD block if DSD-flag is set');
                    this.metadata.setFormat('sampleRate', samplingRate);
                    this.metadata.setFormat('duration', header.totalSamples / samplingRate);
                    break;
                case 0x24: // ID_ALT_TRAILER: maybe used to embed original ID3 tag header
                    debug('ID_ALT_TRAILER: trailer for non-wav files');
                    break;
                case 0x26: // ID_MD5_CHECKSUM
                    this.metadata.setFormat('audioMD5', data);
                    break;
                case 0x2f: // ID_BLOCK_CHECKSUM
                    debug(`ID_BLOCK_CHECKSUM: checksum=${data.toString('hex')}`);
                    break;
                default:
                    debug(`Ignore unsupported meta-sub-block-id functionId=0x${id.functionId.toString(16)}`);
                    break;
            }
            remainingLength -= WavPackToken_1.WavPack.MetadataIdToken.len + (id.largeBlock ? Token.UINT24_LE.len : Token.UINT8.len) + dataSizeInWords * 2;
            debug(`remainingLength=${remainingLength}`);
            if (id.isOddSize)
                this.tokenizer.ignore(1);
        }
        if (remainingLength !== 0)
            throw new Error('metadata-sub-block should fit it remaining length');
    }
}
exports.WavPackParser = WavPackParser;

}, function(modId) { var map = {"../apev2/APEv2Parser":1665830430512,"../common/FourCC":1665830430514,"../common/BasicParser":1665830430511,"./WavPackToken":1665830430551}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430551, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.WavPack = void 0;
const Token = require("token-types");
const FourCC_1 = require("../common/FourCC");
const SampleRates = [6000, 8000, 9600, 11025, 12000, 16000, 22050, 24000, 32000, 44100,
    48000, 64000, 88200, 96000, 192000, -1];
class WavPack {
    static isBitSet(flags, bitOffset) {
        return WavPack.getBitAllignedNumber(flags, bitOffset, 1) === 1;
    }
    static getBitAllignedNumber(flags, bitOffset, len) {
        return (flags >>> bitOffset) & (0xffffffff >>> (32 - len));
    }
}
exports.WavPack = WavPack;
/**
 * WavPack Block Header
 *
 * 32-byte little-endian header at the front of every WavPack block
 *
 * Ref: http://www.wavpack.com/WavPack5FileFormat.pdf (page 2/6: 2.0 "Block Header")
 */
WavPack.BlockHeaderToken = {
    len: 32,
    get: (buf, off) => {
        const flags = Token.UINT32_LE.get(buf, off + 24);
        const res = {
            // should equal 'wvpk'
            BlockID: FourCC_1.FourCcToken.get(buf, off),
            //  0x402 to 0x410 are valid for decode
            blockSize: Token.UINT32_LE.get(buf, off + 4),
            //  0x402 (1026) to 0x410 are valid for decode
            version: Token.UINT16_LE.get(buf, off + 8),
            //  40-bit total samples for entire file (if block_index == 0 and a value of -1 indicates an unknown length)
            totalSamples: /* replace with bigint? (Token.UINT8.get(buf, off + 11) << 32) + */ Token.UINT32_LE.get(buf, off + 12),
            // 40-bit block_index
            blockIndex: /* replace with bigint? (Token.UINT8.get(buf, off + 10) << 32) + */ Token.UINT32_LE.get(buf, off + 16),
            // 40-bit total samples for entire file (if block_index == 0 and a value of -1 indicates an unknown length)
            blockSamples: Token.UINT32_LE.get(buf, off + 20),
            // various flags for id and decoding
            flags: {
                bitsPerSample: (1 + WavPack.getBitAllignedNumber(flags, 0, 2)) * 8,
                isMono: WavPack.isBitSet(flags, 2),
                isHybrid: WavPack.isBitSet(flags, 3),
                isJointStereo: WavPack.isBitSet(flags, 4),
                crossChannel: WavPack.isBitSet(flags, 5),
                hybridNoiseShaping: WavPack.isBitSet(flags, 6),
                floatingPoint: WavPack.isBitSet(flags, 7),
                samplingRate: SampleRates[WavPack.getBitAllignedNumber(flags, 23, 4)],
                isDSD: WavPack.isBitSet(flags, 31)
            },
            // crc for actual decoded data
            crc: new Token.Uint8ArrayType(4).get(buf, off + 28)
        };
        if (res.flags.isDSD) {
            res.totalSamples *= 8;
        }
        return res;
    }
};
/**
 * 3.0 Metadata Sub-Blocks
 * Ref: http://www.wavpack.com/WavPack5FileFormat.pdf (page 4/6: 3.0 "Metadata Sub-Block")
 */
WavPack.MetadataIdToken = {
    len: 1,
    get: (buf, off) => {
        return {
            functionId: WavPack.getBitAllignedNumber(buf[off], 0, 6),
            isOptional: WavPack.isBitSet(buf[off], 5),
            isOddSize: WavPack.isBitSet(buf[off], 6),
            largeBlock: WavPack.isBitSet(buf[off], 7)
        };
    }
};

}, function(modId) { var map = {"../common/FourCC":1665830430514}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430552, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.DsfParser = void 0;
const debug_1 = require("debug");
const AbstractID3Parser_1 = require("../id3v2/AbstractID3Parser");
const DsfChunk_1 = require("./DsfChunk");
const ID3v2Parser_1 = require("../id3v2/ID3v2Parser");
const debug = (0, debug_1.default)('music-metadata:parser:DSF');
/**
 * DSF (dsd stream file) File Parser
 * Ref: https://dsd-guide.com/sites/default/files/white-papers/DSFFileFormatSpec_E.pdf
 */
class DsfParser extends AbstractID3Parser_1.AbstractID3Parser {
    async postId3v2Parse() {
        const p0 = this.tokenizer.position; // mark start position, normally 0
        const chunkHeader = await this.tokenizer.readToken(DsfChunk_1.ChunkHeader);
        if (chunkHeader.id !== 'DSD ')
            throw new Error('Invalid chunk signature');
        this.metadata.setFormat('container', 'DSF');
        this.metadata.setFormat('lossless', true);
        const dsdChunk = await this.tokenizer.readToken(DsfChunk_1.DsdChunk);
        if (dsdChunk.metadataPointer === BigInt(0)) {
            debug(`No ID3v2 tag present`);
        }
        else {
            debug(`expect ID3v2 at offset=${dsdChunk.metadataPointer}`);
            await this.parseChunks(dsdChunk.fileSize - chunkHeader.size);
            // Jump to ID3 header
            await this.tokenizer.ignore(Number(dsdChunk.metadataPointer) - this.tokenizer.position - p0);
            return new ID3v2Parser_1.ID3v2Parser().parse(this.metadata, this.tokenizer, this.options);
        }
    }
    async parseChunks(bytesRemaining) {
        while (bytesRemaining >= DsfChunk_1.ChunkHeader.len) {
            const chunkHeader = await this.tokenizer.readToken(DsfChunk_1.ChunkHeader);
            debug(`Parsing chunk name=${chunkHeader.id} size=${chunkHeader.size}`);
            switch (chunkHeader.id) {
                case 'fmt ':
                    const formatChunk = await this.tokenizer.readToken(DsfChunk_1.FormatChunk);
                    this.metadata.setFormat('numberOfChannels', formatChunk.channelNum);
                    this.metadata.setFormat('sampleRate', formatChunk.samplingFrequency);
                    this.metadata.setFormat('bitsPerSample', formatChunk.bitsPerSample);
                    this.metadata.setFormat('numberOfSamples', formatChunk.sampleCount);
                    this.metadata.setFormat('duration', Number(formatChunk.sampleCount) / formatChunk.samplingFrequency);
                    const bitrate = formatChunk.bitsPerSample * formatChunk.samplingFrequency * formatChunk.channelNum;
                    this.metadata.setFormat('bitrate', bitrate);
                    return; // We got what we want, stop further processing of chunks
                default:
                    this.tokenizer.ignore(Number(chunkHeader.size) - DsfChunk_1.ChunkHeader.len);
                    break;
            }
            bytesRemaining -= chunkHeader.size;
        }
    }
}
exports.DsfParser = DsfParser;

}, function(modId) { var map = {"../id3v2/AbstractID3Parser":1665830430523,"./DsfChunk":1665830430553,"../id3v2/ID3v2Parser":1665830430507}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430553, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.FormatChunk = exports.ChannelType = exports.DsdChunk = exports.ChunkHeader = void 0;
const Token = require("token-types");
const FourCC_1 = require("../common/FourCC");
/**
 * Common chunk DSD header: the 'chunk name (Four-CC)' & chunk size
 */
exports.ChunkHeader = {
    len: 12,
    get: (buf, off) => {
        return { id: FourCC_1.FourCcToken.get(buf, off), size: Token.UINT64_LE.get(buf, off + 4) };
    }
};
/**
 * Common chunk DSD header: the 'chunk name (Four-CC)' & chunk size
 */
exports.DsdChunk = {
    len: 16,
    get: (buf, off) => {
        return {
            fileSize: Token.INT64_LE.get(buf, off),
            metadataPointer: Token.INT64_LE.get(buf, off + 8)
        };
    }
};
var ChannelType;
(function (ChannelType) {
    ChannelType[ChannelType["mono"] = 1] = "mono";
    ChannelType[ChannelType["stereo"] = 2] = "stereo";
    ChannelType[ChannelType["channels"] = 3] = "channels";
    ChannelType[ChannelType["quad"] = 4] = "quad";
    ChannelType[ChannelType["4 channels"] = 5] = "4 channels";
    ChannelType[ChannelType["5 channels"] = 6] = "5 channels";
    ChannelType[ChannelType["5.1 channels"] = 7] = "5.1 channels";
})(ChannelType = exports.ChannelType || (exports.ChannelType = {}));
/**
 * Common chunk DSD header: the 'chunk name (Four-CC)' & chunk size
 */
exports.FormatChunk = {
    len: 40,
    get: (buf, off) => {
        return {
            formatVersion: Token.INT32_LE.get(buf, off),
            formatID: Token.INT32_LE.get(buf, off + 4),
            channelType: Token.INT32_LE.get(buf, off + 8),
            channelNum: Token.INT32_LE.get(buf, off + 12),
            samplingFrequency: Token.INT32_LE.get(buf, off + 16),
            bitsPerSample: Token.INT32_LE.get(buf, off + 20),
            sampleCount: Token.INT64_LE.get(buf, off + 24),
            blockSizePerChannel: Token.INT32_LE.get(buf, off + 32)
        };
    }
};

}, function(modId) { var map = {"../common/FourCC":1665830430514}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430554, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.DsdiffParser = void 0;
const Token = require("token-types");
const debug_1 = require("debug");
const strtok3 = require("strtok3/lib/core");
const FourCC_1 = require("../common/FourCC");
const BasicParser_1 = require("../common/BasicParser");
const ID3v2Parser_1 = require("../id3v2/ID3v2Parser");
const DsdiffToken_1 = require("./DsdiffToken");
const debug = (0, debug_1.default)('music-metadata:parser:aiff');
/**
 * DSDIFF - Direct Stream Digital Interchange File Format (Phillips)
 *
 * Ref:
 * - http://www.sonicstudio.com/pdf/dsd/DSDIFF_1.5_Spec.pdf
 */
class DsdiffParser extends BasicParser_1.BasicParser {
    async parse() {
        const header = await this.tokenizer.readToken(DsdiffToken_1.ChunkHeader64);
        if (header.chunkID !== 'FRM8')
            throw new Error('Unexpected chunk-ID');
        const type = (await this.tokenizer.readToken(FourCC_1.FourCcToken)).trim();
        switch (type) {
            case 'DSD':
                this.metadata.setFormat('container', `DSDIFF/${type}`);
                this.metadata.setFormat('lossless', true);
                return this.readFmt8Chunks(header.chunkSize - BigInt(FourCC_1.FourCcToken.len));
            default:
                throw Error(`Unsupported DSDIFF type: ${type}`);
        }
    }
    async readFmt8Chunks(remainingSize) {
        while (remainingSize >= DsdiffToken_1.ChunkHeader64.len) {
            const chunkHeader = await this.tokenizer.readToken(DsdiffToken_1.ChunkHeader64);
            //  If the data is an odd number of bytes in length, a pad byte must be added at the end
            debug(`Chunk id=${chunkHeader.chunkID}`);
            await this.readData(chunkHeader);
            remainingSize -= (BigInt(DsdiffToken_1.ChunkHeader64.len) + chunkHeader.chunkSize);
        }
    }
    async readData(header) {
        debug(`Reading data of chunk[ID=${header.chunkID}, size=${header.chunkSize}]`);
        const p0 = this.tokenizer.position;
        switch (header.chunkID.trim()) {
            case 'FVER': // 3.1 FORMAT VERSION CHUNK
                const version = await this.tokenizer.readToken(Token.UINT32_LE);
                debug(`DSDIFF version=${version}`);
                break;
            case 'PROP': // 3.2 PROPERTY CHUNK
                const propType = await this.tokenizer.readToken(FourCC_1.FourCcToken);
                if (propType !== 'SND ')
                    throw new Error('Unexpected PROP-chunk ID');
                await this.handleSoundPropertyChunks(header.chunkSize - BigInt(FourCC_1.FourCcToken.len));
                break;
            case 'ID3': // Unofficial ID3 tag support
                const id3_data = await this.tokenizer.readToken(new Token.Uint8ArrayType(Number(header.chunkSize)));
                const rst = strtok3.fromBuffer(id3_data);
                await new ID3v2Parser_1.ID3v2Parser().parse(this.metadata, rst, this.options);
                break;
            default:
                debug(`Ignore chunk[ID=${header.chunkID}, size=${header.chunkSize}]`);
                break;
            case 'DSD':
                this.metadata.setFormat('numberOfSamples', Number(header.chunkSize * BigInt(8) / BigInt(this.metadata.format.numberOfChannels)));
                this.metadata.setFormat('duration', this.metadata.format.numberOfSamples / this.metadata.format.sampleRate);
                break;
        }
        const remaining = header.chunkSize - BigInt(this.tokenizer.position - p0);
        if (remaining > 0) {
            debug(`After Parsing chunk, remaining ${remaining} bytes`);
            await this.tokenizer.ignore(Number(remaining));
        }
    }
    async handleSoundPropertyChunks(remainingSize) {
        debug(`Parsing sound-property-chunks, remainingSize=${remainingSize}`);
        while (remainingSize > 0) {
            const sndPropHeader = await this.tokenizer.readToken(DsdiffToken_1.ChunkHeader64);
            debug(`Sound-property-chunk[ID=${sndPropHeader.chunkID}, size=${sndPropHeader.chunkSize}]`);
            const p0 = this.tokenizer.position;
            switch (sndPropHeader.chunkID.trim()) {
                case 'FS': // 3.2.1 Sample Rate Chunk
                    const sampleRate = await this.tokenizer.readToken(Token.UINT32_BE);
                    this.metadata.setFormat('sampleRate', sampleRate);
                    break;
                case 'CHNL': // 3.2.2 Channels Chunk
                    const numChannels = await this.tokenizer.readToken(Token.UINT16_BE);
                    this.metadata.setFormat('numberOfChannels', numChannels);
                    await this.handleChannelChunks(sndPropHeader.chunkSize - BigInt(Token.UINT16_BE.len));
                    break;
                case 'CMPR': // 3.2.3 Compression Type Chunk
                    const compressionIdCode = (await this.tokenizer.readToken(FourCC_1.FourCcToken)).trim();
                    const count = await this.tokenizer.readToken(Token.UINT8);
                    const compressionName = await this.tokenizer.readToken(new Token.StringType(count, 'ascii'));
                    if (compressionIdCode === 'DSD') {
                        this.metadata.setFormat('lossless', true);
                        this.metadata.setFormat('bitsPerSample', 1);
                    }
                    this.metadata.setFormat('codec', `${compressionIdCode} (${compressionName})`);
                    break;
                case 'ABSS': // 3.2.4 Absolute Start Time Chunk
                    const hours = await this.tokenizer.readToken(Token.UINT16_BE);
                    const minutes = await this.tokenizer.readToken(Token.UINT8);
                    const seconds = await this.tokenizer.readToken(Token.UINT8);
                    const samples = await this.tokenizer.readToken(Token.UINT32_BE);
                    debug(`ABSS ${hours}:${minutes}:${seconds}.${samples}`);
                    break;
                case 'LSCO': // 3.2.5 Loudspeaker Configuration Chunk
                    const lsConfig = await this.tokenizer.readToken(Token.UINT16_BE);
                    debug(`LSCO lsConfig=${lsConfig}`);
                    break;
                case 'COMT':
                default:
                    debug(`Unknown sound-property-chunk[ID=${sndPropHeader.chunkID}, size=${sndPropHeader.chunkSize}]`);
                    await this.tokenizer.ignore(Number(sndPropHeader.chunkSize));
            }
            const remaining = sndPropHeader.chunkSize - BigInt(this.tokenizer.position - p0);
            if (remaining > 0) {
                debug(`After Parsing sound-property-chunk ${sndPropHeader.chunkSize}, remaining ${remaining} bytes`);
                await this.tokenizer.ignore(Number(remaining));
            }
            remainingSize -= BigInt(DsdiffToken_1.ChunkHeader64.len) + sndPropHeader.chunkSize;
            debug(`Parsing sound-property-chunks, remainingSize=${remainingSize}`);
        }
        if (this.metadata.format.lossless && this.metadata.format.sampleRate && this.metadata.format.numberOfChannels && this.metadata.format.bitsPerSample) {
            const bitrate = this.metadata.format.sampleRate * this.metadata.format.numberOfChannels * this.metadata.format.bitsPerSample;
            this.metadata.setFormat('bitrate', bitrate);
        }
    }
    async handleChannelChunks(remainingSize) {
        debug(`Parsing channel-chunks, remainingSize=${remainingSize}`);
        const channels = [];
        while (remainingSize >= FourCC_1.FourCcToken.len) {
            const channelId = await this.tokenizer.readToken(FourCC_1.FourCcToken);
            debug(`Channel[ID=${channelId}]`);
            channels.push(channelId);
            remainingSize -= BigInt(FourCC_1.FourCcToken.len);
        }
        debug(`Channels: ${channels.join(', ')}`);
        return channels;
    }
}
exports.DsdiffParser = DsdiffParser;

}, function(modId) { var map = {"../common/FourCC":1665830430514,"../common/BasicParser":1665830430511,"../id3v2/ID3v2Parser":1665830430507,"./DsdiffToken":1665830430555}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430555, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkHeader64 = void 0;
const Token = require("token-types");
const FourCC_1 = require("../common/FourCC");
/**
 * DSDIFF chunk header
 * The data-size encoding is deviating from EA-IFF 85
 * Ref: http://www.sonicstudio.com/pdf/dsd/DSDIFF_1.5_Spec.pdf
 */
exports.ChunkHeader64 = {
    len: 12,
    get: (buf, off) => {
        return {
            // Group-ID
            chunkID: FourCC_1.FourCcToken.get(buf, off),
            // Size
            chunkSize: Token.INT64_BE.get(buf, off + 4)
        };
    }
};

}, function(modId) { var map = {"../common/FourCC":1665830430514}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430556, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.MatroskaParser = void 0;
const token_types_1 = require("token-types");
const debug_1 = require("debug");
const BasicParser_1 = require("../common/BasicParser");
const types_1 = require("./types");
const matroskaDtd = require("./MatroskaDtd");
const debug = (0, debug_1.default)('music-metadata:parser:matroska');
/**
 * Extensible Binary Meta Language (EBML) parser
 * https://en.wikipedia.org/wiki/Extensible_Binary_Meta_Language
 * http://matroska.sourceforge.net/technical/specs/rfc/index.html
 *
 * WEBM VP8 AUDIO FILE
 */
class MatroskaParser extends BasicParser_1.BasicParser {
    constructor() {
        super();
        this.padding = 0;
        this.parserMap = new Map();
        this.ebmlMaxIDLength = 4;
        this.ebmlMaxSizeLength = 8;
        this.parserMap.set(types_1.DataType.uint, e => this.readUint(e));
        this.parserMap.set(types_1.DataType.string, e => this.readString(e));
        this.parserMap.set(types_1.DataType.binary, e => this.readBuffer(e));
        this.parserMap.set(types_1.DataType.uid, async (e) => await this.readUint(e) === 1);
        this.parserMap.set(types_1.DataType.bool, e => this.readFlag(e));
        this.parserMap.set(types_1.DataType.float, e => this.readFloat(e));
    }
    /**
     * Initialize parser with output (metadata), input (tokenizer) & parsing options (options).
     * @param {INativeMetadataCollector} metadata Output
     * @param {ITokenizer} tokenizer Input
     * @param {IOptions} options Parsing options
     */
    init(metadata, tokenizer, options) {
        super.init(metadata, tokenizer, options);
        return this;
    }
    async parse() {
        const matroska = await this.parseContainer(matroskaDtd.elements, this.tokenizer.fileInfo.size, []);
        this.metadata.setFormat('container', `EBML/${matroska.ebml.docType}`);
        if (matroska.segment) {
            const info = matroska.segment.info;
            if (info) {
                const timecodeScale = info.timecodeScale ? info.timecodeScale : 1000000;
                const duration = info.duration * timecodeScale / 1000000000;
                this.addTag('segment:title', info.title);
                this.metadata.setFormat('duration', duration);
            }
            const audioTracks = matroska.segment.tracks;
            if (audioTracks && audioTracks.entries) {
                audioTracks.entries.forEach(entry => {
                    const stream = {
                        codecName: entry.codecID.replace('A_', '').replace('V_', ''),
                        codecSettings: entry.codecSettings,
                        flagDefault: entry.flagDefault,
                        flagLacing: entry.flagLacing,
                        flagEnabled: entry.flagEnabled,
                        language: entry.language,
                        name: entry.name,
                        type: entry.trackType,
                        audio: entry.audio,
                        video: entry.video
                    };
                    this.metadata.addStreamInfo(stream);
                });
                const audioTrack = audioTracks.entries
                    .filter(entry => {
                    return entry.trackType === types_1.TrackType.audio.valueOf();
                })
                    .reduce((acc, cur) => {
                    if (!acc) {
                        return cur;
                    }
                    if (!acc.flagDefault && cur.flagDefault) {
                        return cur;
                    }
                    if (cur.trackNumber && cur.trackNumber < acc.trackNumber) {
                        return cur;
                    }
                    return acc;
                }, null);
                if (audioTrack) {
                    this.metadata.setFormat('codec', audioTrack.codecID.replace('A_', ''));
                    this.metadata.setFormat('sampleRate', audioTrack.audio.samplingFrequency);
                    this.metadata.setFormat('numberOfChannels', audioTrack.audio.channels);
                }
                if (matroska.segment.tags) {
                    matroska.segment.tags.tag.forEach(tag => {
                        const target = tag.target;
                        const targetType = (target === null || target === void 0 ? void 0 : target.targetTypeValue) ? types_1.TargetType[target.targetTypeValue] : ((target === null || target === void 0 ? void 0 : target.targetType) ? target.targetType : 'track');
                        tag.simpleTags.forEach(simpleTag => {
                            const value = simpleTag.string ? simpleTag.string : simpleTag.binary;
                            this.addTag(`${targetType}:${simpleTag.name}`, value);
                        });
                    });
                }
                if (matroska.segment.attachments) {
                    matroska.segment.attachments.attachedFiles
                        .filter(file => file.mimeType.startsWith('image/'))
                        .map(file => {
                        return {
                            data: file.data,
                            format: file.mimeType,
                            description: file.description,
                            name: file.name
                        };
                    }).forEach(picture => {
                        this.addTag('picture', picture);
                    });
                }
            }
        }
    }
    async parseContainer(container, posDone, path) {
        const tree = {};
        while (this.tokenizer.position < posDone) {
            let element;
            try {
                element = await this.readElement();
            }
            catch (error) {
                if (error.message === 'End-Of-Stream') {
                    break;
                }
                throw error;
            }
            const type = container[element.id];
            if (type) {
                debug(`Element: name=${type.name}, container=${!!type.container}`);
                if (type.container) {
                    const res = await this.parseContainer(type.container, element.len >= 0 ? this.tokenizer.position + element.len : -1, path.concat([type.name]));
                    if (type.multiple) {
                        if (!tree[type.name]) {
                            tree[type.name] = [];
                        }
                        tree[type.name].push(res);
                    }
                    else {
                        tree[type.name] = res;
                    }
                }
                else {
                    tree[type.name] = await this.parserMap.get(type.value)(element);
                }
            }
            else {
                switch (element.id) {
                    case 0xec: // void
                        this.padding += element.len;
                        await this.tokenizer.ignore(element.len);
                        break;
                    default:
                        debug(`parseEbml: path=${path.join('/')}, unknown element: id=${element.id.toString(16)}`);
                        this.padding += element.len;
                        await this.tokenizer.ignore(element.len);
                }
            }
        }
        return tree;
    }
    async readVintData(maxLength) {
        const msb = await this.tokenizer.peekNumber(token_types_1.UINT8);
        let mask = 0x80;
        let oc = 1;
        // Calculate VINT_WIDTH
        while ((msb & mask) === 0) {
            if (oc > maxLength) {
                throw new Error('VINT value exceeding maximum size');
            }
            ++oc;
            mask >>= 1;
        }
        const id = Buffer.alloc(oc);
        await this.tokenizer.readBuffer(id);
        return id;
    }
    async readElement() {
        const id = await this.readVintData(this.ebmlMaxIDLength);
        const lenField = await this.readVintData(this.ebmlMaxSizeLength);
        lenField[0] ^= 0x80 >> (lenField.length - 1);
        const nrLen = Math.min(6, lenField.length); // JavaScript can max read 6 bytes integer
        return {
            id: id.readUIntBE(0, id.length),
            len: lenField.readUIntBE(lenField.length - nrLen, nrLen)
        };
    }
    isMaxValue(vintData) {
        if (vintData.length === this.ebmlMaxSizeLength) {
            for (let n = 1; n < this.ebmlMaxSizeLength; ++n) {
                if (vintData[n] !== 0xff)
                    return false;
            }
            return true;
        }
        return false;
    }
    async readFloat(e) {
        switch (e.len) {
            case 0:
                return 0.0;
            case 4:
                return this.tokenizer.readNumber(token_types_1.Float32_BE);
            case 8:
                return this.tokenizer.readNumber(token_types_1.Float64_BE);
            case 10:
                return this.tokenizer.readNumber(token_types_1.Float64_BE);
            default:
                throw new Error(`Invalid IEEE-754 float length: ${e.len}`);
        }
    }
    async readFlag(e) {
        return (await this.readUint(e)) === 1;
    }
    async readUint(e) {
        const buf = await this.readBuffer(e);
        const nrLen = Math.min(6, e.len); // JavaScript can max read 6 bytes integer
        return buf.readUIntBE(e.len - nrLen, nrLen);
    }
    async readString(e) {
        const rawString = await this.tokenizer.readToken(new token_types_1.StringType(e.len, 'utf-8'));
        return rawString.replace(/\00.*$/g, '');
    }
    async readBuffer(e) {
        const buf = Buffer.alloc(e.len);
        await this.tokenizer.readBuffer(buf);
        return buf;
    }
    addTag(tagId, value) {
        this.metadata.addTag('matroska', tagId, value);
    }
}
exports.MatroskaParser = MatroskaParser;

}, function(modId) { var map = {"../common/BasicParser":1665830430511,"./types":1665830430490,"./MatroskaDtd":1665830430557}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430557, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.elements = void 0;
const types_1 = require("./types");
/**
 * Elements of document type description
 * Derived from https://github.com/tungol/EBML/blob/master/doctypes/matroska.dtd
 * Extended with:
 * - https://www.matroska.org/technical/specs/index.html
 */
exports.elements = {
    0x1a45dfa3: {
        name: 'ebml',
        container: {
            0x4286: { name: 'ebmlVersion', value: types_1.DataType.uint },
            0x42f7: { name: 'ebmlReadVersion', value: types_1.DataType.uint },
            0x42f2: { name: 'ebmlMaxIDWidth', value: types_1.DataType.uint },
            0x42f3: { name: 'ebmlMaxSizeWidth', value: types_1.DataType.uint },
            0x4282: { name: 'docType', value: types_1.DataType.string },
            0x4287: { name: 'docTypeVersion', value: types_1.DataType.uint },
            0x4285: { name: 'docTypeReadVersion', value: types_1.DataType.uint } // 5.1.7
        }
    },
    // Matroska segments
    0x18538067: {
        name: 'segment',
        container: {
            // Meta Seek Information
            0x114d9b74: {
                name: 'seekHead',
                container: {
                    0x4dbb: {
                        name: 'seek',
                        container: {
                            0x53ab: { name: 'seekId', value: types_1.DataType.binary },
                            0x53ac: { name: 'seekPosition', value: types_1.DataType.uint }
                        }
                    }
                }
            },
            // Segment Information
            0x1549a966: {
                name: 'info',
                container: {
                    0x73a4: { name: 'uid', value: types_1.DataType.uid },
                    0x7384: { name: 'filename', value: types_1.DataType.string },
                    0x3cb923: { name: 'prevUID', value: types_1.DataType.uid },
                    0x3c83ab: { name: 'prevFilename', value: types_1.DataType.string },
                    0x3eb923: { name: 'nextUID', value: types_1.DataType.uid },
                    0x3e83bb: { name: 'nextFilename', value: types_1.DataType.string },
                    0x2ad7b1: { name: 'timecodeScale', value: types_1.DataType.uint },
                    0x4489: { name: 'duration', value: types_1.DataType.float },
                    0x4461: { name: 'dateUTC', value: types_1.DataType.uint },
                    0x7ba9: { name: 'title', value: types_1.DataType.string },
                    0x4d80: { name: 'muxingApp', value: types_1.DataType.string },
                    0x5741: { name: 'writingApp', value: types_1.DataType.string }
                }
            },
            // Cluster
            0x1f43b675: {
                name: 'cluster',
                multiple: true,
                container: {
                    0xe7: { name: 'timecode', value: types_1.DataType.uid },
                    0xa3: { name: 'unknown', value: types_1.DataType.binary },
                    0xa7: { name: 'position', value: types_1.DataType.uid },
                    0xab: { name: 'prevSize', value: types_1.DataType.uid }
                }
            },
            // Track
            0x1654ae6b: {
                name: 'tracks',
                container: {
                    0xae: {
                        name: 'entries',
                        multiple: true,
                        container: {
                            0xd7: { name: 'trackNumber', value: types_1.DataType.uint },
                            0x73c5: { name: 'uid', value: types_1.DataType.uid },
                            0x83: { name: 'trackType', value: types_1.DataType.uint },
                            0xb9: { name: 'flagEnabled', value: types_1.DataType.bool },
                            0x88: { name: 'flagDefault', value: types_1.DataType.bool },
                            0x55aa: { name: 'flagForced', value: types_1.DataType.bool },
                            0x9c: { name: 'flagLacing', value: types_1.DataType.bool },
                            0x6de7: { name: 'minCache', value: types_1.DataType.uint },
                            0x6de8: { name: 'maxCache', value: types_1.DataType.uint },
                            0x23e383: { name: 'defaultDuration', value: types_1.DataType.uint },
                            0x23314f: { name: 'timecodeScale', value: types_1.DataType.float },
                            0x536e: { name: 'name', value: types_1.DataType.string },
                            0x22b59c: { name: 'language', value: types_1.DataType.string },
                            0x86: { name: 'codecID', value: types_1.DataType.string },
                            0x63a2: { name: 'codecPrivate', value: types_1.DataType.binary },
                            0x258688: { name: 'codecName', value: types_1.DataType.string },
                            0x3a9697: { name: 'codecSettings', value: types_1.DataType.string },
                            0x3b4040: { name: 'codecInfoUrl', value: types_1.DataType.string },
                            0x26b240: { name: 'codecDownloadUrl', value: types_1.DataType.string },
                            0xaa: { name: 'codecDecodeAll', value: types_1.DataType.bool },
                            0x6fab: { name: 'trackOverlay', value: types_1.DataType.uint },
                            // Video
                            0xe0: {
                                name: 'video',
                                container: {
                                    0x9a: { name: 'flagInterlaced', value: types_1.DataType.bool },
                                    0x53b8: { name: 'stereoMode', value: types_1.DataType.uint },
                                    0xb0: { name: 'pixelWidth', value: types_1.DataType.uint },
                                    0xba: { name: 'pixelHeight', value: types_1.DataType.uint },
                                    0x54b0: { name: 'displayWidth', value: types_1.DataType.uint },
                                    0x54ba: { name: 'displayHeight', value: types_1.DataType.uint },
                                    0x54b3: { name: 'aspectRatioType', value: types_1.DataType.uint },
                                    0x2eb524: { name: 'colourSpace', value: types_1.DataType.uint },
                                    0x2fb523: { name: 'gammaValue', value: types_1.DataType.float }
                                }
                            },
                            // Audio
                            0xe1: {
                                name: 'audio',
                                container: {
                                    0xb5: { name: 'samplingFrequency', value: types_1.DataType.float },
                                    0x78b5: { name: 'outputSamplingFrequency', value: types_1.DataType.float },
                                    0x9f: { name: 'channels', value: types_1.DataType.uint },
                                    0x94: { name: 'channels', value: types_1.DataType.uint },
                                    0x7d7b: { name: 'channelPositions', value: types_1.DataType.binary },
                                    0x6264: { name: 'bitDepth', value: types_1.DataType.uint }
                                }
                            },
                            // Content Encoding
                            0x6d80: {
                                name: 'contentEncodings',
                                container: {
                                    0x6240: {
                                        name: 'contentEncoding',
                                        container: {
                                            0x5031: { name: 'order', value: types_1.DataType.uint },
                                            0x5032: { name: 'scope', value: types_1.DataType.bool },
                                            0x5033: { name: 'type', value: types_1.DataType.uint },
                                            0x5034: {
                                                name: 'contentEncoding',
                                                container: {
                                                    0x4254: { name: 'contentCompAlgo', value: types_1.DataType.uint },
                                                    0x4255: { name: 'contentCompSettings', value: types_1.DataType.binary }
                                                }
                                            },
                                            0x5035: {
                                                name: 'contentEncoding',
                                                container: {
                                                    0x47e1: { name: 'contentEncAlgo', value: types_1.DataType.uint },
                                                    0x47e2: { name: 'contentEncKeyID', value: types_1.DataType.binary },
                                                    0x47e3: { name: 'contentSignature ', value: types_1.DataType.binary },
                                                    0x47e4: { name: 'ContentSigKeyID  ', value: types_1.DataType.binary },
                                                    0x47e5: { name: 'contentSigAlgo ', value: types_1.DataType.uint },
                                                    0x47e6: { name: 'contentSigHashAlgo ', value: types_1.DataType.uint }
                                                }
                                            },
                                            0x6264: { name: 'bitDepth', value: types_1.DataType.uint }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            // Cueing Data
            0x1c53bb6b: {
                name: 'cues',
                container: {
                    0xbb: {
                        name: 'cuePoint',
                        container: {
                            0xb3: { name: 'cueTime', value: types_1.DataType.uid },
                            0xb7: {
                                name: 'positions',
                                container: {
                                    0xf7: { name: 'track', value: types_1.DataType.uint },
                                    0xf1: { name: 'clusterPosition', value: types_1.DataType.uint },
                                    0x5378: { name: 'blockNumber', value: types_1.DataType.uint },
                                    0xea: { name: 'codecState', value: types_1.DataType.uint },
                                    0xdb: {
                                        name: 'reference', container: {
                                            0x96: { name: 'time', value: types_1.DataType.uint },
                                            0x97: { name: 'cluster', value: types_1.DataType.uint },
                                            0x535f: { name: 'number', value: types_1.DataType.uint },
                                            0xeb: { name: 'codecState', value: types_1.DataType.uint }
                                        }
                                    },
                                    0xf0: { name: 'relativePosition', value: types_1.DataType.uint } // extended
                                }
                            }
                        }
                    }
                }
            },
            // Attachment
            0x1941a469: {
                name: 'attachments',
                container: {
                    0x61a7: {
                        name: 'attachedFiles',
                        multiple: true,
                        container: {
                            0x467e: { name: 'description', value: types_1.DataType.string },
                            0x466e: { name: 'name', value: types_1.DataType.string },
                            0x4660: { name: 'mimeType', value: types_1.DataType.string },
                            0x465c: { name: 'data', value: types_1.DataType.binary },
                            0x46ae: { name: 'uid', value: types_1.DataType.uid }
                        }
                    }
                }
            },
            // Chapters
            0x1043a770: {
                name: 'chapters',
                container: {
                    0x45b9: {
                        name: 'editionEntry',
                        container: {
                            0xb6: {
                                name: 'chapterAtom',
                                container: {
                                    0x73c4: { name: 'uid', value: types_1.DataType.uid },
                                    0x91: { name: 'timeStart', value: types_1.DataType.uint },
                                    0x92: { name: 'timeEnd', value: types_1.DataType.uid },
                                    0x98: { name: 'hidden', value: types_1.DataType.bool },
                                    0x4598: { name: 'enabled', value: types_1.DataType.uid },
                                    0x8f: { name: 'track', container: {
                                            0x89: { name: 'trackNumber', value: types_1.DataType.uid },
                                            0x80: {
                                                name: 'display', container: {
                                                    0x85: { name: 'string', value: types_1.DataType.string },
                                                    0x437c: { name: 'language ', value: types_1.DataType.string },
                                                    0x437e: { name: 'country ', value: types_1.DataType.string }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            // Tagging
            0x1254c367: {
                name: 'tags',
                container: {
                    0x7373: {
                        name: 'tag',
                        multiple: true,
                        container: {
                            0x63c0: {
                                name: 'target',
                                container: {
                                    0x63c5: { name: 'tagTrackUID', value: types_1.DataType.uid },
                                    0x63c4: { name: 'tagChapterUID', value: types_1.DataType.uint },
                                    0x63c6: { name: 'tagAttachmentUID', value: types_1.DataType.uid },
                                    0x63ca: { name: 'targetType', value: types_1.DataType.string },
                                    0x68ca: { name: 'targetTypeValue', value: types_1.DataType.uint },
                                    0x63c9: { name: 'tagEditionUID', value: types_1.DataType.uid } // extended
                                }
                            },
                            0x67c8: {
                                name: 'simpleTags',
                                multiple: true,
                                container: {
                                    0x45a3: { name: 'name', value: types_1.DataType.string },
                                    0x4487: { name: 'string', value: types_1.DataType.string },
                                    0x4485: { name: 'binary', value: types_1.DataType.binary },
                                    0x447a: { name: 'language', value: types_1.DataType.string },
                                    0x447b: { name: 'languageIETF', value: types_1.DataType.string },
                                    0x4484: { name: 'default', value: types_1.DataType.bool } // extended
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

}, function(modId) { var map = {"./types":1665830430490}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430558, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomUint8ArrayReader = void 0;
/**
 * Provides abstract Uint8Array access via the IRandomRead interface
 */
class RandomUint8ArrayReader {
    constructor(uint8Array) {
        this.uint8Array = uint8Array;
        this.fileSize = uint8Array.length;
    }
    /**
     * Read from a given position of an abstracted file or buffer.
     * @param uint8Array - Uint8Array that the data will be written to.
     * @param offset - Offset in the buffer to start writing at.
     * @param length - Integer specifying the number of bytes to read.
     * @param position - Specifies where to begin reading from in the file.
     * @return Promise providing bytes read
     */
    async randomRead(uint8Array, offset, length, position) {
        uint8Array.set(this.uint8Array.subarray(position, position + length), offset);
        return length;
    }
}
exports.RandomUint8ArrayReader = RandomUint8ArrayReader;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430559, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.getLyricsHeaderLength = exports.endTag2 = void 0;
exports.endTag2 = 'LYRICS200';
async function getLyricsHeaderLength(reader) {
    if (reader.fileSize >= 143) {
        const buf = Buffer.alloc(15);
        await reader.randomRead(buf, 0, buf.length, reader.fileSize - 143);
        const txt = buf.toString('binary');
        const tag = txt.substr(6);
        if (tag === exports.endTag2) {
            return parseInt(txt.substr(0, 6), 10) + 15;
        }
    }
    return 0;
}
exports.getLyricsHeaderLength = getLyricsHeaderLength;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430560, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomFileReader = void 0;
const fs = require("fs");
/**
 * Provides abstract file access via the IRandomRead interface
 */
class RandomFileReader {
    constructor(fileHandle, filePath, fileSize) {
        this.fileHandle = fileHandle;
        this.filePath = filePath;
        this.fileSize = fileSize;
    }
    /**
     * Read from a given position of an abstracted file or buffer.
     * @param buffer {Buffer} is the buffer that the data will be written to.
     * @param offset {number} is the offset in the buffer to start writing at.
     * @param length {number}is an integer specifying the number of bytes to read.
     * @param position {number} is an argument specifying where to begin reading from in the file.
     * @return {Promise<number>} bytes read
     */
    async randomRead(buffer, offset, length, position) {
        const result = await this.fileHandle.read(buffer, offset, length, position);
        return result.bytesRead;
    }
    async close() {
        return this.fileHandle.close();
    }
    static async init(filePath, fileSize) {
        const fileHandle = await fs.promises.open(filePath, 'r');
        return new RandomFileReader(fileHandle, filePath, fileSize);
    }
}
exports.RandomFileReader = RandomFileReader;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1665830430485);
})()
//miniprogram-npm-outsideDeps=["strtok3","debug","strtok3/lib/core","file-type/core","content-type","media-typer","token-types","fs"]
//# sourceMappingURL=index.js.map