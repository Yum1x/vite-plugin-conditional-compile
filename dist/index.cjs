'use strict';

const remapping = require('@ampproject/remapping');
const unpluginPreprocessorDirectives = require('unplugin-preprocessor-directives');

function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e.default : e; }

const remapping__default = /*#__PURE__*/_interopDefaultCompat(remapping);

const vIfDirective = unpluginPreprocessorDirectives.defineDirective((context) => {
  return {
    lex(comment) {
      return unpluginPreprocessorDirectives.simpleMatchToken(comment ?? "", /#v-(if|else|elif|endif)\s?(.*)/);
    },
    parse(token) {
      if (token.type === "if" || token.type === "elif" || token.type === "else") {
        const node = {
          type: "IfStatement",
          test: token.value,
          consequent: [],
          alternate: [],
          kind: token.type
        };
        this.current++;
        while (this.current < this.tokens.length) {
          const nextToken = this.tokens[this.current];
          if (nextToken.type === "elif" || nextToken.type === "else") {
            node.alternate.push(this.walk());
            break;
          } else if (nextToken.type === "endif") {
            this.current++;
            break;
          } else {
            node.consequent.push(this.walk());
          }
        }
        return node;
      }
    },
    transform(node) {
      if (node.type === "IfStatement") {
        if (unpluginPreprocessorDirectives.resolveConditional(node.test, context.env)) {
          return {
            type: "Program",
            body: node.consequent.map(this.walk.bind(this)).filter((n) => n != null)
          };
        } else if (node.alternate) {
          return {
            type: "Program",
            body: node.alternate.map(this.walk.bind(this)).filter((n) => n != null)
          };
        }
      }
    },
    generate(node, comment) {
      if (node.type === "IfStatement" && comment) {
        let code = "";
        if (node.kind === "else")
          code = `${comment.start} ${node.kind} ${comment.end}`;
        else
          code = `${comment.start} #${node.kind} ${node.test}${comment.end}`;
        const consequentCode = node.consequent.map(this.walk.bind(this)).join("\n");
        code += `
${consequentCode}`;
        if (node.alternate.length) {
          const alternateCode = node.alternate.map(this.walk.bind(this)).join("\n");
          code += `
${alternateCode}`;
        } else {
          code += `
${comment.start} #endif ${comment.end}`;
        }
        return code;
      }
    }
  };
});
const resolveOptions = (userOptions) => {
  return {
    include: ["**/*"],
    exclude: [/[\\/]node_modules[\\/]/, /[\\/]\.git[\\/]/],
    ...userOptions,
    directives: [
      // @ts-expect-error ignore
      vIfDirective
    ]
  };
};

function createContext(options = {}) {
  return new unpluginPreprocessorDirectives.Context(resolveOptions(options));
}

const VitePluginConditionalCompile = (userOptions = {}) => {
  const ctx = createContext(userOptions);
  return {
    name: "vite-plugin-conditional-compile",
    enforce: "pre",
    configResolved(config) {
      ctx.env = { ...ctx.env, ...config.env };
      for (const key in ctx.env) {
        const value = ctx.env[key];
        if (typeof value !== "string")
          continue;
        if (!["true", "false"].includes(value))
          continue;
        ctx.env[key] = value === "true";
      }
    },
    transform(code, id) {
      if (ctx.filter(id)) {
        code = code.replace(/\/\/\/\s*#(if|else|elif|endif)\s?(.*)/gm, (_, token, expression) => `// #v-${token} ${expression}`);
        const transformed = ctx.transformWithMap(code, id);
        if (transformed) {
          const map = remapping__default([this.getCombinedSourcemap(), transformed.map], () => null);
          return {
            code: transformed.code,
            map
          };
        }
      }
    }
  };
};

module.exports = VitePluginConditionalCompile;
