import { BaseUi } from "../ddt/base/ui.ts";

export type Params = Record<string, never>;

export class Ui extends BaseUi<Params> {
  override params(): Params {
    return {};
  }
}
