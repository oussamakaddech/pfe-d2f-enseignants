import { Card, Button, Image, Typography } from "antd";
import type { CSSProperties } from "react";
import 'antd/dist/reset.css';
const { Paragraph, Text } = Typography;

const baseStyle: CSSProperties = {
  width: "100%",
  height: 430,
  border: "none",
  borderRadius: 4,
};

interface DocumentViewerProps {
  url: string;
  ext?: string;
}

export default function DocumentViewer({ url, ext }: DocumentViewerProps) {
  const e = (ext ?? "").toLowerCase();

  // Docs / PPT / XLS / PDF
  if (["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(e)) {
    return (
      <Card variant="outlined" styles={{ body: { padding: 0 } }} style={{ borderRadius: 4 }}>
        <iframe title="document" src={url} style={baseStyle} />
      </Card>
    );
  }

  // Images
  if (["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"].includes(e)) {
    return (
      <Card variant="outlined" styles={{ body: { padding: 0, textAlign: "center" } }} style={{ borderRadius: 4 }}>
        <Image
          src={url}
          alt="preview"
          style={{ maxWidth: "100%", maxHeight: 430, margin: "0 auto" }}
        />
      </Card>
    );
  }

  // Vidéo
  if (["mp4", "webm", "ogg"].includes(e)) {
    return (
      <Card variant="outlined" styles={{ body: { padding: 0 } }} style={{ borderRadius: 4 }}>
        <video controls style={baseStyle}>
          <source src={url} type={`video/${e}`} />
          <track kind="captions" />
          <Text>Votre navigateur ne supporte pas la lecture vidéo.</Text>
        </video>
      </Card>
    );
  }

  // Audio
  if (["mp3", "wav", "oga"].includes(e)) {
    return (
      <Card variant="outlined" styles={{ body: { padding: 16, textAlign: "center" } }} style={{ borderRadius: 4 }}>
        <audio controls style={{ width: "100%" }}>
          <source src={url} type={`audio/${e}`} />
          <track kind="captions" />
          <Text>Votre navigateur ne supporte pas la lecture audio.</Text>
        </audio>
      </Card>
    );
  }

  // Fallback
  return (
    <Card variant="outlined" style={{ borderRadius: 4 }}>
      <Paragraph>
        🔍 Aperçu non disponible.{" "}
        <Button type="link" href={url} target="_blank" rel="noopener noreferrer">
          Télécharger
        </Button>
      </Paragraph>
    </Card>
  );
}




