import $DT  from "./device";
export class JsBridge {
    /**
     * Creates an instance of JsBridge.
     * @param {any} {AppReg} App userAgent标识符
     * @memberof JsBridge
     */
    constructor() {
        this.init();
    }
    // 是否开启调试
    debug = false;
    // 是否初始化中
    doReadying = true;
    // bridge 对象
    bridge = null;
    // 回调队列
    queue = [];
    // 注册队列
    registerQueue = {};
    // 支持的API
    supportedApi = [];
    //配置
    config = options => {
        this.debug = options.debug;
    };
    // 初始化bridge模块
    init = () => {
        const self = this;
        // webviewJsBridge初始化成功或者注册之后的回调
        const callback = bridge => {
            // 兼容老代码，新的使用invoke,封装了一层，解析和调试用
            bridge.invoke = bridge.callNative = (method, params, cb) => {
                // 修改回调方法
                var fn = response => {
                    if (typeof response === "string") {
                        try {
                            response = JSON.parse(response);
                        } catch (e) {
                            callback(e);
                            self.debugInfo("can not parse data from App");
                        }
                    }
                    cb(response);
                    self.debugInfo(
                        `method: ${method}; request:${JSON.stringify(
                            params
                        )}; response:${JSON.stringify(response)}`
                    );
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
        document.addEventListener(
            "WebViewJavascriptBridgeReady",
            function() {
                callback(window.WebViewJavascriptBridge);
                self.debugInfo("bridge ready success!");
            },
            false
        );
        // IOS先到WVJBCallbacks,如果bridge初始化成功之后再取出并执行
        if (window.WVJBCallbacks) {
            return window.WVJBCallbacks.push(callback);
        }
        window.WVJBCallbacks = [callback];
        var WVJBIframe = document.createElement("iframe");
        WVJBIframe.style.display = "none";
        WVJBIframe.src = "https://__bridge_loaded__";
        document.documentElement.appendChild(WVJBIframe);
        setTimeout(function() {
            document.documentElement.removeChild(WVJBIframe);
        }, 0);
        return this;
    };
    // bridge初始完完成调用
    ready = callback => {
        const { isOwnApp, supportedJsBridge } = $DT;
        if (!isOwnApp || !supportedJsBridge) {
            // 不是自己的app或者h5这边没有使用bridge
            return callback();
        }
        if (this.doReadying) {
            // 正在初始化，放到队列中
            this.queue.push(callback);
        } else {
            // 初始化完成，直接调用
            callback(this.bridge);
        }
    };
    // 调用app
    call = options => {
        const self = this;
        self.ready(bridge => {
            const { method, params, success, error = () => {} } = options;
            if (!bridge) {
                return error();
            }
            // 当前方法已支持
            if (self.supportedApi.indexOf(method) > -1) {
                let newParams =
                    typeof params !== "string"
                        ? JSON.stringify(params)
                        : params;
                bridge.invoke(method, newParams, success);
                self.debugInfo(`正在调用APP的方法:${method}`);
            } else {
                // bridge.callNative(options.method, options.params, options.success);
                // 调用checkJsApi判断该方法是否被APP支持,返回一个对象，包含bool值的
                bridge.invoke("checkJsApi", [method], function(re) {
                    if (re[method]) {
                        // 存储下该方法
                        self.supportedApi.push(method);
                        // 已经被支持
                        bridge.invoke(method, params, success);
                        self.debugInfo(`正在调用APP的方法:${method}`);
                    } else if (typeof error === "function") {
                        // 不支持该方法
                        error();
                        self.debugInfo(`当前APP不支持方法:${method}`);
                    }
                });
            }
        });
    };
    register = options => {
        var self = this;
        const { method, callback } = options;
        if (method in this.registerQueue) {
            this.registerQueue[method].push(callback);
        } else {
            this.registerQueue[method] = [];
            this.registerQueue[method].push(callback);
            this.ready(function(bridge) {
                if (!bridge) {
                    self.debugInfo("jsBridge 没有被注册");
                    return;
                }
                bridge.registerHandler(method, function() {
                    var args = [].slice.call(arguments);
                    if (args[0] && typeof args[0] === "string") {
                        try {
                            args[0] = JSON.parse(args[0]);
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    self.registerQueue[method].forEach(function(fn) {
                        fn.apply(bridge, args);
                    });
                    self.debugInfo(`APP调用H5方法: ${method}`);
                });
            });
        }
    };
    // 调试时打印信息
    debugInfo = message => {
        this.debug && window.alert(message);
    };
}
