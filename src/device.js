/*
 * @Author: grove.liqihan
 * @Date: 2018-02-06 10:28:04
 * @Desc: 获取设备信息相关的
*/

export default device = AppReg => {
    const userAgent = navigator.userAgent;
    const isAndroid = userAgent.match(/(Android);?[\s\/]+([\d.]+)?/)
        ? true
        : false;
    const isIpad = userAgent.match(/(iPad).*OS\s([\d_]+)/) ? true : false;
    const isIphone =
        !isIpad && userAgent.match(/(iPhone\sOS)\s([\d_]+)/) ? true : false;
    const isIos = isIpad || isIphone;
    const isMobile = isAndroid || isIos;
    const isOwnApp = AppReg.test(userAgent);
    let os = "";
    let appVersion = "";
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
        os,
        android: isAndroid,
        ios: isIos,
        mobile: isMobile,
        isOwnApp: isOwnApp,
        appVersion: appVersion,
        // 默认先设置为true吧
        supportedJsBridge: true
    };
};
