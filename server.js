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
    console.error("❌ ERRO: A chave da SerpAPI não está definida");
} else {
    console.log("✅ SerpAPI KEY carregada com sucesso");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/buscar", async (req, res) => {
    try {
        const referencia = req.query.referencia;
        const marca = req.query.marca || "";

        console.log("📥 Query recebida:", req.query);

        if (!referencia) {
            return res.json({ resultados: [], mensagem: "Referência não informada" });
        }

        // 🔴 REFERÊNCIA COM PRIORIDADE ABSOLUTA
        const query = `"${referencia}" ${marca}`.trim();

        const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(
            query
        )}&num=20&api_key=${API_KEY}`;

        console.log(`🔎 Buscando: ${query}`);

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ resultados: [], erro: data.error });
        }

        let resultados = data.organic_results || [];

        if (resultados.length === 0) {
            return res.json({ resultados: [], mensagem: "Nada encontrado" });
        }

        const refLimpa = referencia.replace(/\D/g, "");

        const retorno = resultados.map(r => {
            const texto = `${r.title || ""} ${r.snippet || ""}`.toLowerCase();
            const textoLimpo = texto.replace(/\D/g, "");

            const matchExato = textoLimpo.includes(refLimpa);

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
                tipo,
                relevancia: matchExato ? 2 : 1
            };
        });

        // 🔼 ORDENAÇÃO: exato > equivalente > pdf
        retorno.sort((a, b) => b.relevancia - a.relevancia);

        res.json({ resultados: retorno });

    } catch (error) {
        console.error("❌ Erro interno:", error);
        res.status(500).json({ resultados: [], erro: "Erro interno no servidor" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
