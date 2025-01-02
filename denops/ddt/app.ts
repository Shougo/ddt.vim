import { Ddt } from "./ddt.ts";
import { Loader } from "./loader.ts";

import type { Denops, Entrypoint } from "jsr:@denops/std@~7.4.0";

export const main: Entrypoint = (denops: Denops) => {
  const loaders: Record<string, Loader> = {};
  const ddts: Record<string, Ddt> = {};

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
  denops.dispatcher = {};
};
