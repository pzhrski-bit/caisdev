import { Router } from "express";
import multer from "multer";
import path from "path";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const ext = path.extname(req.file.originalname).toLowerCase();

  try {
    let text = "";

    if (ext === ".pdf") {
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const parsed = await pdfParse(req.file.buffer);
      text = parsed.text;
    } else if (ext === ".docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = result.value;
    } else if (ext === ".xlsx" || ext === ".xls") {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(req.file.buffer, { type: "buffer" });
      text = wb.SheetNames.map(name => {
        const ws = wb.Sheets[name];
        return `[${name}]\n` + XLSX.utils.sheet_to_csv(ws);
      }).join("\n\n");
    } else if (ext === ".pptx") {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(req.file.buffer, { type: "buffer" });
      text = wb.SheetNames.map(name => XLSX.utils.sheet_to_csv(wb.Sheets[name])).join("\n");
    } else if (ext === ".md" || ext === ".txt") {
      text = req.file.buffer.toString("utf-8");
    } else {
      return res.status(400).json({ error: "Unsupported file type. Supported: PDF, DOCX, XLSX, PPTX, MD, TXT" });
    }

    text = text.trim();
    if (!text) return res.status(400).json({ error: "Could not extract text from file" });

    res.json({ text, filename: req.file.originalname });
  } catch (e) {
    console.error("[upload] error:", e.message);
    res.status(500).json({ error: "Failed to parse file: " + e.message });
  }
});

export default router;
