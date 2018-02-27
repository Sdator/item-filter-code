/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { NotificationType } from "vscode-languageserver";
import { SoundInformation } from "./index";

export interface SoundNotificationParams {
  uri: string;
  sounds: SoundInformation[];
}

export namespace SoundNotification {
  export const type = new NotificationType<SoundNotificationParams, {}>("update-sounds");
}
