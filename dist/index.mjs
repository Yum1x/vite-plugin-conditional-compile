import remapping from '@ampproject/remapping';
import { defineDirective, simpleMatchToken, resolveConditional, Context } from 'unplugin-preprocessor-directives';

const patternSimple = new RegExp(/#v-(if|else|elif|endif)\s?(.*)/);
const vIfDirective = defineDirective((context) => {
  return {
    lex(comment) {
      return simpleMatchToken(comment ?? "", patternSimple);
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
        if (resolveConditional(node.test, context.env)) {
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
  return new Context(resolveOptions(options));
}

const regexp = /\/\/\/\s*#(if|else|elif|endif)\s?(.*)/;
const pattern = new RegExp(regexp.source, "gm");
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
        code = code.replace(pattern, (_, token, expression) => `// #v-${token} ${expression}`);
        const transformed = ctx.transformWithMap(code, id);
        if (transformed) {
          const map = remapping([this.getCombinedSourcemap(), transformed.map], () => null);
          return {
            code: transformed.code,
            map
          };
        }
      }
    }
  };
};

export { VitePluginConditionalCompile as default };
