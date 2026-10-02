import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, backgroundColor: "#ffffff", fontFamily: "Helvetica" },
  frame: {
    flex: 1,
    borderWidth: 3,
    borderColor: "#4f46e5",
    borderRadius: 12,
    padding: 48,
    justifyContent: "space-between",
  },
  brand: { fontSize: 14, letterSpacing: 3, color: "#4f46e5", fontFamily: "Helvetica-Bold" },
  label: { fontSize: 12, color: "#57534e", letterSpacing: 2, marginTop: 36 },
  title: { fontSize: 34, fontFamily: "Helvetica-Bold", color: "#1c1917", marginTop: 12 },
  text: { fontSize: 14, color: "#44403c", marginTop: 18 },
  name: { fontSize: 30, fontFamily: "Helvetica-Bold", color: "#1c1917", marginTop: 8 },
  course: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#4f46e5", marginTop: 8 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  small: { fontSize: 10, color: "#78716c" },
  strong: { fontSize: 12, color: "#1c1917", fontFamily: "Helvetica-Bold", marginBottom: 4 },
});

export interface CertificateData {
  studentName: string;
  courseTitle: string;
  instructorName: string;
  issuedAt: Date;
  code: string;
  verifyUrl: string;
  durationLabel: string;
}

function CertificateDocument({ data }: { data: CertificateData }) {
  const date = new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(data.issuedAt);
  return (
    <Document title={`Certificado - ${data.courseTitle}`} author="Academia">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.frame}>
          <View>
            <Text style={styles.brand}>ACADEMIA</Text>
            <Text style={styles.label}>CERTIFICADO DE FINALIZACIÓN</Text>
            <Text style={styles.text}>Se otorga a</Text>
            <Text style={styles.name}>{data.studentName}</Text>
            <Text style={styles.text}>por completar el curso</Text>
            <Text style={styles.course}>{data.courseTitle}</Text>
            <Text style={styles.text}>
              Impartido por {data.instructorName} · {data.durationLabel} de contenido
            </Text>
          </View>
          <View style={styles.footer}>
            <View>
              <Text style={styles.strong}>{date}</Text>
              <Text style={styles.small}>Fecha de emisión</Text>
            </View>
            <View>
              <Text style={styles.strong}>Código {data.code}</Text>
              <Text style={styles.small}>Verifica en {data.verifyUrl}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function renderCertificatePdf(data: CertificateData) {
  return renderToBuffer(<CertificateDocument data={data} />);
}
