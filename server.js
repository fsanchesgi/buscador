// server.js — MODO DIAGNÓSTICO DEFINITIVO
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.SERPAPI_KEY;

console.log("🔑 SERPAPI_KEY existe?", !!API_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("/api/buscar", async (req, res) => {
    try {
        const { marca = "", referencia = "" } = req.query;

        console.log("📥 QUERY RECEBIDA:", req.query);

        if (!referencia) {
            return res.json({
                ok: false,
                mensagem: "Referência não informada"
            });
        }

        const query = `${marca} ${referencia}`.trim();
        const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${API_KEY}`;

        console.log("🌐 URL:", url);

        const response = await fetch(url);
        const data = await response.json();

        console.log("📦 CHAVES RETORNADAS:", Object.keys(data));
        console.log("📊 organic_results:", data.organic_results?.length || 0);

        // 🚨 DEVOLVE TUDO, SEM FILTRO
        res.json({
            ok: true,
            query,
            serpapi_raw: data
        });

    } catch (err) {
        console.error("❌ ERRO:", err);
        res.status(500).json({ erro: "Erro interno" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
