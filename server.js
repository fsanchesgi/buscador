import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// ================================
// CACHE EM MEMÓRIA
// ================================
const cache = {};
const CACHE_TTL = 1000 * 60 * 5; // 5 minutos

function setCache(key, data) {
  cache[key] = {
    timestamp: Date.now(),
    data,
  };
}

function getCache(key) {
  const cached = cache[key];
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    delete cache[key];
    return null;
  }
  return cached.data;
}

// ================================
// FUNÇÃO DE BUSCA HÍBRIDA
// ================================
async function buscarReferencia(ref, marca) {
  const refClean = ref.replace(/[\s.-]/g, ""); // remove espaços, pontos, hífen
  const cacheKey = `${marca}:${refClean}`;
  const cachedData = getCache(cacheKey);
  if (cachedData) return cachedData;

  const resultados = {
    originais: [],
    equivalentes: [],
    pdfs: [],
  };

  // Pesquisa exata usando SerpAPI (ou Google Search)
  const serpapiKey = process.env.SERPAPI_KEY;
  const query = `${marca} "${ref}"`;
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${serpapiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.organic_results) {
    data.organic_results.forEach((item) => {
      const codigo = item.title.match(/\d[\d.-]*/g)?.join("") || ref;
      const titulo = item.title;
      const link = item.link;

      const itemObj = { codigo, titulo, link };

      if (link.endsWith(".pdf")) {
        resultados.pdfs.push(itemObj);
      } else if (codigo.replace(/[\s.-]/g, "") === refClean) {
        resultados.originais.push(itemObj);
      } else if (codigo.replace(/[\s.-]/g, "").includes(refClean)) {
        resultados.equivalentes.push(itemObj);
      }
    });
  }

  setCache(cacheKey, resultados);
  return resultados;
}

// ================================
// ROTA DE BUSCA
// ================================
app.get("/api/buscar", async (req, res) => {
  const ref = req.query.referencia;
  const marca = req.query.marca || "";

  if (!ref) return res.json({ resultados: null, mensagem: "Informe a referência." });

  try {
    const resultados = await buscarReferencia(ref, marca);
    res.json({ resultados });
  } catch (err) {
    console.error(err);
    res.status(500).json({ resultados: null, mensagem: "Erro ao realizar a busca." });
  }
});

// ================================
// SERVIR FRONT-END
// ================================
app.use(express.static("public"));

// ================================
app.listen(PORT, () => console.log(`Server rodando na porta ${PORT}`));
