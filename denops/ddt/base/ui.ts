import type {
  BaseParams,
  Context,
  DdtOptions,
  UiOptions,
} from "../types.ts";

import type { Denops } from "jsr:@denops/std@~7.2.0";

type BaseUiArguments<Params extends BaseParams> = {
  denops: Denops;
  context: Context;
  options: DdtOptions;
  uiOptions: UiOptions;
  uiParams: Params;
};

export type RedrawArguments<Params extends BaseParams> = BaseUiArguments<
  Params
>;

export abstract class BaseUi<Params extends BaseParams> {
  apiVersion = 1;

  name = "";
  path = "";
  isInitialized = false;

  abstract params(): Params;

  redraw(_args: RedrawArguments<Params>): void | Promise<void> {}
}

export function defaultUiOptions(): UiOptions {
  return {};
}
