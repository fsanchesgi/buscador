async function buscar() {
    const ref = document.getElementById("ref").value;
    const marca = document.getElementById("marca").value;
    const div = document.getElementById("resultados");

    div.innerHTML = "<p>Buscando...</p>";

    const url = `/api/buscar?referencia=${encodeURIComponent(ref)}&marca=${encodeURIComponent(marca)}`;

    try {
        const resp = await fetch(url);
        const data = await resp.json();

        if (!data.resultados || data.resultados.length === 0) {
            div.innerHTML = "<p><b>Nada encontrado.</b></p>";
            return;
        }

        div.innerHTML = data.resultados.map(r => `
            <div class="card">
                <p><b>Título:</b> ${r.titulo}</p>
                <p><b>Fonte:</b> ${r.fonte}</p>
                <a href="${r.link}" target="_blank">Abrir página</a>
                <p>${r.snippet}</p>
            </div>
        `).join("");

    } catch (err) {
        console.error(err);
        div.innerHTML = "<p>Erro ao buscar resultados.</p>";
    }
}
