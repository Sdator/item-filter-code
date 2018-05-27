/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

// Just like in the completion provider, we only need to establish the context
// within the current line.

import * as path from "path";
import { Hover, Position, Range } from "vscode-languageserver";

import { dataRoot } from "../common";
import { UniqueData, UniqueItem, ItemData, FilterData } from "../types";
import { ContextParser } from "./parsers";

const itemData = <ItemData> require(path.join(dataRoot, "items.json"));
const filterData = <FilterData> require(path.join(dataRoot, "filter.json"));
const uniqueData = <UniqueData> require(path.join(dataRoot, "uniques.json"));

export function getHoverResult(text: string, position: Position): Hover | null {
  const parser = new ContextParser(text, position);
  const keyword = parser.getKeyword();
  if (keyword == null) return null;

  if (parser.isBeforeKeyword()) {
    return null;
  } else if (parser.isWithinKeyword()) {
    const keywordDescription = filterData.keywordDescriptions[keyword.text];
    if (keywordDescription) {
      const keywordHover: Hover = {
        contents: keywordDescription,
        range: keyword.range
      };

      return keywordHover;
    } else {
      return null;
    }
  }

  switch (keyword.text) {
    case "ItemLevel":
    case "DropLevel":
      return getLevelHover(parser);
    case "Quality":
      return getQualityHover(parser);
    case "Sockets":
      return getSocketsHover(parser);
    case "LinkedSockets":
      return getLinkedSocketsHover(parser);
    case "Height":
      return getHeightHover(parser);
    case "Width":
      return getWidthHover(parser);
    case "Rarity":
      return getRarityHover(parser);
    case "SocketGroup":
      return getSocketGroupHover(parser);
    case "Identified":
    case "Corrupted":
    case "ElderItem":
    case "ShaperItem":
    case "ShapedMap":
    case "ElderMap":
    case "DisableDropSound":
      return getBooleanHover(parser);
      case "Class":
      return getClassHover(parser);
    case "BaseType":
      return getBaseTypeHover(parser);
    case "PlayAlertSound":
    case "PlayAlertSoundPositional":
      return getSoundHover(parser);
    case "SetFontSize":
      return getFontSizeHover(parser);
    default:
      // We're missing color values, but this is intentional. The color picker
      // in Visual Studio Code becomes very jittery when hover information is
      // provided to it, with it often flipping its anchor orientation completely.
      return null;
  }
}

function getBaseTypeHover(parser: ContextParser): Hover | null {
  parser.bypassOperator(true);

  if (parser.isBeforeCurrentIndex()) return null;

  const range = parser.getStringRangeAtRequestPosition();
  let baseType = parser.getStringAtRange(range);

  // The range will include quotation marks, if there are any. We need to get rid
  // of them, as we store items without them in the data files.
  const length = baseType.length;
  const startIndex = baseType[0] === `"` ? 1 : 0;
  const endIndex = baseType[length - 1] === `"` ? length - 1 : length;
  baseType = baseType.slice(startIndex, endIndex);

  let output = "";

  const itemClasses: string[] = [];
  const matchedBases: string[] = [];
  for (const itemClass of itemData.classes) {
    const itemBases = itemData.classesToBases[itemClass];
    for (const itemBase of itemBases) {
      if (itemBase.includes(baseType)) {
        if (!itemClasses.includes(itemClass)) itemClasses.push(itemClass);
        matchedBases.push(itemBase);
      }
    }
  }

  if (itemClasses.length === 1) {
    output += `Class: \`${itemClasses[0]}\`\n\n`;
  } else if (itemClasses.length > 1) {
    output += `Classes:`;
    for (const itemClass of itemClasses) {
      output += ` \`${itemClass}\``;
    }

    if (matchedBases.length > 5) {
      output += `\n\nMatched Items: \`${matchedBases.length}\`\n\n`;
    } else if (matchedBases.length > 1) {
      output += "\n\nMatched Items:\n";
      for (const match of matchedBases) {
        output += `- ${match}\n`;
      }
      output += "\n\n";
    }
  }

  const matchedUniques: Array<string|UniqueItem> = [];
  for (const itemBase of matchedBases) {
    const uniques = uniqueData[itemBase];
    if (uniques && uniques.length >= 1) {
      matchedUniques.push.apply(matchedUniques, uniques);
    }
  }

  if (matchedUniques.length >= 1) {
    output += "Uniques:\n";
    let uniquesPushed = 0;
    for (const unique of matchedUniques) {
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
        output += "\n";
      }

      uniquesPushed++;
      if (uniquesPushed === 5) {
        if (matchedUniques.length > 5) {
          output += `- ... and ${matchedUniques.length - 5} more.`;
        }
        break;
      }
    }
  }

  if (output === "") {
    return null;
  } else {
    output += "\n\nA base type to be captured by the closing block. As a string value, " +
      "if the base type consists of a multi-word value, then it must be encapsulated " +
      "in quotation marks. This value can be partial, with all item bases containing that " +
      "partial string then being matched."

    const result: Hover = {
      contents: output,
      range
    };

    return result;
  }
}

function getClassHover(parser: ContextParser): Hover | null {
  parser.bypassOperator(true);

  if (parser.isBeforeCurrentIndex()) return null;

  const range = parser.getStringRangeAtRequestPosition();
  let classType = parser.getStringAtRange(range);

  // Trim the quotation marks.
  const length = classType.length;
  const startIndex = classType[0] === `"` ? 1 : 0;
  const endIndex = classType[length - 1] === `"` ? length - 1 : length;
  classType = classType.slice(startIndex, endIndex);

  let output = "";

  const matchedClasses: string[] = [];
  for (const itemClass of itemData.classes) {
    if (itemClass.includes(classType)) {
      matchedClasses.push(itemClass);
    }
  }

  let containedItems = 0;
  if (matchedClasses.length === 1) {
    output += `Class \`${matchedClasses[0]}\`\n\n`;
    const items = itemData.classesToBases[matchedClasses[0]];
    if (items !== undefined) containedItems = items.length;
  } else if (matchedClasses.length > 1) {
    output += `Matched Classes:\n`;
    for (const itemClass of matchedClasses) {
      output += `- ${itemClass}\n`;
      const items = itemData.classesToBases[itemClass];
      if (items !== undefined) containedItems += items.length;
    }
    output += "\n";
  }

  if (containedItems > 0) {
    output += `Items: \`${containedItems}\``;
  }

  if (output === "") {
    return null;
  } else {
    output += "\n\nAn item class to be captured by the closing block. As a string value, " +
      "if the item class consists of a multi-word value, then it must be encapsulated " +
      "in quotation marks. This value can be partial, with all item classes containing " +
      "that partial string then being matched."

    const result: Hover = {
      contents: output,
      range
    };

    return result;
  }
}

function getLevelHover(parser: ContextParser): Hover | null {
  parser.bypassOperator();

  const range = expectNumber(parser);
  if (range == null) return null;

  return {
    contents: "A level, which can be any number from 0 to 100.",
    range
  };
}

function getSocketsHover(parser: ContextParser): Hover | null {
  parser.bypassOperator();

  const range = expectNumber(parser);
  if (range == null) return null;

  return {
    contents: "The number of sockets on the item, which can be any number from 0 to 6.",
    range
  };
}

function getQualityHover(parser: ContextParser): Hover | null {
  parser.bypassOperator();

  const range = expectNumber(parser);
  if (range == null) return null;

  return {
    contents: "The quality of the item, which can be any number from 0 to 30."
  };
}

function getLinkedSocketsHover(parser: ContextParser): Hover | null {
  parser.bypassOperator();

  const range = expectNumber(parser);
  if (range == null) return null;

  return {
    contents: "The number of linked sockets on the item, which can be either 0 or " +
      "a number from 2 to 6.",
    range
  };
}

function getHeightHover(parser: ContextParser): Hover | null {
  parser.bypassOperator();

  const range = expectNumber(parser);
  if (range == null) return null;

  return {
    contents: "The height of the item within the inventory, which can be a number from 1 to 4.",
    range
  };
}

function getWidthHover(parser: ContextParser): Hover | null {
  parser.bypassOperator();

  const range = expectNumber(parser);
  if (range == null) return null;

  return {
    contents: "The height of the item within the inventory, which can be a number from 1 to 2.",
    range
  };
}

function getRarityHover(parser: ContextParser): Hover | null {
  parser.bypassOperator();

  if (parser.isBeforeCurrentIndex()) return null;

  const range = parser.getWordRangeAtRequestPosition();

  return {
    contents: "The rarity of the item, which is a string such as `Rare` or `Unique`.",
    range
  };
}

function getSocketGroupHover(parser: ContextParser): Hover | null {
  parser.bypassOperator(true);

  if (parser.isBeforeCurrentIndex()) return null;

  const range = parser.getWordRangeAtRequestPosition();

  return {
    contents: "The colors of the sockets within the item, with each character of " +
      "the string representing the color of a single socket.\n\n" +
      "The most common socket group being `RGB`, which indicates that the item " +
      "has one red socket, one green socket, and one blue socket. The second most " +
      "common socket group being `WWWWWW`, which indicates that the item has six " +
      "white sockets.",
    range
  };
}

function getBooleanHover(parser: ContextParser): Hover | null {
  parser.bypassOperator(true);

  if (parser.isBeforeCurrentIndex()) return null;

  const range = parser.getWordRangeAtRequestPosition();

  return {
    contents: "A boolean with two possible values: `True` or `False`.",
    range
  };
}

function getSoundHover(parser: ContextParser): Hover | null {
  parser.bypassOperator(true);

  if (parser.isBeforeCurrentIndex()) return null;

  const identifierRange = parser.getNextStringRange();
  if (identifierRange) {
    if (parser.isWithinRange(identifierRange)) {
      return {
        contents: "The identifier for the alert sound, which can either a number " +
          "from 1 to 16 or a string.\n\nThe only current sounds using a string identifier " +
          "would be those in the Shaper set, which includes identifiers such as `ShVaal` " +
          "and `ShMirror`.",
        range: identifierRange
      };
    }
  } else {
    return null;
  }

  const volumeRange = expectNumber(parser);
  if (volumeRange == null) {
    return null;
  } else {
    return {
      contents: "The volume level for the alert sound, which can be a number from 0 to 300.",
      range: volumeRange
    };
  }
}

function getFontSizeHover(parser: ContextParser): Hover | null {
  parser.bypassOperator(true);

  const range = expectNumber(parser);
  if (range == null) return null;

  return {
    contents: "The size to use for the font, which can be any number from 18 to 45.",
    range
  };
}

/**
 * Attempts to parse a number from the line, returning that number is successful.
 * @param parser The context parser being used for this hover request.
 */
function expectNumber(parser: ContextParser): Range | null {
  if (parser.isBeforeCurrentIndex()) return null;

  const range = parser.getNextNumberRange();
  if (range == null) return null;
  const text = parser.getStringAtRange(range);
  const value = parseInt(text, 10);

  if (isNaN(value)) return null;

  return range;
}
