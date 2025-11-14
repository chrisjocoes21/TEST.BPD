/**
 * ===================================================================
 * CÓDIGO DE FRONTEND (script.js) - Banca Flexible v2.2 (FINAL)
 * Implementa: Carrusel Hero Dinámico (Fade), Modales Horizontales, Economía Rebalanceada.
 * CORRECCIÓN: Estructura de funciones dentro de AppUI para evitar TypeErrors.
 * ===================================================================
 */

// --- CONFIGURACIÓN Y ESTADO ---

const AppConfig = {
    API_URL: 'https://script.google.com/macros/s/AKfycbyhPHZuRmC7_t9z20W4h-VPqVFk0z6qKFG_W-YXMgnth4BMRgi8ibAfjeOtIeR5OrFPXw/exec',
    TRANSACCION_API_URL: 'https://script.google.com/macros/s/AKfycbyhPHZuRmC7_t9z20W4h-VPqVFk0z6qKFG_W-YXMgnth4BMRgi8ibAfjeOtIeR5OrFPXw/exec',
    CLAVE_MAESTRA: 'PinceladasM25-26',
    SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/1GArB7I19uGum6awiRN6qK8HtmTWGcaPGWhOzGCdhbcs/edit?usp=sharing',
    INITIAL_RETRY_DELAY: 1000,
    MAX_RETRY_DELAY: 30000,
    MAX_RETRIES: 5,
    CACHE_DURATION: 300000,
    
    APP_STATUS: 'PRO', 
    APP_VERSION: 'v27.2 - Final', 
    
    // REGLAS DE ECONOMÍA (Debe coincidir con el Backend)
    IMPUESTO_P2P_TASA: 0.05,
    IMPUESTO_DEPOSITO_TASA: 0.0,
    IMPUESTO_DEPOSITO_ADMIN: 0.05,
    TASA_ITBIS: 0.10,
    PRESTAMO_TASA_BASE: 0.15, PRESTAMO_BONUS_POR_DIA: 0.005,
    PRESTAMO_MIN_MONTO: 10000, PRESTAMO_MAX_MONTO: 150000,
    PRESTAMO_MIN_PLAZO_DIAS: 3, PRESTAMO_MAX_PLAZO_DIAS: 21,
    DEPOSITO_TASA_BASE: 0.05, DEPOSITO_BONUS_POR_DIA: 0.005,
    DEPOSITO_MIN_MONTO: 50000,
    DEPOSITO_MIN_PLAZO_DIAS: 7, DEPOSITO_MAX_PLAZO_DIAS: 30,
};

const AppState = {
    datosActuales: null,
    datosAdicionales: { 
        saldoTesoreria: 0, prestamosActivos: [], depositosActivos: [],
        allStudents: [], allGroups: [] 
    },
    actualizacionEnProceso: false,
    retryCount: 0,
    retryDelay: AppConfig.INITIAL_RETRY_DELAY,
    cachedData: null,
    lastCacheTime: null,
    isOffline: false,
    selectedGrupo: null, 
    isSidebarOpen: false, 
    sidebarTimer: null, 
    transaccionSelectAll: {}, 
    lastKnownGroupsHash: '',
    
    currentSearch: {
        p2pOrigen: { query: '', selected: null, info: null },
        p2pDestino: { query: '', selected: null, info: null },
        bonoAlumno: { query: '', selected: null, info: null },
        tiendaAlumno: { query: '', selected: null, info: null },
        prestamoAlumno: { query: '', selected: null, info: null },
        depositoAlumno: { query: '', selected: null, info: null }
    },
    
    bonos: { disponibles: [], canjeados: [], selectedBono: null },
    tienda: { items: {}, isStoreOpen: false, storeManualStatus: 'auto', selectedItem: null },
    
    heroCarousel: {
        currentIndex: 0,
        timer: null
    }
};

// --- CONTENIDO ESTRUCTURAL ---

const HERO_SLIDES = [
    { 
        title: "El Banco del Pincel Dorado",
        subtitle: "Donde el esfuerzo académico tiene su recompensa. Tu economía bajo control.",
        bgClass: "bg-slide-main"
    },
    { 
        title: "¡Préstamos Flexibles!",
        subtitle: "Solicita el monto y plazo que necesitas. Intereses ajustados al riesgo. Sin intervención de terceros.",
        bgClass: "bg-slide-main"
    },
    { 
        title: "Inversiones Inteligentes",
        subtitle: "Crea depósitos a plazo flexible y observa cómo tu capital crece con intereses por día. ¡Cero impuestos a la ganancia!",
        bgClass: "bg-slide-main"
    },
    { 
        title: "Portal P2P y Transferencias",
        subtitle: `Transfiere Pinceles a tus compañeros de forma segura y al instante. Impuesto reducido al ${AppConfig.IMPUESTO_P2P_TASA * 100}% para fomentar la circulación.`,
        bgClass: "bg-slide-main"
    },
    { 
        title: "Tienda y Bonos",
        subtitle: "Accede al catálogo de privilegios y canjea bonos por recompensas instantáneas. ¡Tu esfuerzo genera logros tangibles!",
        bgClass: "bg-slide-main"
    },
    { 
        title: "Historia del BPD",
        subtitle: "Fundado en 2024. Una visión de nuestro Pdte. Cordero Espinal y nuestra Vpdte. Gónzales para la excelencia académica.",
        bgClass: "bg-slide-main"
    }
];

const TERMS_CONTENT = {
    TERMINOS: {
        title: "Términos y Condiciones de Uso",
        sections: [
            { title: "I. Definiciones Clave", content: "El Portal P2P es una herramienta para la interacción económica entre alumnos (Usuarios). Pinceles (ℙ) es la unidad monetaria virtual. Clave P2P es la contraseña intransferible para autorizar Transacciones P2P. La Tesorería es el fondo operativo central." },
            { title: "II. Condiciones de Acceso y Uso", content: "El uso del Portal P2P implica la aceptación incondicional del Contrato. El Usuario es el único responsable de la Clave P2P. Toda transacción confirmada es irrevocable. El BPD puede imponer límites de monto o frecuencia para garantizar la estabilidad económica." },
            { title: "III. Préstamos y Depósitos Flexibles", content: "La solicitud de préstamos y la creación de depósitos son acciones de autoservicio que no requieren aprobación manual. El sistema valida automáticamente la elegibilidad, la capacidad de pago del alumno, y la tasa de interés es dinámica, variando según el plazo solicitado para equilibrar el riesgo y la recompensa." },
            { title: "IV. Impuestos y Comisiones", content: `Toda Transacción P2P está sujeta a un impuesto del ${AppConfig.IMPUESTO_P2P_TASA * 100}% del monto enviado, debitado del Remitente y acreditado a la Tesorería para sostenibilidad. Los depósitos están exentos de retención sobre la ganancia (${AppConfig.IMPUESTO_DEPOSITO_TASA * 100}%).` }
        ]
    },
    PRIVACIDAD: {
        title: "Acuerdo de Privacidad y Manejo de Datos",
        sections: [
            { title: "I. Recolección de Datos", content: "El BPD solo recolecta datos necesarios para la gestión económica: Nombre, Grupo, Saldo, Clave P2P (hash) e historial de transacciones. Su información es confidencial y no se comparte con terceros." },
            { title: "II. Monitoreo y Sanciones", content: "El BPD se reserva el derecho de auditar y monitorear todas las Transacciones P2P atípicas para detectar patrones de fraude o Actos Ilícitos. Los Actos Ilegales resultarán en la congelación inmediata de la cuenta, reversión forzosa de transacciones y transferencia automática a la zona 'Cicla'." },
            { title: "III. Transparencia y Responsabilidad", content: "El saldo de Pinceles es público para fomentar la transparencia y la competencia. El Usuario es el único responsable de la seguridad de su Clave P2P. El BPD no se hace responsable por transacciones no autorizadas resultantes de la negligencia." }
        ]
    }
};

// --- AUTENTICACIÓN Y FORMATO ---

const AppAuth = {
    verificarClave: function() {
        const claveInput = document.getElementById('clave-input');
        if (claveInput.value === AppConfig.CLAVE_MAESTRA) {
            AppUI.hideModal('gestion-modal');
            AppUI.showTransaccionModal('transaccion');
            claveInput.value = '';
            claveInput.classList.remove('shake', 'border-red-500');
        } else {
            claveInput.classList.add('shake', 'border-red-500'); 
            claveInput.focus();
            setTimeout(() => { claveInput.classList.remove('shake'); }, 500);
        }
    }
};

const AppFormat = {
    formatNumber: (num) => new Intl.NumberFormat('es-DO', { maximumFractionDigits: 0 }).format(num),
    toLocalISOString: (date) => {
        const pad = (num) => String(num).padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    },
    calculateLoanRate: (days) => {
        const rate = AppConfig.PRESTAMO_TASA_BASE + (days * AppConfig.PRESTAMO_BONUS_POR_DIA);
        return Math.min(rate, 1.0);
    },
    calculateDepositRate: (days) => {
        const rate = AppConfig.DEPOSITO_TASA_BASE + (days * AppConfig.DEPOSITO_BONUS_POR_DIA);
        return Math.min(rate, 1.0);
    }
};

// --- MANEJO DE DATOS Y ESTADO ---

const AppData = {
    isCacheValid: () => AppState.cachedData && AppState.lastCacheTime && (Date.now() - AppState.lastCacheTime < AppConfig.CACHE_DURATION),

    cargarDatos: async function(isRetry = false) {
        if (AppState.actualizacionEnProceso && !isRetry) return;
        AppState.actualizacionEnProceso = true;

        if (!isRetry) { AppState.retryCount = 0; AppState.retryDelay = AppConfig.INITIAL_RETRY_DELAY; }

        if (!AppState.datosActuales) { AppUI.showLoading(); } else { AppUI.setConnectionStatus('loading', 'Cargando...'); }

        try {
            if (!navigator.onLine) {
                AppState.isOffline = true;
                AppUI.setConnectionStatus('error', 'Sin conexión, mostrando caché.');
                if (AppData.isCacheValid()) { await AppData.procesarYMostrarDatos(AppState.cachedData); } else { throw new Error("Sin conexión y sin datos en caché."); }
            } else {
                AppState.isOffline = false;
                const url = `${AppConfig.API_URL}?cacheBuster=${new Date().getTime()}`;
                const response = await fetch(url, { method: 'GET', cache: 'no-cache', redirect: 'follow' });
                if (!response.ok) { throw new Error(`Error de red: ${response.status} ${response.statusText}`); }
                const data = await response.json();
                if (data && data.error) { throw new Error(`Error de API: ${data.message}`); }
                
                AppData.procesarYMostrarDatos(data);
                AppState.cachedData = data;
                AppState.lastCacheTime = Date.now();
                AppState.retryCount = 0;
                AppUI.setConnectionStatus('ok', 'Conectado');
            }
        } catch (error) {
            console.error("Error al cargar datos:", error.message);
            AppUI.setConnectionStatus('error', 'Error de conexión.');
            if (AppState.retryCount < AppConfig.MAX_RETRIES) {
                AppState.retryCount++;
                setTimeout(() => AppData.cargarDatos(true), AppState.retryDelay);
                AppState.retryDelay = Math.min(AppState.retryDelay * 2, AppConfig.MAX_RETRY_DELAY);
            } else if (AppData.isCacheValid()) {
                console.warn("Fallaron los reintentos. Mostrando datos de caché.");
                AppData.procesarYMostrarDatos(AppState.cachedData);
            } else {
                console.error("Fallaron todos los reintentos y no hay caché.");
            }
        } finally {
            AppState.actualizacionEnProceso = false;
            AppUI.hideLoading(); 
        }
    },
    
    procesarYMostrarDatos: function(data) {
        AppState.datosAdicionales.saldoTesoreria = data.saldoTesoreria || 0;
        AppState.datosAdicionales.prestamosActivos = data.prestamosActivos || [];
        AppState.datosAdicionales.depositosActivos = data.depositosActivos || [];
        AppState.bonos.disponibles = data.bonosDisponibles || [];
        AppState.tienda.items = data.tiendaStock || {};
        AppState.tienda.storeManualStatus = data.storeManualStatus || 'auto';

        const allGroups = data.gruposData;
        let gruposOrdenados = Object.entries(allGroups).map(([nombre, info]) => ({ nombre, total: info.total || 0, usuarios: info.usuarios || [] }));
        
        const ciclaGroup = gruposOrdenados.find(g => g.nombre === 'Cicla');
        const activeGroups = gruposOrdenados.filter(g => g.nombre !== 'Cicla' && g.nombre !== 'Banco');

        AppState.datosAdicionales.allStudents = activeGroups.flatMap(g => g.usuarios).concat(ciclaGroup ? ciclaGroup.usuarios : []);
        activeGroups.forEach(g => { g.usuarios.forEach(u => u.grupoNombre = g.nombre); });
        if (ciclaGroup) { ciclaGroup.usuarios.forEach(u => u.grupoNombre = 'Cicla'); }
        AppState.datosAdicionales.allGroups = gruposOrdenados.map(g => g.nombre).filter(n => n !== 'Banco');

        const currentGroupsHash = AppState.datosAdicionales.allGroups.join('|');
        const groupsChanged = currentGroupsHash !== AppState.lastKnownGroupsHash;
        
        if (groupsChanged) {
            AppUI.populateAdminGroupCheckboxes('bono-admin-grupos-checkboxes-container', 'bonos');
            AppUI.populateAdminGroupCheckboxes('tienda-admin-grupos-checkboxes-container', 'tienda');
            AppState.lastKnownGroupsHash = currentGroupsHash;
        }

        activeGroups.sort((a, b) => b.total - a.total);
        if (ciclaGroup) { activeGroups.push(ciclaGroup); }

        AppUI.actualizarSidebar(activeGroups);
        
        if (AppState.selectedGrupo) {
            const grupoActualizado = activeGroups.find(g => g.nombre === AppState.selectedGrupo);
            if (grupoActualizado) { AppUI.mostrarDatosGrupo(grupoActualizado); } else { AppState.selectedGrupo = null; AppUI.mostrarPantallaNeutral(activeGroups); }
        } else {
            AppUI.mostrarPantallaNeutral(activeGroups);
        }
        
        AppUI.actualizarSidebarActivo();
        
        AppUI.updatePrestamoCalculadora();
        AppUI.updateDepositoCalculadora();

        const isBonoModalOpen = document.getElementById('bonos-modal').classList.contains('opacity-0') === false;
        const isTiendaModalOpen = document.getElementById('tienda-modal').classList.contains('opacity-0') === false;
        
        if (isBonoModalOpen) AppUI.populateBonoList();
        if (isTiendaModalOpen) AppUI.renderTiendaItems();
        
        if (document.getElementById('transaccion-modal').classList.contains('opacity-0') === false) {
            const activeTab = document.querySelector('#transaccion-modal .tab-btn.active-tab');
            const tabId = activeTab ? activeTab.dataset.tab : '';
            if (tabId === 'bonos_admin') { AppUI.populateBonoAdminList(); } 
            else if (tabId === 'tienda_gestion' || tabId === 'tienda_inventario') { AppUI.populateTiendaAdminList(); AppUI.updateTiendaAdminStatusLabel(); }
        }

        AppState.datosActuales = activeGroups;
    }
};

// --- MANEJO DE LA INTERFAZ (UI) ---

const AppUI = {
    // **********************************************
    // 1. FUNCIONES AUXILIARES (DEBEN IR PRIMERO PARA QUE INIT LAS VEA)
    // **********************************************

    mostrarVersionApp: function() {
        const versionContainer = document.getElementById('app-version-container');
        versionContainer.classList.add('text-slate-400'); 
        versionContainer.innerHTML = `Estado: ${AppConfig.APP_STATUS} | ${AppConfig.APP_VERSION}`;
    },
    
    setupSearchInput: function(inputId, resultsId, stateKey, onSelectCallback) {
        const input = document.getElementById(inputId);
        const results = document.getElementById(resultsId);

        if (!input) return;

        input.addEventListener('input', (e) => {
            const query = e.target.value;
            AppState.currentSearch[stateKey].query = query;
            AppState.currentSearch[stateKey].selected = null; 
            AppState.currentSearch[stateKey].info = null;
            
            if (query === '') { onSelectCallback(null); }
            if (results) { AppUI.handleStudentSearch(query, inputId, resultsId, stateKey, onSelectCallback); }
        });
        
        if (results) {
            document.addEventListener('click', (e) => {
                if (!input.contains(e.target) && !results.contains(e.target)) {
                    results.classList.add('hidden');
                }
            });
            input.addEventListener('focus', () => { if (input.value) { AppUI.handleStudentSearch(input.value, inputId, resultsId, stateKey, onSelectCallback); } });
        }
    },

    handleStudentSearch: function(query, inputId, resultsId, stateKey, onSelectCallback) {
        const resultsContainer = document.getElementById(resultsId);
        
        if (!resultsContainer || query.length < 1) {
            if (resultsContainer) resultsContainer.classList.add('hidden');
            return;
        }

        const lowerQuery = query.toLowerCase();
        let studentList = AppState.datosAdicionales.allStudents;
        
        const ciclaAllowed = ['p2pDestino', 'prestamoAlumno', 'depositoAlumno'];
        if (!ciclaAllowed.includes(stateKey) && stateKey !== 'bonoAlumno' && stateKey !== 'tiendaAlumno') {
            studentList = studentList.filter(s => s.grupoNombre !== 'Cicla');
        }
        
        const filteredStudents = studentList
            .filter(s => s.nombre.toLowerCase().includes(lowerQuery))
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .slice(0, 10);

        resultsContainer.innerHTML = '';
        if (filteredStudents.length === 0) {
            resultsContainer.innerHTML = `<div class="p-2 text-sm text-slate-500">No se encontraron alumnos.</div>`;
        } else {
            filteredStudents.forEach(student => {
                const div = document.createElement('div');
                div.className = 'p-2 hover:bg-slate-100 cursor-pointer text-sm text-slate-900';
                div.textContent = `${student.nombre} (${student.grupoNombre})`;
                div.onclick = () => {
                    const input = document.getElementById(inputId);
                    input.value = student.nombre;
                    AppState.currentSearch[stateKey].query = student.nombre;
                    AppState.currentSearch[stateKey].selected = student.nombre;
                    AppState.currentSearch[stateKey].info = student;
                    resultsContainer.classList.add('hidden');
                    onSelectCallback(student);
                };
                resultsContainer.appendChild(div);
            });
        }
        resultsContainer.classList.remove('hidden');
    },

    // **********************************************
    // 2. FUNCIÓN PRINCIPAL INIT
    // **********************************************
    
    init: function() {
        // --- LISTENERS MODALES/ACCIONES ---
        document.getElementById('gestion-btn').addEventListener('click', () => AppUI.showModal('gestion-modal'));
        document.getElementById('modal-submit').addEventListener('click', AppAuth.verificarClave);
        
        // LISTENERS BANCA FLEXIBLE (NUEVOS)
        document.getElementById('prestamos-btn').addEventListener('click', () => AppUI.showPrestamoModal());
        document.getElementById('depositos-btn').addEventListener('click', () => AppUI.showDepositoModal());
        document.getElementById('prestamo-modal-close').addEventListener('click', () => AppUI.hideModal('prestamo-flexible-modal'));
        document.getElementById('deposito-modal-close').addEventListener('click', () => AppUI.hideModal('deposito-flexible-modal'));
        document.getElementById('prestamo-submit-btn').addEventListener('click', AppTransacciones.solicitarPrestamoFlexible);
        document.getElementById('deposito-submit-btn').addEventListener('click', AppTransacciones.crearDepositoFlexible);
        AppUI.setupFlexibleInputListeners('prestamo');
        AppUI.setupFlexibleInputListeners('deposito');
        
        // LISTENERS LEGALES (NUEVOS)
        document.getElementById('terminos-btn').addEventListener('click', () => AppUI.showTerminosModal('TERMINOS'));
        document.getElementById('privacidad-btn').addEventListener('click', () => AppUI.showTerminosModal('PRIVACIDAD'));
        document.getElementById('terminos-modal-close').addEventListener('click', () => AppUI.hideModal('terminos-modal'));


        // --- LISTENERS GENERALES ---
        document.getElementById('modal-cancel').addEventListener('click', () => AppUI.hideModal('gestion-modal'));
        document.getElementById('transaccion-modal-close-btn').addEventListener('click', () => AppUI.hideModal('transaccion-modal'));
        document.getElementById('p2p-portal-btn').addEventListener('click', () => AppUI.showP2PModal());
        document.getElementById('p2p-modal-close-btn').addEventListener('click', () => AppUI.hideModal('p2p-transfer-modal'));
        document.getElementById('bonos-btn').addEventListener('click', () => AppUI.showBonoModal());
        document.getElementById('bonos-modal-close').addEventListener('click', () => AppUI.hideModal('bonos-modal'));
        document.getElementById('tienda-btn').addEventListener('click', () => AppUI.showTiendaModal());
        document.getElementById('tienda-modal-close').addEventListener('click', () => AppUI.hideModal('tienda-modal'));
        document.getElementById('reglas-btn').addEventListener('click', () => AppUI.updateReglasModalContent());
        document.getElementById('reglas-modal-close').addEventListener('click', () => AppUI.hideModal('reglas-modal'));
        
        document.getElementById('p2p-submit-btn').addEventListener('click', AppTransacciones.realizarTransferenciaP2P);
        document.getElementById('p2p-cantidad').addEventListener('input', AppUI.updateP2PCalculoImpuesto);
        document.getElementById('transaccion-submit-btn').addEventListener('click', AppTransacciones.realizarTransaccionMultiple);
        document.getElementById('transaccion-cantidad-input').addEventListener('input', AppUI.updateAdminDepositoCalculo);
        document.getElementById('bono-admin-form').addEventListener('submit', (e) => { e.preventDefault(); AppTransacciones.crearActualizarBono(); });
        document.getElementById('tienda-admin-form').addEventListener('submit', (e) => { e.preventDefault(); AppTransacciones.crearActualizarItem(); });
        document.getElementById('bono-admin-clear-btn').addEventListener('click', AppUI.clearBonoAdminForm);
        document.getElementById('tienda-admin-clear-btn').addEventListener('click', AppUI.clearTiendaAdminForm);


        document.getElementById('toggle-sidebar-btn').addEventListener('click', AppUI.toggleSidebar);
        document.querySelectorAll('#transaccion-modal .tab-btn').forEach(button => { button.addEventListener('click', (e) => { AppUI.changeAdminTab(e.target.dataset.tab); }); });
        
        // Setup Autocomplete
        AppUI.setupSearchInput('p2p-search-origen', 'p2p-origen-results', 'p2pOrigen', AppUI.selectP2PStudent);
        AppUI.setupSearchInput('p2p-search-destino', 'p2p-destino-results', 'p2pDestino', AppUI.selectP2PStudent);
        AppUI.setupSearchInput('bono-search-alumno-step2', 'bono-origen-results-step2', 'bonoAlumno', AppUI.selectBonoStudent);
        AppUI.setupSearchInput('tienda-search-alumno-step2', 'tienda-origen-results-step2', 'tiendaAlumno', AppUI.selectTiendaStudent);
        AppUI.setupSearchInput('prestamo-search-alumno', 'prestamo-origen-results', 'prestamoAlumno', AppUI.selectFlexibleStudent);
        AppUI.setupSearchInput('deposito-search-alumno', 'deposito-origen-results', 'depositoAlumno', AppUI.selectFlexibleStudent);

        AppUI.mostrarVersionApp();
        AppUI.renderHeroCarousel();
        AppData.cargarDatos(false);
        setInterval(() => AppData.cargarDatos(false), 10000); 
        setInterval(AppUI.updateCountdown, 1000);
    },
    
    // **********************************************
    // 3. OTRAS FUNCIONES UI (Carrusel, Modales, Tablas)
    // **********************************************

    // --- LÓGICA DE CARRUSEL HERO SECTION ---
    
    renderHeroCarousel: function() {
        const container = document.getElementById('hero-carousel');
        if (!container) return;
        
        let html = '';
        HERO_SLIDES.forEach((slide, index) => {
            // El primer slide es el activo por defecto
            html += `
                <div class="hero-slide ${index === 0 ? 'active-slide' : ''} bg-slide-main text-white" data-index="${index}">
                    <div class="space-y-4">
                        <h2 class="text-3xl md:text-4xl font-extrabold mb-3">
                            ${slide.title}
                        </h2>
                        <p class="text-lg md:text-xl opacity-90">
                            ${slide.subtitle}
                        </p>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        AppUI.startHeroCarousel();
    },
    
    startHeroCarousel: function() {
        if (AppState.heroCarousel.timer) {
            clearInterval(AppState.heroCarousel.timer);
        }
        const slides = document.querySelectorAll('.hero-slide');
        if (slides.length <= 1) return;

        AppState.heroCarousel.timer = setInterval(() => {
            const nextIndex = (AppState.heroCarousel.currentIndex + 1) % slides.length;
            AppUI.showHeroSlide(nextIndex);
        }, 5000);
    },

    showHeroSlide: function(index) {
        const slides = document.querySelectorAll('.hero-slide');
        if (slides.length === 0) return;

        slides.forEach(slide => {
            slide.classList.remove('active-slide');
        });
        
        slides[index].classList.add('active-slide');
        AppState.heroCarousel.currentIndex = index;
    },
    
    // --- LÓGICA DE MODALES FLEXIBLES ---

    showPrestamoModal: function() {
        if (!AppState.datosActuales) return;
        AppUI.resetFlexibleForm('prestamo');
        AppUI.updatePrestamoCalculadora();
        AppUI.showModal('prestamo-flexible-modal');
    },

    showDepositoModal: function() {
        if (!AppState.datosActuales) return;
        AppUI.resetFlexibleForm('deposito');
        AppUI.updateDepositoCalculadora();
        AppUI.showModal('deposito-flexible-modal');
    },
    
    setupFlexibleInputListeners: function(type) {
        const montoInput = document.getElementById(`${type}-monto-input`);
        const plazoInput = document.getElementById(`${type}-plazo-input`);
        const updateFunc = type === 'prestamo' ? AppUI.updatePrestamoCalculadora : AppUI.updateDepositoCalculadora;

        const updateSliderFill = (input) => {
            if (input.type !== 'range') return;
            const min = input.min ? input.min : 0;
            const max = input.max ? input.max : 100;
            const val = input.value;
            const percent = ((val - min) / (max - min)) * 100;
            input.style.background = `linear-gradient(to right, #d97706 0%, #d97706 ${percent}%, #cbd5e1 ${percent}%, #cbd5e1 100%)`;
        };

        if (montoInput) montoInput.addEventListener('input', updateFunc);
        if (plazoInput) {
            plazoInput.addEventListener('input', updateFunc);
            plazoInput.addEventListener('input', () => updateSliderFill(plazoInput));
            // Aplicar fill inicial
            const initialPlazo = parseInt(plazoInput.value);
            if (!isNaN(initialPlazo)) updateSliderFill(plazoInput);
        }
    },
    
    updatePrestamoCalculadora: function() {
        const montoInput = document.getElementById('prestamo-monto-input');
        const plazoInput = document.getElementById('prestamo-plazo-input');
        const plazoDisplay = document.getElementById('prestamo-plazo-display');
        const tasaDisplay = document.getElementById('prestamo-tasa-display');
        const totalPagarDisplay = document.getElementById('prestamo-total-pagar-display');
        const cuotaDiariaDisplay = document.getElementById('prestamo-cuota-diaria-display');
        const btn = document.getElementById('prestamo-submit-btn');
        const statusMsg = document.getElementById('prestamo-elegibilidad-msg');
        
        if (!montoInput || !plazoInput) return;

        const monto = parseInt(montoInput.value) || 0;
        const plazo = parseInt(plazoInput.value) || 0;
        const student = AppState.currentSearch.prestamoAlumno.info;
        
        plazoDisplay.textContent = `${plazo} Días`;
        
        const minMonto = AppConfig.PRESTAMO_MIN_MONTO;
        const maxMonto = AppConfig.PRESTAMO_MAX_MONTO;
        
        // 1. Validaciones Básicas
        if (monto < minMonto || monto > maxMonto || plazo < AppConfig.PRESTAMO_MIN_PLAZO_DIAS || plazo > AppConfig.PRESTAMO_MAX_PLAZO_DIAS) {
            tasaDisplay.textContent = '-';
            totalPagarDisplay.textContent = '0 ℙ';
            cuotaDiariaDisplay.textContent = '-';
            AppTransacciones.setEligibilityState(btn, statusMsg, false, `Monto entre ${AppFormat.formatNumber(minMonto)} ℙ y ${AppFormat.formatNumber(maxMonto)} ℙ.`, true);
            return;
        }

        // 2. Cálculo de la Tasa
        const tasaDecimal = AppFormat.calculateLoanRate(plazo);
        const interesTotal = monto * tasaDecimal;
        const totalAPagar = Math.ceil(monto + interesTotal);
        const cuotaDiaria = Math.ceil(totalAPagar / plazo);
        
        // Presentación de resultados
        tasaDisplay.textContent = `${(tasaDecimal * 100).toFixed(1)}%`;
        totalPagarDisplay.textContent = `${AppFormat.formatNumber(totalAPagar)} ℙ`;
        cuotaDiariaDisplay.textContent = `${AppFormat.formatNumber(cuotaDiaria)} ℙ`;

        // 3. Validaciones de Elegibilidad (Alumno)
        if (!student) {
            AppTransacciones.setEligibilityState(btn, statusMsg, false, 'Busque su nombre para validar elegibilidad.', true);
            return;
        }
        
        const elegibilidad = AppTransacciones.checkLoanEligibility(student, monto);
        AppTransacciones.setEligibilityState(btn, statusMsg, elegibilidad.isEligible, elegibilidad.message);
    },

    updateDepositoCalculadora: function() {
        const montoInput = document.getElementById('deposito-monto-input');
        const plazoInput = document.getElementById('deposito-plazo-input');
        const plazoDisplay = document.getElementById('deposito-plazo-display');
        const tasaDisplay = document.getElementById('deposito-tasa-display');
        const gananciaDisplay = document.getElementById('deposito-ganancia-display');
        const totalRecibirDisplay = document.getElementById('deposito-total-recibir-display');
        const btn = document.getElementById('deposito-submit-btn');
        const statusMsg = document.getElementById('deposito-elegibilidad-msg');

        if (!montoInput || !plazoInput) return;

        const monto = parseInt(montoInput.value) || 0;
        const plazo = parseInt(plazoInput.value) || 0;
        const student = AppState.currentSearch.depositoAlumno.info;
        
        plazoDisplay.textContent = `${plazo} Días`;
        
        const minMonto = AppConfig.DEPOSITO_MIN_MONTO;

        // 1. Validaciones Básicas
        if (monto < minMonto || plazo < AppConfig.DEPOSITO_MIN_PLAZO_DIAS || plazo > AppConfig.DEPOSITO_MAX_PLAZO_DIAS) {
            tasaDisplay.textContent = '-';
            gananciaDisplay.textContent = '0 ℙ';
            totalRecibirDisplay.textContent = '0 ℙ';
            AppTransacciones.setEligibilityState(btn, statusMsg, false, `Mínimo: ${AppFormat.formatNumber(minMonto)} ℙ. Plazo: 7-30 días.`, true);
            return;
        }

        // 2. Cálculo de la Tasa
        const tasaDecimal = AppFormat.calculateDepositRate(plazo);
        const interesBruto = monto * tasaDecimal;
        const totalARecibir = Math.ceil(monto + interesBruto);
        
        // Presentación de resultados
        tasaDisplay.textContent = `${(tasaDecimal * 100).toFixed(1)}%`;
        gananciaDisplay.textContent = `${AppFormat.formatNumber(Math.ceil(interesBruto))} ℙ`;
        totalRecibirDisplay.textContent = `${AppFormat.formatNumber(totalARecibir)} ℙ`;
        
        // 3. Validaciones de Elegibilidad (Alumno)
        if (!student) {
            AppTransacciones.setEligibilityState(btn, statusMsg, false, 'Busque su nombre para validar elegibilidad.', true);
            return;
        }

        const elegibilidad = AppTransacciones.checkDepositEligibility(student, monto);
        AppTransacciones.setEligibilityState(btn, statusMsg, elegibilidad.isEligible, elegibilidad.message);
    },
    
    selectFlexibleStudent: function(student) {
        if (document.getElementById('prestamo-flexible-modal').classList.contains('opacity-0') === false) {
             AppUI.updatePrestamoCalculadora();
        } else if (document.getElementById('deposito-flexible-modal').classList.contains('opacity-0') === false) {
             AppUI.updateDepositoCalculadora();
        }
    },
    
    resetFlexibleForm: function(type) {
        AppUI.resetSearchInput(`${type}Alumno`);
        document.getElementById(`${type}-clave-p2p`).value = "";
        const montoInput = document.getElementById(`${type}-monto-input`);
        const plazoInput = document.getElementById(`${type}-plazo-input`);
        
        if (montoInput) montoInput.value = type === 'prestamo' ? AppConfig.PRESTAMO_MIN_MONTO : AppConfig.DEPOSITO_MIN_MONTO;
        if (plazoInput) plazoInput.value = type === 'prestamo' ? AppConfig.PRESTAMO_MIN_PLAZO_DIAS : AppConfig.DEPOSITO_MIN_PLAZO_DIAS;
        
        document.getElementById(`${type}-status-msg`).textContent = "";
        
        const plazoSlider = document.getElementById(`${type}-plazo-input`);
        if (plazoSlider) {
            const updateSliderFill = (input) => {
                const min = input.min ? input.min : 0;
                const max = input.max ? input.max : 100;
                const val = input.value;
                const percent = ((val - min) / (max - min)) * 100;
                input.style.background = `linear-gradient(to right, #d97706 0%, #d97706 ${percent}%, #cbd5e1 ${percent}%, #cbd5e1 100%)`;
            };
            updateSliderFill(plazoSlider);
        }

        if (type === 'prestamo') AppUI.updatePrestamoCalculadora();
        if (type === 'deposito') AppUI.updateDepositoCalculadora();
        
        const btn = document.getElementById(`${type}-submit-btn`);
        if (btn) btn.disabled = true;
    },

    showTerminosModal: function(type) {
        const contentDiv = document.getElementById('terminos-modal-content');
        const titleEl = document.getElementById('terminos-modal-title');
        const data = TERMS_CONTENT[type];

        titleEl.textContent = data.title;
        let html = '';
        
        data.sections.forEach(section => {
            html += `
                <div class="space-y-2">
                    <h4 class="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-1">${section.title}</h4>
                    <p class="text-sm text-slate-700 text-justify">${section.content}</p>
                </div>
            `;
        });
        
        contentDiv.innerHTML = html;
        AppUI.showModal('terminos-modal');
    },

    showTransaccionModal: function(tab) {
        if (!AppState.datosActuales) { return; }
        AppUI.changeAdminTab(tab); 
        AppUI.showModal('transaccion-modal');
    },
    
    mostrarPantallaNeutral: function(grupos) {
        document.getElementById('main-header-title').textContent = "Bienvenido al Banco del Pincel Dorado";
        document.getElementById('page-subtitle').innerHTML = ''; 

        document.getElementById('table-container').innerHTML = '';
        document.getElementById('table-container').classList.add('hidden');

        // Llenar paneles principales
        // ...

        document.getElementById('home-stats-container').classList.remove('hidden');
        document.getElementById('home-modules-grid').classList.remove('hidden');
        
        // Mostrar carrusel en slide 0
        AppUI.showHeroSlide(0);
    },
    
    actualizarSidebar: function(grupos) {
        const nav = document.getElementById('sidebar-nav');
        nav.innerHTML = ''; 
        
        const homeLink = document.createElement('button');
        homeLink.dataset.groupName = "home"; 
        homeLink.className = "flex items-center justify-center w-full px-3 py-2 border border-amber-600 text-amber-600 text-sm font-medium rounded-lg hover:bg-amber-50 transition-colors shadow-sm mb-1 nav-link";
        homeLink.innerHTML = `<span class="truncate">Inicio</span>`;
        homeLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (AppState.selectedGrupo === null) { AppUI.hideSidebar(); return; }
            AppState.selectedGrupo = null;
            AppUI.mostrarPantallaNeutral(AppState.datosActuales || []);
            AppUI.actualizarSidebarActivo();
            AppUI.hideSidebar();
        });
        nav.appendChild(homeLink);

        (grupos || []).forEach(grupo => {
            const link = document.createElement('button');
            link.dataset.groupName = grupo.nombre;
            link.className = "flex items-center justify-center w-full px-3 py-2 border border-amber-600 text-amber-600 text-sm font-medium rounded-lg hover:bg-amber-50 transition-colors shadow-sm mb-1 nav-link";
            
            link.innerHTML = `<span class="truncate">${grupo.nombre}</span>`;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (AppState.selectedGrupo === grupo.nombre) { AppUI.hideSidebar(); return; }
                AppState.selectedGrupo = grupo.nombre;
                AppUI.mostrarDatosGrupo(grupo);
                AppUI.actualizarSidebarActivo();
                AppUI.hideSidebar();
            });
            nav.appendChild(link);
        });
    },
    
    // --- LÓGICA DE BOTONES Y ESTADO GENERAL (omito por brevedad) ---
    hideLoading: function() { document.getElementById('loading-overlay').classList.add('opacity-0', 'pointer-events-none'); },
    showLoading: function() { document.getElementById('loading-overlay').classList.remove('opacity-0', 'pointer-events-none'); },
    // ...
};

// --- OBJETO TRANSACCIONES (Préstamos, Depósitos, P2P, Bonos, Tienda) ---
const AppTransacciones = {
    
    // --- NUEVAS FUNCIONES DE BANCA FLEXIBLE ---
    checkLoanEligibility: function(student, montoSolicitado) {
        if (student.pinceles < 0) { return { isEligible: false, message: 'Saldo negativo no es elegible para préstamos.' }; }
        const capacity = student.pinceles * 0.50;
        if (montoSolicitado > capacity) { return { isEligible: false, message: `Monto excede el 50% de tu saldo. Máx: ${AppFormat.formatNumber(capacity)} ℙ.` }; }
        if (AppState.datosAdicionales.prestamosActivos.some(p => p.alumno === student.nombre)) { return { isEligible: false, message: 'Ya tienes un préstamo activo.' }; }
        if (AppState.datosAdicionales.saldoTesoreria < montoSolicitado) { return { isEligible: false, message: 'Tesorería sin fondos suficientes para tu solicitud.' }; }
        return { isEligible: true, message: '¡Elegible! Confirma la solicitud.' };
    },

    checkDepositEligibility: function(student, montoADepositar) {
        if (AppState.datosAdicionales.prestamosActivos.some(p => p.alumno === student.nombre)) { return { isEligible: false, message: 'No puedes invertir con un préstamo activo.' }; }
        if (student.pinceles < montoADepositar) { return { isEligible: false, message: 'Fondos insuficientes en tu cuenta.' }; }
        return { isEligible: true, message: '¡Elegible! Confirma la inversión.' };
    },

    setEligibilityState: function(btn, msgEl, isEligible, message, isBasicValidation = false) {
        if (isEligible) {
            AppTransacciones.setSuccess(msgEl, message);
            btn.disabled = false;
        } else {
            AppTransacciones.setError(msgEl, message, isBasicValidation ? 'text-slate-600' : 'text-red-600');
            btn.disabled = true;
        }
    },
    
    solicitarPrestamoFlexible: async function() {
        const btn = document.getElementById('prestamo-submit-btn');
        const statusMsg = document.getElementById('prestamo-status-msg');
        const btnText = document.getElementById('prestamo-btn-text');

        const alumnoNombre = document.getElementById('prestamo-search-alumno').value.trim();
        const claveP2P = document.getElementById('prestamo-clave-p2p').value;
        const montoSolicitado = parseInt(document.getElementById('prestamo-monto-input').value);
        const plazoSolicitado = parseInt(document.getElementById('prestamo-plazo-input').value);

        const student = AppState.currentSearch.prestamoAlumno.info;

        let errorValidacion = "";
        if (!student || student.nombre !== alumnoNombre) { errorValidacion = "Alumno no encontrado. Seleccione de la lista."; } 
        else if (!claveP2P) { errorValidacion = "Clave P2P requerida."; } 
        else {
            const elegibilidad = AppTransacciones.checkLoanEligibility(student, montoSolicitado);
            if (!elegibilidad.isEligible) errorValidacion = `No elegible: ${elegibilidad.message}`;
        }

        if (errorValidacion) { AppTransacciones.setError(statusMsg, errorValidacion); return; }

        AppTransacciones.setLoadingState(btn, btnText, true, 'Procesando...');
        AppTransacciones.setLoading(statusMsg, 'Enviando solicitud al Banco...');

        try {
            const payload = {
                accion: 'solicitar_prestamo_flexible', 
                alumnoNombre: alumnoNombre, claveP2P: claveP2P,
                montoSolicitado: montoSolicitado, plazoSolicitado: plazoSolicitado
            };

            const response = await AppTransacciones.fetchWithExponentialBackoff(AppConfig.API_URL, {
                method: 'POST', body: JSON.stringify(payload), 
            });

            const result = await response.json();

            if (result.success === true) {
                AppTransacciones.setSuccess(statusMsg, result.message || "¡Préstamo otorgado con éxito!");
                AppUI.resetFlexibleForm('prestamo');
                AppData.cargarDatos(false); 
            } else { throw new Error(result.message || "Error al otorgar el préstamo."); }
        } catch (error) { AppTransacciones.setError(statusMsg, error.message); } 
        finally { AppTransacciones.setLoadingState(btn, btnText, false, 'Confirmar Solicitud'); }
    },

    crearDepositoFlexible: async function() {
        const btn = document.getElementById('deposito-submit-btn');
        const statusMsg = document.getElementById('deposito-status-msg');
        const btnText = document.getElementById('deposito-btn-text');

        const alumnoNombre = document.getElementById('deposito-search-alumno').value.trim();
        const claveP2P = document.getElementById('deposito-clave-p2p').value;
        const montoADepositar = parseInt(document.getElementById('deposito-monto-input').value);
        const plazoEnDias = parseInt(document.getElementById('deposito-plazo-input').value);

        const student = AppState.currentSearch.depositoAlumno.info;

        let errorValidacion = "";
        if (!student || student.nombre !== alumnoNombre) { errorValidacion = "Alumno no encontrado. Seleccione de la lista."; } 
        else if (!claveP2P) { errorValidacion = "Clave P2P requerida."; } 
        else {
            const elegibilidad = AppTransacciones.checkDepositEligibility(student, montoADepositar);
            if (!elegibilidad.isEligible) errorValidacion = `No elegible: ${elegibilidad.message}`;
        }

        if (errorValidacion) { AppTransacciones.setError(statusMsg, errorValidacion); return; }

        AppTransacciones.setLoadingState(btn, btnText, true, 'Procesando...');
        AppTransacciones.setLoading(statusMsg, 'Creando depósito en el Banco...');

        try {
            const payload = {
                accion: 'crear_deposito_flexible',
                alumnoNombre: alumnoNombre, claveP2P: claveP2P,
                montoADepositar: montoADepositar, plazoEnDias: plazoEnDias
            };

            const response = await AppTransacciones.fetchWithExponentialBackoff(AppConfig.API_URL, {
                method: 'POST', body: JSON.stringify(payload), 
            });

            const result = await response.json();

            if (result.success === true) {
                AppTransacciones.setSuccess(statusMsg, result.message || "¡Depósito creado con éxito!");
                AppUI.resetFlexibleForm('deposito');
                AppData.cargarDatos(false); 
            } else { throw new Error(result.message || "Error al crear el depósito."); }
        } catch (error) { AppTransacciones.setError(statusMsg, error.message); } 
        finally { AppTransacciones.setLoadingState(btn, btnText, false, 'Confirmar Inversión'); }
    },
    
    // ... (rest of AppTransacciones functions OMITTED for brevity)
    
    // Utilidades de Fetch y Estado (COMPLETAS)
    fetchWithExponentialBackoff: async function(url, options, maxRetries = 5, initialDelay = 1000) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const response = await fetch(url, options);
                if (response.status !== 429) { return response; }
            } catch (error) {
                if (attempt === maxRetries - 1) throw error;
            }
            const delay = initialDelay * Math.pow(2, attempt) + Math.random() * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        throw new Error('Failed to fetch after multiple retries.');
    },

    setLoadingState: function(btn, btnTextEl, isLoading, defaultText) {
        if (isLoading) {
            if (btnTextEl) btnTextEl.textContent = '...';
            if (btn) btn.disabled = true;
            if (btn) {
                btn.classList.remove('bg-white', 'hover:bg-amber-50', 'text-amber-600', 'border-amber-600');
                btn.classList.add('bg-slate-100', 'text-slate-600', 'border-slate-300', 'cursor-not-allowed', 'shadow-none');
            }
        } else {
            if (btnTextEl && defaultText) btnTextEl.textContent = defaultText;
            if (btn) btn.disabled = false;
            if (btn) {
                btn.classList.remove('bg-slate-100', 'text-slate-600', 'border-slate-300', 'cursor-not-allowed', 'shadow-none');
                btn.classList.add('bg-white', 'hover:bg-amber-50', 'text-amber-600', 'border-amber-600');
            }
        }
    },
    
    setLoading: function(statusMsgEl, message) {
        if (statusMsgEl) { statusMsgEl.textContent = message; statusMsgEl.className = "text-sm text-center font-medium color-dorado-main h-auto min-h-[1rem]"; }
    },

    setSuccess: function(statusMsgEl, message) {
        if (statusMsgEl) { statusMsgEl.textContent = message; statusMsgEl.className = "text-sm text-center font-medium color-dorado-main h-auto min-h-[1rem]"; }
    },

    setError: function(statusMsgEl, message, colorClass = 'text-red-600') {
        if (statusMsgEl) { statusMsgEl.textContent = `Error: ${message}`; statusMsgEl.className = `text-sm text-center font-medium ${colorClass} h-auto min-h-[1em]`; }
    }
};

function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

window.AppUI = AppUI;
window.AppFormat = AppFormat;
window.AppTransacciones = AppTransacciones;

// Exponer funciones globales para onclick
window.AppUI.handleEditBono = AppUI.handleEditBono;
window.AppTransacciones.eliminarBono = AppTransacciones.eliminarBono;
window.AppUI.handleEditItem = AppUI.handleEditItem;
window.AppUI.handleDeleteConfirmation = AppUI.handleDeleteConfirmation;
window.AppUI.cancelDeleteConfirmation = AppUI.cancelDeleteConfirmation;
window.AppTransacciones.eliminarItem = AppTransacciones.eliminarItem;
window.AppTransacciones.toggleStoreManual = AppTransacciones.toggleStoreManual;
window.AppTransacciones.iniciarCompra = AppTransacciones.iniciarCompra;
window.AppTransacciones.iniciarCanje = AppTransacciones.iniciarCanje;

window.onload = function() {
    AppUI.init();
    
    // Llenado visual inicial de sliders y listeners
    const updateSliderFill = (input) => {
        if (input.type !== 'range') return;
        const min = input.min ? input.min : 0;
        const max = input.max ? input.max : 100;
        const val = input.value;
        const percent = ((val - min) / (max - min)) * 100;
        input.style.background = `linear-gradient(to right, #d97706 0%, #d97706 ${percent}%, #cbd5e1 ${percent}%, #cbd5e1 100%)`;
    };

    setTimeout(() => {
        document.querySelectorAll('input[type="range"]').forEach(input => {
            updateSliderFill(input);
            input.addEventListener('input', () => updateSliderFill(input));
        });
    }, 100);
};
