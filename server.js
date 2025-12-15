// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const API_KEY = process.env.SERPAPI_KEY;

if (!API_KEY) {
    console.error("❌ ERRO: SERPAPI_KEY não definida");
} else {
    console.log("✅ SerpAPI KEY carregada com sucesso");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

/* ==========================
   FUNÇÕES UTILITÁRIAS OEM
========================== */

function normalizeReference(ref) {
    const clean = ref.replace(/[^0-9]/g, "");
    const hyphen = ref.replace(/\./g, "-");
    return {
        original: ref,
        clean,
        hyphen
    };
}

function containsReference(text, refVariants) {
    if (!text) return false;
    const t = text.toLowerCase();

    return (
        t.includes(refVariants.original.toLowerCase()) ||
        t.includes(refVariants.clean) ||
        t.includes(refVariants.hyphen.toLowerCase())
    );
}

function detectPDF(link) {
    if (!link) return false;
    return link.toLowerCase().includes(".pdf");
}

function detectBrand(text, brand) {
    if (!brand) return false;
    return text.toLowerCase().includes(brand.toLowerCase());
}

/* ==========================
   ROTA DE BUSCA
========================== */

app.get("/api/buscar", async (req, res) => {
    try {
        const referencia = req.query.referencia;
        const marca = req.query.marca || "";

        if (!referencia) {
            return res.json({ resultados: [], mensagem: "Referência não informada" });
        }

        const refVariants = normalizeReference(referencia);

        // 🔎 A referência SEMPRE vem primeiro
        const query = `${referencia} ${marca}`.trim();

        console.log("📥 Query recebida:", { referencia, marca });
        console.log("🔎 Query SerpAPI:", query);

        const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(
            query
        )}&api_key=${API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.organic_results) {
            return res.json({ resultados: [], mensagem: "Nada encontrado" });
        }

        const original = [];
        const equivalentes = [];
        const pdfs = [];

        data.organic_results.forEach((r) => {
            const title = r.title || "";
            const snippet = r.snippet || "";
            const link = r.link || "";

            const text = `${title} ${snippet}`;

            // ❌ DESCARTA se NÃO tiver referência
            if (!containsReference(text, refVariants)) return;

            const isPDF = detectPDF(link);
            const hasBrand = detectBrand(text, marca);

            const item = {
                codigo: referencia,
                titulo: title,
                descricao: snippet,
                link,
                site: r.source || "",
            };

            // 🥇 ORIGINAL
            if (hasBrand && !isPDF) {
                original.push({ ...item, tipo: "original", score: 100 });
                return;
            }

            // 📄 PDF (OEM ou catálogo)
            if (isPDF) {
                pdfs.push({
                    ...item,
                    tipo: "pdf",
                    score: 90,
                    label: "📄 Ficha técnica (PDF)",
                });
                return;
            }

            // 🔁 EQUIVALENTE (outra marca citando EXPLICITAMENTE a ref)
            equivalentes.push({
                ...item,
                tipo: "equivalente",
                score: 80,
            });
        });

        // 🔃 Ordenação interna
        original.sort((a, b) => b.score - a.score);
        pdfs.sort((a, b) => b.score - a.score);
        equivalentes.sort((a, b) => b.score - a.score);

        // 🔁 Compatibilidade com front atual
        const resultados = [...original, ...pdfs, ...equivalentes];

        if (resultados.length === 0) {
            return res.json({ resultados: [], mensagem: "Nada encontrado" });
        }

        res.json({
            referencia,
            marca,
            original,
            pdfs,
            equivalentes,
            resultados,
        });

    } catch (error) {
        console.error("❌ Erro interno:", error);
        res.status(500).json({ resultados: [], erro: "Erro interno no servidor" });
    }
});

/* ==========================
   START
========================== */

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
