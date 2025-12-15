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

// Debug da chave
if (!API_KEY) {
  console.error("❌ ERRO: A chave da SerpAPI não está definida");
} else {
  console.log("✅ SerpAPI KEY carregada com sucesso");
}

// Caminho para arquivos estáticos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Função para normalizar referência (remover espaços, pontos, hífens)
function normalizeRef(ref) {
  return ref.replace(/[\s.-]/g, "").toUpperCase();
}

// Função para detectar PDF no link
function isPDF(link) {
  return link.toLowerCase().endsWith(".pdf");
}

// Rota de busca
app.get("/api/buscar", async (req, res) => {
  try {
    const referenciaOriginal = req.query.referencia;
    const marca = req.query.marca || "";

    console.log("📥 Query recebida:", req.query);

    if (!referenciaOriginal) {
      return res.json({ resultados: [], mensagem: "Referência não informada" });
    }

    const referencia = normalizeRef(referenciaOriginal);
    const query = `${referenciaOriginal} ${marca}`.trim();
    const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${API_KEY}`;

    console.log(`🔎 Buscando: ${query}`);
    console.log(`🌐 URL SerpAPI: ${url}`);

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error("❌ Erro da SerpAPI:", data.error);
      return res.status(400).json({ resultados: [], erro: data.error });
    }

    const resultadosOriginais = [];
    const resultadosEquivalentes = [];
    const resultadosPDF = [];

    const results = data.organic_results || [];

    results.forEach(r => {
      const titleSnippet = `${r.title || ""} ${r.snippet || ""}`.toUpperCase();
      const normalizedContent = normalizeRef(titleSnippet);

      const link = r.link || "";

      // Detectar PDF
      if (isPDF(link)) {
        resultadosPDF.push({
          codigo: r.title || "PDF",
          titulo: r.snippet || "",
          link,
          site: r.source || "",
        });
        return; // PDF tratado separadamente
      }

      // Verificar se contém a referência exata
      if (normalizedContent.includes(referencia)) {
        // Pode ser Original ou Equivalente
        if (titleSnippet.toUpperCase().includes(referenciaOriginal.toUpperCase())) {
          resultadosOriginais.push({
            codigo: r.title || "",
            titulo: r.snippet || "",
            link,
            site: r.source || "",
          });
        } else {
          resultadosEquivalentes.push({
            codigo: r.title || "",
            titulo: r.snippet || "",
            link,
            site: r.source || "",
          });
        }
      }
    });

    // Combinar resultados: Original > Equivalente > PDF
    const retorno = [...resultadosOriginais, ...resultadosEquivalentes, ...resultadosPDF];

    if (retorno.length === 0) {
      return res.json({ resultados: [], mensagem: "Nada encontrado" });
    }

    res.json({ resultados: retorno });

  } catch (error) {
    console.error("❌ Erro interno no servidor:", error);
    res.status(500).json({ resultados: [], erro: "Erro interno no servidor" });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
