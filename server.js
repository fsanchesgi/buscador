import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const SERPAPI_KEY = process.env.SERPAPI_KEY;

// ===============================
// Utils
// ===============================
function normalizarReferencia(ref) {
  return ref.replace(/[^\w]/g, "").toLowerCase();
}

function contemReferencia(texto, refNorm) {
  if (!texto) return false;
  return normalizarReferencia(texto).includes(refNorm);
}

// ===============================
// Rota de busca (MODO B)
// ===============================
app.get("/buscar", async (req, res) => {
  try {
    const { marca = "", referencia } = req.query;

    if (!referencia) {
      return res.status(400).json({ ok: false, error: "Referência é obrigatória" });
    }

    const refNormalizada = normalizarReferencia(referencia);

    // 🔹 FORÇAR BUSCA APENAS PELA REFERÊNCIA
    const query = `"${referencia}"`;

    const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(
      query
    )}&api_key=${SERPAPI_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.organic_results || data.organic_results.length === 0) {
      return res.json({
        ok: true,
        original: [],
        equivalentes: [],
        message: "Nada encontrado",
      });
    }

    const original = [];
    const equivalentes = [];

    data.organic_results.forEach((item) => {
      const textoCompleto = `
        ${item.title || ""}
        ${item.snippet || ""}
        ${item.link || ""}
      `;

      // ✔ Match EXATO da referência
      if (contemReferencia(textoCompleto, refNormalizada)) {
        const registro = {
          titulo: item.title,
          link: item.link,
          descricao: item.snippet,
          origem: item.source || "Web",
        };

        // 🔥 Se também contém a marca → ORIGINAL
        if (marca && textoCompleto.toLowerCase().includes(marca.toLowerCase())) {
          original.push(registro);
        } else {
          equivalentes.push(registro);
        }
      }
    });

    return res.json({
      ok: true,
      query: referencia,
      marca,
      original,
      equivalentes,
    });
  } catch (error) {
    console.error("Erro na busca:", error);
    res.status(500).json({ ok: false, error: "Erro interno no servidor" });
  }
});

// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
