/**
 * Flow Test Engine – Custom TypeDoc Theme (bootstrap)
 *
 * Registers a theme named "flow" that currently extends the DefaultTheme.
 * This skeleton gives us a stable hook to evolve markup (and decouple from
 * internal class name changes) without rewriting docs config in the future.
 */

import { DefaultTheme } from "typedoc";

export default class FlowTheme extends DefaultTheme {
  constructor(renderer) {
    super(renderer);
  }
}
