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

// Debug
if (!API_KEY) {
    console.error("❌ ERRO: SERPAPI_KEY não definida");
} else {
    console.log("✅ SerpAPI KEY carregada com sucesso");
}

// Static
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

/* =========================
   FUNÇÕES OEM
========================= */

// Remove tudo que não for número
function normalizeRef(ref = "") {
    return ref.replace(/\D/g, "");
}

// Cria regex tolerante
function buildRefRegex(ref) {
    const clean = normalizeRef(ref);
    if (!clean) return null;

    // aceita ponto, hífen ou nada
    const pattern = clean.split("").join("[\\.\\-\\s]*");
    return new RegExp(pattern, "i");
}

// Detecta PDF
function isPDF(result) {
    return (
        result.link?.toLowerCase().endsWith(".pdf") ||
        result.snippet?.toLowerCase().includes("pdf")
    );
}

// Score OEM
function scoreResult(result, refRegex, normalizedRef) {
    const text = `${result.title} ${result.snippet}`.toLowerCase();

    let score = 0;

    if (refRegex && refRegex.test(text)) score += 50;
    if (text.includes(normalizedRef)) score += 30;
    if (isPDF(result)) score += 20;

    return score;
}

/* =========================
   ROTA DE BUSCA
========================= */

app.get("/api/buscar", async (req, res) => {
    try {
        const referencia = req.query.referencia;
        const marca = req.query.marca || "";

        console.log("📥 Query recebida:", req.query);

        if (!referencia) {
            return res.json({ resultados: [], mensagem: "Referência não informada" });
        }

        const normalizedRef = normalizeRef(referencia);
        const refRegex = buildRefRegex(referencia);

        const query = `${referencia} ${marca}`.trim();
        const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${API_KEY}`;

        console.log("🔎 Buscando:", query);

        const response = await fetch(url);
        const data = await response.json();

        if (!data.organic_results || data.organic_results.length === 0) {
            return res.json({ resultados: [], mensagem: "Nada encontrado" });
        }

        const originals = [];
        const equivalents = [];
        const pdfs = [];

        data.organic_results.forEach(r => {
            const score = scoreResult(r, refRegex, normalizedRef);
            if (score === 0) return;

            const item = {
                codigo: referencia,
                titulo: r.title || "",
                descricao: r.snippet || "",
                link: r.link || "",
                site: r.source || "",
                pdf: isPDF(r),
                score
            };

            if (item.pdf) pdfs.push(item);
            else if (score >= 50) originals.push(item);
            else equivalents.push(item);
        });

        if (
            originals.length === 0 &&
            equivalents.length === 0 &&
            pdfs.length === 0
        ) {
            return res.json({ resultados: [], mensagem: "Nada encontrado" });
        }

        originals.sort((a, b) => b.score - a.score);
        equivalents.sort((a, b) => b.score - a.score);
        pdfs.sort((a, b) => b.score - a.score);

        res.json({
            original: originals,
            equivalentes: equivalents,
            pdfs
        });

    } catch (error) {
        console.error("❌ Erro interno:", error);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

// Start
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
