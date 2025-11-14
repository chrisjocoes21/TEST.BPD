/**
 * ===================================================================
 * CÓDIGO DE FRONTEND (script.js) - Banca Flexible v2.5 (FINAL)
 * CORRECCIÓN CRÍTICA: Reestructuración estricta de AppUI para solucionar 
 * TypeErrors de orden de definición.
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
    // 1. FUNCIONES AUXILIARES CRÍTICAS (DEBEN IR PRIMERO)
    // (Definidas antes de AppUI.init para evitar TypeErrors)
    // **********************************************

    // --- CORE UI UTILITIES ---
    showLoading: function() { document.getElementById('loading-overlay').classList.remove('opacity-0', 'pointer-events-none'); },
    hideLoading: function() { document.getElementById('loading-overlay').classList.add('opacity-0', 'pointer-events-none'); },
    setConnectionStatus: function(status, title) {
        const dot = document.getElementById('status-dot');
        const indicator = document.getElementById('status-indicator');
        if (!dot) return;
        indicator.title = title;
        dot.classList.remove('bg-green-600', 'bg-amber-600', 'bg-red-600', 'animate-pulse-dot', 'bg-slate-300');
        switch (status) {
            case 'ok':
            case 'loading':
                dot.classList.add('bg-amber-600', 'animate-pulse-dot');
                break;
            case 'error':
                dot.classList.add('bg-red-600'); 
                break;
        }
    },
    
    mostrarVersionApp: function() {
        const versionContainer = document.getElementById('app-version-container');
        versionContainer.classList.add('text-slate-400'); 
        versionContainer.innerHTML = `Estado: ${AppConfig.APP_STATUS} | ${AppConfig.APP_VERSION}`;
    },
    
    // --- LÓGICA DE BÚSQUEDA (AUTOCOMPLETE) ---
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
    
    // --- LÓGICA DE ADMIN CHECKBOX ---
    getAdminGroupCheckboxSelection: function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return [];
        return Array.from(container.querySelectorAll('.group-admin-checkbox:checked')).map(cb => cb.value);
    },
    
    populateAdminGroupCheckboxes: function(containerId, entityType) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const allGroups = AppState.datosAdicionales.allGroups || [];
        if (allGroups.length === 0) {
            container.innerHTML = `<p class="text-xs text-slate-500">No hay grupos cargados.</p>`;
            return;
        }
        const currentSelection = AppUI.getAdminGroupCheckboxSelection(containerId);
        container.innerHTML = '';
        allGroups.forEach(grupoNombre => {
            const safeName = grupoNombre.replace(/\s/g, '-');
            const checkboxId = `${entityType}-group-cb-${safeName}`;
            const div = document.createElement('div');
            div.className = "flex items-center space-x-2"; 
            const input = document.createElement('input');
            input.type = "checkbox";
            input.id = checkboxId;
            input.value = grupoNombre;
            input.className = "h-4 w-4 text-amber-600 border-slate-300 rounded focus:ring-amber-600 bg-white group-admin-checkbox";
            if (currentSelection.includes(grupoNombre)) { input.checked = true; }
            const label = document.createElement('label');
            label.htmlFor = checkboxId;
            label.textContent = grupoNombre;
            label.className = "ml-2 block text-sm text-slate-900 cursor-pointer flex-1";
            div.appendChild(input);
            div.appendChild(label);
            container.appendChild(div);
        });
    },

    // --- LÓGICA DE NAVEGACIÓN Y VISTAS (Llamadas desde AppData) ---
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
    
    actualizarSidebarActivo: function() {
        const links = document.querySelectorAll('#sidebar-nav .nav-link');
        links.forEach(link => {
            const groupName = link.dataset.groupName;
            const isActive = (AppState.selectedGrupo === null && groupName === 'home') || (AppState.selectedGrupo === groupName);
            link.classList.remove('bg-amber-50', 'text-amber-700', 'font-semibold', 'bg-white', 'text-amber-600', 'border-amber-600', 'hover:bg-amber-50', 'shadow-sm');
            if (isActive) {
                link.classList.add('bg-amber-50', 'text-amber-700', 'font-semibold', 'border-amber-600');
            } else {
                link.classList.add('bg-white', 'border', 'border-amber-600', 'text-amber-600', 'hover:bg-amber-50', 'shadow-sm');
            }
        });
    },

    mostrarPantallaNeutral: function(grupos) {
        document.getElementById('main-header-title').textContent = "Bienvenido al Banco del Pincel Dorado";
        document.getElementById('page-subtitle').innerHTML = ''; 
        document.getElementById('table-container').innerHTML = '';
        document.getElementById('table-container').classList.add('hidden');

        // Llenar paneles principales
        const bovedaContainer = document.getElementById('boveda-card-container');
        const tesoreriaContainer = document.getElementById('tesoreria-card-container');
        const top3Grid = document.getElementById('top-3-grid');
        
        const allStudents = AppState.datosAdicionales.allStudents;
        const totalGeneral = allStudents.filter(s => s.pinceles > 0).reduce((sum, user) => sum + user.pinceles, 0);
        const tesoreriaSaldo = AppState.datosAdicionales.saldoTesoreria;
        
        bovedaContainer.innerHTML = `
            <div class="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl shadow-xl p-4 h-full flex flex-col justify-between text-white">
                <div>
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-medium opacity-80 truncate">Total en Cuentas</span>
                        <span class="text-xs font-bold bg-white/20 text-white rounded-full px-2 py-0.5 w-20 text-center flex-shrink-0">BÓVEDA</span>
                    </div>
                    <div class="flex justify-between items-baseline mt-3">
                        <p class="text-lg font-semibold truncate">Pinceles Totales</p>
                        <p class="text-3xl font-bold">${AppFormat.formatNumber(totalGeneral)} ℙ</p>
                    </div>
                </div>
            </div>`;
        
        tesoreriaContainer.innerHTML = `
            <div class="bg-gradient-to-l from-amber-500 to-amber-600 rounded-xl shadow-xl p-4 h-full flex flex-col justify-between text-white">
                <div>
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-medium opacity-80 truncate">Capital Operativo</span>
                        <span class="text-xs font-bold bg-white/20 text-white rounded-full px-2 py-0.5 w-20 text-center flex-shrink-0">TESORERÍA</span>
                    </div>
                    <div class="flex justify-between items-baseline mt-3">
                        <p class="text-lg font-semibold truncate">Fondo del Banco</p>
                        <p class="text-3xl font-bold">${AppFormat.formatNumber(tesoreriaSaldo)} ℙ</p>
                    </div>
                </div>
            </div>`;
        
        const depositosActivos = AppState.datosAdicionales.depositosActivos;
        const studentsWithCapital = allStudents.map(student => {
            const totalInvertidoDepositos = depositosActivos
                .filter(deposito => (deposito.alumno || '').trim() === (student.nombre || '').trim())
                .reduce((sum, deposito) => (sum + (Number(deposito.monto) || 0)), 0);
            const capitalTotal = student.pinceles + totalInvertidoDepositos;
            return { ...student, totalInvertidoDepositos, capitalTotal };
        });

        const topN = studentsWithCapital.sort((a, b) => b.capitalTotal - a.capitalTotal).slice(0, 3);
        
        let top3Html = '';
        if (topN.length > 0) {
            top3Html = topN.map((student, index) => {
                const pincelesLiquidosF = AppFormat.formatNumber(student.pinceles);
                const totalInvertidoF = AppFormat.formatNumber(student.totalInvertidoDepositos);
                return `
                    <div class="bg-white border border-slate-200 rounded-xl shadow-lg shadow-dorado-soft/10 p-3 h-full flex flex-col justify-between transition-all hover:shadow-xl">
                        <div>
                            <div class="flex items-center justify-between mb-1">
                                <span class="text-sm font-medium text-slate-500 truncate">${student.grupoNombre || 'N/A'}</span>
                                <span class="text-lg font-extrabold color-dorado-main">${index + 1}º</span>
                            </div>
                            <p class="text-base font-semibold text-slate-900 truncate">${student.nombre}</p>
                        </div>
                        <div class="text-right mt-2">
                            <div class="tooltip-container relative inline-block">
                                <p class="text-xl font-bold color-dorado-main">${AppFormat.formatNumber(student.capitalTotal)} ℙ</p>
                                <div class="tooltip-text hidden md:block w-48">
                                    <span class="font-bold">Capital Total</span>
                                    <div class="flex justify-between mt-1 text-xs"><span>Capital Líquido:</span> <span>${pincelesLiquidosF} ℙ</span></div>
                                    <div class="flex justify-between text-xs"><span>Capital Invertido:</span> <span>${totalInvertidoF} ℙ</span></div>
                                    <svg class="absolute text-gray-800 h-2 w-full left-0 bottom-full" x="0px" y="0px" viewBox="0 0 255 255" xml:space="preserve"><polygon class="fill-current" points="0,255 127.5,127.5 255,255"/></svg>
                                </div>
                            </div>
                        </div>
                    </div>`;
            }).join('');
        }
        for (let i = topN.length; i < 3; i++) {
            top3Html += `
                <div class="bg-white rounded-xl shadow-lg shadow-dorado-soft/10 p-3 opacity-50 h-full flex flex-col justify-between border border-slate-200">
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-sm font-medium text-slate-400">-</span>
                            <span class="text-lg font-extrabold text-slate-400">${i + 1}º</span>
                        </div>
                        <p class="text-base font-semibold text-slate-400 truncate">-</p>
                    </div>
                    <div class="text-right mt-2">
                         <p class="text-xl font-bold text-slate-400">- ℙ</p>
                    </div>
                </div>`;
        }
        top3Grid.innerHTML = top3Html;
        
        document.getElementById('home-stats-container').classList.remove('hidden');
        document.getElementById('home-modules-grid').classList.remove('hidden');
        AppUI.showHeroSlide(0);
    },

    mostrarDatosGrupo: function(grupo) {
        document.getElementById('main-header-title').textContent = grupo.nombre;
        
        let totalColor = "text-amber-700"; 
        
        document.getElementById('page-subtitle').innerHTML = `<h2 class="text-xl font-semibold text-slate-900">Total del Grupo: <span class="${totalColor}">${AppFormat.formatNumber(grupo.total)} ℙ</span></h2>`;
        
        const listContainer = document.getElementById('table-container');
        listContainer.classList.remove('overflow-hidden', 'p-4', 'space-y-0'); 

        const usuariosOrdenados = [...grupo.usuarios].sort((a, b) => b.pinceles - a.pinceles);

        const listBody = document.createElement('div');
        listBody.className = "divide-y divide-amber-100"; 

        usuariosOrdenados.forEach((usuario, index) => {
            const pos = index + 1;
            const rankTextClass = 'color-dorado-main';
            const pincelesColor = 'color-dorado-main';
            const grupoNombreEscapado = escapeHTML(grupo.nombre);
            const usuarioNombreEscapado = escapeHTML(usuario.nombre);

            const itemDiv = document.createElement('div');
            itemDiv.className = `grid grid-cols-12 px-6 py-3 hover:bg-slate-100 cursor-pointer transition-colors`;
            itemDiv.setAttribute('onclick', `AppUI.showStudentModal('${grupoNombreEscapado}', '${usuarioNombreEscapado}', ${pos})`);
            itemDiv.innerHTML = `
                <div class="col-span-1 text-center font-extrabold ${rankTextClass} text-lg">${pos}</div>
                <div class="col-span-8 text-left text-sm font-medium text-slate-900 truncate">${usuario.nombre}</div>
                <div class="col-span-3 text-right text-sm font-semibold ${pincelesColor}">${AppFormat.formatNumber(usuario.pinceles)} ℙ</div>
            `;
            listBody.appendChild(itemDiv);
        });

        listContainer.innerHTML = `
            <div class="grid grid-cols-12 px-6 py-3">
                <div class="col-span-1 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">Rank</div>
                <div class="col-span-8 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Nombre</div>
                <div class="col-span-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">Pinceles</div>
            </div>
        `;
        listContainer.appendChild(listBody);
        
        if (usuariosOrdenados.length === 0) {
            listContainer.innerHTML += `<div class="text-center p-6 text-slate-500">No hay alumnos en este grupo.</div>`;
        }

        listContainer.classList.remove('hidden');
        document.getElementById('home-stats-container').classList.add('hidden');
        document.getElementById('home-modules-grid').classList.add('hidden');
    },
    
    // --- LÓGICA DE CALCULADORAS (Llamadas desde AppData y Listeners) ---
    updatePrestamoCalculadora: function() {
        const montoInput = document.getElementById('prestamo-monto-input');
        const plazoInput = document.getElementById('prestamo-plazo-input');
        const plazoDisplay = document.getElementById('prestamo-plazo-display');
        const tasaDisplay = document.getElementById('prestamo-tasa-display');
        const totalPagarDisplay = document.getElementById('prestamo-total-pagar-display');
        const cuotaDiariaDisplay = document.getElementById('prestamo-cuota-diaria-display');
        const btn = document.getElementById('prestamo-submit-btn');
        const statusMsg = document.getElementById('prestamo-elegibilidad-msg');
        
        if (!montoInput || !plazoInput) return; // Salir si el modal no está renderizado

        const monto = parseInt(montoInput.value) || 0;
        const plazo = parseInt(plazoInput.value) || 0;
        const student = AppState.currentSearch.prestamoAlumno.info;
        
        plazoDisplay.textContent = `${plazo} Días`;
        
        const minMonto = AppConfig.PRESTAMO_MIN_MONTO;
        const maxMonto = AppConfig.PRESTAMO_MAX_MONTO;
        
        if (monto < minMonto || monto > maxMonto || plazo < AppConfig.PRESTAMO_MIN_PLAZO_DIAS || plazo > AppConfig.PRESTAMO_MAX_PLAZO_DIAS) {
            tasaDisplay.textContent = '-';
            totalPagarDisplay.textContent = '0 ℙ';
            cuotaDiariaDisplay.textContent = '-';
            AppTransacciones.setEligibilityState(btn, statusMsg, false, `Monto entre ${AppFormat.formatNumber(minMonto)} ℙ y ${AppFormat.formatNumber(maxMonto)} ℙ.`, true);
            return;
        }

        const tasaDecimal = AppFormat.calculateLoanRate(plazo);
        const interesTotal = monto * tasaDecimal;
        const totalAPagar = Math.ceil(monto + interesTotal);
        const cuotaDiaria = Math.ceil(totalAPagar / plazo);
        
        tasaDisplay.textContent = `${(tasaDecimal * 100).toFixed(1)}%`;
        totalPagarDisplay.textContent = `${AppFormat.formatNumber(totalAPagar)} ℙ`;
        cuotaDiariaDisplay.textContent = `${AppFormat.formatNumber(cuotaDiaria)} ℙ`;

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

        if (monto < minMonto || plazo < AppConfig.DEPOSITO_MIN_PLAZO_DIAS || plazo > AppConfig.DEPOSITO_MAX_PLAZO_DIAS) {
            tasaDisplay.textContent = '-';
            gananciaDisplay.textContent = '0 ℙ';
            totalRecibirDisplay.textContent = '0 ℙ';
            AppTransacciones.setEligibilityState(btn, statusMsg, false, `Mínimo: ${AppFormat.formatNumber(minMonto)} ℙ. Plazo: 7-30 días.`, true);
            return;
        }

        const tasaDecimal = AppFormat.calculateDepositRate(plazo);
        const interesBruto = monto * tasaDecimal;
        const totalARecibir = Math.ceil(monto + interesBruto);
        
        tasaDisplay.textContent = `${(tasaDecimal * 100).toFixed(1)}%`;
        gananciaDisplay.textContent = `${AppFormat.formatNumber(Math.ceil(interesBruto))} ℙ`;
        totalRecibirDisplay.textContent = `${AppFormat.formatNumber(totalARecibir)} ℙ`;
        
        if (!student) {
            AppTransacciones.setEligibilityState(btn, statusMsg, false, 'Busque su nombre para validar elegibilidad.', true);
            return;
        }

        const elegibilidad = AppTransacciones.checkDepositEligibility(student, monto);
        AppTransacciones.setEligibilityState(btn, statusMsg, elegibilidad.isEligible, elegibilidad.message);
    },
    
    // --- LÓGICA DE BONOS (Llamada desde AppData) ---
    populateBonoList: function() {
        if (document.getElementById('bonos-modal').classList.contains('opacity-0')) return;
        const container = document.getElementById('bonos-lista-disponible');
        const bonos = AppState.bonos.disponibles;
        const student = AppState.currentSearch.bonoAlumno.info || { grupoNombre: null };
        const studentGroup = student.grupoNombre;
        const now = Date.now();
        const bonosActivos = bonos.filter(bono => {
            if (bono.usos_actuales >= bono.usos_totales) return false;
            if (bono.expiracion_fecha && new Date(bono.expiracion_fecha).getTime() < now) return false;
            const allowedGroups = (bono.grupos_permitidos || '').split(',').map(g => g.trim()).filter(g => g.length > 0);
            if (allowedGroups.length > 0 && studentGroup) { if (!allowedGroups.includes(studentGroup)) { return false; } }
            return true;
        });
        if (bonosActivos.length === 0) {
            container.innerHTML = `<p class="text-sm text-slate-500 text-center col-span-1 md:col-span-2">No hay bonos disponibles en este momento.</p>`;
            return;
        }
        container.innerHTML = bonosActivos.map(bono => {
            const recompensa = AppFormat.formatNumber(bono.recompensa);
            const usosRestantes = bono.usos_totales - bono.usos_actuales;
            const isCanjeado = AppState.bonos.canjeados.includes(bono.clave);
            const cardClass = isCanjeado ? 'bg-slate-50 shadow-inner border-slate-200 opacity-60' : 'bg-white shadow-md border-slate-200';
            const badge = isCanjeado ? `<span class="text-xs font-bold bg-slate-200 text-slate-700 rounded-full px-2 py-0.5">CANJEADO</span>` : `<span class="text-xs font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">DISPONIBLE</span>`;
            const claveEscapada = escapeHTML(bono.clave);
            return `
                <div class="rounded-lg shadow-sm p-4 border transition-all ${cardClass}">
                    <div class="flex justify-between items-center mb-2"><span class="text-sm font-medium text-slate-500 truncate">${bono.clave}</span>${badge}</div>
                    <p class="text-base font-semibold text-slate-900 truncate">${bono.nombre}</p>
                    <div class="flex justify-between items-baseline mt-3">
                        <span class="text-xs text-slate-500">Quedan ${usosRestantes}</span>
                        <div class="flex items-center space-x-3">
                            <span class="text-xl font-bold color-dorado-main">${recompensa} ℙ</span>
                            <button id="bono-btn-${bono.clave}" data-bono-clave="${bono.clave}" onclick="AppTransacciones.iniciarCanje('${claveEscapada}')" class="bono-buy-btn px-3 py-1 text-xs font-medium rounded-lg bg-white border border-amber-600 text-amber-600 hover:bg-amber-50 shadow-sm">Canjear</button>
                        </div>
                    </div>
                </div>`;
        }).join('');
    },
    
    // --- LÓGICA DE TIENDA (Llamada desde AppData) ---
    renderTiendaItems: function() {
        if (document.getElementById('tienda-modal').classList.contains('opacity-0')) return;
        const container = document.getElementById('tienda-items-container');
        const items = AppState.tienda.items;
        const student = AppState.currentSearch.tiendaAlumno.info || { grupoNombre: null };
        const studentGroup = student.grupoNombre;
        const now = Date.now();
        const itemKeys = Object.keys(items);
        const itemsActivos = itemKeys.filter(itemId => {
            const item = items[itemId];
            if (item.stock <= 0 && item.ItemID !== 'filantropo') return false;
            if (item.ExpiracionFecha && new Date(item.ExpiracionFecha).getTime() < now) return false;
            const allowedGroups = (item.GruposPermitidos || '').split(',').map(g => g.trim()).filter(g => g.length > 0);
            if (allowedGroups.length > 0 && studentGroup) { if (!allowedGroups.includes(studentGroup)) { return false; } }
            return true;
        });
        if (itemsActivos.length === 0) {
            container.innerHTML = `<p class="text-sm text-slate-500 text-center col-span-2">No hay artículos disponibles para ti en este momento.</p>`;
            return;
        }
        container.innerHTML = itemsActivos.sort((a,b) => items[a].precio - items[b].precio).map(itemId => {
            const item = items[itemId];
            const costoFinal = Math.round(item.precio * (1 + AppConfig.TASA_ITBIS));
            const itemIdEscapado = escapeHTML(item.ItemID);
            const stockText = item.stock === 9999 ? 'Ilimitado' : `Stock: ${item.stock}`;
            return `
                <div class="rounded-lg shadow-sm p-4 border transition-all bg-white shadow-md border-slate-200">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-xs font-medium text-slate-500 truncate">${item.Tipo} | ${stockText}</span>
                        <span class="text-xs font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">DISPONIBLE</span>
                    </div>
                    <p class="text-base font-semibold text-slate-900 truncate">
                        <span class="tooltip-container">${item.nombre}<div class="tooltip-text hidden md:block w-48">${item.descripcion}</div></span>
                    </p>
                    <div class="flex justify-between items-baseline mt-3">
                        <span class="text-xs text-slate-500">Base: ${AppFormat.formatNumber(item.precio)} ℙ (+ITBIS)</span>
                        <div class="flex items-center space-x-3">
                            <span class="text-xl font-bold color-dorado-main">${AppFormat.formatNumber(costoFinal)} ℙ</span>
                            <button id="buy-btn-${itemId}" data-item-id="${itemId}" onclick="AppTransacciones.iniciarCompra('${itemIdEscapado}')" class="tienda-buy-btn px-3 py-1 text-xs font-medium rounded-lg transition-colors shadow-sm">
                                <span class="btn-text">Comprar</span>
                            </button>
                        </div>
                    </div>
                </div>`;
        }).join('');
        AppUI.updateTiendaButtonStates();
    },
    
    // --- LÓGICA DE ADMIN (Llamada desde AppData) ---
    populateBonoAdminList: function() {
        const tbody = document.getElementById('bonos-admin-lista');
        const bonos = AppState.bonos.disponibles;
        if (bonos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">No hay bonos configurados.</td></tr>`;
            return;
        }
        const bonosOrdenados = [...bonos].sort((a, b) => a.clave.localeCompare(b.clave));
        tbody.innerHTML = bonosOrdenados.map(bono => {
            const recompensa = AppFormat.formatNumber(bono.recompensa);
            const usos = `${bono.usos_actuales} / ${bono.usos_totales}`;
            const isAgotado = bono.usos_actuales >= bono.usos_totales;
            const rowClass = isAgotado ? 'opacity-60 bg-slate-50' : 'hover:bg-slate-100';
            const claveEscapada = escapeHTML(bono.clave);
            return `
                <tr class="${rowClass}">
                    <td class="px-4 py-2 text-sm font-semibold text-slate-800">${bono.clave}</td>
                    <td class="px-4 py-2 text-sm text-slate-700">${bono.nombre}</td>
                    <td class="px-4 py-2 text-sm text-slate-800 text-right">${recompensa} ℙ</td>
                    <td class="px-4 py-2 text-sm text-slate-700 text-right">${usos}</td>
                    <td class="px-4 py-2 text-right text-sm">
                        <button onclick="AppUI.handleEditBono('${claveEscapada}')" class="font-medium text-amber-600 hover:text-amber-800 edit-bono-btn">Editar</button>
                        <button onclick="AppTransacciones.eliminarBono('${claveEscapada}')" class="ml-2 font-medium text-slate-600 hover:text-slate-800 delete-bono-btn">Eliminar</button>
                    </td>
                </tr>`;
        }).join('');
    },
    
    populateTiendaAdminList: function() {
        const tbody = document.getElementById('tienda-admin-lista');
        const items = AppState.tienda.items;
        const itemKeys = Object.keys(items);
        if (itemKeys.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">No hay artículos configurados.</td></tr>`;
            return;
        }
        const itemsOrdenados = itemKeys.sort((a,b) => a.localeCompare(b));
        tbody.innerHTML = itemsOrdenados.map(itemId => {
            const item = items[itemId];
            const precio = AppFormat.formatNumber(item.precio);
            const stock = item.stock;
            const rowClass = (stock <= 0 && item.ItemID !== 'filantropo') ? 'opacity-60 bg-slate-50' : 'hover:bg-slate-100';
            const itemIdEscapado = escapeHTML(item.ItemID);
            return `
                <tr id="tienda-item-row-${itemIdEscapado}" class="${rowClass}">
                    <td class="px-4 py-2 text-sm font-semibold text-slate-800">${item.ItemID}</td>
                    <td class="px-4 py-2 text-sm text-slate-700 truncate" title="${item.nombre}">${item.nombre}</td>
                    <td class="px-4 py-2 text-sm text-slate-800 text-right">${precio} ℙ</td>
                    <td class="px-4 py-2 text-sm text-slate-700 text-right">${stock}</td>
                    <td class="px-4 py-2 text-right text-sm">
                        <button onclick="AppUI.handleEditItem('${itemIdEscapado}')" class="font-medium text-amber-600 hover:text-amber-800 edit-item-btn">Editar</button>
                        <button onclick="AppUI.handleDeleteConfirmation('${itemIdEscapado}')" class="ml-2 font-medium text-slate-600 hover:text-slate-800 delete-item-btn">Eliminar</button>
                    </td>
                </tr>`;
        }).join('');
    },
    
    updateTiendaAdminStatusLabel: function() {
        const label = document.getElementById('tienda-admin-status-label');
        const container = label ? label.closest('div') : null;
        if (!label || !container) return;
        const status = AppState.tienda.storeManualStatus;
        label.classList.remove('text-amber-600', 'text-slate-800');
        container.classList.remove('bg-amber-100', 'bg-slate-200');
        container.classList.add('bg-slate-50');
        if (status === 'auto') { label.textContent = "Automático (por Temporizador)"; label.classList.add('text-amber-600'); } 
        else if (status === 'open') { label.textContent = "Forzado Abierto"; label.classList.add('text-slate-800'); container.classList.add('bg-amber-100'); } 
        else if (status === 'closed') { label.textContent = "Forzado Cerrado"; label.classList.add('text-slate-800'); container.classList.add('bg-slate-200'); } 
        else { label.textContent = "Desconocido"; label.classList.add('text-slate-600'); }
    },

    // **********************************************
    // 3. OTRAS FUNCIONES UI (Event Handlers, etc.)
    // **********************************************
    
    showP2PModal: function() {
        if (!AppState.datosActuales) return;
        AppUI.resetSearchInput('p2pOrigen');
        AppUI.resetSearchInput('p2pDestino');
        document.getElementById('p2p-clave').value = "";
        document.getElementById('p2p-cantidad').value = "";
        document.getElementById('p2p-calculo-impuesto').textContent = "";
        document.getElementById('p2p-status-msg').textContent = "";
        AppUI.showModal('p2p-transfer-modal');
    },
    
    updateP2PCalculoImpuesto: function() {
        const cantidadInput = document.getElementById('p2p-cantidad');
        const calculoMsg = document.getElementById('p2p-calculo-impuesto');
        const cantidad = parseInt(cantidadInput.value, 10);
        if (isNaN(cantidad) || cantidad <= 0) { calculoMsg.textContent = ""; return; }
        const impuesto = Math.ceil(cantidad * AppConfig.IMPUESTO_P2P_TASA);
        const total = cantidad + impuesto;
        calculoMsg.innerHTML = `<span class="color-dorado-main">Impuesto (${AppConfig.IMPUESTO_P2P_TASA * 100}%): ${AppFormat.formatNumber(impuesto)} ℙ | Total a debitar: ${AppFormat.formatNumber(total)} ℙ</span>`;
    },

    showBonoModal: function() {
        if (!AppState.datosActuales) return;
        AppUI.showBonoStep1();
        AppUI.populateBonoList();
        AppUI.showModal('bonos-modal');
    },

    showBonoStep1: function() {
        document.getElementById('bono-step-form-container').classList.add('hidden');
        document.getElementById('bono-step-list-container').classList.remove('hidden');
        AppState.bonos.selectedBono = null;
        document.getElementById('bono-status-msg').textContent = "";
        document.getElementById('bono-step2-status-msg').textContent = "";
        document.getElementById('bono-clave-p2p-step2').value = "";
        AppUI.resetSearchInput('bonoAlumno');
        AppTransacciones.setLoadingState(document.getElementById('bono-submit-step2-btn'), document.getElementById('bono-btn-text-step2'), false, 'Confirmar Canje');
    },

    showBonoStep2: function(bonoClave) {
        const bono = AppState.bonos.disponibles.find(b => b.clave === bonoClave);
        if (!bono) return;
        AppState.bonos.selectedBono = bonoClave;
        document.getElementById('bono-step-list-container').classList.add('hidden');
        document.getElementById('bono-step-form-container').classList.remove('hidden');
        document.getElementById('bono-item-name-display').textContent = bono.nombre;
        document.getElementById('bono-item-reward-display').textContent = `Recompensa: ${AppFormat.formatNumber(bono.recompensa)} ℙ`;
        document.getElementById('bono-clave-input-step2').value = bonoClave;
        document.getElementById('bono-step2-status-msg').textContent = "";
        document.getElementById('bono-search-alumno-step2').value = AppState.currentSearch.bonoAlumno.info?.nombre || '';
        document.getElementById('bono-clave-p2p-step2').focus();
    },

    showTiendaModal: function() {
        if (!AppState.datosActuales) return;
        AppUI.showTiendaStep1();
        const container = document.getElementById('tienda-items-container');
        const isLoading = container.innerHTML.includes('Cargando artículos...');
        if (isLoading || container.innerHTML.trim() === '') { AppUI.renderTiendaItems(); } else { AppUI.updateTiendaButtonStates(); }
        AppUI.updateTiendaAdminStatusLabel();
        AppUI.showModal('tienda-modal');
    },

    showTiendaStep1: function() {
        document.getElementById('tienda-step-form-container').classList.add('hidden');
        document.getElementById('tienda-step-list-container').classList.remove('hidden');
        AppState.tienda.selectedItem = null;
        document.getElementById('tienda-status-msg').textContent = "";
        document.getElementById('tienda-step2-status-msg').textContent = "";
        document.getElementById('tienda-clave-p2p-step2').value = "";
        document.getElementById('tienda-search-alumno-step2').value = AppState.currentSearch.tiendaAlumno.info?.nombre || '';
        AppTransacciones.setLoadingState(document.getElementById('tienda-submit-step2-btn'), document.getElementById('tienda-btn-text-step2'), false, 'Confirmar Compra');
        AppUI.updateTiendaButtonStates();
    },

    showTiendaStep2: function(itemId) {
        const item = AppState.tienda.items[itemId];
        if (!item) return;
        AppState.tienda.selectedItem = itemId;
        document.getElementById('tienda-step-list-container').classList.add('hidden');
        document.getElementById('tienda-step-form-container').classList.remove('hidden');
        const costoFinal = Math.round(item.precio * (1 + AppConfig.TASA_ITBIS));
        const costoItbis = costoFinal - item.precio;
        document.getElementById('tienda-item-name-display').textContent = item.nombre;
        document.getElementById('tienda-item-price-display').textContent = `Precio Base: ${AppFormat.formatNumber(item.precio)} ℙ`;
        document.getElementById('tienda-item-cost-display').innerHTML = `
            Costo Final (incl. ${AppConfig.TASA_ITBIS * 100}% ITBIS): 
            <span class="font-bold text-slate-800">${AppFormat.formatNumber(costoFinal)} ℙ</span>
            <span class="text-xs text-slate-500 block">(ITBIS: ${AppFormat.formatNumber(costoItbis)} ℙ)</span>
        `;
        document.getElementById('tienda-step2-status-msg').textContent = "";
        document.getElementById('tienda-search-alumno-step2').value = AppState.currentSearch.tiendaAlumno.info?.nombre || '';
        document.getElementById('tienda-clave-p2p-step2').focus();
    },

    updateTiendaButtonStates: function() {
        const items = AppState.tienda.items;
        const student = AppState.currentSearch.tiendaAlumno.info; 
        const isStoreOpen = AppState.tienda.isStoreOpen;
        const visibleItemIds = Array.from(document.querySelectorAll('#tienda-items-container button.tienda-buy-btn')).map(btn => btn.dataset.itemId);
        visibleItemIds.forEach(itemId => { 
            const item = items[itemId];
            const btn = document.getElementById(`buy-btn-${itemId}`);
            if (!btn || !item) return;
            const btnText = btn.querySelector('.btn-text');
            if (!btnText) return; 
            const costoFinal = Math.round(item.precio * (1 + AppConfig.TASA_ITBIS));
            btn.classList.remove('bg-amber-600', 'hover:bg-amber-700', 'text-white', 'shadow-md', 'shadow-amber-600/30', 'bg-gray-300', 'hover:bg-gray-300', 'text-gray-600', 'line-through', 'bg-red-100', 'text-red-700', 'border', 'border-red-200', 'cursor-not-allowed', 'shadow-none', 'bg-gray-200', 'text-gray-500', 'border-amber-600', 'hover:bg-amber-50', 'bg-white', 'text-amber-600', 'bg-slate-300', 'text-slate-600', 'bg-slate-100', 'border-slate-300'); 
            btn.disabled = false;
            btnText.textContent = "Comprar";
            if (!isStoreOpen) {
                btn.classList.add('bg-slate-300', 'text-slate-600', 'cursor-not-allowed', 'shadow-none', 'border', 'border-slate-300');
                btn.disabled = true;
                btnText.textContent = "Cerrada"; 
            } else if (student && student.pinceles < costoFinal) { 
                btn.classList.add('bg-slate-100', 'text-slate-600', 'border', 'border-slate-300', 'cursor-not-allowed', 'shadow-none', 'hover:bg-slate-100');
                btn.disabled = true;
                btnText.textContent = "Sin Fondos"; 
            } else {
                btn.classList.add('bg-white', 'border', 'border-amber-600', 'text-amber-600', 'hover:bg-amber-50', 'shadow-sm');
                btnText.textContent = "Comprar";
            }
        });
    },

    updateReglasModalContent: function() {
        const content = document.getElementById('reglas-content');
        if (!content) return;
        
        content.innerHTML = `
            <div class="space-y-3">
                <h4 class="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2">Economía Rebalanceada (v2.1)</h4>
                <p class="text-slate-700 text-justify">Para fomentar la circulación de Pinceles (ℙ) y la confianza en el sistema, la economía ha sido rebalanceada:</p>
                <div class="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                    <p class="text-sm text-slate-700"><strong class="font-medium text-slate-800">Impuesto P2P:</strong> Se reduce al ${AppConfig.IMPUESTO_P2P_TASA * 100}% (Antes 10%). Mover tu dinero ahora es más económico.</p>
                    <p class="text-sm text-slate-700"><strong class="font-medium text-slate-800">Impuesto ITBIS (Tienda):</strong> Se reduce al ${AppConfig.TASA_ITBIS * 100}% (Antes 18%). Tus compras en la tienda son más accesibles.</p>
                    <p class="text-sm text-slate-700"><strong class="font-medium text-slate-800">Impuesto a Depósitos:</strong> ¡Eliminado! (Antes 5%). La tasa de interés que ves es la que recibes. Fomentamos el ahorro sin penalizaciones.</p>
                </div>
            </div>
            
            <div class="space-y-3 pt-4 border-t border-slate-200">
                 <h4 class="text-lg font-semibold text-slate-800">Préstamos Flexibles (Autoservicio)</h4>
                 <p class="text-slate-700 text-justify">
                    Ya no existen paquetes fijos. Ahora puedes solicitar exactamente el monto que necesitas (entre ${AppFormat.formatNumber(AppConfig.PRESTAMO_MIN_MONTO)} y ${AppFormat.formatNumber(AppConfig.PRESTAMO_MAX_MONTO)} ℙ) y elegir el plazo (de ${AppConfig.PRESTAMO_MIN_PLAZO_DIAS} a ${AppConfig.PRESTAMO_MAX_PLAZO_DIAS} días).
                 </p>
                 <p class="text-slate-700 text-justify">
                    La tasa de interés es dinámica: comienza en ${AppConfig.PRESTAMO_TASA_BASE * 100}% base y aumenta un ${AppConfig.PRESTAMO_BONUS_POR_DIA * 100}% por cada día de plazo. A menor plazo, menor interés pagas.
                 </p>
                 <div class="bg-slate-200 p-4 rounded-lg border border-slate-300">
                    <h5 class="font-semibold text-slate-800 mb-1">Reglas de Elegibilidad (Préstamo)</h5>
                    <p class="text-sm text-slate-700">1. Debes tener saldo positivo (no se permiten rescates).</p>
                    <p class="text-sm text-slate-700">2. No puedes tener otro préstamo activo.</p>
                    <p class="text-sm text-slate-700">3. El monto solicitado no puede superar el 50% de tu saldo líquido actual.</p>
                </div>
            </div>

            <div class="space-y-3 pt-4 border-t border-slate-200">
                 <h4 class="text-lg font-semibold text-slate-800">Inversiones Flexibles (Depósitos)</h4>
                 <p class="text-slate-700 text-justify">
                    Maximiza tu esfuerzo. Puedes crear depósitos flexibles (mínimo ${AppFormat.formatNumber(AppConfig.DEPOSITO_MIN_MONTO)} ℙ) con plazos de ${AppConfig.DEPOSITO_MIN_PLAZO_DIAS} a ${AppConfig.DEPOSITO_MAX_PLAZO_DIAS} días.
                 </p>
                 <p class="text-slate-700 text-justify">
                    La tasa de ganancia es dinámica: comienza en ${AppConfig.DEPOSITO_TASA_BASE * 100}% base y aumenta un ${AppConfig.DEPOSITO_BONUS_POR_DIA * 100}% por cada día de plazo. ¡A más largo plazo, mayor es tu recompensa!
                 </p>
                 <div class="bg-slate-200 p-4 rounded-lg border border-slate-300">
                    <h5 class="font-semibold text-slate-800 mb-1">Reglas de Elegibilidad (Depósito)</h5>
                    <p class="text-sm text-slate-700">1. Debes tener los fondos líquidos disponibles en tu cuenta.</p>
                    <p class="text-sm text-slate-700">2. No puedes tener un préstamo activo para poder invertir.</p>
                </div>
            </div>
        `;
        AppUI.showModal('reglas-modal');
    },

    // ... (rest of AppUI methods OMITTED for brevity, like showStudentModal, updateCountdown, etc.)
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
            const response = await AppTransacciones.fetchWithExponentialBackoff(AppConfig.API_URL, { method: 'POST', body: JSON.stringify(payload) });
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
            const response = await AppTransacciones.fetchWithExponentialBackoff(AppConfig.API_URL, { method: 'POST', body: JSON.stringify(payload) });
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
        if (statusMsgEl) { statusMsgEl.textContent = message; statusMsgEl.className = "text-sm text-center font-medium color-dorado-main h-auto min-h-[1EEM]"; }
    },
    setError: function(statusMsgEl, message, colorClass = 'text-red-600') {
        if (statusMsgEl) { statusMsgEl.textContent = `Error: ${message}`; statusMsgEl.className = `text-sm text-center font-medium ${colorClass} h-auto min-h-[1em]`; }
    }
};

// Función auxiliar necesaria para los botones on-click
function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

window.AppUI = AppUI;
window.AppFormat = AppFormat;
window.AppTransacciones = AppTransacciones;

// Exponer funciones globales para onclick
window.AppUI.handleEditBono = (clave) => AppUI.handleEditBono(clave);
window.AppTransacciones.eliminarBono = (clave) => AppTransacciones.eliminarBono(clave);
window.AppUI.handleEditItem = (id) => AppUI.handleEditItem(id);
window.AppUI.handleDeleteConfirmation = (id) => AppUI.handleDeleteConfirmation(id);
window.AppUI.cancelDeleteConfirmation = (id) => AppUI.cancelDeleteConfirmation(id);
window.AppTransacciones.eliminarItem = (id) => AppTransacciones.eliminarItem(id);
window.AppTransacciones.toggleStoreManual = (status) => AppTransacciones.toggleStoreManual(status);
window.AppTransacciones.iniciarCompra = (id) => AppTransacciones.iniciarCompra(id);
window.AppTransacciones.iniciarCanje = (clave) => AppTransacciones.iniciarCanje(clave);
window.AppUI.showStudentModal = (grupo, usuario, rank) => AppUI.showStudentModal(grupo, usuario, rank);

window.onload = function() {
    AppUI.init();
    
    // Llenado visual inicial de sliders y listeners
    const updateSliderFill = (input) => {
        if (!input || input.type !== 'range') return;
        const min = input.min ? input.min : 0;
        const max = input.max ? input.max : 100;
        const val = input.value;
        const percent = ((val - min) / (max - min)) * 100;
        input.style.background = `linear-gradient(to right, #d97706 0%, #d97706 ${percent}%, #cbd5e1 ${percent}%, #cbd5e1 100%)`;
    };

    setTimeout(() => {
        document.querySelectorAll('input[type="range"]').forEach(input => {
            updateSliderFill(input);
        });
    }, 100);
};
