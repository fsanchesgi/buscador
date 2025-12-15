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

// ===============================
// CACHE EM MEMÓRIA (5 MINUTOS)
// ===============================
const cache = new Map(); // chave: referencia+marca, valor: { data, timestamp }
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

function normalizeRef(ref) {
    return ref.toUpperCase().replace(/[\s.\-"]/g, "");
}

// ===============================
// ROTA DE BUSCA
// ===============================
app.get("/api/buscar", async (req, res) => {
    try {
        const referencia = req.query.referencia;
        const marca = req.query.marca || "";

        if (!referencia) {
            return res.json({ resultados: [], mensagem: "Referência não informada" });
        }

        const queryKey = `${normalizeRef(referencia)}|${marca.toUpperCase()}`;

        // Verificar cache
        if (cache.has(queryKey)) {
            const cached = cache.get(queryKey);
            if (Date.now() - cached.timestamp < CACHE_DURATION) {
                console.log("♻️ Retornando do cache:", queryKey);
                return res.json(cached.data);
            }
        }

        // Consulta SerpAPI
        const query = `${referencia} ${marca}`.trim();
        const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${API_KEY}`;

        console.log(`🔎 Buscando: ${query}`);
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ resultados: [], erro: data.error });
        }

        // ===============================
        // EXTRAI RESULTADOS ORIGINAIS, EQUIVALENTES E PDFS
        // ===============================
        let originais = [];
        let equivalentes = [];
        let pdfs = [];

        const refNorm = normalizeRef(referencia);

        if (data.organic_results && data.organic_results.length > 0) {
            data.organic_results.forEach(r => {
                const titleNorm = normalizeRef(r.title || "");
                const snippetNorm = normalizeRef(r.snippet || "");

                const isPDF = r.link && r.link.toLowerCase().endsWith(".pdf");

                const resultObj = {
                    codigo: r.title || r.snippet || "",
                    titulo: r.snippet || "",
                    link: r.link || "",
                    marca: marca,
                    site: r.source || ""
                };

                if (isPDF) {
                    pdfs.push(resultObj);
                } else if (titleNorm.includes(refNorm) || snippetNorm.includes(refNorm)) {
                    if (titleNorm === refNorm || snippetNorm === refNorm) {
                        originais.push(resultObj); // exato
                    } else {
                        equivalentes.push(resultObj); // contém a referência
                    }
                }
            });
        }

        // Ordenar: originais > equivalentes > PDFs
        const resultados = [...originais, ...equivalentes, ...pdfs];

        const retorno = { resultados };

        // Salvar no cache
        cache.set(queryKey, { data: retorno, timestamp: Date.now() });

        res.json(retorno);

    } catch (error) {
        console.error("❌ Erro interno no servidor:", error);
        res.status(500).json({ resultados: [], erro: "Erro interno no servidor" });
    }
});

// ===============================
// INICIAR SERVIDOR
// ===============================
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
