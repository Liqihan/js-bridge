(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.JsBridge = {})));
}(this, (function (exports) { 'use strict';

var userAgent = navigator.userAgent;
var isAndroid = userAgent.match(/(Android);?[\s\/]+([\d.]+)?/) ? true : false;
var isIpad = userAgent.match(/(iPad).*OS\s([\d_]+)/) ? true : false;
var isIphone = !isIpad && userAgent.match(/(iPhone\sOS)\s([\d_]+)/) ? true : false;
var isIos = isIpad || isIphone;
var isMobile = isAndroid || isIos;
var os = isMobile ? isIos ? 'ios' : 'android' : '';
var device = {
    os: os,
    android: isAndroid,
    ios: isIos,
    mobile: isMobile,

    supportedJsBridge: true
};
var deviceTouch = function deviceTouch() {
    var AppReg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : /AppleWebKit\/(\d+(\.\d+){2})/ig;

    var appVersion = '';
    var isOwnApp = AppReg.test(userAgent);
    if (isOwnApp) {
        appVersion = RegExp.$1 || "";
    }
    device.isOwnApp = isOwnApp;
    device.appVersion = appVersion;
    return device;
};
deviceTouch();

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var JsBridge = function JsBridge() {
    var _this = this;

    classCallCheck(this, JsBridge);
    this.debug = false;
    this.doReadying = true;
    this.bridge = null;
    this.queue = [];
    this.registerQueue = {};
    this.supportedApi = [];

    this.config = function (options) {
        _this.debug = options.debug;
    };

    this.setAppReg = function (AppReg) {
        deviceTouch(AppReg);
    };

    this.init = function () {
        var self = _this;

        var callback = function callback(bridge) {
            bridge.invoke = bridge.callNative = function (method, params, cb) {
                var fn = function fn(response) {
                    if (typeof response === "string") {
                        try {
                            response = JSON.parse(response);
                        } catch (e) {
                            callback(e);
                            self.debugInfo("can not parse data from App");
                        }
                    }
                    cb(response);
                    self.debugInfo("method: " + method + "; request:" + JSON.stringify(params) + "; response:" + JSON.stringify(response));
                };
                bridge.callHandler(method, params, fn);
            };

            if (bridge.hasOwnProperty("init")) {
                bridge.init();
            }

            self.doReadying = false;
            self.bridge = bridge;

            for (var i = 0; i < self.queue.length; i++) {
                var cb = self.queue[i];
                cb(bridge);
            }
        };
        if (window.WebViewJavascriptBridge) {
            callback(window.WebViewJavascriptBridge);
            self.debugInfo("bridge ready success!");
            return;
        }

        document.addEventListener("WebViewJavascriptBridgeReady", function () {
            callback(window.WebViewJavascriptBridge);
            if (self.debug) {
                window.alert("ReadySuccess!");
            }
        }, false);

        if (window.WVJBCallbacks) {
            return window.WVJBCallbacks.push(callback);
        }
        window.WVJBCallbacks = [callback];
        var WVJBIframe = document.createElement("iframe");
        WVJBIframe.style.display = "none";
        WVJBIframe.src = "https://__bridge_loaded__";
        document.documentElement.appendChild(WVJBIframe);
        setTimeout(function () {
            document.documentElement.removeChild(WVJBIframe);
        }, 0);
        return _this;
    };

    this.ready = function (callback) {
        var isOwnApp = device.isOwnApp,
            supportedJsBridge = device.supportedJsBridge;

        if (!isOwnApp || !supportedJsBridge) {
            return callback();
        }
        if (_this.doReadying) {
            _this.queue.push(callback);
        } else {
            callback(_this.bridge);
        }
    };

    this.call = function (options) {
        var self = _this;
        self.ready(function (bridge) {
            var method = options.method,
                params = options.params,
                success = options.success,
                _options$error = options.error,
                error = _options$error === undefined ? function () {} : _options$error;

            if (!bridge) {
                return error();
            }

            if (self.supportedApi.indexOf(method) > -1) {
                var newParams = typeof params !== "string" ? JSON.stringify(params) : params;
                bridge.invoke(method, newParams, success);
            } else {
                bridge.callNative("checkJsApi", [method], function (re) {
                    if (re[method]) {
                        self.supportedApi.push(method);

                        bridge.callNative(method, params, success);
                        self.debugInfo("\u6B63\u5728\u8C03\u7528APP\u7684\u65B9\u6CD5:" + method);
                    } else if (typeof error === "function") {
                        error();
                        self.debugInfo("\u5F53\u524DAPP\u4E0D\u652F\u6301\u65B9\u6CD5:" + method);
                    }
                });
            }
        });
    };

    this.register = function (options) {
        var self = _this;
        var method = options.method,
            callback = options.callback;

        if (method in _this.registerQueue) {
            _this.registerQueue[method].push(callback);
        } else {
            _this.registerQueue[method] = [];
            _this.registerQueue[method].push(callback);
            _this.ready(function (bridge) {
                if (!bridge) {
                    self.debugInfo("jsBridge 没有被注册");
                    return;
                }
                bridge.registerHandler(method, function () {
                    var args = [].slice.call(arguments);
                    if (args[0] && typeof args[0] === "string") {
                        try {
                            args[0] = JSON.parse(args[0]);
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    self.registerQueue[method].forEach(function (fn) {
                        fn.apply(bridge, args);
                    });
                    self.debugInfo("APP\u8C03\u7528H5\u65B9\u6CD5: " + method);
                });
            });
        }
    };

    this.debugInfo = function (message) {
        _this.debug && window.alert(message);
    };

    this.init();
};

var jsBridge = new JsBridge();
var callApp = function callApp(method, options, success, fail) {
    if (typeof options === "function") {
        fail = success;
        success = options;
        options = {};
    } else if (typeof options === "undefined") {
        options = {};
    }
    jsBridge.call({
        method: method,
        params: options,
        success: success,
        error: fail
    });
};

var invokeAppMethod = function invokeAppMethod(methodName, obj) {
    return new Promise(function (resolve, reject) {
        callApp(methodName, obj, function (data) {
            resolve(data);
        }, function () {
            reject();
        });
    });
};

var registerAPP = function registerAPP(method, callback) {
    jsBridge.register({
        method: method,
        callback: callback
    });
};

exports.$BG = jsBridge;
exports.$DT = device;
exports.invokeAppMethod = invokeAppMethod;
exports.registerAPP = registerAPP;
exports.callApp = callApp;
exports['default'] = jsBridge;

Object.defineProperty(exports, '__esModule', { value: true });

})));
