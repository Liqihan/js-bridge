import { JsBridge } from "./JsBridge";
import $DT from './device';
const jsBridge = new JsBridge();
const callApp = (method, options, success, fail) => {
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
// 把callApp封装成了promise而已，没啥大差别
const invokeAppMethod = (methodName, obj) => {
    return new Promise(function(resolve, reject) {
        callApp(
            methodName,
            obj,
            function(data) {
                // 成功回调
                resolve(data);
            },
            function() {
                // 失败回调
                reject();
            }
        );
    });
};
// jsbridge app调用h5方法
const registerAPP = (method, callback) => {
    jsBridge.register({
        method: method,
        callback: callback
    });
};
export {
    jsBridge as $BG,
    $DT,
    invokeAppMethod,
    registerAPP, 
    callApp
}
export default jsBridge;
