/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as vscode from "vscode";

import { assertUnreachable } from "../helpers";
import * as types from "../types";

/**
 * Converts a position from our own representation into the VSCode type.
 * @param position A position received as part of the result of a parse.
 */
export function position2CodePosition(position: types.Position): vscode.Position {
  return new vscode.Position(position.line, position.character);
}

/**
 * Converts a range from our own representation into the VSCode type.
 * @param range A range received as part of the result of a parse.
 */
export function range2CodeRange(range: types.Range) {
  return new vscode.Range(position2CodePosition(range.start), position2CodePosition(range.end));
}

/**
 * Converts a span into a VSCode Range.
 * @param span A span received as part of the result of a parse.
 */
export function span2CodeRange(span: types.Span, line: number) {
  return new vscode.Range(line, span.start, line, span.end);
}

/**
 * Converts a diagnostic from our own representation into the VSCode type.
 * @param diagnostic A diagnostic received as part of the result of a parse.
 */
export function diagnostic2CodeDiagnostic(diagnostic: types.Diagnostic): vscode.Diagnostic {
  return new vscode.Diagnostic(
    range2CodeRange(diagnostic.range),
    diagnostic.message,
    diagSeverity2CodeDiagSeverity(diagnostic.severity)
  );
}

/**
 * Converts a diagnostic severity from our own representation into the VSCode type.
 * @param severity A diagnostic severity received as part of the result of a parse.
 */
export function diagSeverity2CodeDiagSeverity(severity: types.DiagnosticSeverity | undefined):
  vscode.DiagnosticSeverity | undefined {

  if (severity == null) {
    return undefined;
  }

  switch (severity) {
    case types.DiagnosticSeverity.Error:
      return vscode.DiagnosticSeverity.Error;
    case types.DiagnosticSeverity.Hint:
      return vscode.DiagnosticSeverity.Hint;
    case types.DiagnosticSeverity.Information:
      return vscode.DiagnosticSeverity.Information;
    case types.DiagnosticSeverity.Warning:
      return vscode.DiagnosticSeverity.Warning;
    default:
      return assertUnreachable(severity);
  }
}

/**
 * Converts a color from our own representation into the VSCode type.
 * @param color A color received as part of the result of a parse.
 */
export function color2CodeColor(color: types.Color): vscode.Color {
  return new vscode.Color(color.red, color.green, color.blue, color.alpha);
}

/**
 * Converts color information from our own representation into the VSCode type.
 * @param colorInfo Color information received as part of the result of a parse.
 */
export function colorInfo2CodeColorInfo(colorInfo: types.ColorInformation):
  vscode.ColorInformation {

  return new vscode.ColorInformation(range2CodeRange(colorInfo.range),
    color2CodeColor(colorInfo.color));
}

/** Returns the operator type that correlates to the given text, if any. */
export function textOperator2FilterOperator(text: string): types.FilterOperator | undefined {
  switch (text) {
    case "=":
      return types.FilterOperator.Equals;
    case ">":
      return types.FilterOperator.GreaterThan;
    case ">=":
      return types.FilterOperator.GreaterThanEquals;
    case "<":
      return types.FilterOperator.LessThan;
    case "<=":
      return types.FilterOperator.LessThanEquals;
    default:
      return undefined;
  }
}

export function textExtensionToSoundType(ext: string): types.CustomSoundType {
  const value = ext.toLowerCase();

  switch (value) {
    case ".mp3":
      return types.CustomSoundType.MP3;
    case ".wav":
      return types.CustomSoundType.WAV;
    default:
      return types.CustomSoundType.Unknown;
  }
}
