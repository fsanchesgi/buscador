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
    console.error("❌ ERRO: SERPAPI_KEY não definida");
} else {
    console.log("✅ SerpAPI KEY carregada com sucesso");
}

// Static
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

/* ======================
   HELPERS OEM
====================== */

const normalize = str => (str || "").replace(/\D/g, "");

const isPDF = r =>
    r.link?.toLowerCase().endsWith(".pdf") ||
    r.snippet?.toLowerCase().includes("pdf");

/* ======================
   BUSCA
====================== */

app.get("/api/buscar", async (req, res) => {
    try {
        const { referencia, marca = "" } = req.query;

        console.log("📥 Query recebida:", req.query);

        if (!referencia) {
            return res.json({ mensagem: "Referência não informada" });
        }

        const refNorm = normalize(referencia);
        const query = `${referencia} ${marca}`.trim();

        const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${API_KEY}`;

        console.log("🔎 Buscando:", query);

        const response = await fetch(url);
        const data = await response.json();

        if (!data.organic_results || data.organic_results.length === 0) {
            return res.json({ mensagem: "Nada encontrado" });
        }

        const original = [];
        const equivalentes = [];
        const pdfs = [];

        data.organic_results.forEach(r => {
            const text = `${r.title} ${r.snippet}`.toLowerCase();
            const refFound = normalize(text).includes(refNorm);

            const item = {
                titulo: r.title || "",
                descricao: r.snippet || "",
                link: r.link || "",
                site: r.source || "",
                pdf: isPDF(r),
                matchExato: refFound
            };

            if (item.pdf) {
                pdfs.push(item);
            } else if (refFound) {
                original.push(item);
            } else {
                equivalentes.push(item);
            }
        });

        res.json({
            original,
            equivalentes,
            pdfs
        });

    } catch (err) {
        console.error("❌ Erro interno:", err);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
