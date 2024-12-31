import type {} from "./types.ts";
import type { Loader } from "./loader.ts";

export class Ddt {
  #loader: Loader;

  constructor(loader: Loader) {
    this.#loader = loader;
  }
}
