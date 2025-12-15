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

// =====================
// Cache em memória
// =====================
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutos

// =====================
// Funções utilitárias
// =====================
function normalizar(texto = "") {
    return texto.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isPDF(url = "") {
    return url.toLowerCase().endsWith(".pdf");
}

function agora() {
    return Date.now();
}

// =====================
// Debug da chave
// =====================
if (!API_KEY) {
    console.error("❌ ERRO: A chave da SerpAPI não está definida");
} else {
    console.log("✅ SerpAPI KEY carregada com sucesso");
}

// =====================
// Arquivos estáticos
// =====================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// =====================
// Rota de busca (modo híbrido)
// =====================
app.get("/api/buscar", async (req, res) => {
    try {
        const referencia = req.query.referencia;
        const marca = req.query.marca || "";
        const somentePdf = req.query.somentePdf === "true";

        console.log("📥 Query recebida:", req.query);

        if (!referencia) {
            return res.json({ resultados: [], mensagem: "Referência não informada" });
        }

        // =====================
        // Cache
        // =====================
        const cacheKey = `${referencia}_${marca}_${somentePdf}`;
        const cached = cache.get(cacheKey);

        if (cached && agora() - cached.time < CACHE_TTL) {
            console.log("📦 Retornando resultado do cache");
            return res.json(cached.data);
        }

        // =====================
        // Chamada SerpAPI
        // =====================
        const query = `${marca} ${referencia}`.trim();
        const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${API_KEY}`;

        console.log(`🔎 Buscando na SerpAPI: ${query}`);

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ Erro SerpAPI:", data.error);
            return res.status(400).json({ resultados: [], erro: data.error });
        }

        if (!data.organic_results || data.organic_results.length === 0) {
            return res.json({ resultados: [], mensagem: "Nada encontrado" });
        }

        const refNorm = normalizar(referencia);

        // =====================
        // Mapeamento + enriquecimento
        // =====================
        let resultados = data.organic_results.map(r => {
            const codigo = r.title || "";
            const descricao = r.snippet || "";
            const link = r.link || "";

            const textoCompletoNorm = normalizar(codigo + " " + descricao);
            const equivalenciaExata = textoCompletoNorm.includes(refNorm);

            return {
                codigo,
                descricao,
                link,
                site: r.source || "",
                tipo: isPDF(link) ? "PDF" : "HTML",
                equivalenciaExata
            };
        });

        // =====================
        // Filtro: somente PDFs
        // =====================
        if (somentePdf) {
            resultados = resultados.filter(r => r.tipo === "PDF");
        }

        // =====================
        // Ordenação profissional
        // 1️⃣ PDF primeiro
        // 2️⃣ Equivalência exata primeiro
        // =====================
        resultados.sort((a, b) => {
            if (a.tipo !== b.tipo) return a.tipo === "PDF" ? -1 : 1;
            if (a.equivalenciaExata !== b.equivalenciaExata)
                return a.equivalenciaExata ? -1 : 1;
            return 0;
        });

        const retornoFinal = { resultados };

        // =====================
        // Salva no cache
        // =====================
        cache.set(cacheKey, {
            time: agora(),
            data: retornoFinal
        });

        console.log(`✅ ${resultados.length} resultados retornados`);

        res.json(retornoFinal);

    } catch (error) {
        console.error("❌ Erro interno no servidor:", error);
        res.status(500).json({ resultados: [], erro: "Erro interno no servidor" });
    }
});

// =====================
// Inicialização
// =====================
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
