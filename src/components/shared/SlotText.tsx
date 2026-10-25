import { Fragment, isValidElement } from "react";

import { Text } from "@/components/ui";

import type { TextProps } from "@/components/ui";
import type { ReactNode } from "react";

// What React renders as nothing: allowed next to text, as in `<>Số: {maybeCount}</>`.
function isBlank(node: ReactNode): boolean {
  return node === null || node === undefined || typeof node === "boolean";
}

function isTextPiece(node: ReactNode): boolean {
  return typeof node === "string" || typeof node === "number";
}

/**
 * True for text and for what only builds text: a number, or a fragment or array whose pieces are
 * all strings and numbers (`<>Số: {n}</>`). On native a bare string must sit inside a `Text`, so
 * these need the wrapper; anything holding an element does not.
 */
function isTextLike(node: ReactNode): boolean {
  if (isTextPiece(node)) return true;
  if (Array.isArray(node)) {
    return node.some(isTextPiece) && node.every((piece) => isTextPiece(piece) || isBlank(piece));
  }
  if (isValidElement<{ children?: ReactNode }>(node) && node.type === Fragment) {
    return isTextLike(node.props.children);
  }
  return false;
}

/**
 * A slot that takes either plain text or a ready-made node: text gets the given type style, a node
 * (a `StatusDot`, a link, a pair of texts) is rendered as it is.
 */
export function SlotText({ children, ...textProps }: TextProps) {
  if (isTextLike(children)) return <Text {...textProps}>{children}</Text>;
  return <>{children}</>;
}
