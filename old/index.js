/*
 * @Author: grove.liqihan
 * @Date: 2017-04-07 17:07:08
 * @Desc: jsbridge
 */


(function (fn, globals) {
    if (typeof define !== 'undefined' && define.amd) {
    define([], function () {
      return fn();
        }); // RequireJS
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = fn(); // CommonJS
    } else {
        globals.$JsBridge = fn(); // <script>
    }
})(function () {
    'use strict';
    var Detect = {
        // app标识
        AppTag: 'liqihan',
        device: function () {
            var userAgent = navigator.userAgent;
            var isAndroid = (userAgent.match(/(Android);?[\s\/]+([\d.]+)?/)) ? true : false;
            var isIpad = (userAgent.match(/(iPad).*OS\s([\d_]+)/)) ? true : false;
            var isIphone = (!isIpad && userAgent.match(/(iPhone\sOS)\s([\d_]+)/)) ? true : false;
            var isIos = isIpad || isIphone;
            var isMobile = isAndroid || isIos;
            var isLiqihan = userAgent.indexOf(this.AppTag) > -1;
            var os = '';
            if (isMobile) {
                if (isIos) {
                    os = 'ios';
                }
                if (isAndroid) {
                    os = 'android';
                }
            }
            return {
                os: os,
                android: isAndroid,
                ios: isIos,
                mobile: isMobile,
                isLiqihan: isLiqihan,
                // 默认先设置为true吧
                supportedJsBridge: true
            }
        }
    }
    var $DT = Detect.device();
    var Bridge = {
        // 是否开启调试
        debug: true,
        // 是否初始化中
        doReadying: true,
        // bridge 对象
        bridge: null,
        // 回调队列
        queue: [],
        // 注册队列
        registerQueue: {},
        // 支持的API
        supportedApi: [],
        //配置
        config: function (options) {
            this.debug = options.debug;
        },
        // 初始化bridge模块
        init: function () {
            var self = this;
            var callback = function (bridge) {
                // alert(Object.keys(bridge));
                // 把默认的callHandler替换为callNative，调用原生方法
                bridge.callNative = function (method, params, callback) {
                    var fn = function (response) {
                        // 如果是字符串的话，就先解析一下
                        if (typeof (response) === 'string') {
                            try {
                                response = JSON.parse(response);
                            } catch (e) {
                                callback();
                                if (self.debug) {
                                    window.alert('app端返回数据解析异常！');
                                }
                            }
                        }
                        callback(response);
                        if (self.debug) {
                            window.alert('方法：' + method + '；返回数据：' + JSON.stringify(response));
                        }
                    }
                    bridge.callHandler(method, params, fn);
                }
                // APP调用页面JS的时候需要先初始化一下init;
                if (bridge.hasOwnProperty('init')) {
                    bridge.init();                    
                }   
                self.doReadying = false;
                self.bridge = bridge;
                // 回调页面逻辑，并传递bridge对象过去
                for (var i = 0; i < self.queue.length; i++) {
                    var cb = self.queue[i];
                    cb(bridge);
                }
            };
            // 初始化 WebViewJavascriptBridge
            if (window.WebViewJavascriptBridge) {
                callback(window.WebViewJavascriptBridge);
                if (self.debug) {
                    window.alert('ReadySuccess!');
                }
                return;
            } else {
                // 这个后续验证下，ios下这个地方得多改改
                document.addEventListener('WebViewJavascriptBridgeReady', function () {
                    callback(window.WebViewJavascriptBridge);
                    if (self.debug) {
                        window.alert('ReadySuccess!');
                    }
                }, false);
            }
            if (window.WVJBCallbacks) {
                return window.WVJBCallbacks.push(callback);
            }
            window.WVJBCallbacks = [callback];
            var WVJBIframe = document.createElement('iframe');
            WVJBIframe.style.display = 'none';
            WVJBIframe.src = 'https://__bridge_loaded__';                        
            document.documentElement.appendChild(WVJBIframe);
            setTimeout(function () {
                document.documentElement.removeChild(WVJBIframe)
            }, 0)
            return this;
        },
        // bridge初始化
        ready: function (callback) {
            if (!$DT.isLiqihan || !$DT.supportedJsBridge) {
                // 不是自己的app或者h5这边没有使用bridge
                callback();
                return;
            }
            if (this.doReadying) {
                // 正在初始化，放到队列中
                this.queue.push(callback);
            } else {    
                // 初始化完成，直接调用
                callback(this.bridge);
            }
        },
        /**
         * 调用APP方法，options包含下面配置
         * @param  {[type]} method  方法
         * @param  {[type]} params 参数
         * @param  {[type]} success 成功回调
         * @param  {[type]} error   失败回调
         * @return {[type]}
         */
        call: function (options) {
            var self = this;
            // alert(55555);
            self.ready(function (bridge) {
                if (!bridge) {
                    if (typeof (options.error) === 'function') {
                        options.error();
                    }
                    return;
                }
                if (self.supportedApi.indexOf(options.method) > -1) {
                    // 当前方法已经被支持了
                    if (typeof (options.success) === 'function') {
                        bridge.callNative(options.method, options.params, options.success)
                        if (self.debug) {
                            window.alert('正在调用APP的方法' + options.method);
                        }
                    }
                } else {
                    // 调用checkJsApi判断该方法是否被APP支持,返回一个对象，包含bool值的
                    bridge.callNative('checkJsApi', [options.method], function (re) {
                        if (re[options.method]) {
                            // 存储下该方法
                            self.supportedApi.push(options.method);
                            // 已经被支持
                            bridge.callNative(options.method, options.params, options.success);
                            if (self.debug) {
                                window.alert('正在调用APP的方法' + options.method);
                            }
                        } else if (typeof (options.error) === 'function') {
                            // 不支持该方法
                            options.error();
                            if (self.debug) {
                                window.alert('当前APP不支持方法' + options.method);
                            }
                        }
                    })
                }
            });
        },
        /**
         * 注册方法给APP调用
         * @param  {[type]}   method   方法
         * @param  {Function} callback 回调
         * @return {[type]}
         */
        register: function (options) {
            var self = this;
            if (options.method in this.registerQueue) {
                this.registerQueue[options.method].push(options.callback);
            } else {
                this.registerQueue[options.method] = [];
                this.registerQueue[options.method].push(options.callback);
                this.ready(function (bridge) {
                    if (!bridge) {
                        if (self.debug) {
                            window.alert('jsBridge 没有被注册');
                        }
                        return;
                    }
                    bridge.registerHandler(options.method, function () {
                        var args = [].slice.call(arguments);
                        if (args[0] && typeof args[0] === 'string') {
                            try {
                                args[0] = JSON.parse(args[0]);
                            } catch (e) {
                                console.error(e);
                            }
                        }
                        self.registerQueue[options.method].forEach(function (fn) {
                            // fn();
                            fn.apply(bridge, args);
                        });
                        if (self.debug) {
                            window.alert('APP调用H5方法' + options.method);
                        }
                    });
                });
            }
        }
    };
    var $BG = Bridge.init();
    // jsbridge h5调用app方法
    var callAPP = function (method, options, success, fail) {
        $BG.call({
            method: method,
            params: options,
            success: success,
            error: fail
        });
    };

    // jsbridge app调用h5方法
    var registerAPP = function (method, callback) {
        $BG.register({
            method: method,
            callback: callback
        });
    }

    return {
        $DT: $DT,
        $BG: $BG,
        callAPP: callAPP,
        registerAPP: registerAPP
    }
}, this);