import * as tslint from "tslint";
import * as ts from "typescript";
import * as tsutils from "tsutils";

const UNDERSCORE = "_".charCodeAt(0);

type RelevantClassMember =
  | ts.MethodDeclaration
  | ts.PropertyDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration;

export class Rule extends tslint.Rules.AbstractRule {
  static FAILURE_STRING = "a private member's name must be prefixed with an underscore";

  apply(sourceFile: ts.SourceFile): tslint.RuleFailure[] {
    return this.applyWithFunction(sourceFile, walk);
  }
}

function walk(ctx: tslint.WalkContext<void>): void {
  traverse(ctx.sourceFile);

  function traverse(node: ts.Node): void {
    checkNodeForViolations(ctx, node);
    return ts.forEachChild(node, traverse);
  }
}

function checkNodeForViolations(ctx: tslint.WalkContext<void>, node: ts.Node): void {
  if (!isRelevantClassMember(node)) {
    return;
  }

  const name = node.name;
  if (!nameIsIdentifier(name)) {
    return;
  }

  if (!nameStartsWithUnderscore(name.text) && memberIsPrivate(node)) {
    ctx.addFailureAtNode(name, Rule.FAILURE_STRING);
  }
}

function isRelevantClassMember(node: ts.Node): node is RelevantClassMember {
  switch (node.kind) {
    case ts.SyntaxKind.MethodDeclaration:
    case ts.SyntaxKind.PropertyDeclaration:
    case ts.SyntaxKind.GetAccessor:
    case ts.SyntaxKind.SetAccessor:
      return true;
    default:
      return false;
  }
}

function nameStartsWithUnderscore(text: string): boolean {
  return text.charCodeAt(0) === UNDERSCORE;
}

function memberIsPrivate(node: ts.Declaration): boolean {
  return tsutils.hasModifier(node.modifiers, ts.SyntaxKind.PrivateKeyword);
}

function nameIsIdentifier(node: ts.Node): node is ts.Identifier {
  return node.kind === ts.SyntaxKind.Identifier;
}
