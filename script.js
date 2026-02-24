
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwcEXzU6_0Xp_NBgDGSZEYMTF5fxZ8KGA28e49UodfQnLa9J3aG7xYN_SW3cFd0yNKY/exec';


async function fetchInventoryData() {
    try {
        showLoading(true);

        try {
            const response = await fetch(GOOGLE_SHEETS_URL);
            const data = await response.json();
            processData(data);
        } catch (fetchError) {
            console.log('Fetch falló, intentando con JSONP...', fetchError);
       
            jsonpRequest();
        }

    } catch (error) {
        console.error('Error al cargar inventario médico:', error);
        showError(error.message);
    }
}


function processData(data) {
    console.log('Datos recibidos:', data);

    if (data.success) {

        document.getElementById('available-count').textContent = data.stats.disponibles || 0;
        document.getElementById('unavailable-count').textContent = data.stats.noDisponibles || 0;

        // Formatear fecha
        const fecha = new Date(data.timestamp);
        const fechaFormateada = fecha.toLocaleString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        document.getElementById('last-update').innerHTML = `<i class="fas fa-sync-alt"></i> Última actualización: ${fechaFormateada}`;

        // Actualizar badge con estadísticas adicionales si existen
        if (data.stats.enMantenimiento || data.stats.enCuarentena) {
            const badge = document.querySelector('.update-badge');
            badge.innerHTML = `Mantenimiento: ${data.stats.enMantenimiento || 0} | Cuarentena: ${data.stats.enCuarentena || 0}`;
        }

        showLoading(false);
    } else {
        throw new Error(data.error || 'Error al cargar los datos');
    }
}


function jsonpRequest() {
    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());

    window[callbackName] = function (data) {
        delete window[callbackName];
        document.body.removeChild(document.getElementById(callbackName));
        processData(data);
    };

    const script = document.createElement('script');
    script.id = callbackName;
    script.src = GOOGLE_SHEETS_URL + '?callback=' + callbackName;

    script.onerror = function (error) {
        delete window[callbackName];
        document.body.removeChild(script);
        showError('Error de conexión con el servidor');
    };

    document.body.appendChild(script);
}


function showLoading(isLoading) {
    const loadingEl = document.getElementById('inventory-loading');
    const contentEl = document.getElementById('inventory-content');

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


document.addEventListener('DOMContentLoaded', () => {
    fetchInventoryData();


    setInterval(fetchInventoryData, 300000);
});


window.fetchInventoryData = fetchInventoryData;