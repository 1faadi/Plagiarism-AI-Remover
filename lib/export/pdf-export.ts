import "server-only";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { HumanizedPdfDocument } from "./pdf-doc";

export async function buildPdfBuffer(body: string): Promise<Buffer> {
  const el = React.createElement(HumanizedPdfDocument, {
    body,
  }) as Parameters<typeof renderToBuffer>[0];
  const buf = await renderToBuffer(el);
  return Buffer.from(buf);
}
