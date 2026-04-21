import "server-only";
import { Document, Packer, Paragraph, TextRun } from "docx";

/** Body only: rewritten text split into paragraphs (no title or source). */
export async function buildDocxBuffer(body: string): Promise<Buffer> {
  const blocks = body.split(/\n\n+/).filter(Boolean);
  const children = blocks.map(
    (block) =>
      new Paragraph({
        children: [new TextRun(block)],
        spacing: { after: 160 },
      }),
  );

  const doc = new Document({
    sections: [{ children }],
  });

  const buf = await Packer.toBuffer(doc);
  return Buffer.from(buf);
}
