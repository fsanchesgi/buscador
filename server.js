import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.SERPAPI_KEY;

app.use(express.json());

// Permitir frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));


// ROTA DE BUSCA
app.get("/api/buscar", async (req, res) => {
    try {
        const referencia = req.query.referencia;
        const marca = req.query.marca || "";

        if (!referencia) {
            return res.json({ erro: "Referência não informada" });
        }

        const query = `${referencia} ${marca}`.trim();

        const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        console.log("🔎 SERPAPI RESPONSE RECEIVED");
        console.log(JSON.stringify(data, null, 2)); // DEBUG

        // Aqui corrigimos: organic_results é onde a SerpAPI devolve resultados reais
        const resultados = data.organic_results || [];

        if (resultados.length === 0) {
            return res.json({ resultados: [], mensagem: "Nada encontrado" });
        }

        // Filtrar apenas os essenciais
        const retorno = resultados.map(r => ({
            titulo: r.title || "",
            link: r.link || "",
            snippet: r.snippet || "",
            fonte: r.source || ""
        }));

        res.json({ resultados: retorno });

    } catch (error) {
        console.error("Erro na API:", error);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

// INICIAR SERVIDOR
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
