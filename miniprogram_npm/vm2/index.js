module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1665830430797, function(require, module, exports) {
if (parseInt(process.versions.node.split('.')[0]) < 6) throw new Error('vm2 requires Node.js version 6 or newer.');

module.exports = require('./lib/main');

}, function(modId) {var map = {"./lib/main":1665830430798}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430798, function(require, module, exports) {


const {
	VMError
} = require('./bridge');
const {
	VMScript
} = require('./script');
const {
	VM
} = require('./vm');
const {
	NodeVM
} = require('./nodevm');

exports.VMError = VMError;
exports.VMScript = VMScript;
exports.NodeVM = NodeVM;
exports.VM = VM;

}, function(modId) { var map = {"./bridge":1665830430799,"./script":1665830430800,"./vm":1665830430801,"./nodevm":1665830430805}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430799, function(require, module, exports) {


/**
 * __        ___    ____  _   _ ___ _   _  ____
 * \ \      / / \  |  _ \| \ | |_ _| \ | |/ ___|
 *  \ \ /\ / / _ \ | |_) |  \| || ||  \| | |  _
 *   \ V  V / ___ \|  _ <| |\  || || |\  | |_| |
 *    \_/\_/_/   \_\_| \_\_| \_|___|_| \_|\____|
 *
 * This file is critical for vm2. It implements the bridge between the host and the sandbox.
 * If you do not know exactly what you are doing, you should NOT edit this file.
 *
 * The file is loaded in the host and sandbox to handle objects in both directions.
 * This is done to ensure that RangeErrors are from the correct context.
 * The boundary between the sandbox and host might throw RangeErrors from both contexts.
 * Therefore, thisFromOther and friends can handle objects from both domains.
 *
 * Method parameters have comments to tell from which context they came.
 *
 */

const globalsList = [
	'Number',
	'String',
	'Boolean',
	'Date',
	'RegExp',
	'Map',
	'WeakMap',
	'Set',
	'WeakSet',
	'Promise',
	'Function'
];

const errorsList = [
	'RangeError',
	'ReferenceError',
	'SyntaxError',
	'TypeError',
	'EvalError',
	'URIError',
	'Error'
];

const OPNA = 'Operation not allowed on contextified object.';

const thisGlobalPrototypes = {
	__proto__: null,
	Object: Object.prototype,
	Array: Array.prototype
};

for (let i = 0; i < globalsList.length; i++) {
	const key = globalsList[i];
	const g = global[key];
	if (g) thisGlobalPrototypes[key] = g.prototype;
}

for (let i = 0; i < errorsList.length; i++) {
	const key = errorsList[i];
	const g = global[key];
	if (g) thisGlobalPrototypes[key] = g.prototype;
}

const {
	getPrototypeOf: thisReflectGetPrototypeOf,
	setPrototypeOf: thisReflectSetPrototypeOf,
	defineProperty: thisReflectDefineProperty,
	deleteProperty: thisReflectDeleteProperty,
	getOwnPropertyDescriptor: thisReflectGetOwnPropertyDescriptor,
	isExtensible: thisReflectIsExtensible,
	preventExtensions: thisReflectPreventExtensions,
	apply: thisReflectApply,
	construct: thisReflectConstruct,
	set: thisReflectSet,
	get: thisReflectGet,
	has: thisReflectHas,
	ownKeys: thisReflectOwnKeys,
	enumerate: thisReflectEnumerate,
} = Reflect;

const thisObject = Object;
const {
	freeze: thisObjectFreeze,
	prototype: thisObjectPrototype
} = thisObject;
const thisObjectHasOwnProperty = thisObjectPrototype.hasOwnProperty;
const ThisProxy = Proxy;
const ThisWeakMap = WeakMap;
const {
	get: thisWeakMapGet,
	set: thisWeakMapSet
} = ThisWeakMap.prototype;
const ThisMap = Map;
const thisMapGet = ThisMap.prototype.get;
const thisMapSet = ThisMap.prototype.set;
const thisFunction = Function;
const thisFunctionBind = thisFunction.prototype.bind;
const thisArrayIsArray = Array.isArray;
const thisErrorCaptureStackTrace = Error.captureStackTrace;

const thisSymbolToString = Symbol.prototype.toString;
const thisSymbolToStringTag = Symbol.toStringTag;
const thisSymbolIterator = Symbol.iterator;
const thisSymbolNodeJSUtilInspectCustom = Symbol.for('nodejs.util.inspect.custom');

/**
 * VMError.
 *
 * @public
 * @extends {Error}
 */
class VMError extends Error {

	/**
	 * Create VMError instance.
	 *
	 * @public
	 * @param {string} message - Error message.
	 * @param {string} code - Error code.
	 */
	constructor(message, code) {
		super(message);

		this.name = 'VMError';
		this.code = code;

		thisErrorCaptureStackTrace(this, this.constructor);
	}
}

thisGlobalPrototypes['VMError'] = VMError.prototype;

function thisUnexpected() {
	return new VMError('Unexpected');
}

if (!thisReflectSetPrototypeOf(exports, null)) throw thisUnexpected();

function thisSafeGetOwnPropertyDescriptor(obj, key) {
	const desc = thisReflectGetOwnPropertyDescriptor(obj, key);
	if (!desc) return desc;
	if (!thisReflectSetPrototypeOf(desc, null)) throw thisUnexpected();
	return desc;
}

function thisThrowCallerCalleeArgumentsAccess(key) {
	
	thisThrowCallerCalleeArgumentsAccess[key];
	return thisUnexpected();
}

function thisIdMapping(factory, other) {
	return other;
}

const thisThrowOnKeyAccessHandler = thisObjectFreeze({
	__proto__: null,
	get(target, key, receiver) {
		if (typeof key === 'symbol') {
			key = thisReflectApply(thisSymbolToString, key, []);
		}
		throw new VMError(`Unexpected access to key '${key}'`);
	}
});

const emptyForzenObject = thisObjectFreeze({
	__proto__: null
});

const thisThrowOnKeyAccess = new ThisProxy(emptyForzenObject, thisThrowOnKeyAccessHandler);

function SafeBase() {}

if (!thisReflectDefineProperty(SafeBase, 'prototype', {
	__proto__: null,
	value: thisThrowOnKeyAccess
})) throw thisUnexpected();

function SHARED_FUNCTION() {}

const TEST_PROXY_HANDLER = thisObjectFreeze({
	__proto__: thisThrowOnKeyAccess,
	construct() {
		return this;
	}
});

function thisIsConstructor(obj) {
	// Note: obj@any(unsafe)
	const Func = new ThisProxy(obj, TEST_PROXY_HANDLER);
	try {
		// eslint-disable-next-line no-new
		new Func();
		return true;
	} catch (e) {
		return false;
	}
}

function thisCreateTargetObject(obj, proto) {
	// Note: obj@any(unsafe) proto@any(unsafe) returns@this(unsafe) throws@this(unsafe)
	let base;
	if (typeof obj === 'function') {
		if (thisIsConstructor(obj)) {
			// Bind the function since bound functions do not have a prototype property.
			base = thisReflectApply(thisFunctionBind, SHARED_FUNCTION, [null]);
		} else {
			base = () => {};
		}
	} else if (thisArrayIsArray(obj)) {
		base = [];
	} else {
		return {__proto__: proto};
	}
	if (!thisReflectSetPrototypeOf(base, proto)) throw thisUnexpected();
	return base;
}

function createBridge(otherInit, registerProxy) {

	const mappingOtherToThis = new ThisWeakMap();
	const protoMappings = new ThisMap();
	const protoName = new ThisMap();

	function thisAddProtoMapping(proto, other, name) {
		// Note: proto@this(unsafe) other@other(unsafe) name@this(unsafe) throws@this(unsafe)
		thisReflectApply(thisMapSet, protoMappings, [proto, thisIdMapping]);
		thisReflectApply(thisMapSet, protoMappings, [other,
			(factory, object) => thisProxyOther(factory, object, proto)]);
		if (name) thisReflectApply(thisMapSet, protoName, [proto, name]);
	}

	function thisAddProtoMappingFactory(protoFactory, other, name) {
		// Note: protoFactory@this(unsafe) other@other(unsafe) name@this(unsafe) throws@this(unsafe)
		let proto;
		thisReflectApply(thisMapSet, protoMappings, [other,
			(factory, object) => {
				if (!proto) {
					proto = protoFactory();
					thisReflectApply(thisMapSet, protoMappings, [proto, thisIdMapping]);
					if (name) thisReflectApply(thisMapSet, protoName, [proto, name]);
				}
				return thisProxyOther(factory, object, proto);
			}]);
	}

	const result = {
		__proto__: null,
		globalPrototypes: thisGlobalPrototypes,
		safeGetOwnPropertyDescriptor: thisSafeGetOwnPropertyDescriptor,
		fromArguments: thisFromOtherArguments,
		from: thisFromOther,
		fromWithFactory: thisFromOtherWithFactory,
		ensureThis: thisEnsureThis,
		mapping: mappingOtherToThis,
		connect: thisConnect,
		reflectSet: thisReflectSet,
		reflectGet: thisReflectGet,
		reflectDefineProperty: thisReflectDefineProperty,
		reflectDeleteProperty: thisReflectDeleteProperty,
		reflectApply: thisReflectApply,
		reflectConstruct: thisReflectConstruct,
		reflectHas: thisReflectHas,
		reflectOwnKeys: thisReflectOwnKeys,
		reflectEnumerate: thisReflectEnumerate,
		reflectGetPrototypeOf: thisReflectGetPrototypeOf,
		reflectIsExtensible: thisReflectIsExtensible,
		reflectPreventExtensions: thisReflectPreventExtensions,
		objectHasOwnProperty: thisObjectHasOwnProperty,
		weakMapSet: thisWeakMapSet,
		addProtoMapping: thisAddProtoMapping,
		addProtoMappingFactory: thisAddProtoMappingFactory,
		defaultFactory,
		protectedFactory,
		readonlyFactory,
		VMError
	};

	const isHost = typeof otherInit !== 'object';

	if (isHost) {
		otherInit = otherInit(result, registerProxy);
	}

	result.other = otherInit;

	const {
		globalPrototypes: otherGlobalPrototypes,
		safeGetOwnPropertyDescriptor: otherSafeGetOwnPropertyDescriptor,
		fromArguments: otherFromThisArguments,
		from: otherFromThis,
		mapping: mappingThisToOther,
		reflectSet: otherReflectSet,
		reflectGet: otherReflectGet,
		reflectDefineProperty: otherReflectDefineProperty,
		reflectDeleteProperty: otherReflectDeleteProperty,
		reflectApply: otherReflectApply,
		reflectConstruct: otherReflectConstruct,
		reflectHas: otherReflectHas,
		reflectOwnKeys: otherReflectOwnKeys,
		reflectEnumerate: otherReflectEnumerate,
		reflectGetPrototypeOf: otherReflectGetPrototypeOf,
		reflectIsExtensible: otherReflectIsExtensible,
		reflectPreventExtensions: otherReflectPreventExtensions,
		objectHasOwnProperty: otherObjectHasOwnProperty,
		weakMapSet: otherWeakMapSet
	} = otherInit;

	function thisOtherHasOwnProperty(object, key) {
		// Note: object@other(safe) key@prim throws@this(unsafe)
		try {
			return otherReflectApply(otherObjectHasOwnProperty, object, [key]) === true;
		} catch (e) { // @other(unsafe)
			throw thisFromOtherForThrow(e);
		}
	}

	function thisDefaultGet(handler, object, key, desc) {
		// Note: object@other(unsafe) key@prim desc@other(safe)
		let ret; // @other(unsafe)
		if (desc.get || desc.set) {
			const getter = desc.get;
			if (!getter) return undefined;
			try {
				ret = otherReflectApply(getter, object, [key]);
			} catch (e) {
				throw thisFromOtherForThrow(e);
			}
		} else {
			ret = desc.value;
		}
		return handler.fromOtherWithContext(ret);
	}

	function otherFromThisIfAvailable(to, from, key) {
		// Note: to@other(safe) from@this(safe) key@prim throws@this(unsafe)
		if (!thisReflectApply(thisObjectHasOwnProperty, from, [key])) return false;
		try {
			to[key] = otherFromThis(from[key]);
		} catch (e) { // @other(unsafe)
			throw thisFromOtherForThrow(e);
		}
		return true;
	}

	class BaseHandler extends SafeBase {

		constructor(object) {
			// Note: object@other(unsafe) throws@this(unsafe)
			super();
			this.objectWrapper = () => object;
		}

		getObject() {
			return this.objectWrapper();
		}

		getFactory() {
			return defaultFactory;
		}

		fromOtherWithContext(other) {
			// Note: other@other(unsafe) throws@this(unsafe)
			return thisFromOtherWithFactory(this.getFactory(), other);
		}

		doPreventExtensions(target, object, factory) {
			// Note: target@this(unsafe) object@other(unsafe) throws@this(unsafe)
			let keys; // @other(safe-array-of-prim)
			try {
				keys = otherReflectOwnKeys(object);
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i]; // @prim
				let desc;
				try {
					desc = otherSafeGetOwnPropertyDescriptor(object, key);
				} catch (e) { // @other(unsafe)
					throw thisFromOtherForThrow(e);
				}
				if (!desc) continue;
				if (!desc.configurable) {
					const current = thisSafeGetOwnPropertyDescriptor(target, key);
					if (current && !current.configurable) continue;
					if (desc.get || desc.set) {
						desc.get = this.fromOtherWithContext(desc.get);
						desc.set = this.fromOtherWithContext(desc.set);
					} else if (typeof object === 'function' && (key === 'caller' || key === 'callee' || key === 'arguments')) {
						desc.value = null;
					} else {
						desc.value = this.fromOtherWithContext(desc.value);
					}
				} else {
					if (desc.get || desc.set) {
						desc = {
							__proto__: null,
							configurable: true,
							enumerable: desc.enumerable,
							writable: true,
							value: null
						};
					} else {
						desc.value = null;
					}
				}
				if (!thisReflectDefineProperty(target, key, desc)) throw thisUnexpected();
			}
			if (!thisReflectPreventExtensions(target)) throw thisUnexpected();
		}

		get(target, key, receiver) {
			// Note: target@this(unsafe) key@prim receiver@this(unsafe) throws@this(unsafe)
			const object = this.getObject(); // @other(unsafe)
			switch (key) {
				case 'constructor': {
					const desc = otherSafeGetOwnPropertyDescriptor(object, key);
					if (desc) return thisDefaultGet(this, object, key, desc);
					const proto = thisReflectGetPrototypeOf(target);
					return proto === null ? undefined : proto.constructor;
				}
				case '__proto__': {
					const desc = otherSafeGetOwnPropertyDescriptor(object, key);
					if (desc) return thisDefaultGet(this, object, key, desc);
					return thisReflectGetPrototypeOf(target);
				}
				case thisSymbolToStringTag:
					if (!thisOtherHasOwnProperty(object, thisSymbolToStringTag)) {
						const proto = thisReflectGetPrototypeOf(target);
						const name = thisReflectApply(thisMapGet, protoName, [proto]);
						if (name) return name;
					}
					break;
				case 'arguments':
				case 'caller':
				case 'callee':
					if (typeof object === 'function' && thisOtherHasOwnProperty(object, key)) {
						throw thisThrowCallerCalleeArgumentsAccess(key);
					}
					break;
			}
			let ret; // @other(unsafe)
			try {
				ret = otherReflectGet(object, key);
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
			return this.fromOtherWithContext(ret);
		}

		set(target, key, value, receiver) {
			// Note: target@this(unsafe) key@prim value@this(unsafe) receiver@this(unsafe) throws@this(unsafe)
			const object = this.getObject(); // @other(unsafe)
			if (key === '__proto__' && !thisOtherHasOwnProperty(object, key)) {
				return this.setPrototypeOf(target, value);
			}
			try {
				value = otherFromThis(value);
				return otherReflectSet(object, key, value) === true;
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
		}

		getPrototypeOf(target) {
			// Note: target@this(unsafe)
			return thisReflectGetPrototypeOf(target);
		}

		setPrototypeOf(target, value) {
			// Note: target@this(unsafe) throws@this(unsafe)
			throw new VMError(OPNA);
		}

		apply(target, context, args) {
			// Note: target@this(unsafe) context@this(unsafe) args@this(safe-array) throws@this(unsafe)
			const object = this.getObject(); // @other(unsafe)
			let ret; // @other(unsafe)
			try {
				context = otherFromThis(context);
				args = otherFromThisArguments(args);
				ret = otherReflectApply(object, context, args);
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
			return thisFromOther(ret);
		}

		construct(target, args, newTarget) {
			// Note: target@this(unsafe) args@this(safe-array) newTarget@this(unsafe) throws@this(unsafe)
			const object = this.getObject(); // @other(unsafe)
			let ret; // @other(unsafe)
			try {
				args = otherFromThisArguments(args);
				ret = otherReflectConstruct(object, args);
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
			return thisFromOtherWithFactory(this.getFactory(), ret, thisFromOther(object));
		}

		getOwnPropertyDescriptorDesc(target, prop, desc) {
			// Note: target@this(unsafe) prop@prim desc@other{safe} throws@this(unsafe)
			const object = this.getObject(); // @other(unsafe)
			if (desc && typeof object === 'function' && (prop === 'arguments' || prop === 'caller' || prop === 'callee')) desc.value = null;
			return desc;
		}

		getOwnPropertyDescriptor(target, prop) {
			// Note: target@this(unsafe) prop@prim throws@this(unsafe)
			const object = this.getObject(); // @other(unsafe)
			let desc; // @other(safe)
			try {
				desc = otherSafeGetOwnPropertyDescriptor(object, prop);
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}

			desc = this.getOwnPropertyDescriptorDesc(target, prop, desc);

			if (!desc) return undefined;

			let thisDesc;
			if (desc.get || desc.set) {
				thisDesc = {
					__proto__: null,
					get: this.fromOtherWithContext(desc.get),
					set: this.fromOtherWithContext(desc.set),
					enumerable: desc.enumerable === true,
					configurable: desc.configurable === true
				};
			} else {
				thisDesc = {
					__proto__: null,
					value: this.fromOtherWithContext(desc.value),
					writable: desc.writable === true,
					enumerable: desc.enumerable === true,
					configurable: desc.configurable === true
				};
			}
			if (!thisDesc.configurable) {
				const oldDesc = thisSafeGetOwnPropertyDescriptor(target, prop);
				if (!oldDesc || oldDesc.configurable || oldDesc.writable !== thisDesc.writable) {
					if (!thisReflectDefineProperty(target, prop, thisDesc)) throw thisUnexpected();
				}
			}
			return thisDesc;
		}

		definePropertyDesc(target, prop, desc) {
			// Note: target@this(unsafe) prop@prim desc@this(safe) throws@this(unsafe)
			return desc;
		}

		defineProperty(target, prop, desc) {
			// Note: target@this(unsafe) prop@prim desc@this(unsafe) throws@this(unsafe)
			const object = this.getObject(); // @other(unsafe)
			if (!thisReflectSetPrototypeOf(desc, null)) throw thisUnexpected();

			desc = this.definePropertyDesc(target, prop, desc);

			if (!desc) return false;

			let otherDesc = {__proto__: null};
			let hasFunc = true;
			let hasValue = true;
			let hasBasic = true;
			hasFunc &= otherFromThisIfAvailable(otherDesc, desc, 'get');
			hasFunc &= otherFromThisIfAvailable(otherDesc, desc, 'set');
			hasValue &= otherFromThisIfAvailable(otherDesc, desc, 'value');
			hasValue &= otherFromThisIfAvailable(otherDesc, desc, 'writable');
			hasBasic &= otherFromThisIfAvailable(otherDesc, desc, 'enumerable');
			hasBasic &= otherFromThisIfAvailable(otherDesc, desc, 'configurable');

			try {
				if (!otherReflectDefineProperty(object, prop, otherDesc)) return false;
				if (otherDesc.configurable !== true && (!hasBasic || !(hasFunc || hasValue))) {
					otherDesc = otherSafeGetOwnPropertyDescriptor(object, prop);
				}
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}

			if (!otherDesc.configurable) {
				let thisDesc;
				if (otherDesc.get || otherDesc.set) {
					thisDesc = {
						__proto__: null,
						get: this.fromOtherWithContext(otherDesc.get),
						set: this.fromOtherWithContext(otherDesc.set),
						enumerable: otherDesc.enumerable,
						configurable: otherDesc.configurable
					};
				} else {
					thisDesc = {
						__proto__: null,
						value: this.fromOtherWithContext(otherDesc.value),
						writable: otherDesc.writable,
						enumerable: otherDesc.enumerable,
						configurable: otherDesc.configurable
					};
				}
				if (!thisReflectDefineProperty(target, prop, thisDesc)) throw thisUnexpected();
			}
			return true;
		}

		deleteProperty(target, prop) {
			// Note: target@this(unsafe) prop@prim throws@this(unsafe)
			const object = this.getObject(); // @other(unsafe)
			try {
				return otherReflectDeleteProperty(object, prop) === true;
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
		}

		has(target, key) {
			// Note: target@this(unsafe) key@prim throws@this(unsafe)
			const object = this.getObject(); // @other(unsafe)
			try {
				return otherReflectHas(object, key) === true;
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
		}

		isExtensible(target) {
			// Note: target@this(unsafe) throws@this(unsafe)
			const object = this.getObject(); // @other(unsafe)
			try {
				if (otherReflectIsExtensible(object)) return true;
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
			if (thisReflectIsExtensible(target)) {
				this.doPreventExtensions(target, object, this);
			}
			return false;
		}

		ownKeys(target) {
			// Note: target@this(unsafe) throws@this(unsafe)
			const object = this.getObject(); // @other(unsafe)
			let res; // @other(unsafe)
			try {
				res = otherReflectOwnKeys(object);
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
			return thisFromOther(res);
		}

		preventExtensions(target) {
			// Note: target@this(unsafe) throws@this(unsafe)
			const object = this.getObject(); // @other(unsafe)
			try {
				if (!otherReflectPreventExtensions(object)) return false;
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
			if (thisReflectIsExtensible(target)) {
				this.doPreventExtensions(target, object, this);
			}
			return true;
		}

		enumerate(target) {
			// Note: target@this(unsafe) throws@this(unsafe)
			const object = this.getObject(); // @other(unsafe)
			let res; // @other(unsafe)
			try {
				res = otherReflectEnumerate(object);
			} catch (e) { // @other(unsafe)
				throw thisFromOtherForThrow(e);
			}
			return this.fromOtherWithContext(res);
		}

	}

	BaseHandler.prototype[thisSymbolNodeJSUtilInspectCustom] = undefined;
	BaseHandler.prototype[thisSymbolToStringTag] = 'VM2 Wrapper';
	BaseHandler.prototype[thisSymbolIterator] = undefined;

	function defaultFactory(object) {
		// Note: other@other(unsafe) returns@this(unsafe) throws@this(unsafe)
		return new BaseHandler(object);
	}

	class ProtectedHandler extends BaseHandler {

		getFactory() {
			return protectedFactory;
		}

		set(target, key, value, receiver) {
			// Note: target@this(unsafe) key@prim value@this(unsafe) receiver@this(unsafe) throws@this(unsafe)
			if (typeof value === 'function') {
				return thisReflectDefineProperty(receiver, key, {
					__proto__: null,
					value: value,
					writable: true,
					enumerable: true,
					configurable: true
				}) === true;
			}
			return super.set(target, key, value, receiver);
		}

		definePropertyDesc(target, prop, desc) {
			// Note: target@this(unsafe) prop@prim desc@this(safe) throws@this(unsafe)
			if (desc && (desc.set || desc.get || typeof desc.value === 'function')) return undefined;
			return desc;
		}

	}

	function protectedFactory(object) {
		// Note: other@other(unsafe) returns@this(unsafe) throws@this(unsafe)
		return new ProtectedHandler(object);
	}

	class ReadOnlyHandler extends BaseHandler {

		getFactory() {
			return readonlyFactory;
		}

		set(target, key, value, receiver) {
			// Note: target@this(unsafe) key@prim value@this(unsafe) receiver@this(unsafe) throws@this(unsafe)
			return thisReflectDefineProperty(receiver, key, {
				__proto__: null,
				value: value,
				writable: true,
				enumerable: true,
				configurable: true
			});
		}

		setPrototypeOf(target, value) {
			// Note: target@this(unsafe) throws@this(unsafe)
			return false;
		}

		defineProperty(target, prop, desc) {
			// Note: target@this(unsafe) prop@prim desc@this(unsafe) throws@this(unsafe)
			return false;
		}

		deleteProperty(target, prop) {
			// Note: target@this(unsafe) prop@prim throws@this(unsafe)
			return false;
		}

		isExtensible(target) {
			// Note: target@this(unsafe) throws@this(unsafe)
			return false;
		}

		preventExtensions(target) {
			// Note: target@this(unsafe) throws@this(unsafe)
			return false;
		}

	}

	function readonlyFactory(object) {
		// Note: other@other(unsafe) returns@this(unsafe) throws@this(unsafe)
		return new ReadOnlyHandler(object);
	}

	class ReadOnlyMockHandler extends ReadOnlyHandler {

		constructor(object, mock) {
			// Note: object@other(unsafe) mock:this(unsafe) throws@this(unsafe)
			super(object);
			this.mock = mock;
		}

		get(target, key, receiver) {
			// Note: target@this(unsafe) key@prim receiver@this(unsafe) throws@this(unsafe)
			const object = this.getObject(); // @other(unsafe)
			const mock = this.mock;
			if (thisReflectApply(thisObjectHasOwnProperty, mock, key) && !thisOtherHasOwnProperty(object, key)) {
				return mock[key];
			}
			return super.get(target, key, receiver);
		}

	}

	function thisFromOther(other) {
		// Note: other@other(unsafe) returns@this(unsafe) throws@this(unsafe)
		return thisFromOtherWithFactory(defaultFactory, other);
	}

	function thisProxyOther(factory, other, proto) {
		const target = thisCreateTargetObject(other, proto);
		const handler = factory(other);
		const proxy = new ThisProxy(target, handler);
		try {
			otherReflectApply(otherWeakMapSet, mappingThisToOther, [proxy, other]);
			registerProxy(proxy, handler);
		} catch (e) {
			throw new VMError('Unexpected error');
		}
		if (!isHost) {
			thisReflectApply(thisWeakMapSet, mappingOtherToThis, [other, proxy]);
			return proxy;
		}
		const proxy2 = new ThisProxy(proxy, emptyForzenObject);
		try {
			otherReflectApply(otherWeakMapSet, mappingThisToOther, [proxy2, other]);
			registerProxy(proxy2, handler);
		} catch (e) {
			throw new VMError('Unexpected error');
		}
		thisReflectApply(thisWeakMapSet, mappingOtherToThis, [other, proxy2]);
		return proxy2;
	}

	function thisEnsureThis(other) {
		const type = typeof other;
		switch (type) {
			case 'object':
				if (other === null) {
					return null;
				}
				// fallthrough
			case 'function':
				let proto = thisReflectGetPrototypeOf(other);
				if (!proto) {
					return other;
				}
				while (proto) {
					const mapping = thisReflectApply(thisMapGet, protoMappings, [proto]);
					if (mapping) {
						const mapped = thisReflectApply(thisWeakMapGet, mappingOtherToThis, [other]);
						if (mapped) return mapped;
						return mapping(defaultFactory, other);
					}
					proto = thisReflectGetPrototypeOf(proto);
				}
				return other;
			case 'undefined':
			case 'string':
			case 'number':
			case 'boolean':
			case 'symbol':
			case 'bigint':
				return other;

			default: // new, unknown types can be dangerous
				throw new VMError(`Unknown type '${type}'`);
		}
	}

	function thisFromOtherForThrow(other) {
		for (let loop = 0; loop < 10; loop++) {
			const type = typeof other;
			switch (type) {
				case 'object':
					if (other === null) {
						return null;
					}
					// fallthrough
				case 'function':
					const mapped = thisReflectApply(thisWeakMapGet, mappingOtherToThis, [other]);
					if (mapped) return mapped;
					let proto;
					try {
						proto = otherReflectGetPrototypeOf(other);
					} catch (e) { // @other(unsafe)
						other = e;
						break;
					}
					if (!proto) {
						return thisProxyOther(defaultFactory, other, null);
					}
					for (;;) {
						const mapping = thisReflectApply(thisMapGet, protoMappings, [proto]);
						if (mapping) return mapping(defaultFactory, other);
						try {
							proto = otherReflectGetPrototypeOf(proto);
						} catch (e) { // @other(unsafe)
							other = e;
							break;
						}
						if (!proto) return thisProxyOther(defaultFactory, other, thisObjectPrototype);
					}
					break;
				case 'undefined':
				case 'string':
				case 'number':
				case 'boolean':
				case 'symbol':
				case 'bigint':
					return other;

				default: // new, unknown types can be dangerous
					throw new VMError(`Unknown type '${type}'`);
			}
		}
		throw new VMError('Exception recursion depth');
	}

	function thisFromOtherWithFactory(factory, other, proto) {
		const type = typeof other;
		switch (type) {
			case 'object':
				if (other === null) {
					return null;
				}
				// fallthrough
			case 'function':
				const mapped = thisReflectApply(thisWeakMapGet, mappingOtherToThis, [other]);
				if (mapped) return mapped;
				if (proto) {
					return thisProxyOther(factory, other, proto);
				}
				try {
					proto = otherReflectGetPrototypeOf(other);
				} catch (e) { // @other(unsafe)
					throw thisFromOtherForThrow(e);
				}
				if (!proto) {
					return thisProxyOther(factory, other, null);
				}
				do {
					const mapping = thisReflectApply(thisMapGet, protoMappings, [proto]);
					if (mapping) return mapping(factory, other);
					try {
						proto = otherReflectGetPrototypeOf(proto);
					} catch (e) { // @other(unsafe)
						throw thisFromOtherForThrow(e);
					}
				} while (proto);
				return thisProxyOther(factory, other, thisObjectPrototype);
			case 'undefined':
			case 'string':
			case 'number':
			case 'boolean':
			case 'symbol':
			case 'bigint':
				return other;

			default: // new, unknown types can be dangerous
				throw new VMError(`Unknown type '${type}'`);
		}
	}

	function thisFromOtherArguments(args) {
		// Note: args@other(safe-array) returns@this(safe-array) throws@this(unsafe)
		const arr = [];
		for (let i = 0; i < args.length; i++) {
			const value = thisFromOther(args[i]);
			thisReflectDefineProperty(arr, i, {
				__proto__: null,
				value: value,
				writable: true,
				enumerable: true,
				configurable: true
			});
		}
		return arr;
	}

	function thisConnect(obj, other) {
		// Note: obj@this(unsafe) other@other(unsafe) throws@this(unsafe)
		try {
			otherReflectApply(otherWeakMapSet, mappingThisToOther, [obj, other]);
		} catch (e) {
			throw new VMError('Unexpected error');
		}
		thisReflectApply(thisWeakMapSet, mappingOtherToThis, [other, obj]);
	}

	thisAddProtoMapping(thisGlobalPrototypes.Object, otherGlobalPrototypes.Object);
	thisAddProtoMapping(thisGlobalPrototypes.Array, otherGlobalPrototypes.Array);

	for (let i = 0; i < globalsList.length; i++) {
		const key = globalsList[i];
		const tp = thisGlobalPrototypes[key];
		const op = otherGlobalPrototypes[key];
		if (tp && op) thisAddProtoMapping(tp, op, key);
	}

	for (let i = 0; i < errorsList.length; i++) {
		const key = errorsList[i];
		const tp = thisGlobalPrototypes[key];
		const op = otherGlobalPrototypes[key];
		if (tp && op) thisAddProtoMapping(tp, op, 'Error');
	}

	thisAddProtoMapping(thisGlobalPrototypes.VMError, otherGlobalPrototypes.VMError, 'Error');

	result.BaseHandler = BaseHandler;
	result.ProtectedHandler = ProtectedHandler;
	result.ReadOnlyHandler = ReadOnlyHandler;
	result.ReadOnlyMockHandler = ReadOnlyMockHandler;

	return result;
}

exports.createBridge = createBridge;
exports.VMError = VMError;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430800, function(require, module, exports) {


const {Script} = require('vm');
const {
	lookupCompiler,
	removeShebang
} = require('./compiler');
const {
	transformer
} = require('./transformer');

const objectDefineProperties = Object.defineProperties;

const MODULE_PREFIX = '(function (exports, require, module, __filename, __dirname) { ';
const STRICT_MODULE_PREFIX = MODULE_PREFIX + '"use strict"; ';
const MODULE_SUFFIX = '\n});';

/**
 * Class Script
 *
 * @public
 */
class VMScript {

	/**
	 * The script code with wrapping. If set will invalidate the cache.<br>
	 * Writable only for backwards compatibility.
	 *
	 * @public
	 * @readonly
	 * @member {string} code
	 * @memberOf VMScript#
	 */

	/**
	 * The filename used for this script.
	 *
	 * @public
	 * @readonly
	 * @since v3.9.0
	 * @member {string} filename
	 * @memberOf VMScript#
	 */

	/**
	 * The line offset use for stack traces.
	 *
	 * @public
	 * @readonly
	 * @since v3.9.0
	 * @member {number} lineOffset
	 * @memberOf VMScript#
	 */

	/**
	 * The column offset use for stack traces.
	 *
	 * @public
	 * @readonly
	 * @since v3.9.0
	 * @member {number} columnOffset
	 * @memberOf VMScript#
	 */

	/**
	 * The compiler to use to get the JavaScript code.
	 *
	 * @public
	 * @readonly
	 * @since v3.9.0
	 * @member {(string|compileCallback)} compiler
	 * @memberOf VMScript#
	 */

	/**
	 * The prefix for the script.
	 *
	 * @private
	 * @member {string} _prefix
	 * @memberOf VMScript#
	 */

	/**
	 * The suffix for the script.
	 *
	 * @private
	 * @member {string} _suffix
	 * @memberOf VMScript#
	 */

	/**
	 * The compiled vm.Script for the VM or if not compiled <code>null</code>.
	 *
	 * @private
	 * @member {?vm.Script} _compiledVM
	 * @memberOf VMScript#
	 */

	/**
	 * The compiled vm.Script for the NodeVM or if not compiled <code>null</code>.
	 *
	 * @private
	 * @member {?vm.Script} _compiledNodeVM
	 * @memberOf VMScript#
	 */

	/**
	 * The compiled vm.Script for the NodeVM in strict mode or if not compiled <code>null</code>.
	 *
	 * @private
	 * @member {?vm.Script} _compiledNodeVMStrict
	 * @memberOf VMScript#
	 */

	/**
	 * The resolved compiler to use to get the JavaScript code.
	 *
	 * @private
	 * @readonly
	 * @member {compileCallback} _compiler
	 * @memberOf VMScript#
	 */

	/**
	 * The script to run without wrapping.
	 *
	 * @private
	 * @member {string} _code
	 * @memberOf VMScript#
	 */

	/**
	 * Whether or not the script contains async functions.
	 *
	 * @private
	 * @member {boolean} _hasAsync
	 * @memberOf VMScript#
	 */

	/**
	 * Create VMScript instance.
	 *
	 * @public
	 * @param {string} code - Code to run.
	 * @param {(string|Object)} [options] - Options map or filename.
	 * @param {string} [options.filename="vm.js"] - Filename that shows up in any stack traces produced from this script.
	 * @param {number} [options.lineOffset=0] - Passed to vm.Script options.
	 * @param {number} [options.columnOffset=0] - Passed to vm.Script options.
	 * @param {(string|compileCallback)} [options.compiler="javascript"] - The compiler to use.
	 * @throws {VMError} If the compiler is unknown or if coffee-script was requested but the module not found.
	 */
	constructor(code, options) {
		const sCode = `${code}`;
		let useFileName;
		let useOptions;
		if (arguments.length === 2) {
			if (typeof options === 'object') {
				useOptions = options || {__proto__: null};
				useFileName = useOptions.filename;
			} else {
				useOptions = {__proto__: null};
				useFileName = options;
			}
		} else if (arguments.length > 2) {
			// We do it this way so that there are no more arguments in the function.
			// eslint-disable-next-line prefer-rest-params
			useOptions = arguments[2] || {__proto__: null};
			useFileName = options || useOptions.filename;
		} else {
			useOptions = {__proto__: null};
		}

		const {
			compiler = 'javascript',
			lineOffset = 0,
			columnOffset = 0
		} = useOptions;

		// Throw if the compiler is unknown.
		const resolvedCompiler = lookupCompiler(compiler);

		objectDefineProperties(this, {
			__proto__: null,
			code: {
				__proto__: null,
				// Put this here so that it is enumerable, and looks like a property.
				get() {
					return this._prefix + this._code + this._suffix;
				},
				set(value) {
					const strNewCode = String(value);
					if (strNewCode === this._code && this._prefix === '' && this._suffix === '') return;
					this._code = strNewCode;
					this._prefix = '';
					this._suffix = '';
					this._compiledVM = null;
					this._compiledNodeVM = null;
					this._compiledCode = null;
				},
				enumerable: true
			},
			filename: {
				__proto__: null,
				value: useFileName || 'vm.js',
				enumerable: true
			},
			lineOffset: {
				__proto__: null,
				value: lineOffset,
				enumerable: true
			},
			columnOffset: {
				__proto__: null,
				value: columnOffset,
				enumerable: true
			},
			compiler: {
				__proto__: null,
				value: compiler,
				enumerable: true
			},
			_code: {
				__proto__: null,
				value: sCode,
				writable: true
			},
			_prefix: {
				__proto__: null,
				value: '',
				writable: true
			},
			_suffix: {
				__proto__: null,
				value: '',
				writable: true
			},
			_compiledVM: {
				__proto__: null,
				value: null,
				writable: true
			},
			_compiledNodeVM: {
				__proto__: null,
				value: null,
				writable: true
			},
			_compiledNodeVMStrict: {
				__proto__: null,
				value: null,
				writable: true
			},
			_compiledCode: {
				__proto__: null,
				value: null,
				writable: true
			},
			_hasAsync: {
				__proto__: null,
				value: false,
				writable: true
			},
			_compiler: {__proto__: null, value: resolvedCompiler}
		});
	}

	/**
	 * Wraps the code.<br>
	 * This will replace the old wrapping.<br>
	 * Will invalidate the code cache.
	 *
	 * @public
	 * @deprecated Since v3.9.0. Wrap your code before passing it into the VMScript object.
	 * @param {string} prefix - String that will be appended before the script code.
	 * @param {script} suffix - String that will be appended behind the script code.
	 * @return {this} This for chaining.
	 * @throws {TypeError} If prefix or suffix is a Symbol.
	 */
	wrap(prefix, suffix) {
		const strPrefix = `${prefix}`;
		const strSuffix = `${suffix}`;
		if (this._prefix === strPrefix && this._suffix === strSuffix) return this;
		this._prefix = strPrefix;
		this._suffix = strSuffix;
		this._compiledVM = null;
		this._compiledNodeVM = null;
		this._compiledNodeVMStrict = null;
		return this;
	}

	/**
	 * Compile this script. <br>
	 * This is useful to detect syntax errors in the script.
	 *
	 * @public
	 * @return {this} This for chaining.
	 * @throws {SyntaxError} If there is a syntax error in the script.
	 */
	compile() {
		this._compileVM();
		return this;
	}

	/**
	 * Get the compiled code.
	 *
	 * @private
	 * @return {string} The code.
	 */
	getCompiledCode() {
		if (!this._compiledCode) {
			const comp = this._compiler(this._prefix + removeShebang(this._code) + this._suffix, this.filename);
			const res = transformer(null, comp, false, false, this.filename);
			this._compiledCode = res.code;
			this._hasAsync = res.hasAsync;
		}
		return this._compiledCode;
	}

	/**
	 * Compiles this script to a vm.Script.
	 *
	 * @private
	 * @param {string} prefix - JavaScript code that will be used as prefix.
	 * @param {string} suffix - JavaScript code that will be used as suffix.
	 * @return {vm.Script} The compiled vm.Script.
	 * @throws {SyntaxError} If there is a syntax error in the script.
	 */
	_compile(prefix, suffix) {
		return new Script(prefix + this.getCompiledCode() + suffix, {
			__proto__: null,
			filename: this.filename,
			displayErrors: false,
			lineOffset: this.lineOffset,
			columnOffset: this.columnOffset
		});
	}

	/**
	 * Will return the cached version of the script intended for VM or compile it.
	 *
	 * @private
	 * @return {vm.Script} The compiled script
	 * @throws {SyntaxError} If there is a syntax error in the script.
	 */
	_compileVM() {
		let script = this._compiledVM;
		if (!script) {
			this._compiledVM = script = this._compile('', '');
		}
		return script;
	}

	/**
	 * Will return the cached version of the script intended for NodeVM or compile it.
	 *
	 * @private
	 * @return {vm.Script} The compiled script
	 * @throws {SyntaxError} If there is a syntax error in the script.
	 */
	_compileNodeVM() {
		let script = this._compiledNodeVM;
		if (!script) {
			this._compiledNodeVM = script = this._compile(MODULE_PREFIX, MODULE_SUFFIX);
		}
		return script;
	}

	/**
	 * Will return the cached version of the script intended for NodeVM in strict mode or compile it.
	 *
	 * @private
	 * @return {vm.Script} The compiled script
	 * @throws {SyntaxError} If there is a syntax error in the script.
	 */
	_compileNodeVMStrict() {
		let script = this._compiledNodeVMStrict;
		if (!script) {
			this._compiledNodeVMStrict = script = this._compile(STRICT_MODULE_PREFIX, MODULE_SUFFIX);
		}
		return script;
	}

}

exports.MODULE_PREFIX = MODULE_PREFIX;
exports.STRICT_MODULE_PREFIX = STRICT_MODULE_PREFIX;
exports.MODULE_SUFFIX = MODULE_SUFFIX;
exports.VMScript = VMScript;

}, function(modId) { var map = {"vm":1665830430801,"./compiler":1665830430804,"./transformer":1665830430803}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430801, function(require, module, exports) {


/**
 * This callback will be called to transform a script to JavaScript.
 *
 * @callback compileCallback
 * @param {string} code - Script code to transform to JavaScript.
 * @param {string} filename - Filename of this script.
 * @return {string} JavaScript code that represents the script code.
 */

/**
 * This callback will be called to resolve a module if it couldn't be found.
 *
 * @callback resolveCallback
 * @param {string} moduleName - Name of the modulusedRequiree to resolve.
 * @param {string} dirname - Name of the current directory.
 * @return {(string|undefined)} The file or directory to use to load the requested module.
 */

const fs = require('fs');
const pa = require('path');
const {
	Script,
	createContext
} = require('vm');
const {
	EventEmitter
} = require('events');
const {
	INSPECT_MAX_BYTES
} = require('buffer');
const {
	createBridge,
	VMError
} = require('./bridge');
const {
	transformer,
	INTERNAL_STATE_NAME
} = require('./transformer');
const {
	lookupCompiler
} = require('./compiler');
const {
	VMScript
} = require('./script');

const objectDefineProperties = Object.defineProperties;

/**
 * Host objects
 *
 * @private
 */
const HOST = Object.freeze({
	Buffer,
	Function,
	Object,
	transformAndCheck,
	INSPECT_MAX_BYTES,
	INTERNAL_STATE_NAME
});

/**
 * Compile a script.
 *
 * @private
 * @param {string} filename - Filename of the script.
 * @param {string} script - Script.
 * @return {vm.Script} The compiled script.
 */
function compileScript(filename, script) {
	return new Script(script, {
		__proto__: null,
		filename,
		displayErrors: false
	});
}

/**
 * Default run options for vm.Script.runInContext
 *
 * @private
 */
const DEFAULT_RUN_OPTIONS = Object.freeze({__proto__: null, displayErrors: false});

function checkAsync(allow) {
	if (!allow) throw new VMError('Async not available');
}

function transformAndCheck(args, code, isAsync, isGenerator, allowAsync) {
	const ret = transformer(args, code, isAsync, isGenerator, undefined);
	checkAsync(allowAsync || !ret.hasAsync);
	return ret.code;
}

/**
 *
 * This callback will be called and has a specific time to finish.<br>
 * No parameters will be supplied.<br>
 * If parameters are required, use a closure.
 *
 * @private
 * @callback runWithTimeout
 * @return {*}
 *
 */

let cacheTimeoutContext = null;
let cacheTimeoutScript = null;

/**
 * Run a function with a specific timeout.
 *
 * @private
 * @param {runWithTimeout} fn - Function to run with the specific timeout.
 * @param {number} timeout - The amount of time to give the function to finish.
 * @return {*} The value returned by the function.
 * @throws {Error} If the function took to long.
 */
function doWithTimeout(fn, timeout) {
	if (!cacheTimeoutContext) {
		cacheTimeoutContext = createContext();
		cacheTimeoutScript = new Script('fn()', {
			__proto__: null,
			filename: 'timeout_bridge.js',
			displayErrors: false
		});
	}
	cacheTimeoutContext.fn = fn;
	try {
		return cacheTimeoutScript.runInContext(cacheTimeoutContext, {
			__proto__: null,
			displayErrors: false,
			timeout
		});
	} finally {
		cacheTimeoutContext.fn = null;
	}
}

const bridgeScript = compileScript(`${__dirname}/bridge.js`,
	`(function(global) {"use strict"; const exports = {};${fs.readFileSync(`${__dirname}/bridge.js`, 'utf8')}\nreturn exports;})`);
const setupSandboxScript = compileScript(`${__dirname}/setup-sandbox.js`,
	`(function(global, host, bridge, data, context) { ${fs.readFileSync(`${__dirname}/setup-sandbox.js`, 'utf8')}\n})`);
const getGlobalScript = compileScript('get_global.js', 'this');

let getGeneratorFunctionScript = null;
let getAsyncFunctionScript = null;
let getAsyncGeneratorFunctionScript = null;
try {
	getGeneratorFunctionScript = compileScript('get_generator_function.js', '(function*(){}).constructor');
} catch (ex) {}
try {
	getAsyncFunctionScript = compileScript('get_async_function.js', '(async function(){}).constructor');
} catch (ex) {}
try {
	getAsyncGeneratorFunctionScript = compileScript('get_async_generator_function.js', '(async function*(){}).constructor');
} catch (ex) {}

/**
 * Class VM.
 *
 * @public
 */
class VM extends EventEmitter {

	/**
	 * The timeout for {@link VM#run} calls.
	 *
	 * @public
	 * @since v3.9.0
	 * @member {number} timeout
	 * @memberOf VM#
	 */

	/**
	 * Get the global sandbox object.
	 *
	 * @public
	 * @readonly
	 * @since v3.9.0
	 * @member {Object} sandbox
	 * @memberOf VM#
	 */

	/**
	 * The compiler to use to get the JavaScript code.
	 *
	 * @public
	 * @readonly
	 * @since v3.9.0
	 * @member {(string|compileCallback)} compiler
	 * @memberOf VM#
	 */

	/**
	 * The resolved compiler to use to get the JavaScript code.
	 *
	 * @private
	 * @readonly
	 * @member {compileCallback} _compiler
	 * @memberOf VM#
	 */

	/**
	 * Create a new VM instance.
	 *
	 * @public
	 * @param {Object} [options] - VM options.
	 * @param {number} [options.timeout] - The amount of time until a call to {@link VM#run} will timeout.
	 * @param {Object} [options.sandbox] - Objects that will be copied into the global object of the sandbox.
	 * @param {(string|compileCallback)} [options.compiler="javascript"] - The compiler to use.
	 * @param {boolean} [options.eval=true] - Allow the dynamic evaluation of code via eval(code) or Function(code)().<br>
	 * Only available for node v10+.
	 * @param {boolean} [options.wasm=true] - Allow to run wasm code.<br>
	 * Only available for node v10+.
	 * @param {boolean} [options.allowAsync=true] - Allows for async functions.
	 * @throws {VMError} If the compiler is unknown.
	 */
	constructor(options = {}) {
		super();

		// Read all options
		const {
			timeout,
			sandbox,
			compiler = 'javascript',
			allowAsync: optAllowAsync = true
		} = options;
		const allowEval = options.eval !== false;
		const allowWasm = options.wasm !== false;
		const allowAsync = optAllowAsync && !options.fixAsync;

		// Early error if sandbox is not an object.
		if (sandbox && 'object' !== typeof sandbox) {
			throw new VMError('Sandbox must be object.');
		}

		// Early error if compiler can't be found.
		const resolvedCompiler = lookupCompiler(compiler);

		// Create a new context for this vm.
		const _context = createContext(undefined, {
			__proto__: null,
			codeGeneration: {
				__proto__: null,
				strings: allowEval,
				wasm: allowWasm
			}
		});

		const sandboxGlobal = getGlobalScript.runInContext(_context, DEFAULT_RUN_OPTIONS);

		// Initialize the sandbox bridge
		const {
			createBridge: sandboxCreateBridge
		} = bridgeScript.runInContext(_context, DEFAULT_RUN_OPTIONS)(sandboxGlobal);

		// Initialize the bridge
		const bridge = createBridge(sandboxCreateBridge, () => {});

		const data = {
			__proto__: null,
			allowAsync
		};

		if (getGeneratorFunctionScript) {
			data.GeneratorFunction = getGeneratorFunctionScript.runInContext(_context, DEFAULT_RUN_OPTIONS);
		}
		if (getAsyncFunctionScript) {
			data.AsyncFunction = getAsyncFunctionScript.runInContext(_context, DEFAULT_RUN_OPTIONS);
		}
		if (getAsyncGeneratorFunctionScript) {
			data.AsyncGeneratorFunction = getAsyncGeneratorFunctionScript.runInContext(_context, DEFAULT_RUN_OPTIONS);
		}

		// Create the bridge between the host and the sandbox.
		const internal = setupSandboxScript.runInContext(_context, DEFAULT_RUN_OPTIONS)(sandboxGlobal, HOST, bridge.other, data, _context);

		const runScript = (script) => {
			// This closure is intentional to hide _context and bridge since the allow to access the sandbox directly which is unsafe.
			let ret;
			try {
				ret = script.runInContext(_context, DEFAULT_RUN_OPTIONS);
			} catch (e) {
				throw bridge.from(e);
			}
			return bridge.from(ret);
		};

		const makeReadonly = (value, mock) => {
			try {
				internal.readonly(value, mock);
			} catch (e) {
				throw bridge.from(e);
			}
			return value;
		};

		const makeProtected = (value) => {
			const sandboxBridge = bridge.other;
			try {
				sandboxBridge.fromWithFactory(sandboxBridge.protectedFactory, value);
			} catch (e) {
				throw bridge.from(e);
			}
			return value;
		};

		const addProtoMapping = (hostProto, sandboxProto) => {
			const sandboxBridge = bridge.other;
			let otherProto;
			try {
				otherProto = sandboxBridge.from(sandboxProto);
				sandboxBridge.addProtoMapping(otherProto, hostProto);
			} catch (e) {
				throw bridge.from(e);
			}
			bridge.addProtoMapping(hostProto, otherProto);
		};

		const addProtoMappingFactory = (hostProto, sandboxProtoFactory) => {
			const sandboxBridge = bridge.other;
			const factory = () => {
				const proto = sandboxProtoFactory(this);
				bridge.addProtoMapping(hostProto, proto);
				return proto;
			};
			try {
				const otherProtoFactory = sandboxBridge.from(factory);
				sandboxBridge.addProtoMappingFactory(otherProtoFactory, hostProto);
			} catch (e) {
				throw bridge.from(e);
			}
		};

		// Define the properties of this object.
		// Use Object.defineProperties here to be able to
		// hide and set properties read-only.
		objectDefineProperties(this, {
			__proto__: null,
			timeout: {
				__proto__: null,
				value: timeout,
				writable: true,
				enumerable: true
			},
			compiler: {
				__proto__: null,
				value: compiler,
				enumerable: true
			},
			sandbox: {
				__proto__: null,
				value: bridge.from(sandboxGlobal),
				enumerable: true
			},
			_runScript: {__proto__: null, value: runScript},
			_makeReadonly: {__proto__: null, value: makeReadonly},
			_makeProtected: {__proto__: null, value: makeProtected},
			_addProtoMapping: {__proto__: null, value: addProtoMapping},
			_addProtoMappingFactory: {__proto__: null, value: addProtoMappingFactory},
			_compiler: {__proto__: null, value: resolvedCompiler},
			_allowAsync: {__proto__: null, value: allowAsync}
		});

		// prepare global sandbox
		if (sandbox) {
			this.setGlobals(sandbox);
		}
	}

	/**
	 * Adds all the values to the globals.
	 *
	 * @public
	 * @since v3.9.0
	 * @param {Object} values - All values that will be added to the globals.
	 * @return {this} This for chaining.
	 * @throws {*} If the setter of a global throws an exception it is propagated. And the remaining globals will not be written.
	 */
	setGlobals(values) {
		for (const name in values) {
			if (Object.prototype.hasOwnProperty.call(values, name)) {
				this.sandbox[name] = values[name];
			}
		}
		return this;
	}

	/**
	 * Set a global value.
	 *
	 * @public
	 * @since v3.9.0
	 * @param {string} name - The name of the global.
	 * @param {*} value - The value of the global.
	 * @return {this} This for chaining.
	 * @throws {*} If the setter of the global throws an exception it is propagated.
	 */
	setGlobal(name, value) {
		this.sandbox[name] = value;
		return this;
	}

	/**
	 * Get a global value.
	 *
	 * @public
	 * @since v3.9.0
	 * @param {string} name - The name of the global.
	 * @return {*} The value of the global.
	 * @throws {*} If the getter of the global throws an exception it is propagated.
	 */
	getGlobal(name) {
		return this.sandbox[name];
	}

	/**
	 * Freezes the object inside VM making it read-only. Not available for primitive values.
	 *
	 * @public
	 * @param {*} value - Object to freeze.
	 * @param {string} [globalName] - Whether to add the object to global.
	 * @return {*} Object to freeze.
	 * @throws {*} If the setter of the global throws an exception it is propagated.
	 */
	freeze(value, globalName) {
		this.readonly(value);
		if (globalName) this.sandbox[globalName] = value;
		return value;
	}

	/**
	 * Freezes the object inside VM making it read-only. Not available for primitive values.
	 *
	 * @public
	 * @param {*} value - Object to freeze.
	 * @param {*} [mock] - When the object does not have a property the mock is used before prototype lookup.
	 * @return {*} Object to freeze.
	 */
	readonly(value, mock) {
		return this._makeReadonly(value, mock);
	}

	/**
	 * Protects the object inside VM making impossible to set functions as it's properties. Not available for primitive values.
	 *
	 * @public
	 * @param {*} value - Object to protect.
	 * @param {string} [globalName] - Whether to add the object to global.
	 * @return {*} Object to protect.
	 * @throws {*} If the setter of the global throws an exception it is propagated.
	 */
	protect(value, globalName) {
		this._makeProtected(value);
		if (globalName) this.sandbox[globalName] = value;
		return value;
	}

	/**
	 * Run the code in VM.
	 *
	 * @public
	 * @param {(string|VMScript)} code - Code to run.
	 * @param {(string|Object)} [options] - Options map or filename.
	 * @param {string} [options.filename="vm.js"] - Filename that shows up in any stack traces produced from this script.<br>
	 * This is only used if code is a String.
	 * @return {*} Result of executed code.
	 * @throws {SyntaxError} If there is a syntax error in the script.
	 * @throws {Error} An error is thrown when the script took to long and there is a timeout.
	 * @throws {*} If the script execution terminated with an exception it is propagated.
	 */
	run(code, options) {
		let script;
		let filename;

		if (typeof options === 'object') {
			filename = options.filename;
		} else {
			filename = options;
		}

		if (code instanceof VMScript) {
			script = code._compileVM();
			checkAsync(this._allowAsync || !code._hasAsync);
		} else {
			const useFileName = filename || 'vm.js';
			let scriptCode = this._compiler(code, useFileName);
			const ret = transformer(null, scriptCode, false, false, useFileName);
			scriptCode = ret.code;
			checkAsync(this._allowAsync || !ret.hasAsync);
			// Compile the script here so that we don't need to create a instance of VMScript.
			script = new Script(scriptCode, {
				__proto__: null,
				filename: useFileName,
				displayErrors: false
			});
		}

		if (!this.timeout) {
			return this._runScript(script);
		}

		return doWithTimeout(() => {
			return this._runScript(script);
		}, this.timeout);
	}

	/**
	 * Run the code in VM.
	 *
	 * @public
	 * @since v3.9.0
	 * @param {string} filename - Filename of file to load and execute in a NodeVM.
	 * @return {*} Result of executed code.
	 * @throws {Error} If filename is not a valid filename.
	 * @throws {SyntaxError} If there is a syntax error in the script.
	 * @throws {Error} An error is thrown when the script took to long and there is a timeout.
	 * @throws {*} If the script execution terminated with an exception it is propagated.
	 */
	runFile(filename) {
		const resolvedFilename = pa.resolve(filename);

		if (!fs.existsSync(resolvedFilename)) {
			throw new VMError(`Script '${filename}' not found.`);
		}

		if (fs.statSync(resolvedFilename).isDirectory()) {
			throw new VMError('Script must be file, got directory.');
		}

		return this.run(fs.readFileSync(resolvedFilename, 'utf8'), resolvedFilename);
	}

}

exports.VM = VM;

}, function(modId) { var map = {"vm":1665830430801,"events":1665830430802,"./bridge":1665830430799,"./transformer":1665830430803,"./compiler":1665830430804,"./script":1665830430800}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430802, function(require, module, exports) {
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// Modified by the vm2 team to make this a standalone module to be loaded into the sandbox.



const host = fromhost;

const {
	Boolean,
  Error,
	String,
	Symbol
} = globalThis;

const ReflectApply = Reflect.apply;
const ReflectOwnKeys = Reflect.ownKeys;

const ErrorCaptureStackTrace = Error.captureStackTrace;

const NumberIsNaN = Number.isNaN;

const ObjectCreate = Object.create;
const ObjectDefineProperty = Object.defineProperty;
const ObjectDefineProperties = Object.defineProperties;
const ObjectGetPrototypeOf = Object.getPrototypeOf;

const SymbolFor = Symbol.for;

function uncurryThis(func) {
	return (thiz, ...args) => ReflectApply(func, thiz, args);
}

const ArrayPrototypeIndexOf = uncurryThis(Array.prototype.indexOf);
const ArrayPrototypeJoin = uncurryThis(Array.prototype.join);
const ArrayPrototypeSlice = uncurryThis(Array.prototype.slice);
const ArrayPrototypeSplice = uncurryThis(Array.prototype.splice);
const ArrayPrototypeUnshift = uncurryThis(Array.prototype.unshift);

const kRejection = SymbolFor('nodejs.rejection');

function inspect(obj) {
	return typeof obj === 'symbol' ? obj.toString() : `${obj}`;
}

function spliceOne(list, index) {
	for (; index + 1 < list.length; index++)
		list[index] = list[index + 1];
	list.pop();
}

function assert(what, message) {
	if (!what) throw new Error(message);
}

function E(key, msg, Base) {
	return function NodeError(...args) {
	  const error = new Base();
	  const message = ReflectApply(msg, error, args);
	  ObjectDefineProperties(error, {
		message: {
		  value: message,
		  enumerable: false,
		  writable: true,
		  configurable: true,
		},
		toString: {
		  value() {
			return `${this.name} [${key}]: ${this.message}`;
		  },
		  enumerable: false,
		  writable: true,
		  configurable: true,
		},
	  });
	  error.code = key;
	  return error;
	};
}


const ERR_INVALID_ARG_TYPE = E('ERR_INVALID_ARG_TYPE',
  (name, expected, actual) => {
    assert(typeof name === 'string', "'name' must be a string");
    if (!ArrayIsArray(expected)) {
      expected = [expected];
    }

    let msg = 'The ';
    if (StringPrototypeEndsWith(name, ' argument')) {
      // For cases like 'first argument'
      msg += `${name} `;
    } else {
      const type = StringPrototypeIncludes(name, '.') ? 'property' : 'argument';
      msg += `"${name}" ${type} `;
    }
    msg += 'must be ';

    const types = [];
    const instances = [];
    const other = [];

    for (const value of expected) {
      assert(typeof value === 'string',
             'All expected entries have to be of type string');
      if (ArrayPrototypeIncludes(kTypes, value)) {
        ArrayPrototypePush(types, StringPrototypeToLowerCase(value));
      } else if (RegExpPrototypeTest(classRegExp, value)) {
        ArrayPrototypePush(instances, value);
      } else {
        assert(value !== 'object',
               'The value "object" should be written as "Object"');
        ArrayPrototypePush(other, value);
      }
    }

    // Special handle `object` in case other instances are allowed to outline
    // the differences between each other.
    if (instances.length > 0) {
      const pos = ArrayPrototypeIndexOf(types, 'object');
      if (pos !== -1) {
        ArrayPrototypeSplice(types, pos, 1);
        ArrayPrototypePush(instances, 'Object');
      }
    }

    if (types.length > 0) {
      if (types.length > 2) {
        const last = ArrayPrototypePop(types);
        msg += `one of type ${ArrayPrototypeJoin(types, ', ')}, or ${last}`;
      } else if (types.length === 2) {
        msg += `one of type ${types[0]} or ${types[1]}`;
      } else {
        msg += `of type ${types[0]}`;
      }
      if (instances.length > 0 || other.length > 0)
        msg += ' or ';
    }

    if (instances.length > 0) {
      if (instances.length > 2) {
        const last = ArrayPrototypePop(instances);
        msg +=
          `an instance of ${ArrayPrototypeJoin(instances, ', ')}, or ${last}`;
      } else {
        msg += `an instance of ${instances[0]}`;
        if (instances.length === 2) {
          msg += ` or ${instances[1]}`;
        }
      }
      if (other.length > 0)
        msg += ' or ';
    }

    if (other.length > 0) {
      if (other.length > 2) {
        const last = ArrayPrototypePop(other);
        msg += `one of ${ArrayPrototypeJoin(other, ', ')}, or ${last}`;
      } else if (other.length === 2) {
        msg += `one of ${other[0]} or ${other[1]}`;
      } else {
        if (StringPrototypeToLowerCase(other[0]) !== other[0])
          msg += 'an ';
        msg += `${other[0]}`;
      }
    }

    if (actual == null) {
      msg += `. Received ${actual}`;
    } else if (typeof actual === 'function' && actual.name) {
      msg += `. Received function ${actual.name}`;
    } else if (typeof actual === 'object') {
      if (actual.constructor && actual.constructor.name) {
        msg += `. Received an instance of ${actual.constructor.name}`;
      } else {
        const inspected = inspect(actual, { depth: -1 });
        msg += `. Received ${inspected}`;
      }
    } else {
      let inspected = inspect(actual, { colors: false });
      if (inspected.length > 25)
        inspected = `${StringPrototypeSlice(inspected, 0, 25)}...`;
      msg += `. Received type ${typeof actual} (${inspected})`;
    }
    return msg;
  }, TypeError);

const ERR_INVALID_THIS = E('ERR_INVALID_THIS', s => `Value of "this" must be of type ${s}`, TypeError);

const ERR_OUT_OF_RANGE = E('ERR_OUT_OF_RANGE',
  (str, range, input, replaceDefaultBoolean = false) => {
    assert(range, 'Missing "range" argument');
    let msg = replaceDefaultBoolean ? str :
      `The value of "${str}" is out of range.`;
    const received = inspect(input);
    msg += ` It must be ${range}. Received ${received}`;
    return msg;
  }, RangeError);

const ERR_UNHANDLED_ERROR = E('ERR_UNHANDLED_ERROR',
  err => {
    const msg = 'Unhandled error.';
    if (err === undefined) return msg;
    return `${msg} (${err})`;
  }, Error);

function validateBoolean(value, name) {
  if (typeof value !== 'boolean')
    throw new ERR_INVALID_ARG_TYPE(name, 'boolean', value);
}

function validateFunction(value, name) {
  if (typeof value !== 'function')
    throw new ERR_INVALID_ARG_TYPE(name, 'Function', value);
}

function validateString(value, name) {
  if (typeof value !== 'string')
    throw new ERR_INVALID_ARG_TYPE(name, 'string', value);
}

function nc(cond, e) {
	return cond === undefined || cond === null ? e : cond;
}

function oc(base, key) {
	return base === undefined || base === null ? undefined : base[key];
}

const kCapture = Symbol('kCapture');
const kErrorMonitor = host.kErrorMonitor || Symbol('events.errorMonitor');
const kMaxEventTargetListeners = Symbol('events.maxEventTargetListeners');
const kMaxEventTargetListenersWarned =
  Symbol('events.maxEventTargetListenersWarned');

const kIsEventTarget = SymbolFor('nodejs.event_target');

function isEventTarget(obj) {
	return oc(oc(obj, 'constructor'), kIsEventTarget);
}

/**
 * Creates a new `EventEmitter` instance.
 * @param {{ captureRejections?: boolean; }} [opts]
 * @constructs {EventEmitter}
 */
function EventEmitter(opts) {
  EventEmitter.init.call(this, opts);
}
module.exports = EventEmitter;
if (host.once) module.exports.once = host.once;
if (host.on) module.exports.on = host.on;
if (host.getEventListeners) module.exports.getEventListeners = host.getEventListeners;
// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.usingDomains = false;

EventEmitter.captureRejectionSymbol = kRejection;
ObjectDefineProperty(EventEmitter, 'captureRejections', {
  get() {
    return EventEmitter.prototype[kCapture];
  },
  set(value) {
    validateBoolean(value, 'EventEmitter.captureRejections');

    EventEmitter.prototype[kCapture] = value;
  },
  enumerable: true
});

if (host.EventEmitterReferencingAsyncResource) {
	const kAsyncResource = Symbol('kAsyncResource');
	const EventEmitterReferencingAsyncResource = host.EventEmitterReferencingAsyncResource;

	class EventEmitterAsyncResource extends EventEmitter {
		/**
		 * @param {{
		 *   name?: string,
		 *   triggerAsyncId?: number,
		 *   requireManualDestroy?: boolean,
		 * }} [options]
		 */
		constructor(options = undefined) {
			let name;
			if (typeof options === 'string') {
				name = options;
				options = undefined;
			} else {
				if (new.target === EventEmitterAsyncResource) {
					validateString(oc(options, 'name'), 'options.name');
				}
				name = oc(options, 'name') || new.target.name;
			}
			super(options);

			this[kAsyncResource] =
				new EventEmitterReferencingAsyncResource(this, name, options);
		}

		/**
		 * @param {symbol,string} event
		 * @param  {...any} args
		 * @returns {boolean}
		 */
		emit(event, ...args) {
			if (this[kAsyncResource] === undefined)
				throw new ERR_INVALID_THIS('EventEmitterAsyncResource');
			const { asyncResource } = this;
			ArrayPrototypeUnshift(args, super.emit, this, event);
			return ReflectApply(asyncResource.runInAsyncScope, asyncResource,
													args);
		}

		/**
		 * @returns {void}
		 */
		emitDestroy() {
			if (this[kAsyncResource] === undefined)
				throw new ERR_INVALID_THIS('EventEmitterAsyncResource');
			this.asyncResource.emitDestroy();
		}

		/**
		 * @type {number}
		 */
		get asyncId() {
			if (this[kAsyncResource] === undefined)
				throw new ERR_INVALID_THIS('EventEmitterAsyncResource');
			return this.asyncResource.asyncId();
		}

		/**
		 * @type {number}
		 */
		get triggerAsyncId() {
			if (this[kAsyncResource] === undefined)
				throw new ERR_INVALID_THIS('EventEmitterAsyncResource');
			return this.asyncResource.triggerAsyncId();
		}

		/**
		 * @type {EventEmitterReferencingAsyncResource}
		 */
		get asyncResource() {
			if (this[kAsyncResource] === undefined)
				throw new ERR_INVALID_THIS('EventEmitterAsyncResource');
			return this[kAsyncResource];
		}
	}
	EventEmitter.EventEmitterAsyncResource = EventEmitterAsyncResource;
}

EventEmitter.errorMonitor = kErrorMonitor;

// The default for captureRejections is false
ObjectDefineProperty(EventEmitter.prototype, kCapture, {
  value: false,
  writable: true,
  enumerable: false
});

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
let defaultMaxListeners = 10;

function checkListener(listener) {
  validateFunction(listener, 'listener');
}

ObjectDefineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new ERR_OUT_OF_RANGE('defaultMaxListeners',
                                 'a non-negative number',
                                 arg);
    }
    defaultMaxListeners = arg;
  }
});

ObjectDefineProperties(EventEmitter, {
  kMaxEventTargetListeners: {
    value: kMaxEventTargetListeners,
    enumerable: false,
    configurable: false,
    writable: false,
  },
  kMaxEventTargetListenersWarned: {
    value: kMaxEventTargetListenersWarned,
    enumerable: false,
    configurable: false,
    writable: false,
  }
});

/**
 * Sets the max listeners.
 * @param {number} n
 * @param {EventTarget[] | EventEmitter[]} [eventTargets]
 * @returns {void}
 */
EventEmitter.setMaxListeners =
  function(n = defaultMaxListeners, ...eventTargets) {
    if (typeof n !== 'number' || n < 0 || NumberIsNaN(n))
      throw new ERR_OUT_OF_RANGE('n', 'a non-negative number', n);
    if (eventTargets.length === 0) {
      defaultMaxListeners = n;
    } else {
      for (let i = 0; i < eventTargets.length; i++) {
        const target = eventTargets[i];
        if (isEventTarget(target)) {
          target[kMaxEventTargetListeners] = n;
          target[kMaxEventTargetListenersWarned] = false;
        } else if (typeof target.setMaxListeners === 'function') {
          target.setMaxListeners(n);
        } else {
          throw new ERR_INVALID_ARG_TYPE(
            'eventTargets',
            ['EventEmitter', 'EventTarget'],
            target);
        }
      }
    }
  };

// If you're updating this function definition, please also update any
// re-definitions, such as the one in the Domain module (lib/domain.js).
EventEmitter.init = function(opts) {

  if (this._events === undefined ||
      this._events === ObjectGetPrototypeOf(this)._events) {
    this._events = ObjectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;


  if (oc(opts, 'captureRejections')) {
    validateBoolean(opts.captureRejections, 'options.captureRejections');
    this[kCapture] = Boolean(opts.captureRejections);
  } else {
    // Assigning the kCapture property directly saves an expensive
    // prototype lookup in a very sensitive hot path.
    this[kCapture] = EventEmitter.prototype[kCapture];
  }
};

function addCatch(that, promise, type, args) {
  if (!that[kCapture]) {
    return;
  }

  // Handle Promises/A+ spec, then could be a getter
  // that throws on second use.
  try {
    const then = promise.then;

    if (typeof then === 'function') {
      then.call(promise, undefined, function(err) {
        // The callback is called with nextTick to avoid a follow-up
        // rejection from this promise.
        process.nextTick(emitUnhandledRejectionOrErr, that, err, type, args);
      });
    }
  } catch (err) {
    that.emit('error', err);
  }
}

function emitUnhandledRejectionOrErr(ee, err, type, args) {
  if (typeof ee[kRejection] === 'function') {
    ee[kRejection](err, type, ...args);
  } else {
    // We have to disable the capture rejections mechanism, otherwise
    // we might end up in an infinite loop.
    const prev = ee[kCapture];

    // If the error handler throws, it is not catchable and it
    // will end up in 'uncaughtException'. We restore the previous
    // value of kCapture in case the uncaughtException is present
    // and the exception is handled.
    try {
      ee[kCapture] = false;
      ee.emit('error', err);
    } finally {
      ee[kCapture] = prev;
    }
  }
}

/**
 * Increases the max listeners of the event emitter.
 * @param {number} n
 * @returns {EventEmitter}
 */
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new ERR_OUT_OF_RANGE('n', 'a non-negative number', n);
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

/**
 * Returns the current max listener value for the event emitter.
 * @returns {number}
 */
EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

/**
 * Synchronously calls each of the listeners registered
 * for the event.
 * @param {string | symbol} type
 * @param {...any} [args]
 * @returns {boolean}
 */
EventEmitter.prototype.emit = function emit(type, ...args) {
  let doError = (type === 'error');

  const events = this._events;
  if (events !== undefined) {
    if (doError && events[kErrorMonitor] !== undefined)
      this.emit(kErrorMonitor, ...args);
    doError = (doError && events.error === undefined);
  } else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    let er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      try {
        const capture = {};
        ErrorCaptureStackTrace(capture, EventEmitter.prototype.emit);
      } catch (e) {}

      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }

    let stringifiedEr;
    try {
      stringifiedEr = inspect(er);
    } catch (e) {
      stringifiedEr = er;
    }

    // At least give some kind of context to the user
    const err = new ERR_UNHANDLED_ERROR(stringifiedEr);
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  const handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    const result = handler.apply(this, args);

    // We check if result is undefined first because that
    // is the most common case so we do not pay any perf
    // penalty
    if (result !== undefined && result !== null) {
      addCatch(this, result, type, args);
    }
  } else {
    const len = handler.length;
    const listeners = arrayClone(handler);
    for (let i = 0; i < len; ++i) {
      const result = listeners[i].apply(this, args);

      // We check if result is undefined first because that
      // is the most common case so we do not pay any perf
      // penalty.
      // This code is duplicated because extracting it away
      // would make it non-inlineable.
      if (result !== undefined && result !== null) {
        addCatch(this, result, type, args);
      }
    }
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  let m;
  let events;
  let existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = ObjectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  nc(listener.listener, listener));

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      const w = new Error('Possible EventEmitter memory leak detected. ' +
                          `${existing.length} ${String(type)} listeners ` +
                          `added to ${inspect(target, { depth: -1 })}. Use ` +
                          'emitter.setMaxListeners() to increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      process.emitWarning(w);
    }
  }

  return target;
}

/**
 * Adds a listener to the event emitter.
 * @param {string | symbol} type
 * @param {Function} listener
 * @returns {EventEmitter}
 */
EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

/**
 * Adds the `listener` function to the beginning of
 * the listeners array.
 * @param {string | symbol} type
 * @param {Function} listener
 * @returns {EventEmitter}
 */
EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  const state = { fired: false, wrapFn: undefined, target, type, listener };
  const wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

/**
 * Adds a one-time `listener` function to the event emitter.
 * @param {string | symbol} type
 * @param {Function} listener
 * @returns {EventEmitter}
 */
EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);

  this.on(type, _onceWrap(this, type, listener));
  return this;
};

/**
 * Adds a one-time `listener` function to the beginning of
 * the listeners array.
 * @param {string | symbol} type
 * @param {Function} listener
 * @returns {EventEmitter}
 */
EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      checkListener(listener);

      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };


/**
 * Removes the specified `listener` from the listeners array.
 * @param {string | symbol} type
 * @param {Function} listener
 * @returns {EventEmitter}
 */
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      checkListener(listener);

      const events = this._events;
      if (events === undefined)
        return this;

      const list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = ObjectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        let position = -1;

        for (let i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

/**
 * Removes all listeners from the event emitter. (Only
 * removes listeners for a specific event name if specified
 * as `type`).
 * @param {string | symbol} [type]
 * @returns {EventEmitter}
 */
EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      const events = this._events;
      if (events === undefined)
        return this;

      // Not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = ObjectCreate(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = ObjectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // Emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        for (const key of ReflectOwnKeys(events)) {
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = ObjectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      const listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (let i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  const events = target._events;

  if (events === undefined)
    return [];

  const evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener);
}

/**
 * Returns a copy of the array of listeners for the event name
 * specified as `type`.
 * @param {string | symbol} type
 * @returns {Function[]}
 */
EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

/**
 * Returns a copy of the array of listeners and wrappers for
 * the event name specified as `type`.
 * @param {string | symbol} type
 * @returns {Function[]}
 */
EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

/**
 * Returns the number of listeners listening to the event name
 * specified as `type`.
 * @deprecated since v3.2.0
 * @param {EventEmitter} emitter
 * @param {string | symbol} type
 * @returns {number}
 */
EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  }
  return emitter.listenerCount(type);
};

EventEmitter.prototype.listenerCount = listenerCount;

/**
 * Returns the number of listeners listening to event name
 * specified as `type`.
 * @param {string | symbol} type
 * @returns {number}
 */
function listenerCount(type) {
  const events = this._events;

  if (events !== undefined) {
    const evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

/**
 * Returns an array listing the events for which
 * the emitter has registered listeners.
 * @returns {any[]}
 */
EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr) {
  // At least since V8 8.3, this implementation is faster than the previous
  // which always used a simple for-loop
  switch (arr.length) {
    case 2: return [arr[0], arr[1]];
    case 3: return [arr[0], arr[1], arr[2]];
    case 4: return [arr[0], arr[1], arr[2], arr[3]];
    case 5: return [arr[0], arr[1], arr[2], arr[3], arr[4]];
    case 6: return [arr[0], arr[1], arr[2], arr[3], arr[4], arr[5]];
  }
  return ArrayPrototypeSlice(arr);
}

function unwrapListeners(arr) {
  const ret = arrayClone(arr);
  for (let i = 0; i < ret.length; ++i) {
    const orig = ret[i].listener;
    if (typeof orig === 'function')
      ret[i] = orig;
  }
  return ret;
}

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430803, function(require, module, exports) {

const {Parser: AcornParser, isNewLine: acornIsNewLine, getLineInfo: acornGetLineInfo} = require('acorn');
const {full: acornWalkFull} = require('acorn-walk');

const INTERNAL_STATE_NAME = 'VM2_INTERNAL_STATE_DO_NOT_USE_OR_PROGRAM_WILL_FAIL';

function assertType(node, type) {
	if (!node) throw new Error(`None existent node expected '${type}'`);
	if (node.type !== type) throw new Error(`Invalid node type '${node.type}' expected '${type}'`);
	return node;
}

function makeNiceSyntaxError(message, code, filename, location, tokenizer) {
	const loc = acornGetLineInfo(code, location);
	let end = location;
	while (end < code.length && !acornIsNewLine(code.charCodeAt(end))) {
		end++;
	}
	let markerEnd = tokenizer.start === location ? tokenizer.end : location + 1;
	if (!markerEnd || markerEnd > end) markerEnd = end;
	let markerLen = markerEnd - location;
	if (markerLen <= 0) markerLen = 1;
	if (message === 'Unexpected token') {
		const type = tokenizer.type;
		if (type.label === 'name' || type.label === 'privateId') {
			message = 'Unexpected identifier';
		} else if (type.label === 'eof') {
			message = 'Unexpected end of input';
		} else if (type.label === 'num') {
			message = 'Unexpected number';
		} else if (type.label === 'string') {
			message = 'Unexpected string';
		} else if (type.label === 'regexp') {
			message = 'Unexpected token \'/\'';
			markerLen = 1;
		} else {
			const token = tokenizer.value || type.label;
			message = `Unexpected token '${token}'`;
		}
	}
	const error = new SyntaxError(message);
	if (!filename) return error;
	const line = code.slice(location - loc.column, end);
	const marker = line.slice(0, loc.column).replace(/\S/g, ' ') + '^'.repeat(markerLen);
	error.stack = `${filename}:${loc.line}\n${line}\n${marker}\n\n${error.stack}`;
	return error;
}

function transformer(args, body, isAsync, isGenerator, filename) {
	let code;
	let argsOffset;
	if (args === null) {
		code = body;
		// Note: Keywords are not allows to contain u escapes
		if (!/\b(?:catch|import|async)\b/.test(code)) {
			return {__proto__: null, code, hasAsync: false};
		}
	} else {
		code = isAsync ? '(async function' : '(function';
		if (isGenerator) code += '*';
		code += ' anonymous(';
		code += args;
		argsOffset = code.length;
		code += '\n) {\n';
		code += body;
		code += '\n})';
	}

	const parser = new AcornParser({
		__proto__: null,
		ecmaVersion: 2022,
		allowAwaitOutsideFunction: args === null && isAsync,
		allowReturnOutsideFunction: args === null
	}, code);
	let ast;
	try {
		ast = parser.parse();
	} catch (e) {
		// Try to generate a nicer error message.
		if (e instanceof SyntaxError && e.pos !== undefined) {
			let message = e.message;
			const match = message.match(/^(.*) \(\d+:\d+\)$/);
			if (match) message = match[1];
			e = makeNiceSyntaxError(message, code, filename, e.pos, parser);
		}
		throw e;
	}

	if (args !== null) {
		const pBody = assertType(ast, 'Program').body;
		if (pBody.length !== 1) throw new SyntaxError('Single function literal required');
		const expr = pBody[0];
		if (expr.type !== 'ExpressionStatement') throw new SyntaxError('Single function literal required');
		const func = expr.expression;
		if (func.type !== 'FunctionExpression') throw new SyntaxError('Single function literal required');
		if (func.body.start !== argsOffset + 3) throw new SyntaxError('Unexpected end of arg string');
	}

	const insertions = [];
	let hasAsync = false;

	const TO_LEFT = -100;
	const TO_RIGHT = 100;

	let internStateValiable = undefined;

	acornWalkFull(ast, (node, state, type) => {
		if (type === 'Function') {
			if (node.async) hasAsync = true;
		}
		const nodeType = node.type;
		if (nodeType === 'CatchClause') {
			const param = node.param;
			if (param) {
				const name = assertType(param, 'Identifier').name;
				const cBody = assertType(node.body, 'BlockStatement');
				if (cBody.body.length > 0) {
					insertions.push({
						__proto__: null,
						pos: cBody.body[0].start,
						order: TO_LEFT,
						code: `${name}=${INTERNAL_STATE_NAME}.handleException(${name});`
					});
				}
			}
		} else if (nodeType === 'WithStatement') {
			insertions.push({
				__proto__: null,
				pos: node.object.start,
				order: TO_LEFT,
				code: INTERNAL_STATE_NAME + '.wrapWith('
			});
			insertions.push({
				__proto__: null,
				pos: node.object.end,
				order: TO_RIGHT,
				code: ')'
			});
		} else if (nodeType === 'Identifier') {
			if (node.name === INTERNAL_STATE_NAME) {
				if (internStateValiable === undefined || internStateValiable.start > node.start) {
					internStateValiable = node;
				}
			}
		} else if (nodeType === 'ImportExpression') {
			insertions.push({
				__proto__: null,
				pos: node.start,
				order: TO_RIGHT,
				code: INTERNAL_STATE_NAME + '.'
			});
		}
	});

	if (internStateValiable) {
		throw makeNiceSyntaxError('Use of internal vm2 state variable', code, filename, internStateValiable.start, {
			__proto__: null,
			start: internStateValiable.start,
			end: internStateValiable.end
		});
	}

	if (insertions.length === 0) return {__proto__: null, code, hasAsync};

	insertions.sort((a, b) => (a.pos == b.pos ? a.order - b.order : a.pos - b.pos));

	let ncode = '';
	let curr = 0;
	for (let i = 0; i < insertions.length; i++) {
		const change = insertions[i];
		ncode += code.substring(curr, change.pos) + change.code;
		curr = change.pos;
	}
	ncode += code.substring(curr);

	return {__proto__: null, code: ncode, hasAsync};
}

exports.INTERNAL_STATE_NAME = INTERNAL_STATE_NAME;
exports.transformer = transformer;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430804, function(require, module, exports) {


const {
	VMError
} = require('./bridge');

let cacheCoffeeScriptCompiler;

/**
 * Returns the cached coffee script compiler or loads it
 * if it is not found in the cache.
 *
 * @private
 * @return {compileCallback} The coffee script compiler.
 * @throws {VMError} If the coffee-script module can't be found.
 */
function getCoffeeScriptCompiler() {
	if (!cacheCoffeeScriptCompiler) {
		try {
			// The warning generated by webpack can be disabled by setting:
			// ignoreWarnings[].message = /Can't resolve 'coffee-script'/
			/* eslint-disable-next-line global-require */
			const coffeeScript = require('coffee-script');
			cacheCoffeeScriptCompiler = (code, filename) => {
				return coffeeScript.compile(code, {header: false, bare: true});
			};
		} catch (e) {
			throw new VMError('Coffee-Script compiler is not installed.');
		}
	}
	return cacheCoffeeScriptCompiler;
}

/**
 * Remove the shebang from source code.
 *
 * @private
 * @param {string} code - Code from which to remove the shebang.
 * @return {string} code without the shebang.
 */
function removeShebang(code) {
	if (!code.startsWith('#!')) return code;
	return '//' + code.substring(2);
}


/**
 * The JavaScript compiler, just a identity function.
 *
 * @private
 * @type {compileCallback}
 * @param {string} code - The JavaScript code.
 * @param {string} filename - Filename of this script.
 * @return {string} The code.
 */
function jsCompiler(code, filename) {
	return removeShebang(code);
}

/**
 * Look up the compiler for a specific name.
 *
 * @private
 * @param {(string|compileCallback)} compiler - A compile callback or the name of the compiler.
 * @return {compileCallback} The resolved compiler.
 * @throws {VMError} If the compiler is unknown or the coffee script module was needed and couldn't be found.
 */
function lookupCompiler(compiler) {
	if ('function' === typeof compiler) return compiler;
	switch (compiler) {
		case 'coffeescript':
		case 'coffee-script':
		case 'cs':
		case 'text/coffeescript':
			return getCoffeeScriptCompiler();
		case 'javascript':
		case 'java-script':
		case 'js':
		case 'text/javascript':
			return jsCompiler;
		default:
			throw new VMError(`Unsupported compiler '${compiler}'.`);
	}
}

exports.removeShebang = removeShebang;
exports.lookupCompiler = lookupCompiler;

}, function(modId) { var map = {"./bridge":1665830430799}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430805, function(require, module, exports) {


/**
 * This callback will be called to resolve a module if it couldn't be found.
 *
 * @callback resolveCallback
 * @param {string} moduleName - Name of the module used to resolve.
 * @param {string} dirname - Name of the current directory.
 * @return {(string|undefined)} The file or directory to use to load the requested module.
 */

/**
 * This callback will be called to require a module instead of node's require.
 *
 * @callback customRequire
 * @param {string} moduleName - Name of the module requested.
 * @return {*} The required module object.
 */

const fs = require('fs');
const pa = require('path');
const {
	Script
} = require('vm');
const {
	VMError
} = require('./bridge');
const {
	VMScript,
	MODULE_PREFIX,
	STRICT_MODULE_PREFIX,
	MODULE_SUFFIX
} = require('./script');
const {
	transformer
} = require('./transformer');
const {
	VM
} = require('./vm');
const {
	resolverFromOptions
} = require('./resolver-compat');

const objectDefineProperty = Object.defineProperty;
const objectDefineProperties = Object.defineProperties;

/**
 * Host objects
 *
 * @private
 */
const HOST = Object.freeze({
	__proto__: null,
	version: parseInt(process.versions.node.split('.')[0]),
	process,
	console,
	setTimeout,
	setInterval,
	setImmediate,
	clearTimeout,
	clearInterval,
	clearImmediate
});

/**
 * Compile a script.
 *
 * @private
 * @param {string} filename - Filename of the script.
 * @param {string} script - Script.
 * @return {vm.Script} The compiled script.
 */
function compileScript(filename, script) {
	return new Script(script, {
		__proto__: null,
		filename,
		displayErrors: false
	});
}

let cacheSandboxScript = null;
let cacheMakeNestingScript = null;

const NESTING_OVERRIDE = Object.freeze({
	__proto__: null,
	vm2: vm2NestingLoader
});

/**
 * Event caused by a <code>console.debug</code> call if <code>options.console="redirect"</code> is specified.
 *
 * @public
 * @event NodeVM."console.debug"
 * @type {...*}
 */

/**
 * Event caused by a <code>console.log</code> call if <code>options.console="redirect"</code> is specified.
 *
 * @public
 * @event NodeVM."console.log"
 * @type {...*}
 */

/**
 * Event caused by a <code>console.info</code> call if <code>options.console="redirect"</code> is specified.
 *
 * @public
 * @event NodeVM."console.info"
 * @type {...*}
 */

/**
 * Event caused by a <code>console.warn</code> call if <code>options.console="redirect"</code> is specified.
 *
 * @public
 * @event NodeVM."console.warn"
 * @type {...*}
 */

/**
 * Event caused by a <code>console.error</code> call if <code>options.console="redirect"</code> is specified.
 *
 * @public
 * @event NodeVM."console.error"
 * @type {...*}
 */

/**
 * Event caused by a <code>console.dir</code> call if <code>options.console="redirect"</code> is specified.
 *
 * @public
 * @event NodeVM."console.dir"
 * @type {...*}
 */

/**
 * Event caused by a <code>console.trace</code> call if <code>options.console="redirect"</code> is specified.
 *
 * @public
 * @event NodeVM."console.trace"
 * @type {...*}
 */

/**
 * Class NodeVM.
 *
 * @public
 * @extends {VM}
 * @extends {EventEmitter}
 */
class NodeVM extends VM {

	/**
	 * Create a new NodeVM instance.<br>
	 *
	 * Unlike VM, NodeVM lets you use require same way like in regular node.<br>
	 *
	 * However, it does not use the timeout.
	 *
	 * @public
	 * @param {Object} [options] - VM options.
	 * @param {Object} [options.sandbox] - Objects that will be copied into the global object of the sandbox.
	 * @param {(string|compileCallback)} [options.compiler="javascript"] - The compiler to use.
	 * @param {boolean} [options.eval=true] - Allow the dynamic evaluation of code via eval(code) or Function(code)().<br>
	 * Only available for node v10+.
	 * @param {boolean} [options.wasm=true] - Allow to run wasm code.<br>
	 * Only available for node v10+.
	 * @param {("inherit"|"redirect"|"off")} [options.console="inherit"] - Sets the behavior of the console in the sandbox.
	 * <code>inherit</code> to enable console, <code>redirect</code> to redirect to events, <code>off</code> to disable console.
	 * @param {Object|boolean} [options.require=false] - Allow require inside the sandbox.
	 * @param {(boolean|string[]|Object)} [options.require.external=false] - <b>WARNING: When allowing require the option <code>options.require.root</code>
	 * should be set to restrict the script from requiring any module. Values can be true, an array of allowed external modules or an object.
	 * @param {(string[])} [options.require.external.modules] - Array of allowed external modules. Also supports wildcards, so specifying ['@scope/*-ver-??],
	 * for instance, will allow using all modules having a name of the form @scope/something-ver-aa, @scope/other-ver-11, etc.
	 * @param {boolean} [options.require.external.transitive=false] - Boolean which indicates if transitive dependencies of external modules are allowed.
	 * @param {string[]} [options.require.builtin=[]] - Array of allowed built-in modules, accepts ["*"] for all.
	 * @param {(string|string[])} [options.require.root] - Restricted path(s) where local modules can be required. If omitted every path is allowed.
	 * @param {Object} [options.require.mock] - Collection of mock modules (both external or built-in).
	 * @param {("host"|"sandbox")} [options.require.context="host"] - <code>host</code> to require modules in host and proxy them to sandbox.
	 * <code>sandbox</code> to load, compile and require modules in sandbox.
	 * Builtin modules except <code>events</code> always required in host and proxied to sandbox.
	 * @param {string[]} [options.require.import] - Array of modules to be loaded into NodeVM on start.
	 * @param {resolveCallback} [options.require.resolve] - An additional lookup function in case a module wasn't
	 * found in one of the traditional node lookup paths.
	 * @param {customRequire} [options.require.customRequire=require] - Custom require to require host and built-in modules.
	 * @param {boolean} [option.require.strict=true] - Load required modules in strict mode.
	 * @param {boolean} [options.nesting=false] -
	 * <b>WARNING: Allowing this is a security risk as scripts can create a NodeVM which can require any host module.</b>
	 * Allow nesting of VMs.
	 * @param {("commonjs"|"none")} [options.wrapper="commonjs"] - <code>commonjs</code> to wrap script into CommonJS wrapper,
	 * <code>none</code> to retrieve value returned by the script.
	 * @param {string[]} [options.sourceExtensions=["js"]] - Array of file extensions to treat as source code.
	 * @param {string[]} [options.argv=[]] - Array of arguments passed to <code>process.argv</code>.
	 * This object will not be copied and the script can change this object.
	 * @param {Object} [options.env={}] - Environment map passed to <code>process.env</code>.
	 * This object will not be copied and the script can change this object.
	 * @param {boolean} [options.strict=false] - If modules should be loaded in strict mode.
	 * @throws {VMError} If the compiler is unknown.
	 */
	constructor(options = {}) {
		const {
			compiler,
			eval: allowEval,
			wasm,
			console: consoleType = 'inherit',
			require: requireOpts = false,
			nesting = false,
			wrapper = 'commonjs',
			sourceExtensions = ['js'],
			argv,
			env,
			strict = false,
			sandbox
		} = options;

		// Throw this early
		if (sandbox && 'object' !== typeof sandbox) {
			throw new VMError('Sandbox must be an object.');
		}

		super({__proto__: null, compiler: compiler, eval: allowEval, wasm});

		// This is only here for backwards compatibility.
		objectDefineProperty(this, 'options', {__proto__: null, value: {
			console: consoleType,
			require: requireOpts,
			nesting,
			wrapper,
			sourceExtensions,
			strict
		}});

		const resolver = resolverFromOptions(this, requireOpts, nesting && NESTING_OVERRIDE, this._compiler);

		objectDefineProperty(this, '_resolver', {__proto__: null, value: resolver});

		if (!cacheSandboxScript) {
			cacheSandboxScript = compileScript(`${__dirname}/setup-node-sandbox.js`,
				`(function (host, data) { ${fs.readFileSync(`${__dirname}/setup-node-sandbox.js`, 'utf8')}\n})`);
		}

		const closure = this._runScript(cacheSandboxScript);

		const extensions = {
			__proto__: null
		};

		const loadJS = (mod, filename) => resolver.loadJS(this, mod, filename);

		for (let i = 0; i < sourceExtensions.length; i++) {
			extensions['.' + sourceExtensions[i]] = loadJS;
		}

		if (!extensions['.json']) extensions['.json'] = (mod, filename) => resolver.loadJSON(this, mod, filename);
		if (!extensions['.node']) extensions['.node'] = (mod, filename) => resolver.loadNode(this, mod, filename);


		this.readonly(HOST);
		this.readonly(resolver);
		this.readonly(this);

		const {
			Module,
			jsonParse,
			createRequireForModule,
			requireImpl
		} = closure(HOST, {
			__proto__: null,
			argv,
			env,
			console: consoleType,
			vm: this,
			resolver,
			extensions
		});

		objectDefineProperties(this, {
			__proto__: null,
			_Module: {__proto__: null, value: Module},
			_jsonParse: {__proto__: null, value: jsonParse},
			_createRequireForModule: {__proto__: null, value: createRequireForModule},
			_requireImpl: {__proto__: null, value: requireImpl},
			_cacheRequireModule: {__proto__: null, value: null, writable: true}
		});


		resolver.init(this);

		// prepare global sandbox
		if (sandbox) {
			this.setGlobals(sandbox);
		}

		if (requireOpts && requireOpts.import) {
			if (Array.isArray(requireOpts.import)) {
				for (let i = 0, l = requireOpts.import.length; i < l; i++) {
					this.require(requireOpts.import[i]);
				}
			} else {
				this.require(requireOpts.import);
			}
		}
	}

	/**
	 * @ignore
	 * @deprecated Just call the method yourself like <code>method(args);</code>
	 * @param {function} method - Function to invoke.
	 * @param {...*} args - Arguments to pass to the function.
	 * @return {*} Return value of the function.
	 * @todo Can we remove this function? It even had a bug that would use args as this parameter.
	 * @throws {*} Rethrows anything the method throws.
	 * @throws {VMError} If method is not a function.
	 * @throws {Error} If method is a class.
	 */
	call(method, ...args) {
		if ('function' === typeof method) {
			return method(...args);
		} else {
			throw new VMError('Unrecognized method type.');
		}
	}

	/**
	 * Require a module in VM and return it's exports.
	 *
	 * @public
	 * @param {string} module - Module name.
	 * @return {*} Exported module.
	 * @throws {*} If the module couldn't be found or loading it threw an error.
	 */
	require(module) {
		const path = this._resolver.pathResolve('.');
		let mod = this._cacheRequireModule;
		if (!mod || mod.path !== path) {
			const filename = this._resolver.pathConcat(path, '/vm.js');
			mod = new (this._Module)(filename, path);
			this._resolver.registerModule(mod, filename, path, null, false);
			this._cacheRequireModule = mod;
		}
		return this._requireImpl(mod, module, true);
	}

	/**
	 * Run the code in NodeVM.
	 *
	 * First time you run this method, code is executed same way like in node's regular `require` - it's executed with
	 * `module`, `require`, `exports`, `__dirname`, `__filename` variables and expect result in `module.exports'.
	 *
	 * @param {(string|VMScript)} code - Code to run.
	 * @param {(string|Object)} [options] - Options map or filename.
	 * @param {string} [options.filename="vm.js"] - Filename that shows up in any stack traces produced from this script.<br>
	 * This is only used if code is a String.
	 * @param {boolean} [options.strict] - If modules should be loaded in strict mode. Defaults to NodeVM options.
	 * @param {("commonjs"|"none")} [options.wrapper] - <code>commonjs</code> to wrap script into CommonJS wrapper,
	 * <code>none</code> to retrieve value returned by the script. Defaults to NodeVM options.
	 * @return {*} Result of executed code.
	 * @throws {SyntaxError} If there is a syntax error in the script.
	 * @throws {*} If the script execution terminated with an exception it is propagated.
	 * @fires NodeVM."console.debug"
	 * @fires NodeVM."console.log"
	 * @fires NodeVM."console.info"
	 * @fires NodeVM."console.warn"
	 * @fires NodeVM."console.error"
	 * @fires NodeVM."console.dir"
	 * @fires NodeVM."console.trace"
	 */
	run(code, options) {
		let script;
		let filename;

		if (typeof options === 'object') {
			filename = options.filename;
		} else {
			filename = options;
			options = {__proto__: null};
		}

		const {
			strict = this.options.strict,
			wrapper = this.options.wrapper,
			module: customModule,
			require: customRequire,
			dirname: customDirname = null
		} = options;

		let sandboxModule = customModule;
		let dirname = customDirname;

		if (code instanceof VMScript) {
			script = strict ? code._compileNodeVMStrict() : code._compileNodeVM();
			if (!sandboxModule) {
				const resolvedFilename = this._resolver.pathResolve(code.filename);
				dirname = this._resolver.pathDirname(resolvedFilename);
				sandboxModule = new (this._Module)(resolvedFilename, dirname);
				this._resolver.registerModule(sandboxModule, resolvedFilename, dirname, null, false);
			}
		} else {
			const unresolvedFilename = filename || 'vm.js';
			if (!sandboxModule) {
				if (filename) {
					const resolvedFilename = this._resolver.pathResolve(filename);
					dirname = this._resolver.pathDirname(resolvedFilename);
					sandboxModule = new (this._Module)(resolvedFilename, dirname);
					this._resolver.registerModule(sandboxModule, resolvedFilename, dirname, null, false);
				} else {
					sandboxModule = new (this._Module)(null, null);
					sandboxModule.id = unresolvedFilename;
				}
			}
			const prefix = strict ? STRICT_MODULE_PREFIX : MODULE_PREFIX;
			let scriptCode = this._compiler(code, unresolvedFilename);
			scriptCode = transformer(null, scriptCode, false, false, unresolvedFilename).code;
			script = new Script(prefix + scriptCode + MODULE_SUFFIX, {
				__proto__: null,
				filename: unresolvedFilename,
				displayErrors: false
			});
		}

		const closure = this._runScript(script);

		const usedRequire = customRequire || this._createRequireForModule(sandboxModule);

		const ret = Reflect.apply(closure, this.sandbox, [sandboxModule.exports, usedRequire, sandboxModule, filename, dirname]);
		return wrapper === 'commonjs' ? sandboxModule.exports : ret;
	}

	/**
	 * Create NodeVM and run code inside it.
	 *
	 * @public
	 * @static
	 * @param {string} script - Code to execute.
	 * @param {string} [filename] - File name (used in stack traces only).
	 * @param {Object} [options] - VM options.
	 * @param {string} [options.filename] - File name (used in stack traces only). Used if <code>filename</code> is omitted.
	 * @return {*} Result of executed code.
	 * @see {@link NodeVM} for the options.
	 * @throws {SyntaxError} If there is a syntax error in the script.
	 * @throws {*} If the script execution terminated with an exception it is propagated.
	 */
	static code(script, filename, options) {
		let unresolvedFilename;
		if (filename != null) {
			if ('object' === typeof filename) {
				options = filename;
				unresolvedFilename = options.filename;
			} else if ('string' === typeof filename) {
				unresolvedFilename = filename;
			} else {
				throw new VMError('Invalid arguments.');
			}
		} else if ('object' === typeof options) {
			unresolvedFilename = options.filename;
		}

		if (arguments.length > 3) {
			throw new VMError('Invalid number of arguments.');
		}

		const resolvedFilename = typeof unresolvedFilename === 'string' ? pa.resolve(unresolvedFilename) : undefined;

		return new NodeVM(options).run(script, resolvedFilename);
	}

	/**
	 * Create NodeVM and run script from file inside it.
	 *
	 * @public
	 * @static
	 * @param {string} filename - Filename of file to load and execute in a NodeVM.
	 * @param {Object} [options] - NodeVM options.
	 * @return {*} Result of executed code.
	 * @see {@link NodeVM} for the options.
	 * @throws {Error} If filename is not a valid filename.
	 * @throws {SyntaxError} If there is a syntax error in the script.
	 * @throws {*} If the script execution terminated with an exception it is propagated.
	 */
	static file(filename, options) {
		const resolvedFilename = pa.resolve(filename);

		if (!fs.existsSync(resolvedFilename)) {
			throw new VMError(`Script '${filename}' not found.`);
		}

		if (fs.statSync(resolvedFilename).isDirectory()) {
			throw new VMError('Script must be file, got directory.');
		}

		return new NodeVM(options).run(fs.readFileSync(resolvedFilename, 'utf8'), resolvedFilename);
	}
}

function vm2NestingLoader(resolver, vm, id) {
	if (!cacheMakeNestingScript) {
		cacheMakeNestingScript = compileScript('nesting.js', '(vm, nodevm) => ({VM: vm, NodeVM: nodevm})');
	}
	const makeNesting = vm._runScript(cacheMakeNestingScript);
	return makeNesting(vm.readonly(VM), vm.readonly(NodeVM));
}

exports.NodeVM = NodeVM;

}, function(modId) { var map = {"vm":1665830430801,"./bridge":1665830430799,"./script":1665830430800,"./transformer":1665830430803,"./vm":1665830430801,"./resolver-compat":1665830430806}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430806, function(require, module, exports) {


// Translate the old options to the new Resolver functionality.

const fs = require('fs');
const pa = require('path');
const nmod = require('module');
const {EventEmitter} = require('events');
const util = require('util');

const {
	Resolver,
	DefaultResolver
} = require('./resolver');
const {VMScript} = require('./script');
const {VM} = require('./vm');
const {VMError} = require('./bridge');

/**
 * Require wrapper to be able to annotate require with webpackIgnore.
 *
 * @private
 * @param {string} moduleName - Name of module to load.
 * @return {*} Module exports.
 */
function defaultRequire(moduleName) {
	// Set module.parser.javascript.commonjsMagicComments=true in your webpack config.
	// eslint-disable-next-line global-require
	return require(/* webpackIgnore: true */ moduleName);
}

// source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
function escapeRegExp(string) {
	return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function makeExternalMatcherRegex(obj) {
	return escapeRegExp(obj).replace(/\\\\|\//g, '[\\\\/]')
		.replace(/\\\*\\\*/g, '.*').replace(/\\\*/g, '[^\\\\/]*').replace(/\\\?/g, '[^\\\\/]');
}

function makeExternalMatcher(obj) {
	const regexString = makeExternalMatcherRegex(obj);
	return new RegExp(`[\\\\/]node_modules[\\\\/]${regexString}(?:[\\\\/](?!(?:.*[\\\\/])?node_modules[\\\\/]).*)?$`);
}

class LegacyResolver extends DefaultResolver {

	constructor(builtinModules, checkPath, globalPaths, pathContext, customResolver, hostRequire, compiler, strict, externals, allowTransitive) {
		super(builtinModules, checkPath, globalPaths, pathContext, customResolver, hostRequire, compiler, strict);
		this.externals = externals;
		this.currMod = undefined;
		this.trustedMods = new WeakMap();
		this.allowTransitive = allowTransitive;
	}

	isPathAllowed(path) {
		return this.isPathAllowedForModule(path, this.currMod);
	}

	isPathAllowedForModule(path, mod) {
		if (!super.isPathAllowed(path)) return false;
		if (mod) {
			if (mod.allowTransitive) return true;
			if (path.startsWith(mod.path)) {
				const rem = path.slice(mod.path.length);
				if (!/(?:^|[\\\\/])node_modules(?:$|[\\\\/])/.test(rem)) return true;
			}
		}
		return this.externals.some(regex => regex.test(path));
	}

	registerModule(mod, filename, path, parent, direct) {
		const trustedParent = this.trustedMods.get(parent);
		this.trustedMods.set(mod, {
			filename,
			path,
			paths: this.genLookupPaths(path),
			allowTransitive: this.allowTransitive &&
				((direct && trustedParent && trustedParent.allowTransitive) || this.externals.some(regex => regex.test(filename)))
		});
	}

	resolveFull(mod, x, options, ext, direct) {
		this.currMod = undefined;
		if (!direct) return super.resolveFull(mod, x, options, ext, false);
		const trustedMod = this.trustedMods.get(mod);
		if (!trustedMod || mod.path !== trustedMod.path) return super.resolveFull(mod, x, options, ext, false);
		const paths = [...mod.paths];
		if (paths.length === trustedMod.length) {
			for (let i = 0; i < paths.length; i++) {
				if (paths[i] !== trustedMod.paths[i]) {
					return super.resolveFull(mod, x, options, ext, false);
				}
			}
		}
		const extCopy = Object.assign({__proto__: null}, ext);
		try {
			this.currMod = trustedMod;
			return super.resolveFull(trustedMod, x, undefined, extCopy, true);
		} finally {
			this.currMod = undefined;
		}
	}

	checkAccess(mod, filename) {
		const trustedMod = this.trustedMods.get(mod);
		if ((!trustedMod || trustedMod.filename !== filename) && !this.isPathAllowedForModule(filename, undefined)) {
			throw new VMError(`Module '${filename}' is not allowed to be required. The path is outside the border!`, 'EDENIED');
		}
	}

	loadJS(vm, mod, filename) {
		filename = this.pathResolve(filename);
		this.checkAccess(mod, filename);
		if (this.pathContext(filename, 'js') === 'sandbox') {
			const trustedMod = this.trustedMods.get(mod);
			const script = this.readScript(filename);
			vm.run(script, {filename, strict: true, module: mod, wrapper: 'none', dirname: trustedMod ? trustedMod.path : mod.path});
		} else {
			const m = this.hostRequire(filename);
			mod.exports = vm.readonly(m);
		}
	}

}

function defaultBuiltinLoader(resolver, vm, id) {
	const mod = resolver.hostRequire(id);
	return vm.readonly(mod);
}

const eventsModules = new WeakMap();

function defaultBuiltinLoaderEvents(resolver, vm, id) {
	return eventsModules.get(vm);
}

let cacheBufferScript;

function defaultBuiltinLoaderBuffer(resolver, vm, id) {
	if (!cacheBufferScript) {
		cacheBufferScript = new VMScript('return buffer=>({Buffer: buffer});', {__proto__: null, filename: 'buffer.js'});
	}
	const makeBuffer = vm.run(cacheBufferScript, {__proto__: null, strict: true, wrapper: 'none'});
	return makeBuffer(Buffer);
}

let cacheUtilScript;

function defaultBuiltinLoaderUtil(resolver, vm, id) {
	if (!cacheUtilScript) {
		cacheUtilScript = new VMScript(`return function inherits(ctor, superCtor) {
			ctor.super_ = superCtor;
			Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
		}`, {__proto__: null, filename: 'util.js'});
	}
	const inherits = vm.run(cacheUtilScript, {__proto__: null, strict: true, wrapper: 'none'});
	const copy = Object.assign({}, util);
	copy.inherits = inherits;
	return vm.readonly(copy);
}

const BUILTIN_MODULES = (nmod.builtinModules || Object.getOwnPropertyNames(process.binding('natives'))).filter(s=>!s.startsWith('internal/'));

let EventEmitterReferencingAsyncResourceClass = null;
if (EventEmitter.EventEmitterAsyncResource) {
	// eslint-disable-next-line global-require
	const {AsyncResource} = require('async_hooks');
	const kEventEmitter = Symbol('kEventEmitter');
	class EventEmitterReferencingAsyncResource extends AsyncResource {
		constructor(ee, type, options) {
			super(type, options);
			this[kEventEmitter] = ee;
		}
		get eventEmitter() {
			return this[kEventEmitter];
		}
	}
	EventEmitterReferencingAsyncResourceClass = EventEmitterReferencingAsyncResource;
}

let cacheEventsScript;

const SPECIAL_MODULES = {
	events(vm) {
		if (!cacheEventsScript) {
			const eventsSource = fs.readFileSync(`${__dirname}/events.js`, 'utf8');
			cacheEventsScript = new VMScript(`(function (fromhost) { const module = {}; module.exports={};{ ${eventsSource}
} return module.exports;})`, {filename: 'events.js'});
		}
		const closure = VM.prototype.run.call(vm, cacheEventsScript);
		const eventsInstance = closure(vm.readonly({
			kErrorMonitor: EventEmitter.errorMonitor,
			once: EventEmitter.once,
			on: EventEmitter.on,
			getEventListeners: EventEmitter.getEventListeners,
			EventEmitterReferencingAsyncResource: EventEmitterReferencingAsyncResourceClass
		}));
		eventsModules.set(vm, eventsInstance);
		vm._addProtoMapping(EventEmitter.prototype, eventsInstance.EventEmitter.prototype);
		return defaultBuiltinLoaderEvents;
	},
	buffer(vm) {
		return defaultBuiltinLoaderBuffer;
	},
	util(vm) {
		return defaultBuiltinLoaderUtil;
	}
};

function addDefaultBuiltin(builtins, key, vm) {
	if (builtins[key]) return;
	const special = SPECIAL_MODULES[key];
	builtins[key] = special ? special(vm) : defaultBuiltinLoader;
}


function genBuiltinsFromOptions(vm, builtinOpt, mockOpt, override) {
	const builtins = {__proto__: null};
	if (mockOpt) {
		const keys = Object.getOwnPropertyNames(mockOpt);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			builtins[key] = (resolver, tvm, id) => tvm.readonly(mockOpt[key]);
		}
	}
	if (override) {
		const keys = Object.getOwnPropertyNames(override);
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			builtins[key] = override[key];
		}
	}
	if (Array.isArray(builtinOpt)) {
		const def = builtinOpt.indexOf('*') >= 0;
		if (def) {
			for (let i = 0; i < BUILTIN_MODULES.length; i++) {
				const name = BUILTIN_MODULES[i];
				if (builtinOpt.indexOf(`-${name}`) === -1) {
					addDefaultBuiltin(builtins, name, vm);
				}
			}
		} else {
			for (let i = 0; i < BUILTIN_MODULES.length; i++) {
				const name = BUILTIN_MODULES[i];
				if (builtinOpt.indexOf(name) !== -1) {
					addDefaultBuiltin(builtins, name, vm);
				}
			}
		}
	} else if (builtinOpt) {
		for (let i = 0; i < BUILTIN_MODULES.length; i++) {
			const name = BUILTIN_MODULES[i];
			if (builtinOpt[name]) {
				addDefaultBuiltin(builtins, name, vm);
			}
		}
	}
	return builtins;
}

function defaultCustomResolver() {
	return undefined;
}

const DENY_RESOLVER = new Resolver({__proto__: null}, [], id => {
	throw new VMError(`Access denied to require '${id}'`, 'EDENIED');
});

function resolverFromOptions(vm, options, override, compiler) {
	if (!options) {
		if (!override) return DENY_RESOLVER;
		const builtins = genBuiltinsFromOptions(vm, undefined, undefined, override);
		return new Resolver(builtins, [], defaultRequire);
	}

	const {
		builtin: builtinOpt,
		mock: mockOpt,
		external: externalOpt,
		root: rootPaths,
		resolve: customResolver,
		customRequire: hostRequire = defaultRequire,
		context = 'host',
		strict = true,
	} = options;

	const builtins = genBuiltinsFromOptions(vm, builtinOpt, mockOpt, override);

	if (!externalOpt) return new Resolver(builtins, [], hostRequire);

	let checkPath;
	if (rootPaths) {
		const checkedRootPaths = (Array.isArray(rootPaths) ? rootPaths : [rootPaths]).map(f => pa.resolve(f));
		checkPath = (filename) => {
			return checkedRootPaths.some(path => {
				if (!filename.startsWith(path)) return false;
				const len = path.length;
				if (filename.length === len || (len > 0 && path[len-1] === pa.sep)) return true;
				const sep = filename[len];
				return sep === '/' || sep === pa.sep;
			});
		};
	} else {
		checkPath = () => true;
	}

	let newCustomResolver = defaultCustomResolver;
	let externals = undefined;
	let external = undefined;
	if (customResolver) {
		let externalCache;
		newCustomResolver = (resolver, x, path, extList) => {
			if (external && !(resolver.pathIsAbsolute(x) || resolver.pathIsRelative(x))) {
				if (!externalCache) {
					externalCache = external.map(ext => new RegExp(makeExternalMatcherRegex(ext)));
				}
				if (!externalCache.some(regex => regex.test(x))) return undefined;
			}
			const resolved = customResolver(x, path);
			if (!resolved) return undefined;
			if (externals) externals.push(new RegExp('^' + escapeRegExp(resolved)));
			return resolver.loadAsFileOrDirecotry(resolved, extList);
		};
	}

	if (typeof externalOpt !== 'object') {
		return new DefaultResolver(builtins, checkPath, [], () => context, newCustomResolver, hostRequire, compiler, strict);
	}

	let transitive = false;
	if (Array.isArray(externalOpt)) {
		external = externalOpt;
	} else {
		external = externalOpt.modules;
		transitive = context === 'sandbox' && externalOpt.transitive;
	}
	externals = external.map(makeExternalMatcher);
	return new LegacyResolver(builtins, checkPath, [], () => context, newCustomResolver, hostRequire, compiler, strict, externals, transitive);
}

exports.resolverFromOptions = resolverFromOptions;

}, function(modId) { var map = {"events":1665830430802,"./resolver":1665830430807,"./script":1665830430800,"./vm":1665830430801,"./bridge":1665830430799}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1665830430807, function(require, module, exports) {


// The Resolver is currently experimental and might be exposed to users in the future.

const pa = require('path');
const fs = require('fs');

const {
	VMError
} = require('./bridge');
const { VMScript } = require('./script');

// This should match. Note that '\', '%' are invalid characters
// 1. name/.*
// 2. @scope/name/.*
const EXPORTS_PATTERN = /^((?:@[^/\\%]+\/)?[^/\\%]+)(\/.*)?$/;

// See https://tc39.es/ecma262/#integer-index
function isArrayIndex(key) {
	const keyNum = +key;
	if (`${keyNum}` !== key) return false;
	return keyNum >= 0 && keyNum < 0xFFFFFFFF;
}

class Resolver {

	constructor(builtinModules, globalPaths, hostRequire) {
		this.builtinModules = builtinModules;
		this.globalPaths = globalPaths;
		this.hostRequire = hostRequire;
	}

	init(vm) {

	}

	pathResolve(path) {
		return pa.resolve(path);
	}

	pathIsRelative(path) {
		if (path === '' || path[0] !== '.') return false;
		if (path.length === 1) return true;
		const idx = path[1] === '.' ? 2 : 1;
		if (path.length <= idx) return false;
		return path[idx] === '/' || path[idx] === pa.sep;
	}

	pathIsAbsolute(path) {
		return pa.isAbsolute(path);
	}

	pathConcat(...paths) {
		return pa.join(...paths);
	}

	pathBasename(path) {
		return pa.basename(path);
	}

	pathDirname(path) {
		return pa.dirname(path);
	}

	lookupPaths(mod, id) {
		if (typeof id === 'string') throw new Error('Id is not a string');
		if (this.pathIsRelative(id)) return [mod.path || '.'];
		return [...mod.paths, ...this.globalPaths];
	}

	getBuiltinModulesList() {
		return Object.getOwnPropertyNames(this.builtinModules);
	}

	loadBuiltinModule(vm, id) {
		const handler = this.builtinModules[id];
		return handler && handler(this, vm, id);
	}

	loadJS(vm, mod, filename) {
		throw new VMError(`Access denied to require '${filename}'`, 'EDENIED');
	}

	loadJSON(vm, mod, filename) {
		throw new VMError(`Access denied to require '${filename}'`, 'EDENIED');
	}

	loadNode(vm, mod, filename) {
		throw new VMError(`Access denied to require '${filename}'`, 'EDENIED');
	}

	registerModule(mod, filename, path, parent, direct) {

	}

	resolve(mod, x, options, ext, direct) {
		if (typeof x !== 'string') throw new Error('Id is not a string');

		if (x.startsWith('node:') || this.builtinModules[x]) {
			// a. return the core module
			// b. STOP
			return x;
		}

		return this.resolveFull(mod, x, options, ext, direct);
	}

	resolveFull(mod, x, options, ext, direct) {
		// 7. THROW "not found"
		throw new VMError(`Cannot find module '${x}'`, 'ENOTFOUND');
	}

	// NODE_MODULES_PATHS(START)
	genLookupPaths(path) {
		// 1. let PARTS = path split(START)
		// 2. let I = count of PARTS - 1
		// 3. let DIRS = []
		const dirs = [];
		// 4. while I >= 0,
		while (true) {
			const name = this.pathBasename(path);
			// a. if PARTS[I] = "node_modules" CONTINUE
			if (name !== 'node_modules') {
				// b. DIR = path join(PARTS[0 .. I] + "node_modules")
				// c. DIRS = DIR + DIRS // Note: this seems wrong. Should be DIRS + DIR
				dirs.push(this.pathConcat(path, 'node_modules'));
			}
			const dir = this.pathDirname(path);
			if (dir == path) break;
			// d. let I = I - 1
			path = dir;
		}

		return dirs;
		// This is done later on
		// 5. return DIRS + GLOBAL_FOLDERS
	}

}

class DefaultResolver extends Resolver {

	constructor(builtinModules, checkPath, globalPaths, pathContext, customResolver, hostRequire, compiler, strict) {
		super(builtinModules, globalPaths, hostRequire);
		this.checkPath = checkPath;
		this.pathContext = pathContext;
		this.customResolver = customResolver;
		this.compiler = compiler;
		this.strict = strict;
		this.packageCache = {__proto__: null};
		this.scriptCache = {__proto__: null};
	}

	isPathAllowed(path) {
		return this.checkPath(path);
	}

	pathTestIsDirectory(path) {
		try {
			const stat = fs.statSync(path, {__proto__: null, throwIfNoEntry: false});
			return stat && stat.isDirectory();
		} catch (e) {
			return false;
		}
	}

	pathTestIsFile(path) {
		try {
			const stat = fs.statSync(path, {__proto__: null, throwIfNoEntry: false});
			return stat && stat.isFile();
		} catch (e) {
			return false;
		}
	}

	readFile(path) {
		return fs.readFileSync(path, {encoding: 'utf8'});
	}

	readFileWhenExists(path) {
		return this.pathTestIsFile(path) ? this.readFile(path) : undefined;
	}

	readScript(filename) {
		let script = this.scriptCache[filename];
		if (!script) {
			script = new VMScript(this.readFile(filename), {filename, compiler: this.compiler});
			this.scriptCache[filename] = script;
		}
		return script;
	}

	checkAccess(mod, filename) {
		if (!this.isPathAllowed(filename)) {
			throw new VMError(`Module '${filename}' is not allowed to be required. The path is outside the border!`, 'EDENIED');
		}
	}

	loadJS(vm, mod, filename) {
		filename = this.pathResolve(filename);
		this.checkAccess(mod, filename);
		if (this.pathContext(filename, 'js') === 'sandbox') {
			const script = this.readScript(filename);
			vm.run(script, {filename, strict: this.strict, module: mod, wrapper: 'none', dirname: mod.path});
		} else {
			const m = this.hostRequire(filename);
			mod.exports = vm.readonly(m);
		}
	}

	loadJSON(vm, mod, filename) {
		filename = this.pathResolve(filename);
		this.checkAccess(mod, filename);
		const json = this.readFile(filename);
		mod.exports = vm._jsonParse(json);
	}

	loadNode(vm, mod, filename) {
		filename = this.pathResolve(filename);
		this.checkAccess(mod, filename);
		if (this.pathContext(filename, 'node') === 'sandbox') throw new VMError('Native modules can be required only with context set to \'host\'.');
		const m = this.hostRequire(filename);
		mod.exports = vm.readonly(m);
	}

	// require(X) from module at path Y
	resolveFull(mod, x, options, ext, direct) {
		// Note: core module handled by caller

		const extList = Object.getOwnPropertyNames(ext);
		const path = mod.path || '.';

		// 5. LOAD_PACKAGE_SELF(X, dirname(Y))
		let f = this.loadPackageSelf(x, path, extList);
		if (f) return f;

		// 4. If X begins with '#'
		if (x[0] === '#') {
			// a. LOAD_PACKAGE_IMPORTS(X, dirname(Y))
			f = this.loadPackageImports(x, path, extList);
			if (f) return f;
		}

		// 2. If X begins with '/'
		if (this.pathIsAbsolute(x)) {
			// a. set Y to be the filesystem root
			f = this.loadAsFileOrDirecotry(x, extList);
			if (f) return f;

			// c. THROW "not found"
			throw new VMError(`Cannot find module '${x}'`, 'ENOTFOUND');

		// 3. If X begins with './' or '/' or '../'
		} else if (this.pathIsRelative(x)) {
			if (typeof options === 'object' && options !== null) {
				const paths = options.paths;
				if (Array.isArray(paths)) {
					for (let i = 0; i < paths.length; i++) {
						// a. LOAD_AS_FILE(Y + X)
						// b. LOAD_AS_DIRECTORY(Y + X)
						f = this.loadAsFileOrDirecotry(this.pathConcat(paths[i], x), extList);
						if (f) return f;
					}
				} else if (paths === undefined) {
					// a. LOAD_AS_FILE(Y + X)
					// b. LOAD_AS_DIRECTORY(Y + X)
					f = this.loadAsFileOrDirecotry(this.pathConcat(path, x), extList);
					if (f) return f;
				} else {
					throw new VMError('Invalid options.paths option.');
				}
			} else {
				// a. LOAD_AS_FILE(Y + X)
				// b. LOAD_AS_DIRECTORY(Y + X)
				f = this.loadAsFileOrDirecotry(this.pathConcat(path, x), extList);
				if (f) return f;
			}

			// c. THROW "not found"
			throw new VMError(`Cannot find module '${x}'`, 'ENOTFOUND');
		}

		let dirs;
		if (typeof options === 'object' && options !== null) {
			const paths = options.paths;
			if (Array.isArray(paths)) {
				dirs = [];

				for (let i = 0; i < paths.length; i++) {
					const lookups = this.genLookupPaths(paths[i]);
					for (let j = 0; j < lookups.length; j++) {
						if (!dirs.includes(lookups[j])) dirs.push(lookups[j]);
					}
					if (i === 0) {
						const globalPaths = this.globalPaths;
						for (let j = 0; j < globalPaths.length; j++) {
							if (!dirs.includes(globalPaths[j])) dirs.push(globalPaths[j]);
						}
					}
				}
			} else if (paths === undefined) {
				dirs = [...mod.paths, ...this.globalPaths];
			} else {
				throw new VMError('Invalid options.paths option.');
			}
		} else {
			dirs = [...mod.paths, ...this.globalPaths];
		}

		// 6. LOAD_NODE_MODULES(X, dirname(Y))
		f = this.loadNodeModules(x, dirs, extList);
		if (f) return f;

		f = this.customResolver(this, x, path, extList);
		if (f) return f;

		return super.resolveFull(mod, x, options, ext, direct);
	}

	loadAsFileOrDirecotry(x, extList) {
		// a. LOAD_AS_FILE(X)
		const f = this.loadAsFile(x, extList);
		if (f) return f;
		// b. LOAD_AS_DIRECTORY(X)
		return this.loadAsDirectory(x, extList);
	}

	tryFile(x) {
		x = this.pathResolve(x);
		return this.isPathAllowed(x) && this.pathTestIsFile(x) ? x : undefined;
	}

	tryWithExtension(x, extList) {
		for (let i = 0; i < extList.length; i++) {
			const ext = extList[i];
			if (ext !== this.pathBasename(ext)) continue;
			const f = this.tryFile(x + ext);
			if (f) return f;
		}
		return undefined;
	}

	readPackage(path) {
		const packagePath = this.pathResolve(this.pathConcat(path, 'package.json'));

		const cache = this.packageCache[packagePath];
		if (cache !== undefined) return cache;

		if (!this.isPathAllowed(packagePath)) return undefined;
		const content = this.readFileWhenExists(packagePath);
		if (!content) {
			this.packageCache[packagePath] = false;
			return false;
		}

		let parsed;
		try {
			parsed = JSON.parse(content);
		} catch (e) {
			e.path = packagePath;
			e.message = 'Error parsing ' + packagePath + ': ' + e.message;
			throw e;
		}

		const filtered = {
			name: parsed.name,
			main: parsed.main,
			exports: parsed.exports,
			imports: parsed.imports,
			type: parsed.type
		};
		this.packageCache[packagePath] = filtered;
		return filtered;
	}

	readPackageScope(path) {
		while (true) {
			const dir = this.pathDirname(path);
			if (dir === path) break;
			const basename = this.pathBasename(dir);
			if (basename === 'node_modules') break;
			const pack = this.readPackage(dir);
			if (pack) return {data: pack, scope: dir};
			path = dir;
		}
		return {data: undefined, scope: undefined};
	}

	// LOAD_AS_FILE(X)
	loadAsFile(x, extList) {
		// 1. If X is a file, load X as its file extension format. STOP
		const f = this.tryFile(x);
		if (f) return f;
		// 2. If X.js is a file, load X.js as JavaScript text. STOP
		// 3. If X.json is a file, parse X.json to a JavaScript Object. STOP
		// 4. If X.node is a file, load X.node as binary addon. STOP
		return this.tryWithExtension(x, extList);
	}

	// LOAD_INDEX(X)
	loadIndex(x, extList) {
		// 1. If X/index.js is a file, load X/index.js as JavaScript text. STOP
		// 2. If X/index.json is a file, parse X/index.json to a JavaScript object. STOP
		// 3. If X/index.node is a file, load X/index.node as binary addon. STOP
		return this.tryWithExtension(this.pathConcat(x, 'index'), extList);
	}

	// LOAD_AS_DIRECTORY(X)
	loadAsPackage(x, pack, extList) {
		// 1. If X/package.json is a file,
		// already done.
		if (pack) {
			// a. Parse X/package.json, and look for "main" field.
			// b. If "main" is a falsy value, GOTO 2.
			if (typeof pack.main === 'string') {
				// c. let M = X + (json main field)
				const m = this.pathConcat(x, pack.main);
				// d. LOAD_AS_FILE(M)
				let f = this.loadAsFile(m, extList);
				if (f) return f;
				// e. LOAD_INDEX(M)
				f = this.loadIndex(m, extList);
				if (f) return f;
				// f. LOAD_INDEX(X) DEPRECATED
				f = this.loadIndex(x, extList);
				if (f) return f;
				// g. THROW "not found"
				throw new VMError(`Cannot find module '${x}'`, 'ENOTFOUND');
			}
		}

		// 2. LOAD_INDEX(X)
		return this.loadIndex(x, extList);
	}

	// LOAD_AS_DIRECTORY(X)
	loadAsDirectory(x, extList) {
		// 1. If X/package.json is a file,
		const pack = this.readPackage(x);
		return this.loadAsPackage(x, pack, extList);
	}

	// LOAD_NODE_MODULES(X, START)
	loadNodeModules(x, dirs, extList) {
		// 1. let DIRS = NODE_MODULES_PATHS(START)
		// This step is already done.

		// 2. for each DIR in DIRS:
		for (let i = 0; i < dirs.length; i++) {
			const dir = dirs[i];
			// a. LOAD_PACKAGE_EXPORTS(X, DIR)
			let f = this.loadPackageExports(x, dir, extList);
			if (f) return f;
			// b. LOAD_AS_FILE(DIR/X)
			f = this.loadAsFile(dir + '/' + x, extList);
			if (f) return f;
			// c. LOAD_AS_DIRECTORY(DIR/X)
			f = this.loadAsDirectory(dir + '/' + x, extList);
			if (f) return f;
		}

		return undefined;
	}

	// LOAD_PACKAGE_IMPORTS(X, DIR)
	loadPackageImports(x, dir, extList) {
		// 1. Find the closest package scope SCOPE to DIR.
		const {data, scope} = this.readPackageScope(dir);
		// 2. If no scope was found, return.
		if (!data) return undefined;
		// 3. If the SCOPE/package.json "imports" is null or undefined, return.
		if (typeof data.imports !== 'object' || data.imports === null || Array.isArray(data.imports)) return undefined;
		// 4. let MATCH = PACKAGE_IMPORTS_RESOLVE(X, pathToFileURL(SCOPE),
		//   ["node", "require"]) defined in the ESM resolver.

		// PACKAGE_IMPORTS_RESOLVE(specifier, parentURL, conditions)
		// 1. Assert: specifier begins with "#".
		// 2. If specifier is exactly equal to "#" or starts with "#/", then
		if (x === '#' || x.startsWith('#/')) {
			// a. Throw an Invalid Module Specifier error.
			throw new VMError(`Invalid module specifier '${x}'`, 'ERR_INVALID_MODULE_SPECIFIER');
		}
		// 3. Let packageURL be the result of LOOKUP_PACKAGE_SCOPE(parentURL).
		// Note: packageURL === parentURL === scope
		// 4. If packageURL is not null, then
		// Always true
		// a. Let pjson be the result of READ_PACKAGE_JSON(packageURL).
		// pjson === data
		// b. If pjson.imports is a non-null Object, then
		// Already tested
		// x. Let resolved be the result of PACKAGE_IMPORTS_EXPORTS_RESOLVE( specifier, pjson.imports, packageURL, true, conditions).
		const match = this.packageImportsExportsResolve(x, data.imports, scope, true, ['node', 'require'], extList);
		// y. If resolved is not null or undefined, return resolved.
		if (!match) {
			// 5. Throw a Package Import Not Defined error.
			throw new VMError(`Package import not defined for '${x}'`, 'ERR_PACKAGE_IMPORT_NOT_DEFINED');
		}
		// END PACKAGE_IMPORTS_RESOLVE

		// 5. RESOLVE_ESM_MATCH(MATCH).
		return this.resolveEsmMatch(match, x, extList);
	}

	// LOAD_PACKAGE_EXPORTS(X, DIR)
	loadPackageExports(x, dir, extList) {
		// 1. Try to interpret X as a combination of NAME and SUBPATH where the name
		//    may have a @scope/ prefix and the subpath begins with a slash (`/`).
		const res = x.match(EXPORTS_PATTERN);
		// 2. If X does not match this pattern or DIR/NAME/package.json is not a file,
		//    return.
		if (!res) return undefined;
		const scope = this.pathConcat(dir, res[1]);
		const pack = this.readPackage(scope);
		if (!pack) return undefined;
		// 3. Parse DIR/NAME/package.json, and look for "exports" field.
		// 4. If "exports" is null or undefined, return.
		if (!pack.exports) return undefined;
		// 5. let MATCH = PACKAGE_EXPORTS_RESOLVE(pathToFileURL(DIR/NAME), "." + SUBPATH,
		//    `package.json` "exports", ["node", "require"]) defined in the ESM resolver.
		const match = this.packageExportsResolve(scope, '.' + (res[2] || ''), pack.exports, ['node', 'require'], extList);
		// 6. RESOLVE_ESM_MATCH(MATCH)
		return this.resolveEsmMatch(match, x, extList);
	}

	// LOAD_PACKAGE_SELF(X, DIR)
	loadPackageSelf(x, dir, extList) {
		// 1. Find the closest package scope SCOPE to DIR.
		const {data, scope} = this.readPackageScope(dir);
		// 2. If no scope was found, return.
		if (!data) return undefined;
		// 3. If the SCOPE/package.json "exports" is null or undefined, return.
		if (!data.exports) return undefined;
		// 4. If the SCOPE/package.json "name" is not the first segment of X, return.
		if (x !== data.name && !x.startsWith(data.name + '/')) return undefined;
		// 5. let MATCH = PACKAGE_EXPORTS_RESOLVE(pathToFileURL(SCOPE),
		//    "." + X.slice("name".length), `package.json` "exports", ["node", "require"])
		//    defined in the ESM resolver.
		const match = this.packageExportsResolve(scope, '.' + x.slice(data.name.length), data.exports, ['node', 'require'], extList);
		// 6. RESOLVE_ESM_MATCH(MATCH)
		return this.resolveEsmMatch(match, x, extList);
	}

	// RESOLVE_ESM_MATCH(MATCH)
	resolveEsmMatch(match, x, extList) {
		// 1. let { RESOLVED, EXACT } = MATCH
		const resolved = match;
		const exact = true;
		// 2. let RESOLVED_PATH = fileURLToPath(RESOLVED)
		const resolvedPath = resolved;
		let f;
		// 3. If EXACT is true,
		if (exact) {
			// a. If the file at RESOLVED_PATH exists, load RESOLVED_PATH as its extension
			// format. STOP
			f = this.tryFile(resolvedPath);
		// 4. Otherwise, if EXACT is false,
		} else {
			// a. LOAD_AS_FILE(RESOLVED_PATH)
			// b. LOAD_AS_DIRECTORY(RESOLVED_PATH)
			f = this.loadAsFileOrDirecotry(resolvedPath, extList);
		}
		if (f) return f;
		// 5. THROW "not found"
		throw new VMError(`Cannot find module '${x}'`, 'ENOTFOUND');
	}

	// PACKAGE_EXPORTS_RESOLVE(packageURL, subpath, exports, conditions)
	packageExportsResolve(packageURL, subpath, rexports, conditions, extList) {
		// 1. If exports is an Object with both a key starting with "." and a key not starting with ".", throw an Invalid Package Configuration error.
		let hasDots = false;
		if (typeof rexports === 'object' && !Array.isArray(rexports)) {
			const keys = Object.getOwnPropertyNames(rexports);
			if (keys.length > 0) {
				hasDots = keys[0][0] === '.';
				for (let i = 0; i < keys.length; i++) {
					if (hasDots !== (keys[i][0] === '.')) {
						throw new VMError('Invalid package configuration', 'ERR_INVALID_PACKAGE_CONFIGURATION');
					}
				}
			}
		}
		// 2. If subpath is equal to ".", then
		if (subpath === '.') {
			// a. Let mainExport be undefined.
			let mainExport = undefined;
			// b. If exports is a String or Array, or an Object containing no keys starting with ".", then
			if (typeof rexports === 'string' || Array.isArray(rexports) || !hasDots) {
				// x. Set mainExport to exports.
				mainExport = rexports;
			// c. Otherwise if exports is an Object containing a "." property, then
			} else if (hasDots) {
				// x. Set mainExport to exports["."].
				mainExport = rexports['.'];
			}
			// d. If mainExport is not undefined, then
			if (mainExport) {
				// x. Let resolved be the result of PACKAGE_TARGET_RESOLVE( packageURL, mainExport, "", false, false, conditions).
				const resolved = this.packageTargetResolve(packageURL, mainExport, '', false, false, conditions, extList);
				// y. If resolved is not null or undefined, return resolved.
				if (resolved) return resolved;
			}
		// 3. Otherwise, if exports is an Object and all keys of exports start with ".", then
		} else if (hasDots) {
			// a. Let matchKey be the string "./" concatenated with subpath.
			// Note: Here subpath starts already with './'
			// b. Let resolved be the result of PACKAGE_IMPORTS_EXPORTS_RESOLVE( matchKey, exports, packageURL, false, conditions).
			const resolved = this.packageImportsExportsResolve(subpath, rexports, packageURL, false, conditions, extList);
			// c. If resolved is not null or undefined, return resolved.
			if (resolved) return resolved;
		}
		// 4. Throw a Package Path Not Exported error.
		throw new VMError(`Package path '${subpath}' is not exported`, 'ERR_PACKAGE_PATH_NOT_EXPORTED');
	}

	// PACKAGE_IMPORTS_EXPORTS_RESOLVE(matchKey, matchObj, packageURL, isImports, conditions)
	packageImportsExportsResolve(matchKey, matchObj, packageURL, isImports, conditions, extList) {
		// 1. If matchKey is a key of matchObj and does not contain "*", then
		let target = matchObj[matchKey];
		if (target && matchKey.indexOf('*') === -1) {
			// a. Let target be the value of matchObj[matchKey].
			// b. Return the result of PACKAGE_TARGET_RESOLVE(packageURL, target, "", false, isImports, conditions).
			return this.packageTargetResolve(packageURL, target, '', false, isImports, conditions, extList);
		}
		// 2. Let expansionKeys be the list of keys of matchObj containing only a single "*",
		//    sorted by the sorting function PATTERN_KEY_COMPARE which orders in descending order of specificity.
		const expansionKeys = Object.getOwnPropertyNames(matchObj);
		let bestKey = '';
		let bestSubpath;
		// 3. For each key expansionKey in expansionKeys, do
		for (let i = 0; i < expansionKeys.length; i++) {
			const expansionKey = expansionKeys[i];
			if (matchKey.length < expansionKey.length) continue;
			// a. Let patternBase be the substring of expansionKey up to but excluding the first "*" character.
			const star = expansionKey.indexOf('*');
			if (star === -1) continue; // Note: expansionKeys was not filtered
			const patternBase = expansionKey.slice(0, star);
			// b. If matchKey starts with but is not equal to patternBase, then
			if (matchKey.startsWith(patternBase) && expansionKey.indexOf('*', star + 1) === -1) { // Note: expansionKeys was not filtered
				// 1. Let patternTrailer be the substring of expansionKey from the index after the first "*" character.
				const patternTrailer = expansionKey.slice(star + 1);
				// 2. If patternTrailer has zero length, or if matchKey ends with patternTrailer and the length of matchKey is greater than or
				//    equal to the length of expansionKey, then
				if (matchKey.endsWith(patternTrailer) && this.patternKeyCompare(bestKey, expansionKey) === 1) { // Note: expansionKeys was not sorted
					// a. Let target be the value of matchObj[expansionKey].
					target = matchObj[expansionKey];
					// b. Let subpath be the substring of matchKey starting at the index of the length of patternBase up to the length of
					//    matchKey minus the length of patternTrailer.
					bestKey = expansionKey;
					bestSubpath = matchKey.slice(patternBase.length, matchKey.length - patternTrailer.length);
				}
			}
		}
		if (bestSubpath) { // Note: expansionKeys was not sorted
			// c. Return the result of PACKAGE_TARGET_RESOLVE(packageURL, target, subpath, true, isImports, conditions).
			return this.packageTargetResolve(packageURL, target, bestSubpath, true, isImports, conditions, extList);
		}
		// 4. Return null.
		return null;
	}

	// PATTERN_KEY_COMPARE(keyA, keyB)
	patternKeyCompare(keyA, keyB) {
		// 1. Assert: keyA ends with "/" or contains only a single "*".
		// 2. Assert: keyB ends with "/" or contains only a single "*".
		// 3. Let baseLengthA be the index of "*" in keyA plus one, if keyA contains "*", or the length of keyA otherwise.
		const baseAStar = keyA.indexOf('*');
		const baseLengthA = baseAStar === -1 ? keyA.length : baseAStar + 1;
		// 4. Let baseLengthB be the index of "*" in keyB plus one, if keyB contains "*", or the length of keyB otherwise.
		const baseBStar = keyB.indexOf('*');
		const baseLengthB = baseBStar === -1 ? keyB.length : baseBStar + 1;
		// 5. If baseLengthA is greater than baseLengthB, return -1.
		if (baseLengthA > baseLengthB) return -1;
		// 6. If baseLengthB is greater than baseLengthA, return 1.
		if (baseLengthB > baseLengthA) return 1;
		// 7. If keyA does not contain "*", return 1.
		if (baseAStar === -1) return 1;
		// 8. If keyB does not contain "*", return -1.
		if (baseBStar === -1) return -1;
		// 9. If the length of keyA is greater than the length of keyB, return -1.
		if (keyA.length > keyB.length) return -1;
		// 10. If the length of keyB is greater than the length of keyA, return 1.
		if (keyB.length > keyA.length) return 1;
		// 11. Return 0.
		return 0;
	}

	// PACKAGE_TARGET_RESOLVE(packageURL, target, subpath, pattern, internal, conditions)
	packageTargetResolve(packageURL, target, subpath, pattern, internal, conditions, extList) {
		// 1. If target is a String, then
		if (typeof target === 'string') {
			// a. If pattern is false, subpath has non-zero length and target does not end with "/", throw an Invalid Module Specifier error.
			if (!pattern && subpath.length > 0 && !target.endsWith('/')) {
				throw new VMError(`Invalid package specifier '${subpath}'`, 'ERR_INVALID_MODULE_SPECIFIER');
			}
			// b. If target does not start with "./", then
			if (!target.startsWith('./')) {
				// 1. If internal is true and target does not start with "../" or "/" and is not a valid URL, then
				if (internal && !target.startsWith('../') && !target.startsWith('/')) {
					let isURL = false;
					try {
						// eslint-disable-next-line no-new
						new URL(target);
						isURL = true;
					} catch (e) {}
					if (!isURL) {
						// a. If pattern is true, then
						if (pattern) {
							// 1. Return PACKAGE_RESOLVE(target with every instance of "*" replaced by subpath, packageURL + "/").
							return this.packageResolve(target.replace(/\*/g, subpath), packageURL, conditions, extList);
						}
						// b. Return PACKAGE_RESOLVE(target + subpath, packageURL + "/").
						return this.packageResolve(this.pathConcat(target, subpath), packageURL, conditions, extList);
					}
				}
				// Otherwise, throw an Invalid Package Target error.
				throw new VMError(`Invalid package target for '${subpath}'`, 'ERR_INVALID_PACKAGE_TARGET');
			}
			target = decodeURI(target);
			// c. If target split on "/" or "\" contains any ".", ".." or "node_modules" segments after the first segment, case insensitive
			//    and including percent encoded variants, throw an Invalid Package Target error.
			if (target.split(/[/\\]/).slice(1).findIndex(x => x === '.' || x === '..' || x.toLowerCase() === 'node_modules') !== -1) {
				throw new VMError(`Invalid package target for '${subpath}'`, 'ERR_INVALID_PACKAGE_TARGET');
			}
			// d. Let resolvedTarget be the URL resolution of the concatenation of packageURL and target.
			const resolvedTarget = this.pathConcat(packageURL, target);
			// e. Assert: resolvedTarget is contained in packageURL.
			subpath = decodeURI(subpath);
			// f. If subpath split on "/" or "\" contains any ".", ".." or "node_modules" segments, case insensitive and including percent
			//    encoded variants, throw an Invalid Module Specifier error.
			if (subpath.split(/[/\\]/).findIndex(x => x === '.' || x === '..' || x.toLowerCase() === 'node_modules') !== -1) {
				throw new VMError(`Invalid package specifier '${subpath}'`, 'ERR_INVALID_MODULE_SPECIFIER');
			}
			// g. If pattern is true, then
			if (pattern) {
				// 1. Return the URL resolution of resolvedTarget with every instance of "*" replaced with subpath.
				return resolvedTarget.replace(/\*/g, subpath);
			}
			// h. Otherwise,
			// 1. Return the URL resolution of the concatenation of subpath and resolvedTarget.
			return this.pathConcat(resolvedTarget, subpath);
		// 3. Otherwise, if target is an Array, then
		} else if (Array.isArray(target)) {
			// a. If target.length is zero, return null.
			if (target.length === 0) return null;
			let lastException = undefined;
			// b. For each item targetValue in target, do
			for (let i = 0; i < target.length; i++) {
				const targetValue = target[i];
				// 1. Let resolved be the result of PACKAGE_TARGET_RESOLVE( packageURL, targetValue, subpath, pattern, internal, conditions),
				//    continuing the loop on any Invalid Package Target error.
				let resolved;
				try {
					resolved = this.packageTargetResolve(packageURL, targetValue, subpath, pattern, internal, conditions, extList);
				} catch (e) {
					if (e.code !== 'ERR_INVALID_PACKAGE_TARGET') throw e;
					lastException = e;
					continue;
				}
				// 2. If resolved is undefined, continue the loop.
				// 3. Return resolved.
				if (resolved !== undefined) return resolved;
				if (resolved === null) {
					lastException = null;
				}
			}
			// c. Return or throw the last fallback resolution null return or error.
			if (lastException === undefined || lastException === null) return lastException;
			throw lastException;
		// 2. Otherwise, if target is a non-null Object, then
		} else if (typeof target === 'object' && target !== null) {
			const keys = Object.getOwnPropertyNames(target);
			// a. If exports contains any index property keys, as defined in ECMA-262 6.1.7 Array Index, throw an Invalid Package Configuration error.
			for (let i = 0; i < keys.length; i++) {
				const p = keys[i];
				if (isArrayIndex(p)) throw new VMError(`Invalid package configuration for '${subpath}'`, 'ERR_INVALID_PACKAGE_CONFIGURATION');
			}
			// b. For each property p of target, in object insertion order as,
			for (let i = 0; i < keys.length; i++) {
				const p = keys[i];
				// 1. If p equals "default" or conditions contains an entry for p, then
				if (p === 'default' || conditions.includes(p)) {
					// a. Let targetValue be the value of the p property in target.
					const targetValue = target[p];
					// b. Let resolved be the result of PACKAGE_TARGET_RESOLVE( packageURL, targetValue, subpath, pattern, internal, conditions).
					const resolved = this.packageTargetResolve(packageURL, targetValue, subpath, pattern, internal, conditions, extList);
					// c. If resolved is equal to undefined, continue the loop.
					// d. Return resolved.
					if (resolved !== undefined) return resolved;
				}
			}
			// c. Return undefined.
			return undefined;
		// 4. Otherwise, if target is null, return null.
		} else if (target == null) {
			return null;
		}
		// Otherwise throw an Invalid Package Target error.
		throw new VMError(`Invalid package target for '${subpath}'`, 'ERR_INVALID_PACKAGE_TARGET');
	}

	// PACKAGE_RESOLVE(packageSpecifier, parentURL)
	packageResolve(packageSpecifier, parentURL, conditions, extList) {
		// 1. Let packageName be undefined.
		let packageName = undefined;
		// 2. If packageSpecifier is an empty string, then
		if (packageSpecifier === '') {
			// a. Throw an Invalid Module Specifier error.
			throw new VMError(`Invalid package specifier '${packageSpecifier}'`, 'ERR_INVALID_MODULE_SPECIFIER');
		}
		// 3. If packageSpecifier is a Node.js builtin module name, then
		if (this.builtinModules[packageSpecifier]) {
			// a. Return the string "node:" concatenated with packageSpecifier.
			return 'node:' + packageSpecifier;
		}
		let idx = packageSpecifier.indexOf('/');
		// 5. Otherwise,
		if (packageSpecifier[0] === '@') {
			// a. If packageSpecifier does not contain a "/" separator, then
			if (idx === -1) {
				// x. Throw an Invalid Module Specifier error.
				throw new VMError(`Invalid package specifier '${packageSpecifier}'`, 'ERR_INVALID_MODULE_SPECIFIER');
			}
			// b. Set packageName to the substring of packageSpecifier until the second "/" separator or the end of the string.
			idx = packageSpecifier.indexOf('/', idx + 1);
		}
		// else
		// 4. If packageSpecifier does not start with "@", then
		// a. Set packageName to the substring of packageSpecifier until the first "/" separator or the end of the string.
		packageName = idx === -1 ? packageSpecifier : packageSpecifier.slice(0, idx);
		// 6. If packageName starts with "." or contains "\" or "%", then
		if (idx !== 0 && (packageName[0] === '.' || packageName.indexOf('\\') >= 0 || packageName.indexOf('%') >= 0)) {
			// a. Throw an Invalid Module Specifier error.
			throw new VMError(`Invalid package specifier '${packageSpecifier}'`, 'ERR_INVALID_MODULE_SPECIFIER');
		}
		// 7. Let packageSubpath be "." concatenated with the substring of packageSpecifier from the position at the length of packageName.
		const packageSubpath = '.' + packageSpecifier.slice(packageName.length);
		// 8. If packageSubpath ends in "/", then
		if (packageSubpath[packageSubpath.length - 1] === '/') {
			// a. Throw an Invalid Module Specifier error.
			throw new VMError(`Invalid package specifier '${packageSpecifier}'`, 'ERR_INVALID_MODULE_SPECIFIER');
		}
		// 9. Let selfUrl be the result of PACKAGE_SELF_RESOLVE(packageName, packageSubpath, parentURL).
		const selfUrl = this.packageSelfResolve(packageName, packageSubpath, parentURL);
		// 10. If selfUrl is not undefined, return selfUrl.
		if (selfUrl) return selfUrl;
		// 11. While parentURL is not the file system root,
		let packageURL;
		while (true) {
			// a. Let packageURL be the URL resolution of "node_modules/" concatenated with packageSpecifier, relative to parentURL.
			packageURL = this.pathResolve(this.pathConcat(parentURL, 'node_modules', packageSpecifier));
			// b. Set parentURL to the parent folder URL of parentURL.
			const parentParentURL = this.pathDirname(parentURL);
			// c. If the folder at packageURL does not exist, then
			if (this.isPathAllowed(packageURL) && this.pathTestIsDirectory(packageURL)) break;
			// 1. Continue the next loop iteration.
			if (parentParentURL === parentURL) {
				// 12. Throw a Module Not Found error.
				throw new VMError(`Cannot find module '${packageSpecifier}'`, 'ENOTFOUND');
			}
			parentURL = parentParentURL;
		}
		// d. Let pjson be the result of READ_PACKAGE_JSON(packageURL).
		const pack = this.readPackage(packageURL);
		// e. If pjson is not null and pjson.exports is not null or undefined, then
		if (pack && pack.exports) {
			// 1. Return the result of PACKAGE_EXPORTS_RESOLVE(packageURL, packageSubpath, pjson.exports, defaultConditions).
			return this.packageExportsResolve(packageURL, packageSubpath, pack.exports, conditions, extList);
		}
		// f. Otherwise, if packageSubpath is equal to ".", then
		if (packageSubpath === '.') {
			// 1. If pjson.main is a string, then
			// a. Return the URL resolution of main in packageURL.
			return this.loadAsPackage(packageSubpath, pack, extList);
		}
		// g. Otherwise,
		// 1. Return the URL resolution of packageSubpath in packageURL.
		return this.pathConcat(packageURL, packageSubpath);
	}

}

exports.Resolver = Resolver;
exports.DefaultResolver = DefaultResolver;

}, function(modId) { var map = {"./bridge":1665830430799,"./script":1665830430800}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1665830430797);
})()
//miniprogram-npm-outsideDeps=["fs","path","buffer","acorn","acorn-walk","coffee-script","module","util","async_hooks"]
//# sourceMappingURL=index.js.map