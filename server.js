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

if (!API_KEY) {
    console.error("❌ ERRO: SerpAPI Key não configurada");
} else {
    console.log("✅ SerpAPI Key carregada");
}

// Caminho para arquivos estáticos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Normaliza referências: remove espaços, pontos, hífens e aspas, converte para minúscula
function normalizeRef(ref) {
    return ref.replace(/[\s.-"]/g, "").toLowerCase();
}

// Classifica resultados
function classifyResults(resultados, referencia) {
    const refNorm = normalizeRef(referencia);

    const originais = [];
    const equivalentes = [];
    const pdfs = [];

    resultados.forEach(r => {
        const titleNorm = normalizeRef(r.title || "");
        const snippetNorm = normalizeRef(r.snippet || "");
        const link = r.link || "";

        // Detecta PDF
        if (link.toLowerCase().endsWith(".pdf") || (r.snippet && r.snippet.toLowerCase().includes("pdf"))) {
            if (titleNorm.includes(refNorm) || snippetNorm.includes(refNorm)) {
                pdfs.push({
                    codigo: r.title || "Ficha técnica (PDF)",
                    titulo: r.snippet || "",
                    link,
                    site: r.source || "PDF"
                });
            }
            return;
        }

        // Originais = título e snippet contêm referência exata
        if (titleNorm.includes(refNorm) && snippetNorm.includes(refNorm)) {
            originais.push({
                codigo: r.title,
                titulo: r.snippet,
                link,
                site: r.source || ""
            });
        }
        // Equivalentes = contém referência como substring (relacionada)
        else if (titleNorm.includes(refNorm) || snippetNorm.includes(refNorm)) {
            equivalentes.push({
                codigo: r.title,
                titulo: r.snippet,
                link,
                site: r.source || ""
            });
        }
    });

    return { originais, equivalentes, pdfs };
}

// Rota de busca
app.get("/api/buscar", async (req, res) => {
    try {
        const referencia = req.query.referencia;
        const marca = req.query.marca || "";

        console.log("📥 Query recebida:", { referencia, marca });

        if (!referencia) {
            return res.json({ resultados: [], mensagem: "Referência não informada" });
        }

        const query = `${referencia} ${marca}`.trim();
        const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${API_KEY}`;

        console.log(`🔎 Buscando: ${query}`);
        const response = await fetch(url);
        const data = await response.json();

        if (!data.organic_results || data.organic_results.length === 0) {
            return res.json({ resultados: [], mensagem: "Nada encontrado" });
        }

        // Classifica resultados
        const { originais, equivalentes, pdfs } = classifyResults(data.organic_results, referencia);

        res.json({
            resultados: {
                originais,
                equivalentes,
                pdfs
            }
        });

    } catch (error) {
        console.error("❌ Erro interno no servidor:", error);
        res.status(500).json({ resultados: [], erro: "Erro interno no servidor" });
    }
});

// Inicia servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
