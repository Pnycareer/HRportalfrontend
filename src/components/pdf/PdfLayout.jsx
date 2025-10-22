// src/components/pdf/PdfLayout.js
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 11, fontFamily: "Helvetica" },
  header: { fontSize: 16, marginBottom: 8 },
  subheader: { fontSize: 12, marginBottom: 16, color: "#666" },
  table: {
    display: "table",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  row: { flexDirection: "row" },
  cell: {
    width: "33.33%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 6,
  },
  th: { backgroundColor: "#f5f5f5", fontWeight: 700 },
  footer: { marginTop: 16, color: "#888", fontSize: 10 },
});

export default function PdfLayout({ title = "Backfill Report", generatedAt, rows = [] }) {
  const dateLabel = generatedAt || new Date().toLocaleString();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>{title}</Text>
        <Text style={styles.subheader}>Generated at: {dateLabel}</Text>

        <View style={styles.table}>
          <View style={[styles.row, styles.th]}>
            <Text style={styles.cell}>User</Text>
            <Text style={styles.cell}>Designation</Text>
            <Text style={styles.cell}>Contact Number</Text>
          </View>

          {rows.map((r, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={styles.cell}>{r.name || r.email || r._id}</Text>
              <Text style={styles.cell}>
                {r.designation === null || typeof r.designation === "undefined" ? "—" : String(r.designation)}
              </Text>
              <Text style={styles.cell}>
                {r.contactNumber === null || typeof r.contactNumber === "undefined" ? "—" : String(r.contactNumber)}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Note: “—” means the field is undefined/null at generation time.</Text>
      </Page>
    </Document>
  );
}
