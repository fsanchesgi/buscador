async function buscar() {
    const ref = document.getElementById("ref").value;
    const marca = document.getElementById("marca").value;
    const div = document.getElementById("resultados");

    div.innerHTML = "<p>Buscando...</p>";

    const url = `/buscar?ref=${encodeURIComponent(ref)}&marca=${encodeURIComponent(marca)}`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (!data.resultados.length) {
        div.innerHTML = "<p><b>Nada encontrado.</b></p>";
        return;
    }

    div.innerHTML = data.resultados.map(r => `
        <div class="item">
            <p><b>Código:</b> ${r.codigo}</p>
            <p><b>Título:</b> ${r.titulo}</p>
            <a href="${r.link}" target="_blank">Abrir página</a>
        </div>
    `).join("");
}
