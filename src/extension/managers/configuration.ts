/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as vscode from "vscode";

import { Emitter, Event, IDisposable } from "../../common/event-kit";
import { ConfigurationValues } from "../types";

/** Type information for the ConfigurationManager's Emitter. */
interface Emissions {
  /** Emitted whenever the configuration has changed. */
  "change": ConfigurationValues;
}

/**
 * A simple wrapper around the Visual Studio Code configuration API, providing
 * an easy and consistent access to our configuration values.
 *
 * This does not support folder-level configuration values.
 */
export class ConfigurationManager implements IDisposable {
  private readonly emitter: Emitter<Emissions>;
  private readonly subscriptions: IDisposable[];

  values: ConfigurationValues;

  constructor() {
    this.emitter = new Emitter();

    this.subscriptions = [
      vscode.workspace.onDidChangeConfiguration(this.change, this)
    ];

    this.values = this.updateValues();
  }

  /** Disposes of this manager and all of its subscriptions. */
  dispose(): void {
    while (this.subscriptions.length) {
      const s = this.subscriptions.pop();
      if (s) s.dispose();
    }

    this.emitter.dispose();
  }

  /**
   * Invoke the given callback whenever the configuration has changed within
   * Visual Studio Code.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  onDidChange: Event<Emissions["change"]> = (e, thisArg, disposables) => {
    return this.emitter.registerEvent("change", e, thisArg, disposables);
  }

  /** Queries Visual Studio Code in order to retrieve a fully up-to-date configuration. */
  private updateValues(): ConfigurationValues {
    const config = vscode.workspace.getConfiguration("item-filter");

    const baseWhitelist = config.get<string[]>("baseWhitelist");
    const classWhitelist = config.get<string[]>("classWhitelist");
    const ruleWhitelist = config.get<string[]>("ruleWhitelist");
    const soundWhitelist = config.get<string[]>("soundWhitelist");
    const modWhitelist = config.get<string[]>("modWhitelist");
    const performanceHints = config.get<boolean>("performanceHints");
    const alwaysShowAlpha = config.get<boolean>("alwaysShowAlpha");
    const limitedModPool = config.get<boolean>("limitedModPool");
    const itemValueQuotes = config.get<boolean>("itemValueQuotes");
    const booleanQuotes = config.get<boolean>("booleanQuotes");
    const rarityQuotes = config.get<boolean>("rarityQuotes");
    const modQuotes = config.get<boolean>("modQuotes");
    const linuxMPGAvailable = config.get<boolean>("linuxMPGAvailable");
    const linuxMPGPath = config.get<string>("linuxMPGPath");

    return {
      baseWhitelist: baseWhitelist ? baseWhitelist : [],
      classWhitelist: classWhitelist ? classWhitelist : [],
      ruleWhitelist: ruleWhitelist ? ruleWhitelist : [],
      soundWhitelist: soundWhitelist ? soundWhitelist : [],
      modWhitelist: modWhitelist ? modWhitelist : [],
      performanceHints: performanceHints == null ? true : performanceHints,
      alwaysShowAlpha: alwaysShowAlpha == null ? false : alwaysShowAlpha,
      limitedModPool: limitedModPool == null ? false : limitedModPool,
      itemValueQuotes: itemValueQuotes == null ? true : itemValueQuotes,
      booleanQuotes: booleanQuotes == null ? false : booleanQuotes,
      rarityQuotes: rarityQuotes == null ? false : rarityQuotes,
      modQuotes: modQuotes == null ? true : modQuotes,
      linuxMPGAvailable: linuxMPGAvailable == null ? false : linuxMPGAvailable,
      linuxMPGPath: linuxMPGPath == null ? "" : linuxMPGPath
    };
  }

  /** Updates the configuration values, emitting the result to any listeners. */
  private change(event: vscode.ConfigurationChangeEvent): void {
    if (!event.affectsConfiguration("item-filter")) {
      return;
    }

    this.values = this.updateValues();
    this.emitter.emit("change", this.values);
  }
}