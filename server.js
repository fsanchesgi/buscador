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

/* =========================================================
   ROTA DE BUSCA OEM
========================================================= */
app.get("/api/buscar", async (req, res) => {
    try {
        const referencia = req.query.referencia;
        const marca = req.query.marca || "";

        console.log("📥 Query recebida:", req.query);

        if (!referencia) {
            return res.json({
                original: [],
                equivalentes: [],
                mensagem: "Referência não informada"
            });
        }

        const query = `${marca} ${referencia}`.trim();
        const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${API_KEY}`;

        console.log(`🔎 Buscando: ${query}`);
        console.log(`🌐 URL SerpAPI: ${url}`);

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ Erro da SerpAPI:", data.error);
            return res.status(400).json({
                original: [],
                equivalentes: [],
                erro: data.error
            });
        }

        const organic = data.organic_results || [];

        if (organic.length === 0) {
            return res.json({
                original: [],
                equivalentes: [],
                mensagem: "Nada encontrado"
            });
        }

        /* =========================================================
           NORMALIZAÇÃO OEM
        ========================================================= */
        const refNormalizada = referencia
            .replace(/[^a-zA-Z0-9]/g, "")
            .toLowerCase();

        const marcaLower = marca.toLowerCase();

        const originais = [];
        const equivalentes = [];

        organic.forEach(r => {
            const title = r.title || "";
            const snippet = r.snippet || "";
            const link = r.link || "";
            const source = r.source || "";

            const textoCompleto = `${title} ${snippet}`.toLowerCase();
            const textoNormalizado = textoCompleto.replace(/[^a-zA-Z0-9]/g, "");

            const contemReferencia =
                textoCompleto.includes(referencia.toLowerCase()) ||
                textoNormalizado.includes(refNormalizada);

            const contemMarca =
                marcaLower && textoCompleto.includes(marcaLower);

            const item = {
                codigo: title,
                titulo: snippet,
                link,
                site: source
            };

            // ORIGINAL: marca + referência exata
            if (contemReferencia && contemMarca) {
                originais.push(item);
            }
            // EQUIVALENTE: contém referência mas não a marca
            else if (contemReferencia) {
                equivalentes.push(item);
            }
        });

        /* =========================================================
           FALLBACK CONTROLADO
        ========================================================= */
        if (originais.length === 0 && equivalentes.length === 0) {
            organic.slice(0, 10).forEach(r => {
                equivalentes.push({
                    codigo: r.title || "",
                    titulo: r.snippet || "",
                    link: r.link || "",
                    site: r.source || ""
                });
            });
        }

        /* =========================================================
           FORÇA REFERÊNCIA PESQUISADA NO TOPO
        ========================================================= */
        originais.unshift({
            codigo: referencia,
            titulo: `Referência pesquisada (${marca || "OEM"})`,
            link: "",
            site: "Consulta direta"
        });

        res.json({
            original: originais,
            equivalentes
        });

    } catch (error) {
        console.error("❌ Erro interno no servidor:", error);
        res.status(500).json({
            original: [],
            equivalentes: [],
            erro: "Erro interno no servidor"
        });
    }
});

/* =========================================================
   START SERVER
========================================================= */
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
