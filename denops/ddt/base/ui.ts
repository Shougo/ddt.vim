import type {
  ActionName,
  BaseParams,
  Context,
  DdtOptions,
  UiActionCallback,
  UiOptions,
} from "../types.ts";

import type { Denops } from "jsr:@denops/std@~7.4.0";

export type UiAction<Params extends BaseParams, ReturnType = unknown> = {
  description: string;
  callback: UiActionCallback<Params, ReturnType>;
};

export type UiActions<Params extends BaseParams> = {
  [K in ActionName]: UiAction<Params, unknown>;
};

type BaseUiArguments<Params extends BaseParams> = {
  denops: Denops;
  context: Context;
  options: DdtOptions;
  uiOptions: UiOptions;
  uiParams: Params;
};

export type OnInitArguments<Params extends BaseParams> = {
  denops: Denops;
  uiOptions: UiOptions;
  uiParams: Params;
};

export type RedrawArguments<Params extends BaseParams> = BaseUiArguments<
  Params
>;

export type GetInputArguments<Params extends BaseParams> = BaseUiArguments<
  Params
>;

export abstract class BaseUi<Params extends BaseParams> {
  apiVersion = 1;

  name = "";
  path = "";
  isInitialized = false;

  abstract params(): Params;

  onInit(_args: OnInitArguments<Params>): void | Promise<void> {}
  redraw(_args: RedrawArguments<Params>): void | Promise<void> {}
  getInput(_args: GetInputArguments<Params>): string | Promise<string> {
    return "";
  }

  abstract actions: UiActions<Params>;
}

export function defaultUiOptions(): UiOptions {
  return {
    actions: {},
  };
}
