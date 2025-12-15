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

// Rota principal (evita Cannot GET /)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Rota de busca
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

        console.log("📄 Resposta SerpAPI recebida");

        if (data.error) {
            console.error("❌ Erro da SerpAPI:", data.error);
            return res.status(400).json({ resultados: [], erro: data.error });
        }

        let resultados = [];

        if (data.organic_results && data.organic_results.length > 0) {
            resultados = data.organic_results;
        }

        if (resultados.length === 0) {
            return res.json({ resultados: [], mensagem: "Nada encontrado" });
        }

        // Normalização leve (SEGURA)
        const refLimpa = referencia.replace(/\D/g, "");

        const retorno = resultados.map(r => {
            const texto = `${r.title || ""} ${r.snippet || ""}`.toLowerCase();
            const textoLimpo = texto.replace(/\D/g, "");

            const matchExato = refLimpa && textoLimpo.includes(refLimpa);

            const isPdf =
                r.link?.toLowerCase().endsWith(".pdf") ||
                r.snippet?.toLowerCase().includes("pdf");

            let tipo = "equivalente";
            if (matchExato) tipo = "original";
            if (isPdf) tipo = "pdf";

            return {
                codigo: referencia,
                titulo: r.title || "",
                descricao: r.snippet || "",
                link: r.link || "",
                site: r.source || "",
                tipo
            };
        });

        res.json({ resultados: retorno });

    } catch (error) {
        console.error("❌ Erro interno no servidor:", error);
        res.status(500).json({ resultados: [], erro: "Erro interno no servidor" });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
