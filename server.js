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

app.get("/api/buscar", async (req, res) => {
    try {
        const referencia = req.query.referencia;
        const marca = (req.query.marca || "").toLowerCase();

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

        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ Erro SerpAPI:", data.error);
            return res.json({
                original: [],
                equivalentes: [],
                erro: data.error
            });
        }

        // 🔥 COLETAR DADOS DE TODAS AS FONTES POSSÍVEIS
        const organic = data.organic_results || [];
        const related = data.related_questions || [];
        const answerBox = data.answer_box ? [data.answer_box] : [];
        const knowledge = data.knowledge_graph ? [data.knowledge_graph] : [];

        const todosResultados = [
            ...organic,
            ...related,
            ...answerBox,
            ...knowledge
        ];

        // Normalização OEM
        const refNormalizada = referencia.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

        const original = [];
        const equivalentes = [];

        todosResultados.forEach(r => {
            const title = r.title || r.name || "";
            const snippet = r.snippet || r.answer || r.description || "";
            const link = r.link || r.url || "";
            const site = r.source || r.website || "";

            const texto = `${title} ${snippet}`.toLowerCase();
            const textoNormalizado = texto.replace(/[^a-zA-Z0-9]/g, "");

            const matchExato = textoNormalizado.includes(refNormalizada);
            const matchMarca = marca && texto.includes(marca);

            const item = {
                codigo: title || referencia,
                titulo: snippet,
                link,
                site
            };

            if (matchExato && matchMarca) {
                original.push(item);
            } else if (matchExato) {
                original.push(item);
            } else {
                equivalentes.push(item);
            }
        });

        // 🔒 GARANTIA ABSOLUTA DE RETORNO
        if (original.length === 0 && equivalentes.length === 0) {
            organic.slice(0, 10).forEach(r => {
                equivalentes.push({
                    codigo: r.title || referencia,
                    titulo: r.snippet || "Resultado relacionado",
                    link: r.link || "",
                    site: r.source || ""
                });
            });
        }

        // Forçar referência pesquisada no topo
        original.unshift({
            codigo: referencia,
            titulo: `Referência pesquisada (${marca || "OEM"})`,
            link: "",
            site: "Consulta direta"
        });

        res.json({
            original,
            equivalentes
        });

    } catch (error) {
        console.error("❌ Erro interno:", error);
        res.status(500).json({
            original: [],
            equivalentes: [],
            erro: "Erro interno no servidor"
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
