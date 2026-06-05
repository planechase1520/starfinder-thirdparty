import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";

/**
 * Rollup build configuration for Starfinder Third Party Library.
 * Bundles TypeScript source into a single ES module for Foundry VTT.
 */
export default {
  input: "src/main.ts",
  output: {
    file: "scripts/starfinder-thirdparty.js",
    format: "es",
    sourcemap: true,
    inlineDynamicImports: true,
  },
  plugins: [
    json(),
    resolve({
      browser: true,
    }),
    typescript({
      tsconfig: "./tsconfig.json",
      sourceMap: true,
      inlineSources: false,
    }),
  ],
  external: [],
};
