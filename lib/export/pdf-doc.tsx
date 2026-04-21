import { Document, Page, StyleSheet, Text } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  paragraph: {
    marginBottom: 10,
    lineHeight: 1.45,
  },
});

function splitParagraphs(body: string): string[] {
  return body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}

/** Rewritten body only (no headings from export). */
export function HumanizedPdfDocument({ body }: { body: string }) {
  const paragraphs = splitParagraphs(body);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {paragraphs.map((p, i) => (
          <Text key={i} style={styles.paragraph}>
            {p}
          </Text>
        ))}
      </Page>
    </Document>
  );
}
