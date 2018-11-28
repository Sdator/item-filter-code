/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as path from "path";
import * as vscode from "vscode";

import { assetRoot, dataOutputRoot, splitLines, stylizedArrayJoin } from "../helpers";
import * as types from "../types";
import * as contextParser from "../parsers/context";
import { range2CodeRange } from "../converters";

const itemData = <types.ItemData>require(path.join(dataOutputRoot, "items.json"));
const imageData = <types.ImageData>require(path.join(dataOutputRoot, "images.json"));
const filterData = <types.FilterData>require(path.join(dataOutputRoot, "filter.json"));
const uniqueData = <types.UniqueData>require(path.join(dataOutputRoot, "uniques.json"));
const separatorText = "\n\n---\n\n";

export class FilterHoverProvider implements vscode.HoverProvider {
  provideHover(document: vscode.TextDocument, position: vscode.Position,
    _token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {

    const lines = splitLines(document.getText());
    return getHoverResult(lines[position.line], position);
  }
}

export function getHoverResult(text: string, position: vscode.Position): vscode.Hover | null {
  const keywordResult = contextParser.getKeyword(text, position.line);
  if (!keywordResult) return null;

  const [keyword, keywordRange] = keywordResult;
  const currentIndex = keywordRange.end.character;

  if (keywordRange.start.character > position.character) {
    return null;
  } else if (keywordRange.end.character > position.character) {
    const keywordDescription = filterData.keywordDescriptions[keyword];

    if (keywordDescription) {
      return new vscode.Hover(keywordDescription, range2CodeRange(keywordRange));
    } else {
      return null;
    }
  }

  if (keywordRange.end.character >= position.character) return null;

  switch (keyword) {
    case "ItemLevel":
      return getItemLevelHover(position, text, currentIndex);
    case "DropLevel":
      return getDropLevelHover(position, text, currentIndex);
    case "GemLevel":
      return getGemLevelHover(position, text, currentIndex);
    case "Quality":
      return getQualityHover(position, text, currentIndex);
    case "StackSize":
      return getStackSizeHover(position, text, currentIndex);
    case "Sockets":
      return getSocketsHover(position, text, currentIndex);
    case "LinkedSockets":
      return getLinkedSocketsHover(position, text, currentIndex);
    case "Height":
      return getHeightHover(position, text, currentIndex);
    case "Width":
      return getWidthHover(position, text, currentIndex);
    case "MapTier":
      return getMapTierHover(position, text, currentIndex);
    case "Rarity":
      return getRarityHover(position, text, currentIndex);
    case "SocketGroup":
      return getSocketGroupHover(position, text, currentIndex);
    case "Identified":
    case "Corrupted":
    case "ElderItem":
    case "ShaperItem":
    case "ShapedMap":
    case "ElderMap":
      return getBooleanHover(position, text, currentIndex);
    case "HasExplicitMod":
      return getModHover(position, text, currentIndex);
    case "Class":
      return getClassHover(position, text, currentIndex);
    case "BaseType":
      return getBaseTypeHover(position, text, currentIndex);
    case "PlayAlertSound":
    case "PlayAlertSoundPositional":
      return getSoundHover(position, text, currentIndex);
    case "CustomAlertSound":
      return getCustomSoundHover(position, text, currentIndex);
    case "MinimapIcon":
      return getMinimapIconHover(position, text, currentIndex);
    case "PlayEffect":
      return getPlayEffectHover(position, text, currentIndex);
    case "SetFontSize":
      return getFontSizeHover(position, text, currentIndex);
    default:
      // We're missing color values, but this is intentional. The color picker
      // in Visual Studio Code becomes very jittery when hover information is
      // provided to it, with it often flipping its anchor orientation completely.
      return null;
  }
}

function getBaseTypeHover(position: vscode.Position, text: string, index: number):
  vscode.Hover | null {

  let valueIndex = contextParser.bypassEqOperator(text, index);

  if (valueIndex === undefined || position.character < valueIndex) {
    return null;
  }

  let valueRange: types.Range | undefined;
  do {
    valueRange = contextParser.getNextValueRange(text, position.line, valueIndex);

    if (valueRange) {
      valueIndex = valueRange.end.character + 1;
    } else {
      return null;
    }
  } while (!contextParser.isNextValue(valueRange, position));

  valueRange.end.character++;
  let baseType = text.slice(valueRange.start.character, valueRange.end.character);

  // The range will include quotation marks, if there are any. We need to get rid
  // of them, as we store items without them in the data files.
  const length = baseType.length;
  const startIndex = baseType[0] === `"` ? 1 : 0;
  const endIndex = baseType[length - 1] === `"` ? length - 1 : length;
  baseType = baseType.slice(startIndex, endIndex);

  // We're essentially buffering directly into a markdown string.
  let output = "\n\nA base type to be captured by the closing block. As a string value, " +
    "if the base type consists of a multi-word value, then it must be encapsulated " +
    "in quotation marks. This value can be partial, with all item bases containing that " +
    "partial string then being matched.";
  let separatorInputted = false;

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
    output += separatorText + `Class: \`${itemClasses[0]}\`\n\n`;
    separatorInputted = true;
  } else if (itemClasses.length > 1) {
    output += separatorText + `Classes:`;
    separatorInputted = true;

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

  const matchedUniques: Array<string | types.UniqueItem> = [];
  for (const itemBase of matchedBases) {
    const uniques = uniqueData[itemBase];
    if (uniques && uniques.length >= 1) {
      matchedUniques.push.apply(matchedUniques, uniques);
    }
  }

  if (matchedUniques.length >= 1) {
    if (!separatorInputted) {
      output += separatorText;
      separatorInputted = true;
    }

    output += "Uniques:\n";
    let uniquesPushed = 0;
    for (const unique of matchedUniques) {
      if (typeof (unique) === "string") {
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

  return new vscode.Hover(output, range2CodeRange(valueRange));
}

function getClassHover(position: vscode.Position, text: string, index: number):
  vscode.Hover | null {

  let valueIndex = contextParser.bypassEqOperator(text, index);

  if (valueIndex === undefined || position.character < valueIndex) {
    return null;
  }

  let valueRange: types.Range | undefined;
  do {
    valueRange = contextParser.getNextValueRange(text, position.line, valueIndex);

    if (valueRange) {
      valueIndex = valueRange.end.character + 1;
    } else {
      return null;
    }
  } while (!contextParser.isNextValue(valueRange, position));

  valueRange.end.character++;
  let classType = text.slice(valueRange.start.character, valueRange.end.character);

  // Trim the quotation marks.
  const length = classType.length;
  const startIndex = classType[0] === `"` ? 1 : 0;
  const endIndex = classType[length - 1] === `"` ? length - 1 : length;
  classType = classType.slice(startIndex, endIndex);

  let output = "An item class to be captured by the closing block. As a string value, " +
    "if the item class consists of a multi-word value, then it must be encapsulated " +
    "in quotation marks. This value can be partial, with all item classes containing " +
    "that partial string then being matched.";
  let separatorInputted = false;

  const matchedClasses: string[] = [];
  for (const itemClass of itemData.classes) {
    if (itemClass.includes(classType)) {
      matchedClasses.push(itemClass);
    }
  }

  let containedItems = 0;
  if (matchedClasses.length === 1) {
    output += separatorText + `Class \`${matchedClasses[0]}\`\n\n`;
    separatorInputted = true;
    const items = itemData.classesToBases[matchedClasses[0]];
    if (items !== undefined) containedItems = items.length;
  } else if (matchedClasses.length > 1) {
    output += separatorText + `Matched Classes:\n`;
    separatorInputted = true;
    for (const itemClass of matchedClasses) {
      output += `- ${itemClass}\n`;
      const items = itemData.classesToBases[itemClass];
      if (items !== undefined) containedItems += items.length;
    }
    output += "\n";
  }

  if (containedItems > 0) {
    if (!separatorInputted) {
      output += separatorText;
      separatorInputted = true;
    }

    output += `Items: \`${containedItems}\``;
  }

  return new vscode.Hover(output, range2CodeRange(valueRange));
}

function getModHover(pos: vscode.Position, text: string, index: number): vscode.Hover | null {
  // TODO(glen): hook into the main parsing pass in order to provide detailed
  //             information regarding each affix.
  let valueIndex = contextParser.bypassEqOperator(text, index);

  if (valueIndex === undefined || pos.character < valueIndex) {
    return null;
  }

  let valueRange: types.Range | undefined;
  do {
    valueRange = contextParser.getNextValueRange(text, pos.line, valueIndex);

    if (valueRange) {
      valueIndex = valueRange.end.character + 1;
    } else {
      return null;
    }
  } while (!contextParser.isNextValue(valueRange, pos));

  valueRange.end.character++;

  return new vscode.Hover(
    "The name of an explicit item mod, such as `Tyrannical`.",
    range2CodeRange(valueRange)
  );
}

function getSoundHover(pos: vscode.Position, text: string, index: number): vscode.Hover | null {
  let result: vscode.Hover | null = null;

  let valueIndex = contextParser.bypassEqOperator(text, index);
  if (valueIndex == null || pos.character < valueIndex) return result;

  const firstValueRange = contextParser.getNextValueRange(text, pos.line, valueIndex);

  if (firstValueRange == null) {
    return result;
  } else if (contextParser.isNextValue(firstValueRange, pos)) {
    firstValueRange.end.character++;
    result = new vscode.Hover(
      "The identifier for the alert sound, which can either a number " +
      "from 1 to 16 or a string.\n\nThe only current sounds using a string identifier " +
      "would be those in the Shaper set, which includes identifiers such as `ShVaal` " +
      "and `ShMirror`.",
      range2CodeRange(firstValueRange)
    );
    return result;
  }

  valueIndex = firstValueRange.end.character + 1;
  const secondValueRange = contextParser.getNextValueRange(text, pos.line, valueIndex);

  if (secondValueRange != null && contextParser.isNextValue(secondValueRange, pos)) {
    secondValueRange.end.character++;
    result = new vscode.Hover(
      "The volume level for the alert sound, which can be a number from 0 to 300.",
      range2CodeRange(secondValueRange)
    );
  }

  return result;
}

function getMinimapIconHover(pos: vscode.Position, text: string, index: number):
  vscode.Hover | null {

  let result: vscode.Hover | null = null;

  let valueIndex = contextParser.bypassEqOperator(text, index);
  if (valueIndex == null || pos.character < valueIndex) return result;

  const firstValueRange = contextParser.getNextValueRange(text, pos.line, valueIndex);
  let secondValueRange: types.Range | undefined;
  let thirdValueRange: types.Range | undefined;

  if (firstValueRange) {
    valueIndex = firstValueRange.end.character + 1;
    secondValueRange = contextParser.getNextValueRange(text, pos.line, valueIndex);
  }

  if (secondValueRange) {
    valueIndex = secondValueRange.end.character + 1;
    thirdValueRange = contextParser.getNextValueRange(text, pos.line, valueIndex);
  }

  let size: string | undefined;
  let color: string | undefined;
  let shape: string | undefined;

  let previewText: string | undefined;
  if (firstValueRange && secondValueRange && thirdValueRange) {
    size = text.slice(firstValueRange.start.character, firstValueRange.end.character + 1);
    color = text.slice(secondValueRange.start.character, secondValueRange.end.character + 1);
    shape = text.slice(thirdValueRange.start.character, thirdValueRange.end.character + 1);

    // Validates each of the values.
    if (filterData.minimapIcons.sizes.includes(parseInt(size, 10)) &&
      filterData.minimapIcons.colors.includes(color) &&
      filterData.minimapIcons.shapes.includes(shape)) {

      const key = `minimap-icons/${shape.toLowerCase()}_${color.toLowerCase()}_${size}.png`;
      const image = imageData[key];

      if (image) {
        previewText = "\n\nA preview of the shape at this size and color:" +
          `\n\n![Minimap Icon Preview](data:image/png;base64,${image})`;
      }
    }
  }

  if (firstValueRange == null) {
    return result;
  } else if (contextParser.isNextValue(firstValueRange, pos)) {
    firstValueRange.end.character++;
    const text = stylizedArrayJoin(filterData.minimapIcons.sizes, true);

    let contents = `The size of the icon on the minimap, which can be ${text}. The ` +
      "smallest value correlates to the largest icon size.";
    if (previewText) {
      contents += previewText;
    }

    result = new vscode.Hover(
      previewText ? new vscode.MarkdownString(contents) : contents,
      range2CodeRange(firstValueRange)
    );
    return result;
  }

  if (secondValueRange == null) {
    return result;
  } else if (secondValueRange != null && contextParser.isNextValue(secondValueRange, pos)) {
    secondValueRange.end.character++;
    const text = stylizedArrayJoin(filterData.minimapIcons.colors, true);

    let contents = `The color of the icon on the minimap, which can be ${text}.`;
    if (previewText) {
      contents += previewText;
    }

    result = new vscode.Hover(
      previewText ? new vscode.MarkdownString(contents) : contents,
      range2CodeRange(secondValueRange)
    );
    return result;
  }

  if (thirdValueRange != null && contextParser.isNextValue(thirdValueRange, pos)) {
    thirdValueRange.end.character++;
    const validValuesText = stylizedArrayJoin(filterData.minimapIcons.shapes, true);

    let contents = `The shape of the icon on the minimap, which can be ${validValuesText}.`;
    if (previewText) {
      contents += previewText;
    }

    result = new vscode.Hover(
      previewText ? new vscode.MarkdownString(contents) : contents,
      range2CodeRange(thirdValueRange)
    );
  }

  return result;
}

function getPlayEffectHover(pos: vscode.Position, text: string, index: number):
  vscode.Hover | null {

  let result: vscode.Hover | null = null;

  let valueIndex = contextParser.bypassEqOperator(text, index);
  if (valueIndex == null || pos.character < valueIndex) return result;

  const firstValueRange = contextParser.getNextValueRange(text, pos.line, valueIndex);

  if (firstValueRange == null) {
    return result;
  } else if (contextParser.isNextValue(firstValueRange, pos)) {
    firstValueRange.end.character++;
    const text = stylizedArrayJoin(filterData.dropEffects.colors, true);
    result = new vscode.Hover(
      `The color of the beam of light overtop of the item, which can be ${text}.`,
      range2CodeRange(firstValueRange)
    );
    return result;
  }

  valueIndex = firstValueRange.end.character + 1;
  const secondValueRange = contextParser.getNextValueRange(text, pos.line, valueIndex);

  if (secondValueRange == null) {
    return result;
  } else if (secondValueRange != null && contextParser.isNextValue(secondValueRange, pos)) {
    secondValueRange.end.character++;
    result = new vscode.Hover(
      "The use of Temp results in the item drop effect only temporarily being visible" +
      " as the item is dropping to the ground.",
      range2CodeRange(secondValueRange)
    );
    return result;
  }

  return result;
}

function getDropLevelHover(pos: vscode.Position, text: string, index: number):
  vscode.Hover | null {

  const ranges = filterData.ruleRanges["DropLevel"];
  const contents = "The level at which an item begins dropping, which can be any " +
    `number from ${ranges.min} to ${ranges.max}.`;
  return getRepeatingValueHover(pos, text, index, contents, false);
}

function getItemLevelHover(pos: vscode.Position, text: string, index: number):
  vscode.Hover | null {

  const ranges = filterData.ruleRanges["ItemLevel"];
  const contents = "The level at which the item was generated, which can be any " +
    `number from ${ranges.min} to ${ranges.max}.`;
  return getRepeatingValueHover(pos, text, index, contents, false);
}

function getGemLevelHover(pos: vscode.Position, text: string, index: number):
  vscode.Hover | null {

  const ranges = filterData.ruleRanges["GemLevel"];
  const contents = "The level of the gem, which can be any number from " +
    `${ranges.min} to ${ranges.max}.`;
  return getRepeatingValueHover(pos, text, index, contents, false);
}

function getSocketsHover(pos: vscode.Position, text: string, index: number): vscode.Hover | null {
  const ranges = filterData.ruleRanges["Sockets"];
  const contents = "The number of sockets on the item, which can be any number from " +
    `${ranges.min} to ${ranges.max}.`;
  return getRepeatingValueHover(pos, text, index, contents, false);
}

function getQualityHover(pos: vscode.Position, text: string, index: number): vscode.Hover | null {
  const ranges = filterData.ruleRanges["Quality"];
  const contents = "The quality of the item, which can be any number from " +
    `${ranges.min} to ${ranges.max}.`;
  return getRepeatingValueHover(pos, text, index, contents, false);
}

function getLinkedSocketsHover(pos: vscode.Position, text: string, index: number):
  vscode.Hover | null {

  const ranges = filterData.ruleRanges["LinkedSockets"];
  const contents = "The number of linked sockets on the item, which can be either " +
    `0 or a number from ${ranges.min} to ${ranges.max}.`;
  return getRepeatingValueHover(pos, text, index, contents, false);
}

function getHeightHover(pos: vscode.Position, text: string, index: number): vscode.Hover | null {
  const ranges = filterData.ruleRanges["Height"];
  const contents = "The height of the item within the inventory, which can be a " +
    `number from ${ranges.min} to ${ranges.max}.`;
  return getRepeatingValueHover(pos, text, index, contents, false);
}

function getWidthHover(pos: vscode.Position, text: string, index: number): vscode.Hover | null {
  const ranges = filterData.ruleRanges["Width"];
  const contents = "The height of the item within the inventory, which can be a " +
    `number from ${ranges.min} to ${ranges.max}.`;
  return getRepeatingValueHover(pos, text, index, contents, false);
}

function getMapTierHover(pos: vscode.Position, text: string, index: number): vscode.Hover | null {
  const ranges = filterData.ruleRanges["MapTier"];
  const contents = "The tier of the map item, which can be a " +
    `number from ${ranges.min} to ${ranges.max}.`;
  return getRepeatingValueHover(pos, text, index, contents, false);
}

function getStackSizeHover(pos: vscode.Position, text: string, index: number):
  vscode.Hover | null {

  const ranges = filterData.ruleRanges["StackSize"];
  const content = "The stack size of the currency item, which can be any number from " +
    `${ranges.min} to ${ranges.max}.`;
  return getRepeatingValueHover(pos, text, index, content, false);
}

function getRarityHover(pos: vscode.Position, text: string, index: number): vscode.Hover | null {
  const contents = "The rarity of the item, which is a string such as `Rare` or `Unique`.";
  return getRepeatingValueHover(pos, text, index, contents, false);
}

function getSocketGroupHover(pos: vscode.Position, text: string, index: number):
  vscode.Hover | null {

  const contents = "The colors of the sockets within the item, with each character of " +
    "the string representing the color of a single socket.\n\n" +
    "The most common socket group being `RGB`, which indicates that the item " +
    "has one red socket, one green socket, and one blue socket. The second most " +
    "common socket group being `WWWWWW`, which indicates that the item has six " +
    "white sockets.";
  return getRepeatingValueHover(pos, text, index, contents, true);
}

function getBooleanHover(pos: vscode.Position, text: string, index: number): vscode.Hover | null {
  const contents = "A boolean with two possible values: `True` or `False`.";
  return getSingleValueHover(pos, text, index, contents, true);
}

function getCustomSoundHover(pos: vscode.Position, text: string, index: number):
  vscode.Hover | null {

  const contents = "The file name or full file path for the custom sound.";
  return getSingleValueHover(pos, text, index, contents, true);
}

function getFontSizeHover(pos: vscode.Position, text: string, index: number): vscode.Hover | null {
  const ranges = filterData.ruleRanges["SetFontSize"];
  const content = "The size to use for the font, which can be any number from " +
    `${ranges.min} to ${ranges.max}.`;
  return getSingleValueHover(pos, text, index, content, true);
}

function getSingleValueHover(pos: vscode.Position, text: string, index: number, contents: string,
  equalsOnly: boolean): vscode.Hover | null {

  let result: vscode.Hover | null = null;

  const valueIndex = equalsOnly ? contextParser.bypassEqOperator(text, index) :
    contextParser.bypassOperator(text, index);

  if (valueIndex != null && pos.character >= valueIndex) {
    const valueRange = contextParser.getNextValueRange(text, pos.line, valueIndex);

    if (valueRange != null && contextParser.isNextValue(valueRange, pos)) {
      valueRange.end.character++;
      result = new vscode.Hover(contents, range2CodeRange(valueRange));
    }
  }

  return result;
}

function getRepeatingValueHover(pos: vscode.Position, text: string, index: number,
  contents: string, equalsOnly: boolean): vscode.Hover | null {

  let valueIndex = equalsOnly ? contextParser.bypassEqOperator(text, index) :
    contextParser.bypassOperator(text, index);

  if (valueIndex === undefined || pos.character < valueIndex) {
    return null;
  }

  let valueRange: types.Range | undefined;
  do {
    valueRange = contextParser.getNextValueRange(text, pos.line, valueIndex);

    if (valueRange) {
      valueIndex = valueRange.end.character + 1;
    } else {
      return null;
    }
  } while (!contextParser.isNextValue(valueRange, pos));

  valueRange.end.character++;

  return new vscode.Hover(contents, range2CodeRange(valueRange));
}
