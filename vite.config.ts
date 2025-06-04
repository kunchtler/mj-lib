import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import libAssetsPlugin from "@laynezh/vite-plugin-lib-assets";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { PluginOptions } from "babel-plugin-react-compiler";
import { externalizeDeps } from "vite-plugin-externalize-deps";

const assetsDir = "src/assets/";
const ReactCompilerConfig: Partial<PluginOptions> = {
    // sources: (filename) => {
    //     return filename.indexOf("src/path/to/dir") !== -1;
    // },
};
export default defineConfig((config) => {
    // console.log(config);
    return {
        base: "",
        server: { https: { key: "./musjugvr.key", cert: "./musjugvr.crt" } },
        build: {
            lib: {
                entry: "./src/MusicalJuggling.ts",
                fileName: "MusicalJuggling",
                name: "MusicalJuggling",
                formats: ["es"]
            },
            target: "esnext",
            minify: false,
            rollupOptions: {
                // external: ["three", "js-sdsl", "fraction.js", "antlr4", /^three/],
                output: {
                    // globals: {
                    //     three: "THREE",
                    //     "three/addons/controls/OrbitControls.js": "OrbitControls"
                    // },
                    assetFileNames: assetsDir
                }
            }
        },
        plugins: [
            externalizeDeps(),
            react({
                babel: {
                    plugins: [
                        ["babel-plugin-react-compiler", ReactCompilerConfig] /*must run first!*/
                    ]
                }
            }),
            dts({ include: "src/" /*, rollupTypes: true*/ }),
            libAssetsPlugin({
                name: "[name].[ext]",
                outputPath: (url, resourcePath) => {
                    console.log(resourcePath);
                    return resourcePath.split("src" + path.sep)[1].split(path.sep + url)[0];
                }
            })
        ],
        resolve: {
            alias: {
                "@tabler/icons-react": "@tabler/icons-react/dist/esm/icons/index.mjs"
            }
        }
    };
});
