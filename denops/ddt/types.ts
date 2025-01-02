import type { Denops } from "jsr:@denops/std@~7.4.0";

export type UiName = string;
export type ActionName = string;

export type DdtExtType = "ui";

export type UiActionCallback<Params extends BaseParams, ReturnType = unknown> =
  (
    args: UiActionArguments<Params>,
  ) => Promise<ReturnType> | ReturnType;

export type Context = {
  // TODO: remove placeholder
  placeholder?: unknown;
};

export type DdtOptions = {
  // TODO: remove placeholder
  placeholder?: unknown;
};

export type BaseParams = Record<string, unknown>;

export type UiOptions = {
  // TODO: remove placeholder
  placeholder?: unknown;
};

export type UiActionArguments<Params extends BaseParams> = {
  denops: Denops;
  context: Context;
  options: DdtOptions;
  uiOptions: UiOptions;
  uiParams: Params;
  actionParams: BaseParams;
};

export enum ActionFlags {
  None = 0,
}
