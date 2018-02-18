/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

// Currently, we only display the sound decorations within the editor on Windows.
// On Windows, we invoke the bundled mpg123 binary through a subprocess in order
// to play audio. This will hopefully be unnecessary at some point when the
// VS Code team provides a sound API.

import * as path from "path";
import * as cp from "child_process";

interface SoundFile {
  [key: string]: string;
}

const soundData: SoundFile = require("../sounds.json");

const mpgPath = path.join(__dirname, "..", "..", "tools", "mpg123.exe");

export function playSound(identifier: string, volume: number) {
  // We need to do a percentage-wise scale of the samples. GGG uses a range of
  // 0 to 300 within their syntax, with MPG itself using 0 to 32768. As a side
  // node, I believe item filters actually play sounds at 33% by default.
  const percentage = volume / 300;
  const samples = Math.trunc(32768 * percentage);

  // Sound identifiers can be whitelisted, so just don't attempt to play any
  // sounds that we don't bundle.
  const soundFilePart = soundData[identifier];
  if (soundFilePart) {
    const soundPath = path.join(__dirname, "..", "..", "media", "sounds", soundFilePart);
    cp.execFile(mpgPath, ["-q", "-f", `${samples}`, soundPath]);
  }
}
