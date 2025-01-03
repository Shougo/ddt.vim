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

export interface ContextBuilder {
  get(denops: Denops, options: UserOptions): Promise<[Context, DdtOptions]>;
  getGlobal(): Partial<DdtOptions>;
  getLocal(): Record<string, Partial<DdtOptions>>;
  setGlobal(options: Partial<DdtOptions>): void;
  setLocal(name: string, options: Partial<DdtOptions>): void;
  patchGlobal(options: Partial<DdtOptions>): void;
  patchLocal(name: string, options: Partial<DdtOptions>): void;
}

export type DdtOptions = {
  name: string;
  ui: string;
  uiOptions: Record<UiName, Partial<UiOptions>>;
  uiParams: Record<UiName, Partial<BaseParams>>;
};

export type UserOptions = Record<string, unknown>;

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
