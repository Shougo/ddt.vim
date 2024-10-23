import type {
  BaseParams,
  UiOptions,
} from "../types.ts";

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
