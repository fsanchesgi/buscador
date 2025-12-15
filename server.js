import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.SERPAPI_KEY;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// ===============================
// Utils OEM
// ===============================
const normalizeRef = (ref = "") =>
  ref
    .toUpperCase()
    .replace(/[\s\-\.\/]/g, "")
    .trim();

const isPDF = (link = "") =>
  link.toLowerCase().endsWith(".pdf") ||
  link.toLowerCase().includes("scribd") ||
  link.toLowerCase().includes("catalog");

// Extrai possível código do texto
const extractCode = (text, refNorm) => {
  if (!text) return "";
  const clean = text.toUpperCase();
  if (clean.includes(refNorm)) return refNorm;
  return "";
};

// ===============================
// API BUSCA
// ===============================
app.get("/api/buscar", async (req, res) => {
  try {
    const marca = (req.query.marca || "").trim();
    const referencia = (req.query.referencia || "").trim();

    if (!referencia) {
      return res.json({
        original: [],
        equivalentes: [],
        pdfs: [],
        mensagem: "Referência não informada"
      });
    }

    const refNorm = normalizeRef(referencia);
    const query = `${referencia} ${marca}`.trim();

    const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(
      query
    )}&api_key=${API_KEY}`;

    console.log("🔎 Busca:", query);

    const response = await fetch(url);
    const data = await response.json();

    if (!data.organic_results) {
      return res.json({
        original: [],
        equivalentes: [],
        pdfs: [],
        mensagem: "Nada encontrado"
      });
    }

    const original = [];
    const equivalentes = [];
    const pdfs = [];

    data.organic_results.forEach((r) => {
      const title = r.title || "";
      const snippet = r.snippet || "";
      const link = r.link || "";

      const combined = `${title} ${snippet}`.toUpperCase();
      const foundNorm = normalizeRef(combined);

      const matchExact =
        foundNorm.includes(refNorm) &&
        marca &&
        combined.includes(marca.toUpperCase());

      const matchEquivalent = foundNorm.includes(refNorm);

      const item = {
        titulo: title,
        descricao: snippet,
        link,
        site: r.source || "",
        marca_detectada: marca || "Não informada",
        codigo: refNorm
      };

      if (isPDF(link)) {
        pdfs.push(item);
      } else if (matchExact) {
        original.push(item);
      } else if (matchEquivalent) {
        equivalentes.push(item);
      }
    });

    // Remove duplicados
    const unique = (arr) =>
      Array.from(new Map(arr.map(i => [i.link, i])).values());

    res.json({
      original: unique(original),
      equivalentes: unique(equivalentes),
      pdfs: unique(pdfs)
    });

  } catch (error) {
    console.error("❌ Erro:", error);
    res.status(500).json({
      original: [],
      equivalentes: [],
      pdfs: [],
      erro: "Erro interno no servidor"
    });
  }
});

// ===============================
// Rota raiz (FIX Cannot GET /)
// ===============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===============================
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
