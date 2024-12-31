import type { Denops, Entrypoint } from "jsr:@denops/std@~7.4.0";

export const main: Entrypoint = (denops: Denops) => {
  denops.dispatcher = {};
};
