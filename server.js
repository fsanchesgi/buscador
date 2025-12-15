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

// Rota de busca (VERSÃO ESTÁVEL)
app.get("/api/buscar", async (req, res) => {
    try {
        const referencia = req.query.referencia;
        const marca = req.query.marca || "";

        console.log("📥 Query recebida:", req.query);

        if (!referencia) {
            return res.json({ resultados: [], mensagem: "Referência não informada" });
        }

        const query = `${referencia} ${marca}`.trim();
        const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${API_KEY}`;

        console.log(`🔎 Buscando: ${query}`);
        console.log(`🌐 URL SerpAPI: ${url}`);

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ Erro da SerpAPI:", data.error);
            return res.status(400).json({ resultados: [], erro: data.error });
        }

        const resultados = data.organic_results || [];

        if (resultados.length === 0) {
            return res.json({ resultados: [], mensagem: "Nada encontrado" });
        }

        // Mapeamento simples (SEM FILTRO)
        const retorno = resultados.map(r => ({
            codigo: referencia,
            titulo: r.title || "",
            descricao: r.snippet || "",
            link: r.link || "",
            site: r.source || ""
        }));

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
