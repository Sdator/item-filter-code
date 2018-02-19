/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

// Just like in the completion provider, we only need to establish the context
// within the current line.

import { Hover, Position } from "vscode-languageserver";

import { UniqueData, ItemData } from "./common";
import { bypassEqOperator, getStringRangeAtPosition } from "./completion-provider";

const itemData: ItemData = require("../items.json");
const uniqueData: UniqueData = require("../uniques.json");

export function getHoverResult(text: string, position: Position): Hover | null {
  const keywordRegex = /^\s*[A-Z]+(?=\s|$)/i;
  const wordRegex = /[A-Z]+(?=\s|$)/i;

  const hasKeyword = keywordRegex.test(text);
  if (!hasKeyword) return null;

  const keywordResult = wordRegex.exec(text);
  if (!keywordResult) return null;

  const keyword = keywordResult[0];
  const keywordStartIndex = keywordResult.index;
  const keywordEndIndex = keywordStartIndex + keyword.length;
  const currentIndex = keywordEndIndex;

  if (keywordEndIndex >= position.character) return null;

  switch (keyword) {
    case "BaseType":
      return getBaseTypeHover(position, text, currentIndex);
    default:
      return null;
  }
}

function getBaseTypeHover(position: Position, text: string, index: number): Hover | null {
  const valueIndex = bypassEqOperator(text, index);

  if (valueIndex === undefined || position.character < valueIndex) {
    return null;
  }

  const valueRange = getStringRangeAtPosition(position, text, valueIndex);
  let baseType = text.slice(valueRange.start.character, valueRange.end.character);

  // The range will include quotation marks, if there are any. We need to get rid
  // of them, as we store items without them in the data files.
  const length = baseType.length;
  const startIndex = baseType[0] === `"` ? 1 : 0;
  const endIndex = baseType[length - 1] === `"` ? length - 1 : length;
  baseType = baseType.slice(startIndex, endIndex);

  // We're essentially buffering directly into a markdown string.
  let output: string = "";
  const itemClass = itemData.basesToClasses[baseType];
  if (itemClass) {
    output += `Class: \`${itemClass}\`\n\n`;
  }

  const uniques = uniqueData[baseType];
  if (uniques) {
    output += "Uniques:\n";
    let uniquesPushed = 0;
    for (const unique of uniques) {
      if (typeof(unique) === "string") {
        output += `- ${unique}\n`;
      } else {
        output += `- ${unique.name}`;
        if (unique.boss) output += ` \`${unique.boss}\``;
        if (unique.location) output += ` \`${unique.location}\``;
        if (unique.league) output += ` \`${unique.league}\``;
        if (unique.leagues) {
          for (const league of unique.leagues) {
            output += ` \`${league}\``;
          }
        }
        output += `\n`;
      }

      uniquesPushed++;
      if (uniquesPushed === 5) {
        if (uniques.length > 5) {
          output += `- ... and ${uniques.length - 5} more.`;
        }
        break;
      }
    }
  }

  if (output === "") {
    return null;
  } else {
    const result: Hover = {
      contents: output,
      range: valueRange
    };

    return result;
  }
}
