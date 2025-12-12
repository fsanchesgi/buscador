require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

const SERPAPI_KEY = process.env.SERPAPI_KEY;

// Função para extrair equivalências usando regex
function extrairCodigos(texto) {
  if (!texto) return [];

  // Padrão OEM comum: números, letras, hífen
  const regex = /[A-Z0-9\-]{5,20}/gi;
  return texto.match(regex) || [];
}

app.get("/buscar", async (req, res) => {
  try {
    const ref = req.query.ref;
    const marca = req.query.marca || "";

    if (!ref) return res.json({ resultados: [] });

    const query = `${ref} ${marca} equivalente OEM Mercedes peça comparação`;

    const serpUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${SERPAPI_KEY}`;

    const serp = await axios.get(serpUrl);

    const organic = serp.data.organic_results || [];
    const resultados = [];

    // Extrair títulos + links
    for (const item of organic) {
      const titulo = item.title || "";
      const link = item.link || "";

      const codigos = extrairCodigos(titulo);
      codigos.forEach(c => {
        resultados.push({
          codigo: c,
          titulo,
          link
        });
      });
    }

    // Se não achou nada → Tenta scrapear páginas do Resultado
    for (const item of organic.slice(0, 5)) {
      try {
        const pagina = await axios.get(item.link, {
          headers: { "User-Agent": "Mozilla/5.0" }
        });

        const $ = cheerio.load(pagina.data);

        $("body *").each((i, el) => {
          const texto = $(el).text();
          const cods = extrairCodigos(texto);
          cods.forEach(c => {
            resultados.push({
              codigo: c,
              titulo: item.title,
              link: item.link
            });
          });
        });
      } catch (err) {
        continue;
      }
    }

    // Remover duplicados
    const unicos = resultados.filter(
      (v, i, a) => a.findIndex(t => t.codigo === v.codigo) === i
    );

    res.json({ resultados: unicos });

  } catch (err) {
    console.error("ERRO NA BUSCA:", err);
    res.json({ resultados: [] });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor ativo na porta " + PORT));
