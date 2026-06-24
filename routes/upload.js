import { Router } from "express";
import multer from "multer";
import path from "path";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
const IMAGE_MIMES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const ext = path.extname(req.file.originalname).toLowerCase();

  try {
    if (IMAGE_EXTS.includes(ext)) {
      const base64 = req.file.buffer.toString("base64");
      return res.json({ base64, mimeType: IMAGE_MIMES[ext], filename: req.file.originalname });
    }

    let text = "";

    if (ext === ".pdf") {
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const parsed = await pdfParse(req.file.buffer);
      text = parsed.text;
      text = text
        .split("\n")
        .filter(line => !/^\s*\d+\s*$/.test(line))
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    } else if (ext === ".docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = result.value;
    } else if (ext === ".md" || ext === ".txt") {
      text = req.file.buffer.toString("utf-8");
    } else {
      return res.status(400).json({ error: "Неподдерживаемый тип файла. Поддерживаются: PDF, DOCX, MD, TXT, PNG, JPG, JPEG, WEBP, GIF" });
    }

    text = text.trim();
    if (!text) return res.status(400).json({ error: "Could not extract text from file" });

    if (text.length > 12000) {
      text = text.slice(0, 12000) + "\n\n[Текст обрезан до 12 000 символов]";
    }

    res.json({ text, filename: req.file.originalname });
  } catch (e) {
    console.error("[upload] error:", e.message);
    res.status(500).json({ error: "Failed to parse file: " + e.message });
  }
});

export default router;
