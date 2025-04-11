import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import libAssetsPlugin from "@laynezh/vite-plugin-lib-assets";

const assetsDir = "src/assets/";
export default defineConfig((config) => {
    // console.log(config);
    return {
        base: "",
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
                external: ["three", "js-sdsl", "fraction.js", "antlr4", /three/],
                output: {
                    globals: {
                        three: "THREE",
                        "three/addons/controls/OrbitControls.js": "OrbitControls"
                    },
                    assetFileNames: assetsDir
                }
            }
        },
        plugins: [
            dts({ include: "src/" /*, rollupTypes: true*/ }),
            libAssetsPlugin({
                name: "[name].[ext]",
                outputPath: (url, resourcePath) => {
                    return "assets/" + resourcePath.split(assetsDir)[1].split("/" + url)[0];
                }
            })
        ]
    };
});
