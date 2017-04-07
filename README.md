# js-bridge

之前公司一直没有这块的相关文档，只能自己和客户端同学一起研究，终于统一了一个基本的方案。
此方案是用于和原生ios和安卓交互的，但是毕竟ios和android实现的方法有所不同，故写了这个来封装了两者，借鉴了很多公司的设计思想，如微信等，目前只是初步的版本，基本实现了和客户端的通信，后续会继续迭代的。

原生的客户端方法
iOS 用到的开源方案：https://github.com/marcuswestin/WebViewJavascriptBridge
Android 用到的开源方案：https://github.com/lzyzsd/JsBridge
微信JS 
使用方法
```
    /**
        * 调用APP方法，options包含下面配置
        * @param  {[type]} method  方法
        * @param  {[type]} params 参数
        * @param  {[type]} success 成功回调
        * @param  {[type]} error   失败回调
        * @return {[type]}
        */
    $JsBridge.callAPP(method,{}, function(response){
        <!--成功之后的方法-->
    }, function(err) {
        alert(err);
    })
    