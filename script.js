const INVENTARIO_URL = 'https://script.google.com/macros/s/AKfycbwcEXzU6_0Xp_NBgDGSZEYMTF5fxZ8KGA28e49UodfQnLa9J3aG7xYN_SW3cFd0yNKY/exec';
const ENCUESTAS_URL = 'https://script.google.com/macros/s/AKfycbykbmnNCUgXunR5ZOfUUSU6Q1BFgHOMlfanP1rGLCQdqqFBUGfQ877CNFo7KwwED3gM/exec';

let charts = {};

function jsonpFetch(url, params = {}) {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonpCb_' + Math.round(1000000 * Math.random());
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Timeout JSONP'));
        }, 15000);

        function cleanup() {
            clearTimeout(timeout);
            delete window[callbackName];
            const s = document.getElementById(callbackName);
            if (s && s.parentNode) s.parentNode.removeChild(s);
        }

        window[callbackName] = function (data) {
            cleanup();
            resolve(data);
        };

        const query = new URLSearchParams(params);
        query.set('callback', callbackName);
        const sep = url.includes('?') ? '&' : '?';

        const script = document.createElement('script');
        script.id = callbackName;
        script.src = url + sep + query.toString();
        script.onerror = function () {
            cleanup();
            reject(new Error('Error de red JSONP'));
        };
        document.body.appendChild(script);
    });
}

async function fetchInventoryData() {
    try {
        showLoading(true);
        const data = await jsonpFetch(INVENTARIO_URL);
        processData(data);
    } catch (error) {
        console.error('Error al cargar inventario médico:', error);
        showError(error.message);
    }
}

function processData(data) {
    if (data && data.success) {
        document.getElementById('available-count').textContent = data.stats.disponibles || 0;
        document.getElementById('unavailable-count').textContent = data.stats.noDisponibles || 0;

        const fecha = new Date(data.timestamp);
        const fechaFormateada = fecha.toLocaleString('es-MX', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        document.getElementById('last-update').innerHTML = `<i class="fas fa-sync-alt"></i> Última actualización: ${fechaFormateada}`;

        if (data.stats.enMantenimiento || data.stats.enCuarentena) {
            const badge = document.querySelector('.update-badge');
            badge.innerHTML = `Mantenimiento: ${data.stats.enMantenimiento || 0} | Cuarentena: ${data.stats.enCuarentena || 0}`;
        }
        showLoading(false);
    } else {
        throw new Error((data && data.error) || 'Error al cargar los datos');
    }
}

function showLoading(isLoading) {
    const loadingEl = document.getElementById('inventory-loading');
    const contentEl = document.getElementById('inventory-content');
    if (!loadingEl || !contentEl) return;
    if (isLoading) {
        loadingEl.style.display = 'block';
        contentEl.style.display = 'none';
    } else {
        loadingEl.style.display = 'none';
        contentEl.style.display = 'block';
    }
}

function showError(errorMessage) {
    document.getElementById('inventory-loading').innerHTML = `
        <i class="fas fa-exclamation-triangle" style="color: #dc3545; font-size: 2rem; margin-bottom: 1rem;"></i>
        <p style="color: #dc3545;">Error al consultar el inventario. Contacte a soporte técnico.</p>
        <p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">${errorMessage}</p>
        <button onclick="fetchInventoryData()" class="cta-button" style="margin-top: 1rem; padding: 0.5rem 1rem; font-size: 0.9rem;">
            <i class="fas fa-sync-alt"></i> Reintentar
        </button>
    `;
}

async function fetchEncuestasData() {
    try {
        showChartsLoading(true);
        let data;
        try {
            data = await jsonpFetch(ENCUESTAS_URL, { sheet: 'encuestas' });
        } catch (error) {
            console.warn('JSONP falló:', error.message, '- usando datos de ejemplo');
            data = getExampleData();
        }

        if (!data || !data.success) {
            console.warn('Respuesta sin datos válidos:', data);
            data = getExampleData();
        }

        processEncuestasData(data);
    } catch (error) {
        console.error('Error al cargar encuestas:', error);
        processEncuestasData(getExampleData());
    }
}

function getExampleData() {
    return {
        success: true,
        timestamp: new Date().toISOString(),
        totalEncuestas: 0,
        requiereOxigeno: {},
        ciudad: {},
        identifica: {},
        dificultades: {},
        frecuencia: {},
        adquisicion: {},
        recarga: {},
        mantenimiento: {},
        preocupacion: {}
    };
}

function processEncuestasData(data) {
    document.getElementById('total-encuestas').textContent = `${data.totalEncuestas || 0} respuestas`;

    createChartPie('chartRequiereOxigeno', 'requiereOxigeno', data.requiereOxigeno,
        ['#005b96', '#17a2b8', '#28a745', '#ffc107']);

    createChartBar('chartCiudad', 'ciudad', data.ciudad,
        ['#005b96', '#0077be', '#17a2b8', '#28a745', '#ffc107', '#dc3545', '#6f42c1']);

    createChartDoughnut('chartIdentifica', 'identifica', data.identifica,
        ['#28a745', '#dc3545', '#ffc107']);

    createChartPie('chartDificultades', 'dificultades', data.dificultades,
        ['#dc3545', '#ffc107', '#28a745', '#17a2b8']);

    createChartBar('chartFrecuencia', 'frecuencia', data.frecuencia,
        ['#005b96', '#0077be', '#17a2b8', '#28a745', '#ffc107']);

    createChartDoughnut('chartAdquisicion', 'adquisicion', data.adquisicion,
        ['#005b96', '#0077be', '#17a2b8', '#28a745', '#ffc107', '#dc3545']);

    createChartPie('chartRecargaDomicilio', 'recarga', data.recarga,
        ['#28a745', '#17a2b8', '#ffc107', '#dc3545']);

    createChartDoughnut('chartMantenimiento', 'mantenimiento', data.mantenimiento,
        ['#28a745', '#ffc107', '#dc3545', '#6f42c1']);

    createChartBarHorizontal('chartPreocupacion', 'preocupacion', data.preocupacion,
        ['#dc3545', '#ffc107', '#005b96', '#28a745', '#6f42c1', '#17a2b8']);

    updateSummaryTable(data);
    showChartsLoading(false);
}

function showChartsLoading(isLoading) {
    const loadingEl = document.getElementById('charts-loading');
    const contentEl = document.getElementById('charts-content');
    const summaryEl = document.getElementById('dataSummary');
    if (!loadingEl || !contentEl || !summaryEl) return;

    if (isLoading) {
        loadingEl.style.display = 'block';
        contentEl.style.display = 'none';
        summaryEl.style.display = 'none';
    } else {
        loadingEl.style.display = 'none';
        contentEl.style.display = 'grid';
        summaryEl.style.display = 'block';
    }
}

function createChartPie(canvasId, chartKey, dataObj, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (charts[chartKey]) charts[chartKey].destroy();

    const labels = Object.keys(dataObj || {});
    const values = Object.values(dataObj || {});

    if (labels.length === 0) {
        labels.push('Sin datos');
        values.push(1);
        colors = ['#ccc'];
    }

    const total = values.reduce((a, b) => a + b, 0) || 1;

    charts[chartKey] = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 3,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { padding: 12, font: { size: 11 }, usePointStyle: true, pointStyle: 'circle' } },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const pct = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: ${context.raw} (${pct}%)`;
                        }
                    }
                }
            },
            animation: { animateScale: true, animateRotate: true }
        }
    });
}

function createChartDoughnut(canvasId, chartKey, dataObj, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (charts[chartKey]) charts[chartKey].destroy();

    const labels = Object.keys(dataObj || {});
    const values = Object.values(dataObj || {});

    if (labels.length === 0) {
        labels.push('Sin datos');
        values.push(1);
        colors = ['#ccc'];
    }

    const total = values.reduce((a, b) => a + b, 0) || 1;

    charts[chartKey] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '55%',
            plugins: {
                legend: { position: 'bottom', labels: { padding: 12, font: { size: 11 }, usePointStyle: true, pointStyle: 'circle' } },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const pct = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: ${context.raw} (${pct}%)`;
                        }
                    }
                }
            },
            animation: { animateScale: true, animateRotate: true }
        }
    });
}

function createChartBar(canvasId, chartKey, dataObj, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (charts[chartKey]) charts[chartKey].destroy();

    const labels = Object.keys(dataObj || {});
    const values = Object.values(dataObj || {});

    if (labels.length === 0) {
        labels.push('Sin datos');
        values.push(0);
    }

    charts[chartKey] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Respuestas',
                data: values,
                backgroundColor: colors.slice(0, labels.length).map(c => c + 'cc'),
                borderColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => `${ctx.raw} respuestas` } }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
            },
            animation: { duration: 1200, easing: 'easeOutQuart' }
        }
    });
}

function createChartBarHorizontal(canvasId, chartKey, dataObj, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (charts[chartKey]) charts[chartKey].destroy();

    const labels = Object.keys(dataObj || {});
    const values = Object.values(dataObj || {});

    if (labels.length === 0) {
        labels.push('Sin datos');
        values.push(0);
    }

    charts[chartKey] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Respuestas',
                data: values,
                backgroundColor: colors.slice(0, labels.length).map(c => c + 'cc'),
                borderRadius: 8,
                borderWidth: 0
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => `${ctx.raw} respuestas` } }
            },
            scales: {
                x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                y: { grid: { display: false } }
            },
            animation: { duration: 1200, easing: 'easeOutQuart' }
        }
    });
}

function updateSummaryTable(data) {
    const tbody = document.getElementById('summaryTableBody');
    if (!tbody) return;

    const getTop = (obj) => {
        const entries = Object.entries(obj || {});
        if (entries.length === 0) return ['-', 0];
        return entries.reduce((a, b) => b[1] > a[1] ? b : a);
    };

    const topCiudad = getTop(data.ciudad);
    const topAdquisicion = getTop(data.adquisicion);
    const topPreocupacion = getTop(data.preocupacion);

    const totalIdentifica = Object.values(data.identifica || {}).reduce((a, b) => a + b, 0) || 1;
    const sabenIdentificar = Object.entries(data.identifica || {})
        .filter(([k]) => k.toLowerCase().includes('sí'))
        .reduce((a, [, v]) => a + v, 0);
    const pctIdentifica = ((sabenIdentificar / totalIdentifica) * 100).toFixed(1);

    const totalRecarga = Object.values(data.recarga || {}).reduce((a, b) => a + b, 0) || 1;
    const dispuestosRecarga = Object.entries(data.recarga || {})
        .filter(([k]) => k.toLowerCase().includes('sí') || k.toLowerCase().includes('probable'))
        .reduce((a, [, v]) => a + v, 0);
    const pctRecarga = ((dispuestosRecarga / totalRecarga) * 100).toFixed(1);

    const rows = [
        { metrica: 'Total de Respuestas', valor: data.totalEncuestas || 0, tendencia: 'Muestra de encuesta' },
        { metrica: 'Ciudad/Región más frecuente', valor: `${topCiudad[0]} (${topCiudad[1]})`, tendencia: 'Mayor concentración' },
        { metrica: 'Saben identificar tanque lleno/vacío', valor: `${pctIdentifica}%`, tendencia: pctIdentifica >= 50 ? '↑ Mayoría capacitada' : '⚠ Requiere educación' },
        { metrica: 'Interesados en recarga a domicilio', valor: `${pctRecarga}%`, tendencia: pctRecarga >= 60 ? '↑ Alta demanda' : '→ Demanda moderada' },
        { metrica: 'Canal de adquisición principal', valor: `${topAdquisicion[0]} (${topAdquisicion[1]})`, tendencia: 'Canal dominante' },
        { metrica: 'Principal preocupación', valor: `${topPreocupacion[0]}`, tendencia: 'Punto crítico de atención' }
    ];

    tbody.innerHTML = rows.map(row => `
        <tr>
            <td><strong>${row.metrica}</strong></td>
            <td>${row.valor}</td>
            <td class="trend">${row.tendencia}</td>
        </tr>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    fetchInventoryData();
    setInterval(fetchInventoryData, 300000);
    fetchEncuestasData();
});

window.fetchInventoryData = fetchInventoryData;
window.fetchEncuestasData = fetchEncuestasData;