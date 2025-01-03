import type {
  BaseParams,
  DdtExtType,
  DdtOptions,
} from "./types.ts";
import {
  ContextBuilderImpl,
} from "./context.ts";
import { Ddt } from "./ddt.ts";
import { Loader } from "./loader.ts";

import type { Denops, Entrypoint } from "jsr:@denops/std@~7.4.0";
import { is } from "jsr:@core/unknownutil@~4.3.0/is";
import { ensure } from "jsr:@core/unknownutil@~4.3.0/ensure";

export const main: Entrypoint = (denops: Denops) => {
  const loaders: Record<string, Loader> = {};
  const ddts: Record<string, Ddt> = {};
  const contextBuilder = new ContextBuilderImpl();

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
  };
};
