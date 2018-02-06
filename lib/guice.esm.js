/*
 * @Author: grove.liqihan
 * @Date: 2018-02-06 10:28:04
 * @Desc: 获取设备信息相关的
*/

var device$1 = device = function device(AppReg) {
    var userAgent = navigator.userAgent;
    var isAndroid = userAgent.match(/(Android);?[\s\/]+([\d.]+)?/) ? true : false;
    var isIpad = userAgent.match(/(iPad).*OS\s([\d_]+)/) ? true : false;
    var isIphone = !isIpad && userAgent.match(/(iPhone\sOS)\s([\d_]+)/) ? true : false;
    var isIos = isIpad || isIphone;
    var isMobile = isAndroid || isIos;
    var isOwnApp = AppReg.test(userAgent);
    var os = "";
    var appVersion = "";
    if (isMobile) {
        if (isIos) {
            os = "ios";
        }
        if (isAndroid) {
            os = "android";
        }
    }
    if (isOwnApp) {
        appVersion = RegExp.$1 || "";
    }
    return {
        os: os,
        android: isAndroid,
        ios: isIos,
        mobile: isMobile,
        isOwnApp: isOwnApp,
        appVersion: appVersion,
        // 默认先设置为true吧
        supportedJsBridge: true
    };
};

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var JsBridge = function () {
    /**
     * Creates an instance of JsBridge.
     * @param {any} {AppReg} App userAgent标识符
     * @memberof JsBridge
     */
    function JsBridge() {
        var _this = this;

        classCallCheck(this, JsBridge);
        this.debug = false;
        this.doReadying = true;
        this.bridge = null;
        this.queue = [];
        this.registerQueue = {};
        this.supportedApi = [];
        this.AppReg = "";

        this.config = function (options) {
            _this.debug = options.debug;
        };

        this.setAppReg = function (AppReg) {
            _this.AppReg = AppReg;
        };

        this.init = function () {
            var self = _this;
            // webviewJsBridge初始化成功或者注册之后的回调
            var callback = function callback(bridge) {
                // 兼容老代码，新的使用invoke,封装了一层，解析和调试用
                bridge.invoke = bridge.callNative = function (method, params, cb) {
                    // 修改回调方法
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
                // Android调用JS的时候有一步init的过程
                if (bridge.hasOwnProperty("init")) {
                    bridge.init();
                }
                // 初始化完成;
                self.doReadying = false;
                self.bridge = bridge;
                // bridge未初始化完成之前的调用方法执行;
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
            // Android注册一个监听事件，等bridge初始化成功之后执行
            document.addEventListener("WebViewJavascriptBridgeReady", function () {
                callback(window.WebViewJavascriptBridge);
                if (self.debug) {
                    window.alert("ReadySuccess!");
                }
            }, false);
            // IOS先到WVJBCallbacks,如果bridge初始化成功之后再取出并执行
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
            var _device = _this.device,
                isOwnApp = _device.isOwnApp,
                supportedJsBridge = _device.supportedJsBridge;

            if (!isOwnApp || !supportedJsBridge) {
                // 不是自己的app或者h5这边没有使用bridge
                return callback();
            }
            if (_this.doReadying) {
                // 正在初始化，放到队列中
                _this.queue.push(callback);
            } else {
                // 初始化完成，直接调用
                callback(_this.bridge);
            }
        };

        this._call = function (options) {
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
                // 当前方法已支持
                if (self.supportedApi.indexOf(method) > -1) {
                    var newParams = typeof params !== "string" ? JSON.stringify(params) : params;
                    bridge.invoke(method, newParams, success);
                } else {
                    // bridge.callNative(options.method, options.params, options.success);
                    // 调用checkJsApi判断该方法是否被APP支持,返回一个对象，包含bool值的
                    bridge.callNative("checkJsApi", [method], function (re) {
                        if (re[method]) {
                            // 存储下该方法
                            self.supportedApi.push(method);
                            // 已经被支持
                            bridge.callNative(method, params, success);
                            self.debugInfo("\u6B63\u5728\u8C03\u7528APP\u7684\u65B9\u6CD5:" + method);
                        } else if (typeof error === "function") {
                            // 不支持该方法
                            error();
                            self.debugInfo("\u5F53\u524DAPP\u4E0D\u652F\u6301\u65B9\u6CD5:" + method);
                        }
                    });
                }
            });
        };

        this.debugInfo = function (message) {
            _this.debug && window.alert(message);
        };
    }
    // 是否开启调试

    // 是否初始化中

    // bridge 对象

    // 回调队列

    // 注册队列

    // 支持的API

    //配置

    // getInstance = ((options) => {
    //     var instance = null;
    //     return (options) => {
    //         if (!instance) {
    //             instance = new JsBridge(options);
    //         }
    //     }
    // })()


    createClass(JsBridge, [{
        key: "device",
        get: function get$$1() {
            return device$1(this.AppReg);
        }
        // 初始化bridge模块

        // bridge初始完完成调用

        // 调用app


        // 调试时打印信息

    }]);
    return JsBridge;
}();
