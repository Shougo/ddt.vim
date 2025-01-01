import type { BaseParams, Context, DdtOptions, UiActionCallback, UiOptions } from "../types.ts";

import type { Denops } from "jsr:@denops/std@~7.4.0";

export type UiActions<Params extends BaseParams> = Record<
  string,
  UiActionCallback<Params>
>;

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

  abstract actions: UiActions<Params>;
}

export function defaultUiOptions(): UiOptions {
  return {};
}
