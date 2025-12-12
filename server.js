const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());

// Servir o index.html
app.use(express.static(path.join(__dirname)));

app.get("/buscar", async (req, res) => {
  try {
    const ref = req.query.ref;
    const marca = req.query.marca || "";

    if (!ref) {
      return res.json({ resultados: [] });
    }

    const query = `${ref} ${marca} equivalente`;

    const serpapiUrl =
      `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_KEY}`;

    const response = await axios.get(serpapiUrl);

    return res.json({
      resultados: response.data.organic_results || []
    });

  } catch (err) {
    console.error("Erro na busca:", err);
    return res.json({ resultados: [] });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor rodando na porta " + PORT));
