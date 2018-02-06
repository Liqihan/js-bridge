/*
 * @Author: grove.liqihan
 * @Date: 2018-02-06 10:28:04
 * @Desc: 获取设备信息相关的
*/
const userAgent = navigator.userAgent;
const isAndroid = userAgent.match(/(Android);?[\s\/]+([\d.]+)?/)
    ? true
    : false;
const isIpad = userAgent.match(/(iPad).*OS\s([\d_]+)/) ? true : false;
const isIphone =
    !isIpad && userAgent.match(/(iPhone\sOS)\s([\d_]+)/) ? true : false;
const isIos = isIpad || isIphone;
const isMobile = isAndroid || isIos;
const os = isMobile ? (isIos ? 'ios' : 'android') : ''
const device = {
    os: os,
    android: isAndroid,
    ios: isIos,
    mobile: isMobile,
    // 默认设置为true吧
    supportedJsBridge: true
}
export const deviceTouch = (AppReg = /AppleWebKit\/(\d+(\.\d+){2})/ig) => {
    let appVersion = '';
    const isOwnApp = AppReg.test(userAgent);
    if (isOwnApp) {
        appVersion = RegExp.$1 || "";
    }
    device.isOwnApp = isOwnApp;
    device.appVersion = appVersion;
    return device;
};
deviceTouch();
export default device;
