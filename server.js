const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());

// Servir o index.html automaticamente
app.use(express.static(path.join(__dirname)));

app.get("/buscar", async (req, res) => {
  try {
    const ref = req.query.ref;
    const marca = req.query.marca || "";
    const query = `${ref} ${marca} equivalente`;

    const serpapiUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_KEY}`;

    const response = await axios.get(serpapiUrl);
    res.json({ resultados: response.data.organic_results || [] });

  } catch (err) {
    res.json({ resultados: [] });
  }
});


    const $ = cheerio.load(googleHtml.data);
    const resultados = [];

    $("div.g").each((i, el) => {
      const titulo = $(el).find("h3").text();
      const link = $(el).find("a").attr("href");

      if (!titulo || !link) return;

      const regex = /[A-Za-z0-9\-]{3,25}/g;
      const codigos = titulo.match(regex) || [];

      codigos.forEach(c => {
        resultados.push({
          codigo: c,
          titulo: titulo,
          site: link
        });
      });
    });

    res.json({ resultados });

  } catch (error) {
    console.error("Erro:", error);
    res.json({ resultados: [] });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));
