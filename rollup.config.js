import babel from "rollup-plugin-babel";
export default {
    input: "src/index.js",
    output: [
        {
            file: "lib/jsbridge.umd.js",
            format: "umd",
            name: 'JsBridge'
        },
        {
            file: "lib/jsbridge.esm.js",
            format: "es"
        }
    ],
    plugins: [
        babel({
            plugins: ["external-helpers"],
            exclude: "node_modules/**" // 只编译我们的源代码
        })
    ],
    external: [
    ]
};