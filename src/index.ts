import remapping from "@ampproject/remapping";
import type { Plugin } from "vite";
import { createContext } from "./context";
import { UserOptions } from "./types";
const regexp = /\/\/\/\s*#(if|else|elif|endif)\s?(.*)/gm;
const pattern = new RegExp(regexp.source);
const VitePluginConditionalCompile = (userOptions: UserOptions = {}): Plugin => {
    const ctx = createContext(userOptions);
    return {
        name: "vite-plugin-conditional-compile",
        enforce: "pre",
        configResolved(config) {
            ctx.env = { ...ctx.env, ...config.env };
            for (const key in ctx.env) {
                const value = ctx.env[key];
                if (typeof value !== "string") continue;
                if (!["true","false"].includes(value)) continue;
                ctx.env[key] = value === "true";
            }
        },
        transform(code, id) {
            if (ctx.filter(id)) {
                code = code.replace(pattern, (_, token, expression) => `// #v-${token} ${expression}`);
                const transformed = ctx.transformWithMap(code, id);
                if (transformed) {
                    const map = remapping([this.getCombinedSourcemap() as any, transformed.map], () => null) as any;
                    return {
                        code: transformed.code,
                        map
                    };
                }
            }
        }
    };
};
export default VitePluginConditionalCompile;
