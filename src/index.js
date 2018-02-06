import { JsBridge } from "./JsBridge";

const jsBridge = new JsBridge();
const { device } = jsBridge;
export const callApp = (method, options, success, fail) => {
    if (typeof options === "function") {
        fail = success;
        success = options;
        options = {};
    } else if (typeof options === "undefined") {
        options = {};
    }
    $BG.call({
        method: method,
        params: options,
        success: success,
        error: fail
    });
};
// 把callApp封装成了promise而已，没啥大差别
export const invokeAppMethod = (methodName, obj) => {
    return new Promise(function(resolve, reject) {
        callAPP(
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
export {
    device as $DT
}
// jsbridge app调用h5方法
export const registerAPP = (method, callback) => {
    jsBridge.register({
        method: method,
        callback: callback
    });
};

export default jsBridge;
