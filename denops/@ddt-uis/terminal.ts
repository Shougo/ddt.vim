import { BaseUi, UiActions } from "../ddt/base/ui.ts";

import type { Denops } from "jsr:@denops/std@~7.4.0";

export type Params = Record<string, never>;

export class Ui extends BaseUi<Params> {
  override redraw(args: {
    denops: Denops;
  }): void | Promise<void> {
  }

  override actions: UiActions<Params> = {
  }

  override params(): Params {
    return {};
  }
}
