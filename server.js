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

// Rota de busca
app.get("/api/buscar", async (req, res) => {
    try {
        const referencia = req.query.ref;
        const marca = req.query.marca || "";

        console.log("📥 Query recebida:", req.query);

        if (!referencia) {
            return res.json({ resultados: [], mensagem: "Referência não informada" });
        }

        const query = `${referencia} ${marca}`.trim();
        const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${API_KEY}`;

        console.log(`🔎 Buscando: ${query}`);
        console.log(`🌐 URL SerpAPI: ${url}`);

        const response = await fetch(url);
        const data = await response.json();

        console.log("📄 Resposta completa da SerpAPI:", JSON.stringify(data, null, 2));

        if (data.error) {
            console.error("❌ Erro da SerpAPI:", data.error);
            return res.status(400).json({ resultados: [], erro: data.error });
        }

        // Extrair resultados de qualquer fonte disponível
        let resultados = [];

        if (data.organic_results && data.organic_results.length > 0) {
            resultados = data.organic_results;
        } else if (data.answer_box && data.answer_box.answer) {
            resultados = [{
                codigo: "Resposta direta",
                titulo: data.answer_box.answer,
                link: "",
                site: "SerpAPI Answer Box"
            }];
        } else if (data.related_questions && data.related_questions.length > 0) {
            resultados = data.related_questions.map(r => ({
                codigo: r.question || "",
                titulo: r.answer || "",
                link: r.link || "",
                site: "Google Related Questions"
            }));
        } else if (data.knowledge_graph) {
            resultados = [{
                codigo: data.knowledge_graph.name || "Informação",
                titulo: data.knowledge_graph.detailed_description || "",
                link: data.knowledge_graph.url || "",
                site: "Knowledge Graph"
            }];
        }

        if (resultados.length === 0) {
            return res.json({ resultados: [], mensagem: "Nada encontrado" });
        }

        // Mapear resultados essenciais
        const retorno = resultados.map(r => ({
            codigo: r.title || r.codigo || "",
            titulo: r.snippet || r.titulo || "",
            link: r.link || "",
            site: r.source || r.site || ""
        }));

        res.json({ resultados: retorno });

    } catch (error) {
        console.error("❌ Erro interno no servidor:", error);
        res.status(500).json({ resultados: [], erro: "Erro interno no servidor" });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
