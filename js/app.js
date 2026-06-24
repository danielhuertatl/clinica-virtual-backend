// Variable global para detectar cambios en edición
let personaOriginal = null;

document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DE LOGIN ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const usuarioInput = document.getElementById('usuario').value;
            const contrasenaInput = document.getElementById('contrasena').value;

            try {
                const respuesta = await fetch('https://clinica-virtual-backend.onrender.com/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo: usuarioInput, password: contrasenaInput })
                });

                const datos = await respuesta.json();

                if (datos.success) {
                    // Limpiar datos de sesión anterior
                    localStorage.removeItem('cedulaUsuario');
                    localStorage.removeItem('idPaciente');
                    
                    localStorage.setItem('nombreUsuario', datos.nombre); 
                    localStorage.setItem('rolUsuario', datos.rol); 
                    if (datos.cedula) localStorage.setItem('cedulaUsuario', datos.cedula);
                    if (datos.id_paciente) localStorage.setItem('idPaciente', datos.id_paciente);
                    alert('¡Acceso concedido! Entrando como: ' + datos.rol);
                    
                    if (datos.rol === 'admin') window.location.href = 'pages/5-admin.html';
                    else if (datos.rol === 'doctor') window.location.href = 'pages/2-doctor.html';
                    else if (datos.rol === 'enfermero') window.location.href = 'pages/4-enfermero.html';
                    else window.location.href = 'pages/3-paciente.html'; 
                } else {
                    alert('⚠️ ' + datos.mensaje);
                }
            } catch (error) {
                console.error('🛑 Error detallado en fetch (Login):', error);
                alert('❌ Error de conexión.');
            }
        });
    }

    // --- LÓGICA DE ENVÍO DE EDICIÓN ---
    const formEditar = document.getElementById('form-editar-personal');
    if (formEditar) {
        formEditar.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!personaOriginal) return alert("⚠️ Primero debe buscar y cargar un personal.");

            const datosEditados = {
                cedula: document.getElementById('display-cedula').value,
                nombre: document.getElementById('nombre').value,
                apellido_p: document.getElementById('apellido_p').value,
                apellido_m: document.getElementById('apellido_m').value,
                telefono: document.getElementById('telefono').value,
                correo: document.getElementById('email').value,
                calle: document.getElementById('calle').value,
                num_ext: document.getElementById('num_ext').value,
                cp: document.getElementById('cp').value,
                colonia: document.getElementById('colonia').value
            };

            // Comparar si hubo cambios reales contra la "foto" original
            const huboCambios = Object.keys(datosEditados).some(key => {
                return String(datosEditados[key]) !== String(personaOriginal[key]);
            });

            if (!huboCambios) {
                alert("ℹ️ No se detectaron cambios. No se requiere actualizar.");
                return;
            }

            // Validaciones rápidas
            if (datosEditados.telefono.length !== 10 || datosEditados.cp.length !== 5) {
                return alert("⚠️ Formato de teléfono o CP incorrecto.");
            }

            try {
                const res = await fetch('https://clinica-virtual-backend.onrender.com/api/personal/update', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosEditados)
                });
                const resData = await res.json();

                if (resData.success) {
                    alert("✅ " + resData.mensaje);
                    window.location.href = '5-admin.html';
                } else {
                    alert("⚠️ " + resData.mensaje);
                }
            } catch (err) {
                console.error('🛑 Error detallado en fetch (Update):', err);
                alert("❌ Error al conectar para actualizar.");
            }
        });
    }

    // --- CÁLCULO DE IMC AUTOMÁTICO (PANTALLA 6) ---
    const inputPeso = document.getElementById('input-peso');
    const inputTalla = document.getElementById('input-talla');
    const inputImc = document.getElementById('input-imc');

    if (inputPeso && inputTalla && inputImc) {
        const calcularIMC = () => {
            const peso = parseFloat(inputPeso.value);
            const talla = parseFloat(inputTalla.value);
            if (peso > 0 && talla > 0) {
                const imc = (peso / (talla * talla)).toFixed(2);
                inputImc.value = imc;
            } else {
                inputImc.value = "";
            }
        };
        inputPeso.addEventListener('input', calcularIMC);
        inputTalla.addEventListener('input', calcularIMC);
    }

    // --- LLENAR RECETA PARA IMPRESIÓN (PANTALLA 20) ---
    const contenidoReceta = document.getElementById('contenido-receta');
    const fechaReceta = document.getElementById('fecha-receta');
    const nombrePacienteReceta = document.getElementById('nombre-paciente-receta');
    const nombreDoctorReceta = document.getElementById('nombre-doctor-receta');
    const cedulaDoctorReceta = document.getElementById('cedula-doctor-receta');
    
    // --- NUEVOS CAMPOS ---
    const edadPacienteReceta = document.getElementById('edad-paciente-receta');
    const pesoPacienteReceta = document.getElementById('peso-paciente-receta');
    const tallaPacienteReceta = document.getElementById('talla-paciente-receta');
    const imcPacienteReceta = document.getElementById('imc-paciente-receta');
    
    if (contenidoReceta && fechaReceta) {
        const recetaGuardada = localStorage.getItem('recetaTemporal') || 'Sin indicaciones...';
        const fechaGuardada = localStorage.getItem('fechaReceta') || '--/--/----';
        contenidoReceta.textContent = recetaGuardada;
        fechaReceta.textContent = fechaGuardada;
        
        // Llenar datos dinámicos si existen los campos en el HTML
        if (nombrePacienteReceta) nombrePacienteReceta.textContent = localStorage.getItem('pacienteTemporal') || 'Paciente no registrado';
        if (nombreDoctorReceta) nombreDoctorReceta.textContent = 'Dr(a). ' + (localStorage.getItem('nombreUsuario') || 'No especificado');
        if (cedulaDoctorReceta) cedulaDoctorReceta.textContent = localStorage.getItem('cedulaUsuario') || 'S/N';
        
        if (edadPacienteReceta) edadPacienteReceta.textContent = localStorage.getItem('edadTemporal') || '--';
        if (pesoPacienteReceta) pesoPacienteReceta.textContent = localStorage.getItem('pesoTemporal') ? localStorage.getItem('pesoTemporal') + ' kg' : '--';
        if (tallaPacienteReceta) tallaPacienteReceta.textContent = localStorage.getItem('tallaTemporal') ? localStorage.getItem('tallaTemporal') + ' m' : '--';
        if (imcPacienteReceta) imcPacienteReceta.textContent = localStorage.getItem('imcTemporal') || '--';
        
        // --- RECETA: ESTUDIOS PENDIENTES ---
        const estudiosPendientesReceta = localStorage.getItem('estudiosPendientesReceta');
        const contPendientesReceta = document.getElementById('contenedor-pendientes-receta');
        const txtPendientesReceta = document.getElementById('texto-pendientes-receta');
        if (contPendientesReceta && txtPendientesReceta) {
            if (estudiosPendientesReceta) {
                contPendientesReceta.style.display = 'block';
                txtPendientesReceta.textContent = estudiosPendientesReceta;
            } else {
                contPendientesReceta.style.display = 'none';
            }
        }
        
        // --- RECETA: ESTUDIOS INTERPRETADOS (RESULTADOS) ---
        const estudiosInterpretadosReceta = localStorage.getItem('estudiosInterpretadosReceta');
        const contInterpretadosReceta = document.getElementById('contenedor-interpretados-receta');
        const txtInterpretadosReceta = document.getElementById('texto-interpretados-receta');
        if (contInterpretadosReceta && txtInterpretadosReceta) {
            if (estudiosInterpretadosReceta) {
                contInterpretadosReceta.style.display = 'block';
                txtInterpretadosReceta.textContent = estudiosInterpretadosReceta;
            } else {
                contInterpretadosReceta.style.display = 'none';
            }
        }
    }

    // --- RELOJ ACTUAL (ACTUALIZA LA HORA CADA SEGUNDO) ---
    setInterval(() => {
        const reloj = document.getElementById('reloj-actual');
        if (reloj) {
            const ahora = new Date();
            const horas = String(ahora.getHours()).padStart(2, '0');
            const minutos = String(ahora.getMinutes()).padStart(2, '0');
            reloj.textContent = `${horas}:${minutos}`;
        }
    }, 1000);

    // --- LÓGICA PARA AMPLIAR RECETA (PANTALLA 6) ---
    const btnExpandir = document.getElementById('btn-expandir');
    const textoReceta = document.getElementById('texto-receta');
    
    if (btnExpandir && textoReceta) {
        btnExpandir.addEventListener('click', () => {
            textoReceta.classList.toggle('receta-expandida');
            btnExpandir.classList.toggle('btn-flotante');
            
            if (textoReceta.classList.contains('receta-expandida')) {
                btnExpandir.innerText = 'Minimizar ⤢';
            } else {
                btnExpandir.innerText = 'Ampliar ⤢';
            }
        });
    }

    // --- CARGAR AGENDA DEL DOCTOR (PANTALLA 7) ---
    const contenedorCitasHoy = document.getElementById('contenedor-citas-hoy-agenda');
    const filtroFechaAgenda = document.getElementById('filtro-fecha-agenda');
    
    if (contenedorCitasHoy) {
        const cargarCitasDoctor = async (fecha) => {
            const cedula = localStorage.getItem('cedulaUsuario');
            if (!cedula || cedula === 'undefined') return;

            try {
                const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/citas/doctor/${cedula}/fecha/${fecha}`);
                const data = await res.json();
                contenedorCitasHoy.innerHTML = ''; 

                if (data.success && data.citas.length > 0) {
                    data.citas.forEach(cita => {
                        const nombreCompleto = `${cita.nombre} ${cita.apellido_paterno} ${cita.apellido_materno || ''}`.trim();
                        const horaCita = cita.hora.substring(0, 5); // Ej. "13:43"
                        
                        contenedorCitasHoy.innerHTML += `
                            <div class="tarjeta-cita">
                                <div class="info-cita">
                                    <p style="font-size: 18px; font-weight: bold; color: #0E3B5C;">${horaCita} hrs</p>
                                    <p><strong>${nombreCompleto}</strong></p>
                                    <p style="font-size: 12px; color: #666;">Estatus: ${cita.estatus}</p>
                                </div>
                                <div>
                                    <button class="btn-accion" onclick="iniciarConsultaDesdeAgenda(${cita.id_paciente})">Iniciar Consulta</button>
                                </div>
                            </div>
                        `;
                    });
                } else {
                    contenedorCitasHoy.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No tiene citas programadas para esta fecha.</p>';
                }
            } catch (error) {
                console.error('Error al cargar agenda:', error);
                contenedorCitasHoy.innerHTML = '<p style="text-align: center; color: #991D27;">Error al conectar con la agenda.</p>';
            }
        };

        const initAgenda = () => {
            const hoy = new Date().toISOString().split('T')[0];
            if (filtroFechaAgenda) {
                filtroFechaAgenda.value = hoy;
                filtroFechaAgenda.addEventListener('change', (e) => cargarCitasDoctor(e.target.value));
            }
            cargarCitasDoctor(filtroFechaAgenda ? filtroFechaAgenda.value : hoy);
        };
        initAgenda();
    }

    // --- AUTO-CARGAR PACIENTE DESDE LA AGENDA A LA CONSULTA (PANTALLA 6) ---
    const inputBusquedaConsulta = document.getElementById('id-busqueda');
    if (inputBusquedaConsulta && window.location.pathname.includes('6-consulta-ahora.html')) {
        const pacienteAgenda = localStorage.getItem('pacienteAtenderAhora');
        if (pacienteAgenda) {
            inputBusquedaConsulta.value = pacienteAgenda;
            setTimeout(() => {
                if (typeof buscarPacienteConsulta === 'function') buscarPacienteConsulta();
                localStorage.removeItem('pacienteAtenderAhora'); 
            }, 300); // Retardo sutil para asegurar que todo el HTML cargó
        }
    }

    // --- CARGAR CITAS DEL PACIENTE (PANTALLA 26) ---
    const contenedorProximaCita = document.getElementById('contenedor-proxima-cita');
    const contenedorHistorialCitas = document.getElementById('contenedor-historial-citas');
    const mensajeSinCitas = document.getElementById('mensaje-sin-citas');

    if (contenedorProximaCita && contenedorHistorialCitas && mensajeSinCitas) {
        const cargarMisCitas = async () => {
            const idPaciente = localStorage.getItem('idPaciente');
            if (!idPaciente) return;

            try {
                const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/citas/paciente/${idPaciente}`);
                const data = await res.json();
                
                contenedorProximaCita.innerHTML = '';
                contenedorHistorialCitas.innerHTML = '';
                
                if (data.success && data.citas.length > 0) {
                    let tieneProxima = false;
                    const hoy = new Date();
                    hoy.setHours(0,0,0,0);

                    data.citas.forEach(cita => {
                        const nombreDoctor = `Dr(a). ${cita.nombre} ${cita.apellido_paterno} ${cita.apellido_materno || ''}`.trim();
                        const fechaSolo = cita.fecha.split('T')[0];
                        const fechaCita = new Date(fechaSolo + 'T12:00:00'); // Evita desfase horario
                        const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                        const fechaFormateada = fechaCita.toLocaleDateString('es-MX', opcionesFecha);
                        const horaFormateada = cita.hora.substring(0, 5) + ' hrs';

                        if (fechaCita >= hoy && cita.estatus === 'agendada') {
                            tieneProxima = true;
                            contenedorProximaCita.innerHTML += `
                                <div class="tarjeta-cita-destacada">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                                        <div>
                                            <p style="font-size: 20px; font-weight: bold; color: #0E3B5C; text-transform: capitalize;">${fechaFormateada}</p>
                                            <p style="font-size: 18px; color: #991D27;">${horaFormateada}</p>
                                        </div>
                                        <span style="background-color: #e6f4ea; color: #1e8e3e; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">CONFIRMADA</span>
                                    </div>
                                    <p style="margin-bottom: 5px;"><strong>Doctor(a):</strong> ${nombreDoctor}</p>
                                    <p style="font-size: 14px; color: #666; margin-bottom: 20px;"><strong>Ubicación:</strong> Consultorio Asignado</p>
                                    <div style="display: flex; gap: 10px;">
                                        <button class="btn-accion-rojo" style="flex: 1;" onclick="cancelarCitaPaciente(${cita.id_cita})">❌ Cancelar Cita</button>
                                    </div>
                                </div>
                            `;
                        } else {
                            const colorEstatus = cita.estatus === 'cancelada' ? '#991D27' : '#2D5A27';
                            contenedorHistorialCitas.innerHTML += `
                                <div class="tarjeta-cita" style="opacity: 0.7;">
                                    <div class="info-cita">
                                        <p style="font-size: 14px; color: #666; text-transform: capitalize;">${fechaFormateada} - ${horaFormateada}</p>
                                        <p><strong>${nombreDoctor}</strong></p>
                                        <p style="font-size: 12px; color: ${colorEstatus}; font-weight: bold; text-transform: uppercase;">${cita.estatus}</p>
                                    </div>
                                </div>
                            `;
                        }
                    });
                    mensajeSinCitas.style.display = tieneProxima ? 'none' : 'block';
                } else {
                    mensajeSinCitas.style.display = 'block';
                }
            } catch (error) { console.error(error); }
        };
        cargarMisCitas();
    }

    // --- AUTO-CARGAR USUARIOS SI ESTAMOS EN LA PANTALLA 30 ---
    if (window.location.pathname.includes('30-lista-usuarios.html')) {
        cargarUsuariosAdmin();
    }

    // --- AUTO-CARGAR AGENDA DE ENFERMERÍA (PANTALLA 28) ---
    if (window.location.pathname.includes('28-agenda-enfermero.html')) {
        cargarAgendaEnfermeria();
    }

    // --- AUTO-CARGAR HORARIO DEL DOCTOR (PANTALLA 25) ---
    if (window.location.pathname.includes('25-editar-horario.html')) {
        cargarHorarioDoctor();
    }
});

// --- FUNCIÓN DE BÚSQUEDA (Global para el botón onclick) ---
window.simularBusqueda = async function() {
    const termino = document.getElementById('buscar-cedula').value.trim();
    if (!termino) return alert("⚠️ Ingrese una Cédula Profesional o Correo Electrónico.");

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/personal/${termino}`);
        const data = await res.json();

        if (data.success) {
            const p = data.persona;
            // Guardamos el original para comparar cambios después
            personaOriginal = {
                cedula: p.cedula_id,
                nombre: p.nombre,
                apellido_p: p.apellido_paterno,
                apellido_m: p.apellido_materno,
                telefono: p.telefono,
                correo: p.correo,
                calle: p.direccion_calle,
                num_ext: p.direccion_num_ext,
                cp: p.direccion_cp,
                colonia: p.direccion_colonia
            };

            // Llenar campos visibles
            document.getElementById('nombre').value = p.nombre;
            document.getElementById('apellido_p').value = p.apellido_paterno;
            document.getElementById('apellido_m').value = p.apellido_materno;
            document.getElementById('telefono').value = p.telefono;
            document.getElementById('email').value = p.correo;
            document.getElementById('calle').value = p.direccion_calle;
            document.getElementById('num_ext').value = p.direccion_num_ext;
            document.getElementById('cp').value = p.direccion_cp;
            document.getElementById('colonia').value = p.direccion_colonia;
            
            // Campos solo lectura
            document.getElementById('display-puesto').value = p.puesto;
            document.getElementById('display-cedula').value = p.cedula_id;

            alert("✅ Datos de " + p.nombre + " cargados.");
        } else {
            alert("❌ Personal no encontrado.");
        }
    } catch (error) {
        console.error('🛑 Error detallado en fetch (Buscar):', error);
        alert("❌ Error de conexión al buscar.");
    }
};

// --- CANCELAR CITA DEL PACIENTE (PANTALLA 26) ---
window.cancelarCitaPaciente = async function(id_cita) {
    if (confirm("⚠️ ¿Deseas CANCELAR definitivamente esta cita? Esta acción no se puede deshacer.")) {
        try {
            const res = await fetch('https://clinica-virtual-backend.onrender.com/api/citas/cancelar', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_cita })
            });
            const data = await res.json();
            if(data.success) {
                alert("✅ " + data.mensaje);
                location.reload(); // Recarga la página para mostrar que se canceló
            } else {
                alert("❌ " + data.mensaje);
            }
        } catch(e) {
            alert("❌ Error de conexión al cancelar la cita.");
        }
    }
};

// --- FUNCIÓN PARA SALTAR DE AGENDA A CONSULTA ---
window.iniciarConsultaDesdeAgenda = function(id_paciente) {
    localStorage.setItem('pacienteAtenderAhora', id_paciente);
    window.location.href = '6-consulta-ahora.html';
};

// --- GUARDAR CONSULTA Y RECETA (PANTALLA 6) ---
window.guardarYGenerarReceta = async function() {
    const inputBusqueda = document.getElementById('id-busqueda');
    const idReal = inputBusqueda.dataset.idReal; 
    const receta = document.getElementById('texto-receta').value.trim();
    
    if (!idReal) return alert("⚠️ Primero busque un paciente válido.");
    if (!receta) return alert("⚠️ No puede finalizar la consulta sin escribir la receta.");

    const cedulaReal = localStorage.getItem('cedulaUsuario') || '14776894';

    const datosConsulta = {
        id_paciente: parseInt(idReal),
        cedula_doctor: cedulaReal, // Cédula real del doctor logueado
        peso: parseFloat(document.getElementById('input-peso').value) || null,
        talla: parseFloat(document.getElementById('input-talla').value) || null,
        fc: parseInt(document.getElementById('input-fc').value) || null,
        fr: parseInt(document.getElementById('input-fr').value) || null,
        sato2: parseInt(document.getElementById('input-sato2').value) || null,
        imc: parseFloat(document.getElementById('input-imc').value) || null,
        receta: receta
    };

    try {
        const res = await fetch('https://clinica-virtual-backend.onrender.com/api/consultas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosConsulta)
        });
        
        const data = await res.json();
        
        if (data.success) {
            // NUEVO: Borrar signos pendientes de la BD porque ya se usaron
            try { fetch(`https://clinica-virtual-backend.onrender.com/api/signos/${idReal}`, { method: 'DELETE' }); } catch(e){}

            alert("✅ " + data.mensaje);
            // Guardar en memoria temporal para mostrarlo en la hoja de impresión
            localStorage.setItem('recetaTemporal', receta);
            const ahora = new Date();
            const fechaFormateada = ahora.toLocaleDateString('es-MX') + ' ' + ahora.toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'});
            localStorage.setItem('fechaReceta', fechaFormateada);
            localStorage.setItem('pacienteTemporal', document.getElementById('nombre-paciente').value);
            localStorage.setItem('edadTemporal', document.getElementById('edad-paciente').value);
            localStorage.setItem('pesoTemporal', document.getElementById('input-peso').value);
            localStorage.setItem('tallaTemporal', document.getElementById('input-talla').value);
            localStorage.setItem('imcTemporal', document.getElementById('input-imc').value);
            
            window.location.href = '20-receta.html'; // Te manda a la receta lista
        } else {
            alert("❌ " + data.mensaje);
        }
    } catch (error) {
        console.error('🛑 Error al guardar consulta:', error);
        alert("❌ Error de conexión al guardar la consulta.");
    }
};

// --- BÚSQUEDA DE PACIENTE EN CONSULTA (PANTALLA 6) ---
window.buscarPacienteConsulta = async function() {
    const idInput = document.getElementById('id-busqueda').value.trim();
    if (!idInput) return alert("⚠️ Ingrese un Teléfono, CURP o Correo del paciente.");
    
    // Aseguramos que la alerta esté oculta antes de cada nueva búsqueda.
    document.getElementById('alerta-signos-faltantes').style.display = 'none';

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/pacientes/${idInput}`);
        const data = await res.json();

        if (data.success) {
            const p = data.paciente;
            const nombreCompleto = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.trim();
            
            // Si es un paciente diferente, limpiamos las interpretaciones anteriores de la memoria
            const currentId = document.getElementById('id-busqueda').dataset.idReal;
            if (currentId != p.id_paciente) {
                localStorage.removeItem('estudiosInterpretadosReceta');
            }
            
            document.getElementById('nombre-paciente').value = nombreCompleto;
            document.getElementById('edad-paciente').value = p.edad + " años";
            document.getElementById('sangre-paciente').value = p.tipo_sangre || "No reg.";
            
            // Guardamos el ID real oculto para cuando le dé en Finalizar Consulta
            document.getElementById('id-busqueda').dataset.idReal = p.id_paciente;

            // --- NUEVO: Cargar signos de enfermería si existen ---
            const alertaSignos = document.getElementById('alerta-signos-faltantes');
            const camposSignos = ['input-peso', 'input-talla', 'input-fc', 'input-fr', 'input-sato2'];

            try {
                const resSignos = await fetch(`https://clinica-virtual-backend.onrender.com/api/signos/${p.id_paciente}`);
                const dataSignos = await resSignos.json();

                if (dataSignos.success) {
                    alertaSignos.style.display = 'none'; // Ocultamos la alerta porque sí hay signos
                    const signos = dataSignos.signos;
                    
                    const inputPeso = document.getElementById('input-peso');
                    const inputTalla = document.getElementById('input-talla');
                    
                    if(inputPeso) inputPeso.value = signos.peso || '';
                    if(inputTalla) inputTalla.value = signos.talla || '';
                    
                    const inputFc = document.getElementById('input-fc');
                    if(inputFc) inputFc.value = signos.fc || '';
                    
                    const inputFr = document.getElementById('input-fr');
                    if(inputFr) inputFr.value = signos.fr || '';
                    
                    const inputSato2 = document.getElementById('input-sato2');
                    if(inputSato2) inputSato2.value = signos.sato2 || '';
                    
                    // Forzar cálculo de IMC automáticamente
                    if(inputPeso) {
                        inputPeso.dispatchEvent(new Event('input'));
                    }
                    
                    alert("✅ Datos del paciente y SIGNOS VITALES de enfermería cargados correctamente.");
                } else {
                    // Si no hay signos, mostramos la alerta y limpiamos los campos
                    alertaSignos.style.display = 'block';
                    camposSignos.forEach(id => {
                        const campo = document.getElementById(id);
                        if (campo) campo.value = '';
                    });
                    if (document.getElementById('input-imc')) document.getElementById('input-imc').value = '';
                }
            } catch(e) {
                alert("✅ Datos del paciente cargados. (No se pudo conectar a los signos vitales)");
            }
            
            // --- NUEVO: BUSCAR ESTUDIOS PENDIENTES ---
            const resEstudios = await fetch(`https://clinica-virtual-backend.onrender.com/api/estudios/${p.id_paciente}/pendientes`);
            const dataEstudios = await resEstudios.json();
            
            const alertaEstudios = document.getElementById('alerta-estudios');
            const listaEstudios = document.getElementById('lista-estudios-pendientes');
            
            if (dataEstudios.success && dataEstudios.estudios.length > 0) {
                alertaEstudios.style.display = 'block';
                let htmlEstudios = '';
                let textoPendientesParaReceta = ''; // Se imprimirá en la receta
                
                const nombresEstudios = { 'bh': 'Biometría Hemática', 'qs': 'Química Sanguínea (27 elem.)', 'ego': 'Examen General de Orina', 'rx': 'Radiografía (Rayos X)', 'usg': 'Ultrasonido' };
                
                dataEstudios.estudios.forEach(est => {
                    const nombreEstudio = nombresEstudios[est.tipo_estudio] || est.tipo_estudio;
                    textoPendientesParaReceta += `- ${nombreEstudio}\n`;
                    
                    htmlEstudios += `
                        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ccc;">
                            <p style="color: #0E3B5C;"><strong>${nombreEstudio}</strong> <span style="font-size: 11px; color:#666;">(Solicitado el: ${new Date(est.fecha_solicitud).toLocaleDateString('es-MX')})</span></p>
                            <textarea id="notas-estudio-${est.id_estudio}" rows="2" style="width: 100%; border: 1px solid #ccc; margin-top: 5px; padding: 5px; font-size: 13px;" placeholder="Escriba la interpretación clínica del resultado..."></textarea>
                            <button type="button" class="btn-accion-verde" style="padding: 5px 10px; font-size: 12px; margin-top: 5px;" onclick="completarEstudio(${est.id_estudio}, '${nombreEstudio}')">Guardar Interpretación y Completar</button>
                        </div>
                    `;
                });
                listaEstudios.innerHTML = htmlEstudios;
                localStorage.setItem('estudiosPendientesReceta', textoPendientesParaReceta);
            } else {
                alertaEstudios.style.display = 'none';
                localStorage.removeItem('estudiosPendientesReceta');
            }
        } else {
            alert("❌ " + data.mensaje);
            document.getElementById('nombre-paciente').value = "";
            document.getElementById('edad-paciente').value = "";
            document.getElementById('sangre-paciente').value = "";
            delete document.getElementById('id-busqueda').dataset.idReal;
        }
    } catch (error) {
        console.error('🛑 Error detallado en fetch (Buscar Paciente):', error);
        alert("❌ Error de conexión al buscar paciente.");
    }
};

// --- MARCAR ESTUDIO COMO COMPLETADO (PANTALLA 6) ---
window.completarEstudio = async function(id_estudio, nombreEstudio) {
    const notas = document.getElementById(`notas-estudio-${id_estudio}`).value.trim();
    if (!notas) return alert("⚠️ Debe escribir la interpretación clínica antes de marcar el estudio como completado.");
    
    try {
        const res = await fetch('https://clinica-virtual-backend.onrender.com/api/estudios/completar', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_estudio, notas_medico: notas })
        });
        const data = await res.json();
        if (data.success) {
            alert("✅ " + data.mensaje);
            
            let interpretados = localStorage.getItem('estudiosInterpretadosReceta') || '';
            interpretados += `> ${nombreEstudio}:\n${notas}\n\n`;
            localStorage.setItem('estudiosInterpretadosReceta', interpretados);
            
            buscarPacienteConsulta(); // Refresca la pantalla para que la alerta desaparezca
        } else {
            alert("❌ " + data.mensaje);
        }
    } catch(e) {
        alert("❌ Error de conexión al completar el estudio.");
    }
};

// --- BÚSQUEDA DE PACIENTE EN ENFERMERÍA (PANTALLA 19) ---
window.buscarPacienteSignos = async function() {
    const idInput = document.getElementById('id-busqueda-signos').value.trim();
    if (!idInput) return alert("⚠️ Ingrese un Teléfono, CURP o Correo del paciente.");

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/pacientes/${idInput}`);
        const data = await res.json();

        if (data.success) {
            const p = data.paciente;
            const nombreCompleto = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.trim();
            
            document.getElementById('nombre-paciente').value = nombreCompleto;
            
            // Guardamos el ID real oculto para conectar con el doctor
            document.getElementById('id-busqueda-signos').dataset.idReal = p.id_paciente;

            alert("✅ Paciente encontrado. Proceda a tomar los signos vitales.");
        } else {
            alert("❌ " + data.mensaje);
            document.getElementById('nombre-paciente').value = "";
            if (document.getElementById('id-busqueda-signos')) {
                delete document.getElementById('id-busqueda-signos').dataset.idReal;
            }
        }
    } catch (error) {
        console.error('🛑 Error detallado en fetch (Buscar Paciente Signos):', error);
        alert("❌ Error de conexión al buscar paciente.");
    }
};

// --- BÚSQUEDA DE PACIENTE PARA ESTUDIOS (PANTALLA 14) ---
window.buscarPacienteEstudio = async function() {
    const idInput = document.getElementById('id-busqueda-estudio').value.trim();
    if (!idInput) return alert("⚠️ Ingrese un Teléfono, CURP o Correo del paciente.");

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/pacientes/${idInput}`);
        const data = await res.json();

        if (data.success) {
            const p = data.paciente;
            const nombreCompleto = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.trim();
            
            document.getElementById('nombre-paciente-estudio').value = nombreCompleto;
            
            // Guardamos el ID real oculto
            document.getElementById('id-busqueda-estudio').dataset.idReal = p.id_paciente;

            alert("✅ Paciente encontrado.");
        } else {
            alert("❌ " + data.mensaje);
            document.getElementById('nombre-paciente-estudio').value = "";
            if (document.getElementById('id-busqueda-estudio')) {
                delete document.getElementById('id-busqueda-estudio').dataset.idReal;
            }
        }
    } catch (error) {
        console.error('🛑 Error detallado en fetch (Buscar Paciente Estudios):', error);
        alert("❌ Error de conexión al buscar paciente.");
    }
};

// --- SOLICITAR ESTUDIO (PANTALLA 14) ---
window.solicitarEstudio = async function() {
    const inputBusqueda = document.getElementById('id-busqueda-estudio');
    const idReal = inputBusqueda ? inputBusqueda.dataset.idReal : null;
    const tipoEstudio = document.getElementById('tipo-estudio').value;
    const indicaciones = document.getElementById('indicaciones-estudio').value.trim();

    if (!idReal) return alert("⚠️ Primero busque un paciente válido.");
    if (!tipoEstudio) return alert("⚠️ Seleccione un tipo de estudio de la lista.");
    if (!indicaciones) return alert("⚠️ Escriba las indicaciones o el motivo del estudio.");

        let cedulaReal = localStorage.getItem('cedulaUsuario');
        if (!cedulaReal || cedulaReal === "undefined") cedulaReal = '14776894';

    const datosEstudio = {
        id_paciente: parseInt(idReal),
        cedula_doctor: cedulaReal,
        tipo_estudio: tipoEstudio,
        indicaciones: indicaciones
    };

    try {
        const res = await fetch('https://clinica-virtual-backend.onrender.com/api/estudios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosEstudio)
        });
        
        const data = await res.json();
        
        if (data.success) {
            alert("✅ " + data.mensaje);
            window.location.href = '8-consultar-estudios.html'; // Te regresa al menú de estudios
        } else {
            alert("❌ " + data.mensaje);
        }
    } catch (error) {
        console.error('🛑 Error al solicitar estudio:', error);
        alert("❌ Error de conexión al solicitar el estudio.");
    }
};

// --- VER ESTUDIOS DE UN PACIENTE (PANTALLA 15) ---
window.buscarEstudiosPaciente = async function() {
    const idInput = document.getElementById('id-busqueda-ver-estudio').value.trim();
    if (!idInput) return alert("⚠️ Ingrese un Teléfono, CURP o Correo del paciente.");

    try {
        // 1. Buscamos primero al paciente para saber su nombre
        const resPac = await fetch(`https://clinica-virtual-backend.onrender.com/api/pacientes/${idInput}`);
        const dataPac = await resPac.json();

        if (!dataPac.success) {
            return alert("❌ No se encontró paciente con ese ID.");
        }

        const p = dataPac.paciente;
        const nombreCompleto = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.trim();
        document.getElementById('nombre-paciente-ver').innerHTML = `<strong>${nombreCompleto}</strong>`;

        // 2. Buscamos los estudios asociados a su ID
        const resEstudios = await fetch(`https://clinica-virtual-backend.onrender.com/api/estudios/${p.id_paciente}`);
        const dataEstudios = await resEstudios.json();

        const contenedor = document.getElementById('contenedor-estudios');
        contenedor.innerHTML = ''; // Limpiamos lo anterior

        if (dataEstudios.success && dataEstudios.estudios.length > 0) {
            const nombresEstudios = {
                'bh': 'Biometría Hemática',
                'qs': 'Química Sanguínea (27 elem.)',
                'ego': 'Examen General de Orina',
                'rx': 'Radiografía (Rayos X)',
                'usg': 'Ultrasonido'
            };

            dataEstudios.estudios.forEach(est => {
                const nombreLegible = nombresEstudios[est.tipo_estudio] || est.tipo_estudio;
                const fechaFormateada = new Date(est.fecha_solicitud).toLocaleDateString('es-MX');
                const colorEstado = est.estado === 'Pendiente' ? '#991D27' : '#2D5A27';
                
                contenedor.innerHTML += `
                    <div class="tarjeta-estudio" style="flex-direction: column; align-items: stretch;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <p><strong>${nombreLegible}</strong></p>
                                <p style="color: #666; font-size: 13px;">Fecha: ${fechaFormateada}</p>
                            </div>
                            <p style="color: ${colorEstado}; font-weight: bold; font-size: 14px;">${est.estado}</p>
                        </div>
                        <details style="margin-top: 10px; background: #f9f9f9; padding: 10px; border-radius: 5px; border: 1px solid #ddd;">
                            <summary style="cursor: pointer; color: #0E3B5C; font-weight: bold; font-size: 14px;">Ver Detalles y Resultados</summary>
                            <p style="font-size: 13px; color: #444; margin-top: 8px; border-top: 1px dashed #ccc; padding-top: 5px;"><strong>Indicaciones/Motivo:</strong><br>${est.indicaciones}</p>
                            ${est.notas_medico ? `<p style="font-size: 13px; color: #0E3B5C; margin-top: 8px; background: #eef5f9; padding: 5px; border-radius: 3px;"><strong>Interpretación Médica:</strong><br>${est.notas_medico}</p>` : ''}
                            <button class="btn-ver" style="margin-top: 10px; width: 100%; border-radius: 4px;" ${est.estado === 'Pendiente' ? 'disabled style="background-color:#ccc;cursor:not-allowed;"' : 'onclick="alert(\'Descargando PDF del resultado...\')" '}>
                                ${est.estado === 'Pendiente' ? 'Resultado no disponible' : 'Descargar Resultado (PDF)'}
                            </button>
                        </details>
                    </div>
                `;
            });
        } else {
            contenedor.innerHTML = '<p style="color: #666; font-size: 14px; text-align: center; padding: 20px;">Este paciente no tiene estudios registrados aún.</p>';
        }

        // 3. Buscamos las consultas previas para el historial completo
        const resConsultas = await fetch(`https://clinica-virtual-backend.onrender.com/api/consultas/${p.id_paciente}`);
        const dataConsultas = await resConsultas.json();
        const contConsultas = document.getElementById('contenedor-consultas');
        
        if (contConsultas && dataConsultas.success) {
            if (dataConsultas.consultas.length > 0) {
                contConsultas.innerHTML = dataConsultas.consultas.map(c => `
                    <div class="tarjeta-estudio" style="border-left-color: #2D5A27; flex-direction: column; align-items: stretch;">
                        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                            <p><strong>Fecha:</strong> ${new Date(c.fecha).toLocaleDateString('es-MX')} ${new Date(c.fecha).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}</p>
                            <p style="color: #666; font-size: 13px;"><strong>Atendido por:</strong> Dr(a). ${c.doctor_nombre || 'N/A'} ${c.doctor_apellido || ''}</p>
                        </div>
                        <details style="margin-top: 10px; background: #f9f9f9; padding: 10px; border-radius: 5px; border: 1px solid #ddd;">
                            <summary style="cursor: pointer; color: #0E3B5C; font-weight: bold; font-size: 14px;">Ver Expediente de Consulta</summary>
                            <p style="font-size: 13px; color: #444; margin-top: 8px; border-top: 1px dashed #ccc; padding-top: 5px;"><strong>Signos:</strong> Peso: ${c.peso||'--'}kg | Talla: ${c.talla||'--'}m | FC: ${c.fc||'--'} | FR: ${c.fr||'--'} | SatO2: ${c.sato2||'--'}%</p>
                            <p style="font-size: 13px; color: #0E3B5C; margin-top: 8px; background: #eef5f9; padding: 5px; border-radius: 3px; width: 100%;"><strong>Receta / Notas Médicas:</strong><br>${c.receta || 'Sin indicaciones.'}</p>
                        </details>
                    </div>
                `).join('');
            } else {
                contConsultas.innerHTML = '<p style="color: #666; font-size: 14px; text-align: center; padding: 20px;">Este paciente no tiene consultas previas registradas.</p>';
            }
        }
    } catch (error) {
        console.error('🛑 Error:', error);
        alert("❌ Error de conexión al consultar el historial.");
    }
};

// --- CARGAR LISTA DE USUARIOS (PANTALLA ADMIN) ---
window.cargarUsuariosAdmin = async function() {
    const contenedor = document.getElementById('contenedor-usuarios-admin');
    if (!contenedor) return;

    // Mensaje de carga mientras el servidor de Render responde
    contenedor.innerHTML = '<p style="text-align: center; color: #0E3B5C; padding: 20px; font-weight: bold;">⏳ Cargando lista de usuarios... (Si es el primer acceso, el servidor puede tardar unos segundos en despertar)</p>';

    try {
        // Cambia la URL si pruebas en local: http://localhost:3000/api/admin/usuarios
        const res = await fetch('https://clinica-virtual-backend.onrender.com/api/admin/usuarios');
        const data = await res.json();
        
        contenedor.innerHTML = '';
        
        if (data.success && data.usuarios.length > 0) {
            let html = '<table style="width:100%; border-collapse: collapse; margin-top: 15px; background: white;">';
            html += '<tr style="background-color: #0E3B5C; color: white;">';
            html += '<th style="padding: 10px; border: 1px solid #ccc;">ID</th>';
            html += '<th style="padding: 10px; border: 1px solid #ccc;">Nombre</th>';
            html += '<th style="padding: 10px; border: 1px solid #ccc;">Rol</th>';
            html += '<th style="padding: 10px; border: 1px solid #ccc;">Correo</th>';
            html += '<th style="padding: 10px; border: 1px solid #ccc;">Contraseña</th>';
            html += '<th style="padding: 10px; border: 1px solid #ccc;">Cédula</th>';
            html += '<th style="padding: 10px; border: 1px solid #ccc;">Acciones</th>';
            html += '</tr>';
            
            data.usuarios.forEach(u => {
                const nombre = u.nombre ? `${u.nombre} ${u.apellido_paterno} ${u.apellido_materno || ''}`.trim() : 'N/A';
                const cedula = u.cedula_id || 'N/A';
                const passParaHtml = (u.password_hash || '').replace(/'/g, "\\'");
                const btnBaja = u.estatus ? 
                    `<button onclick="darDeBajaUsuario(${u.id_usuario})" class="btn-accion-rojo" style="padding: 5px; font-size: 12px; width: 100%;">Dar de Baja</button>` : 
                    `<span style="color: #991D27; font-weight: bold; font-size: 12px;">Inactivo</span>`;
                
                html += `<tr style="${!u.estatus ? 'opacity: 0.5; background-color: #f8f8f8;' : ''}">
                    <td style="padding: 10px; border: 1px solid #ccc; text-align: center;">${u.id_usuario}</td>
                    <td style="padding: 10px; border: 1px solid #ccc;">${nombre}</td>
                    <td style="padding: 10px; border: 1px solid #ccc; text-align: center; text-transform: capitalize;">${u.rol}</td>
                    <td style="padding: 10px; border: 1px solid #ccc;">${u.correo}</td>
                    <td style="padding: 10px; border: 1px solid #ccc; text-align: center; max-width: 150px;">
                        <span id="pass-${u.id_usuario}" style="font-size: 14px; color: #000; letter-spacing: 2px;">••••••••</span>
                        <button onclick="revelarContrasena(${u.id_usuario}, '${passParaHtml}')" style="background: none; border: none; cursor: pointer; font-size: 16px; margin-left: 5px;" title="Mostrar/Ocultar">👁️</button>
                    </td>
                    <td style="padding: 10px; border: 1px solid #ccc; text-align: center;">${cedula}</td>
                    <td style="padding: 10px; border: 1px solid #ccc; text-align: center;">${btnBaja}</td>
                </tr>`;
            });
            html += '</table>';
            contenedor.innerHTML = html;
        } else {
            contenedor.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No hay usuarios registrados.</p>';
        }
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        contenedor.innerHTML = '<p style="text-align: center; color: #991D27; padding: 20px;">Error de conexión al cargar la lista de usuarios.</p>';
    }
};

// --- REVELAR CONTRASEÑA CON EL OJITO ---
window.revelarContrasena = function(id, hash) {
    const span = document.getElementById(`pass-${id}`);
    if (span.innerText.includes('••••')) {
        const pass = prompt("🔒 Por seguridad, ingrese su contraseña de administrador para visualizar este dato:");
        if (pass !== null && pass.trim() !== "") {
            // Se muestra el hash encriptado de la base de datos
            span.innerText = hash;
            span.style.fontSize = '10px';
            span.style.color = '#666';
            span.style.wordWrap = 'break-word';
            span.style.letterSpacing = 'normal';
        }
    } else {
        span.innerText = '••••••••';
        span.style.fontSize = '14px';
        span.style.color = '#000';
        span.style.letterSpacing = '2px';
    }
};

// --- DAR DE BAJA A UN USUARIO (PANTALLA ADMIN) ---
window.darDeBajaUsuario = async function(id_usuario) {
    if (!confirm("⚠️ ¿Estás seguro de que deseas dar de baja a este usuario? Ya no podrá iniciar sesión.")) return;
    try {
        const res = await fetch('https://clinica-virtual-backend.onrender.com/api/admin/usuarios/baja', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_usuario })
        });
        const data = await res.json();
        if (data.success) {
            alert("✅ " + data.mensaje);
            cargarUsuariosAdmin(); // Recargar la tabla para reflejar el cambio
        } else alert("❌ " + data.mensaje);
    } catch (e) { alert("❌ Error de conexión al intentar dar de baja."); }
};

// --- CARGAR AGENDA DE ENFERMERÍA (PANTALLA 28) ---
window.cargarAgendaEnfermeria = async function() {
    const contenedor = document.getElementById('contenedor-agenda-enfermeria');
    if (!contenedor) return;

    contenedor.innerHTML = '<p style="text-align: center; color: #0E3B5C; padding: 20px; font-weight: bold;">⏳ Cargando agenda del día...</p>';
    const hoy = new Date().toISOString().split('T')[0];

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/citas/fecha/${hoy}`);
        const data = await res.json();

        if (data.success && data.citas.length > 0) {
            let html = '';
            data.citas.forEach(cita => {
                const nombreCompleto = `${cita.nombre} ${cita.apellido_paterno} ${cita.apellido_materno || ''}`.trim();
                const nombreDoctor = `Dr(a). ${cita.doctor_nombre || 'No'} ${cita.doctor_apellido || 'Asignado'}`.trim();
                const horaCita = cita.hora.substring(0, 5);

                let controles = '';
                let claseEstado = '';

                switch(cita.estatus) {
                    case 'agendada':
                        controles = `
                            <button class="btn-accion-verde" style="padding: 8px;" onclick="marcarAsistencia(${cita.id_cita}, 'presente', ${cita.id_paciente})">✅ Sí llegó</button>
                            <button class="btn-accion-rojo" style="padding: 8px;" onclick="marcarAsistencia(${cita.id_cita}, 'ausente')">❌ No llegó</button>
                        `;
                        break;
                    case 'presente':
                        claseEstado = 'estado-presente';
                        controles = `
                            <span style="color: #2D5A27; font-weight: bold; text-align: center; margin-bottom: 5px;">En Sala de Espera</span>
                            <button class="btn-accion" style="padding: 10px; font-size: 12px;" onclick="saltarASignos(${cita.id_paciente})">🩺 Tomar Signos Vitales</button>
                        `;
                        break;
                    case 'ausente':
                        claseEstado = 'estado-ausente';
                        controles = `<span style="color: #991D27; font-weight: bold; text-align: center;">Paciente No Asistió</span>`;
                        break;
                    default:
                        claseEstado = 'estado-ausente';
                        controles = `<span style="color: #666; font-weight: bold; text-align: center; text-transform: capitalize;">${cita.estatus}</span>`;
                }

                html += `
                    <div class="tarjeta-paciente ${claseEstado}" id="paciente-${cita.id_cita}">
                        <div class="info-paciente">
                            <p style="font-size: 18px; font-weight: bold; color: #0E3B5C;">${horaCita} hrs</p>
                            <p style="font-size: 16px;"><strong>${nombreCompleto}</strong></p>
                            <p style="font-size: 14px; color: #666;"><strong>ID:</strong> PT-${cita.id_paciente}</p>
                            <p style="font-size: 14px; color: #0E3B5C; background: #e6f0fa; padding: 2px 5px; border-radius: 3px; display: inline-block; margin-top: 5px;">
                                👨‍⚕️ <strong>Doctor(a):</strong> ${nombreDoctor}
                            </p>
                        </div>
                        <div class="botones-control" id="controles-${cita.id_cita}">${controles}</div>
                    </div>
                `;
            });
            contenedor.innerHTML = html;
        } else {
            contenedor.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No hay pacientes agendados para hoy.</p>';
        }
    } catch (e) {
        contenedor.innerHTML = '<p style="text-align: center; color: #991D27; padding: 20px;">Error de conexión al cargar la agenda.</p>';
    }
};

// --- SALTAR DE AGENDA DE ENFERMERÍA A SIGNOS VITALES ---
window.saltarASignos = function(id_paciente) {
    // Usamos el mismo localStorage que usa la agenda del doctor para mantener consistencia
    localStorage.setItem('pacienteAtenderAhora', id_paciente);
    window.location.href = '19-signos-vitales.html';
};

// --- CARGAR Y GUARDAR HORARIO DEL DOCTOR (PANTALLA 25) ---
window.cargarHorarioDoctor = async function() {
    const cedula = localStorage.getItem('cedulaUsuario');
    if (!cedula) return;

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/horarios/${cedula}`);
        const data = await res.json();

        if (data.success && data.horario.length > 0) {
            // Primero desactivamos todos
            for (let i = 0; i < 7; i++) {
                document.getElementById(`chk-${i}`).checked = false;
            }
            // Activamos y llenamos solo los que vienen de la BD
            data.horario.forEach(h => {
                const chk = document.getElementById(`chk-${h.dia_semana}`);
                const inicio = document.getElementById(`inicio-${h.dia_semana}`);
                const fin = document.getElementById(`fin-${h.dia_semana}`);
                if (chk && inicio && fin) {
                    chk.checked = true;
                    inicio.value = h.hora_inicio ? h.hora_inicio.substring(0, 5) : '';
                    fin.value = h.hora_fin ? h.hora_fin.substring(0, 5) : '';
                }
            });
            // Al final, recorremos todos para aplicar el estado visual correcto
            for (let i = 0; i < 7; i++) {
                toggleDia(document.getElementById(`chk-${i}`));
            });
        }
    } catch (e) {
        console.error("Error al cargar horario", e);
    }
};

window.guardarHorarioDoctor = async function() {
    const cedula = localStorage.getItem('cedulaUsuario');
    if (!cedula) return alert("No se pudo identificar al doctor.");

    const horarios = [];
    for (let i = 0; i < 7; i++) {
        if (document.getElementById(`chk-${i}`).checked) {
            horarios.push({
                dia_semana: i,
                hora_inicio: document.getElementById(`inicio-${i}`).value || null,
                hora_fin: document.getElementById(`fin-${i}`).value || null
            });
        }
    }

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/horarios/${cedula}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(horarios)
        });
        const data = await res.json();
        alert(data.mensaje);
        if (data.success) window.location.href = '7-agenda.html';
    } catch (e) {
        alert("Error de conexión al guardar el horario.");
    }
};
