// server.js

require("dotenv").config(); // Carregar SERPAPI_KEY
const express = require("express");
const path = require("path");
const cors = require("cors");
const SerpApi = require("google-search-results-nodejs"); 
const app = express();
const api = new SerpApi.GoogleSearch(process.env.SERPAPI_KEY);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // pasta do site

// ---------------------------
// ROTA PRINCIPAL DE BUSCA OEM
// ---------------------------
app.get("/buscar", async (req, res) => {
  try {
    const ref = req.query.ref;
    const marca = req.query.marca || "";

    if (!ref) {
      return res.json({ resultados: [] });
    }

    const query = `${ref} ${marca} OEM equivalentes Mercedes EPC Autodoc Yoyoparts Sampa`;

    console.log("🟦 Buscando por:", query);

    const params = {
      engine: "google",
      q: query,
      api_key: process.env.SERPAPI_KEY,
      google_domain: "google.com",
      num: 20
    };

    api.json(params, (data) => {
      if (!data || !data.organic_results) {
        console.log("⚠️ Nenhum dado recebido da SerpAPI");
        return res.json({ resultados: [] });
      }

      console.log("🟩 Resultados encontrados:", data.organic_results.length);

      const resultados = data.organic_results.map(r => ({
        titulo: r.title || "",
        descricao: r.snippet || "",
        link: r.link || "",
        fonte: r.source || "",
      }));

      // Ordenação opcional por relevância da fonte
      const fontesPrioritarias = [
        "autodoc", "autodoc.co", "autodoc.de",
        "partslink24", "mercedes", "epc",
        "yoyoparts", "spareka", "autohansa",
        "sampa", "ak24", "spareto"
      ];

      resultados.sort((a, b) => {
        const aPri = fontesPrioritarias.some(f => a.link.toLowerCase().includes(f)) ? 0 : 1;
        const bPri = fontesPrioritarias.some(f => b.link.toLowerCase().includes(f)) ? 0 : 1;
        return aPri - bPri;
      });

      res.json({ resultados });
    });

  } catch (e) {
    console.error("🔥 ERRO NO /buscar:", e);
    res.json({ resultados: [] });
  }
});

// --------------------
// SUBIR SERVIDOR RENDER
// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
