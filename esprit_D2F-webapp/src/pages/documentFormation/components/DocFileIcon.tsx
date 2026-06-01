import {
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileImageOutlined,
  FileZipOutlined,
  FileTextOutlined,
} from "@ant-design/icons";

export function DocFileIcon({ name }: Readonly<{ name: string }>) {
  const ext = String(name || "").split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FilePdfOutlined style={{ color: "#dc2626" }} />;
  if (ext === "doc" || ext === "docx") return <FileWordOutlined style={{ color: "#1d4ed8" }} />;
  if (ext === "xls" || ext === "xlsx" || ext === "csv")
    return <FileExcelOutlined style={{ color: "#047857" }} />;
  if (ext === "ppt" || ext === "pptx") return <FilePptOutlined style={{ color: "#c2410c" }} />;
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext ?? ""))
    return <FileImageOutlined style={{ color: "#7c3aed" }} />;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext ?? ""))
    return <FileZipOutlined style={{ color: "#b45309" }} />;
  return <FileTextOutlined style={{ color: "#475569" }} />;
}
