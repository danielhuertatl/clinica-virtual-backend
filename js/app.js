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
});

// --- FUNCIÓN DE BÚSQUEDA (Global para el botón onclick) ---
window.simularBusqueda = async function() {
    const cedula = document.getElementById('buscar-cedula').value.trim();
    if (!cedula) return alert("⚠️ Ingrese una cédula profesional.");

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/personal/${cedula}`);
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
    if (!idInput) return alert("⚠️ Ingrese un ID de paciente o su CURP.");

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
            const signosGuardados = localStorage.getItem('signosPendientes_' + p.id_paciente);
            if (signosGuardados) {
                const signos = JSON.parse(signosGuardados);
                
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
                alert("✅ Datos del paciente cargados correctamente. (Sin signos vitales previos)");
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
    if (!idInput) return alert("⚠️ Ingrese un ID de paciente o su CURP.");

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
    if (!idInput) return alert("⚠️ Ingrese un ID de paciente o su CURP.");

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
    if (!idInput) return alert("⚠️ Ingrese el ID del paciente.");

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
