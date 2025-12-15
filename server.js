import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.SERPAPI_KEY;

if (!API_KEY) console.error("❌ ERRO: Chave SerpAPI não definida");

// Configuração de paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Cache simples (5 minutos)
const cache = new Map();

// Função para normalizar referência
const normalize = (str) => str.toLowerCase().replace(/[\s.-]/g, "");

// Função para verificar se um resultado é válido (desprezar spam, anúncios, strings curtas)
const isValidResult = (title, snippet) => {
    if (!title || title.length < 3) return false;
    if (!snippet || snippet.length < 5) return false;
    const forbidden = ["anúncio", "ads", "publicidade", "sponsored"];
    const combined = (title + " " + snippet).toLowerCase();
    return !forbidden.some(f => combined.includes(f));
};

// Rota de busca
app.get("/api/buscar", async (req, res) => {
    try {
        const referencia = req.query.referencia;
        const marca = req.query.marca || "";

        if (!referencia) return res.json({ resultados: [], mensagem: "Referência não informada" });

        const cleanRef = normalize(referencia);
        const query = `${referencia} ${marca}`.trim();
        const cacheKey = query.toLowerCase();

        // Verifica cache
        if (cache.has(cacheKey)) {
            const cached = cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
                return res.json(cached.data);
            }
        }

        // Chamada SerpAPI
        const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) return res.status(400).json({ resultados: [], erro: data.error });

        let originais = [];
        let equivalentes = [];
        let pdfs = [];

        if (data.organic_results && data.organic_results.length > 0) {
            data.organic_results.forEach(r => {
                if (!isValidResult(r.title, r.snippet)) return; // ignora resultados irrelevantes

                const titleNorm = normalize(r.title || "");
                const snippetNorm = normalize(r.snippet || "");

                const hasRef = titleNorm.includes(cleanRef) || snippetNorm.includes(cleanRef);
                const isPDF = r.link && r.link.toLowerCase().endsWith(".pdf");

                const item = {
                    codigo: r.title || "Sem título",
                    titulo: r.snippet || "",
                    link: r.link || "",
                    site: r.source || "",
                    tipo: isPDF ? "pdf" : (hasRef ? "original" : "equivalente")
                };

                if (isPDF) pdfs.push(item);
                else if (hasRef) originais.push(item);
                else equivalentes.push(item);
            });
        }

        const resultados = [...originais, ...pdfs, ...equivalentes];

        const retorno = { resultados };
        cache.set(cacheKey, { data: retorno, timestamp: Date.now() });

        res.json(retorno);

    } catch (error) {
        console.error(error);
        res.status(500).json({ resultados: [], erro: "Erro interno no servidor" });
    }
});

// Inicializa servidor
app.listen(PORT, () => console.log(`🚀 Servidor rodando em http://localhost:${PORT}`));
