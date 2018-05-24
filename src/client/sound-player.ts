/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

// There is no API for playing sounds in Visual Studio Code, so we call out to
// executables on the system. On Windows, we bundle a binary with the extension.

import * as path from "path";
import * as cp from "child_process";

import { dataRoot, projectRoot } from "../common";

import { workspace } from "vscode";

interface SoundFile {
  [key: string]: string;
}

const soundData = <SoundFile> require(path.join(dataRoot, "sounds.json"));

export function playSound(identifier: string, volume: number) {
  // Sound identifiers can be whitelisted, so just don't attempt to play any
  // sounds that we don't bundle.
  const soundFilePart = soundData[identifier];
  const soundPath = path.join(projectRoot, "media", "sounds", soundFilePart);

  // GGG uses a scale of 0 to 300 for volume.
  const percentage = volume / 300;

  // MPG123 uses a scale of 0 to 32768 in order to scale volume.
  const scaledSamples = Math.trunc(32768 * percentage);

  let player: string;
  let args: string[];
  if (process.platform === "win32") {
    const mpgPath = path.join(projectRoot, "tools", "mpg123.exe");
    player = mpgPath;
    args = ["-q", "-f", `${scaledSamples}`, soundPath];
  } else if (process.platform === "linux") {
    const availability = <boolean> workspace.getConfiguration("item-filter")
      .get("linuxMPGAvailable");
    const mpgPath = <string> workspace.getConfiguration("item-filter")
      .get("linuxMPGPath");

    if (mpgPath && mpgPath !== "") {
      player = mpgPath;
    } else if (availability) {
      player = "mpg123";
    } else {
      return;
    }

    args = ["-q", "-f", `${scaledSamples}`, soundPath];
  } else if (process.platform === "darwin") {
    // afplay uses 0.0 to 1.0, so we're good on volume. This uses a different
    // method of scaling volume than mpg123, so it may or may not be more
    // accurate to what GGG itself does with the client.
    const volume = percentage;
    player = "afplay";
    args = ["-v", `${volume}`, soundPath];
  } else {
    return;
  }

  cp.execFile(player, args);
}
