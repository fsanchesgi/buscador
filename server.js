// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.SERPAPI_KEY;

if (!API_KEY) {
  console.error("❌ ERRO: SerpAPI KEY não definida");
} else {
  console.log("✅ SerpAPI KEY carregada");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Função para normalizar referência (remover espaços, pontos e hífens)
const normalizeRef = (ref) => ref.replace(/[\s.-]/g, "").toUpperCase();

// Função para identificar PDF
const isPDF = (url) => url.toLowerCase().endsWith(".pdf");

// Rota de busca
app.get("/api/buscar", async (req, res) => {
  try {
    const referenciaRaw = req.query.referencia;
    const marca = req.query.marca || "";

    if (!referenciaRaw) {
      return res.json({ resultados: [], mensagem: "Referência não informada" });
    }

    const referencia = normalizeRef(referenciaRaw);
    const query = `${referenciaRaw} ${marca}`.trim();
    const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${API_KEY}`;

    console.log("📥 Query recebida:", { referenciaRaw, marca });
    console.log(`🔎 Buscando: ${query}`);

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ resultados: [], erro: data.error });
    }

    let resultados = [];

    // Extrair resultados orgânicos
    if (data.organic_results && data.organic_results.length > 0) {
      data.organic_results.forEach((r) => {
        const title = r.title || "";
        const snippet = r.snippet || "";
        const link = r.link || "";
        const codigoMatch = title || snippet;

        const tipo = isPDF(link)
          ? "pdf"
          : normalizeRef(codigoMatch).includes(referencia)
          ? "original"
          : "equivalente";

        // Apenas incluir se referência estiver presente ou for PDF
        if (tipo === "pdf" || normalizeRef(codigoMatch).includes(referencia)) {
          resultados.push({
            codigo: codigoMatch,
            titulo: snippet || title,
            link,
            tipo,
          });
        }
      });
    }

    // Priorizar original, depois equivalentes, depois PDFs
    resultados.sort((a, b) => {
      const order = { original: 0, equivalente: 1, pdf: 2 };
      return order[a.tipo] - order[b.tipo];
    });

    // Remover duplicados (mesmo link e tipo)
    const seen = new Set();
    resultados = resultados.filter((r) => {
      const key = `${r.link}-${r.tipo}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (resultados.length === 0) {
      return res.json({ resultados: [], mensagem: "Nada encontrado" });
    }

    res.json({ resultados });
  } catch (error) {
    console.error("❌ Erro interno:", error);
    res.status(500).json({ resultados: [], erro: "Erro interno no servidor" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
