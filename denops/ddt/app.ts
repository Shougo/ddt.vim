import type {
  BaseParams,
  DdtExtType,
  DdtOptions,
  UserOptions,
} from "./types.ts";
import { ContextBuilderImpl } from "./context.ts";
import { Ddt } from "./ddt.ts";
import { Loader } from "./loader.ts";
import { isDenoCacheIssueError } from "./utils.ts";
import type { BaseUi } from "./base/ui.ts";

import type { Denops, Entrypoint } from "@denops/std";

import { toFileUrl } from "@std/path/to-file-url";
import { is } from "@core/unknownutil/is";
import { ensure } from "@core/unknownutil/ensure";
import { Lock } from "@core/asyncutil/lock";

export const main: Entrypoint = (denops: Denops) => {
  const loaders: Record<string, Loader> = {};
  const ddts: Record<string, Ddt> = {};
  const contextBuilder = new ContextBuilderImpl();
  const lock = new Lock(0);

  const getLoader = (name: string) => {
    if (!loaders[name]) {
      loaders[name] = new Loader();
    }

    return loaders[name];
  };
  const getDdt = (name: string) => {
    if (!ddts[name]) {
      ddts[name] = new Ddt(getLoader(name));
    }

    return ddts[name];
  };
  denops.dispatcher = {
    async registerPath(
      arg1: unknown,
      arg2: unknown,
      arg3: unknown,
    ): Promise<void> {
      const loader = getLoader(ensure(arg1, is.String) as string);
      await loader.registerPath(
        ensure(arg2, is.String) as DdtExtType,
        ensure(arg3, is.String) as string,
      );
      return Promise.resolve();
    },
    registerExtension(
      arg1: unknown,
      arg2: unknown,
      arg3: unknown,
      arg4: unknown,
    ): Promise<void> {
      const name = ensure(arg1, is.String);
      const type = ensure(arg2, is.String);
      const extName = ensure(arg3, is.String);

      const loader = getLoader(name);
      switch (type) {
        case "ui":
          loader.registerExtension(type, extName, arg4 as BaseUi<BaseParams>);
          break;
      }

      return Promise.resolve();
    },
    setGlobal(arg1: unknown): Promise<void> {
      const options = ensure(arg1, is.Record) as Partial<DdtOptions>;
      contextBuilder.setGlobal(options);
      return Promise.resolve();
    },
    setLocal(arg1: unknown, arg2: unknown): Promise<void> {
      const options = ensure(arg1, is.Record) as Partial<DdtOptions>;
      const name = ensure(arg2, is.String) as string;
      contextBuilder.setLocal(name, options);
      return Promise.resolve();
    },
    patchGlobal(arg1: unknown): Promise<void> {
      const options = ensure(arg1, is.Record) as Partial<DdtOptions>;
      contextBuilder.patchGlobal(options);
      return Promise.resolve();
    },
    patchLocal(arg1: unknown, arg2: unknown): Promise<void> {
      const options = ensure(arg1, is.Record) as Partial<DdtOptions>;
      const name = ensure(arg2, is.String) as string;
      contextBuilder.patchLocal(name, options);
      return Promise.resolve();
    },
    getGlobal(): Promise<Partial<DdtOptions>> {
      return Promise.resolve(contextBuilder.getGlobal());
    },
    getLocal(): Promise<Partial<DdtOptions>> {
      return Promise.resolve(contextBuilder.getLocal());
    },
    async loadConfig(arg1: unknown): Promise<void> {
      //const startTime = Date.now();
      // NOTE: Lock until load finished to prevent execute start() API.
      await lock.lock(async () => {
        const path = ensure(arg1, is.String) as string;

        try {
          // NOTE: Import module with fragment so that reload works properly.
          // https://github.com/vim-denops/denops.vim/issues/227
          const mod = await import(
            `${toFileUrl(path).href}#${performance.now()}`
          );
          const obj = new mod.Config();
          await obj.config({ denops, contextBuilder });
        } catch (e) {
          if (isDenoCacheIssueError(e)) {
            console.warn("*".repeat(80));
            console.warn(`Deno module cache issue is detected.`);
            console.warn(
              `Execute '!deno cache --reload "${path}"' and restart Vim/Neovim.`,
            );
            console.warn("*".repeat(80));
          }

          console.error(`Failed to load file '${path}': ${e}`);
          throw e;
        }
      });
      //console.log(`${arg1}: ${Date.now() - startTime} ms`);
      return Promise.resolve();
    },
    async start(arg1: unknown): Promise<void> {
      //const startTime = Date.now();

      const userOptions = ensure(arg1, is.Record) as UserOptions;
      const [context, options] = await contextBuilder.get(denops, userOptions);

      const ddt = getDdt(options.name);

      await ddt.start(denops, context, options, userOptions);

      //console.log(`${Date.now() - startTime} ms`);
    },
    async uiAction(
      arg1: unknown,
      arg2: unknown,
      arg3: unknown,
    ): Promise<void> {
      const name = ensure(arg1, is.String) as string;
      const actionName = ensure(arg2, is.String) as string;
      const params = ensure(arg3, is.Record) as BaseParams;

      const ddt = getDdt(name);
      if (ddt.getOptions().ui !== "") {
        await ddt.uiAction(denops, actionName, params);
      }
    },
    async getInput(
      arg1: unknown,
    ): Promise<string> {
      const name = ensure(arg1, is.String) as string;

      const ddt = getDdt(name);
      if (ddt.getOptions().ui !== "") {
        return await ddt.getInput(denops);
      }

      return "";
    },
  };
};
