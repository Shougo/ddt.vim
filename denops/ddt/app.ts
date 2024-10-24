import type { Denops, Entrypoint } from "jsr:@denops/std@~7.2.0";

export const main: Entrypoint = (denops: Denops) => {
  denops.dispatcher = {};
};
