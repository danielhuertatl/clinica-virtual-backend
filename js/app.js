// Variable global para detectar cambios en edición
let personaOriginal = null;

document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DE LOGIN ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const feedbackDiv = document.getElementById('login-feedback');
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

                // Limpiar feedback anterior SOLO si el elemento existe en el HTML
                if (feedbackDiv) {
                    feedbackDiv.className = 'login-feedback-message';
                }

                if (datos.success) {
                    // Limpiar datos de sesión anterior
                    localStorage.removeItem('cedulaUsuario');
                    localStorage.removeItem('idPaciente');
                    
                    localStorage.setItem('nombreUsuario', datos.nombre); 
                    localStorage.setItem('rolUsuario', datos.rol); 
                    if (datos.cedula) localStorage.setItem('cedulaUsuario', datos.cedula);
                    if (datos.id_paciente) localStorage.setItem('idPaciente', datos.id_paciente);
                    
                    // Alerta o mensaje integrado según disponibilidad del HTML
                    if (feedbackDiv) {
                        feedbackDiv.textContent = '✅ ¡Acceso concedido! Redirigiendo...';
                        feedbackDiv.classList.add('success');
                    } else {
                        alert('✅ ¡Acceso concedido! Redirigiendo...');
                    }

                    // Esperar un segundo y redirigir
                    setTimeout(() => {
                        if (datos.rol === 'admin') window.location.href = 'pages/5-admin.html';
                        else if (datos.rol === 'doctor') window.location.href = 'pages/2-doctor.html';
                        else if (datos.rol === 'enfermero') window.location.href = 'pages/4-enfermero.html';
                        else window.location.href = 'pages/3-paciente.html'; 
                    }, 1000);

                } else {
                    // Mostrar mensaje de error integrado o alerta clásica de respaldo
                    if (feedbackDiv) {
                        feedbackDiv.textContent = '⚠️ ' + datos.mensaje;
                        feedbackDiv.classList.add('error');
                    } else {
                        alert('⚠️ ' + datos.mensaje);
                    }
                }
            } catch (error) {
                console.error('🛑 Error detallado en fetch (Login):', error);
                if (feedbackDiv) {
                    feedbackDiv.textContent = '❌ Error de conexión con el servidor.';
                    feedbackDiv.classList.add('error');
                } else {
                    alert('❌ Error de conexión con el servidor.');
                }
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

    // --- VALIDACIÓN DE CURP COMPLETA Y CÁLCULO DE EDAD ESTRICTO (PANTALLA 10) ---
    const inputCurp = document.getElementById('curp');
    const inputEdad = document.getElementById('edad');
    const spanCurpError = document.getElementById('curp-error');
    const chkExtranjero = document.getElementById('chk-extranjero-reg');
    const filaExtranjero = document.getElementById('fila-extranjero');

    // Inputs de fecha opcionales para extranjeros
    const diaNac = document.getElementById('dia-nac');
    const mesNac = document.getElementById('mes-nac');
    const anioNac = document.getElementById('anio-nac');
    const inputNombre = document.getElementById('nombre');
    const inputApPaterno = document.getElementById('ap-paterno');
    const inputApMaterno = document.getElementById('ap-materno');

    if (inputCurp && inputEdad && spanCurpError) {
        
        // Validador estricto de fechas reales en el calendario
        const validarFechaRealYCalcularEdad = (yy, mm, dd, char17) => {
            if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
                spanCurpError.style.display = 'block';
                spanCurpError.textContent = "⚠️ Error: Mes o día inexistente en la CURP.";
                inputEdad.value = '';
                return false;
            }

            let year = yy;
            if (char17 && char17.match(/[0-9]/)) year += 1900;
            else if (char17 && char17.match(/[A-Z]/)) year += 2000;
            else {
                let currentYear = new Date().getFullYear() % 100;
                year += (yy > currentYear ? 1900 : 2000);
            }

            let birthDate = new Date(year, mm - 1, dd);
            // Evita desbordes automáticos de JS (como aceptar 31 de febrero)
            if (birthDate.getFullYear() !== year || birthDate.getMonth() !== (mm - 1) || birthDate.getDate() !== dd) {
                spanCurpError.style.display = 'block';
                spanCurpError.textContent = "⚠️ Error: Calendario inválido para ese mes/año.";
                inputEdad.value = '';
                return false;
            }

            let today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            let monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;

            if (!isNaN(age) && age >= 0 && age <= 120) {
                inputEdad.value = age;
                spanCurpError.style.display = 'none';
                return true;
            } else {
                spanCurpError.style.display = 'block';
                spanCurpError.textContent = "⚠️ Error: Edad calculada incoherente.";
                inputEdad.value = '';
                return false;
            }
        };

        const generarCurpExtranjero = () => {
            if (!chkExtranjero || !chkExtranjero.checked) return;

            const n = (inputNombre ? inputNombre.value : '').trim().toUpperCase() || 'X';
            const ap = (inputApPaterno ? inputApPaterno.value : '').trim().toUpperCase() || 'XX';
            const am = (inputApMaterno ? inputApMaterno.value : '').trim().toUpperCase() || 'X';

            const dStr = (diaNac ? diaNac.value : '').padStart(2, '0');
            const mStr = (mesNac ? mesNac.value : '').padStart(2, '0');
            const aStr = (anioNac ? anioNac.value : '');

            if (diaNac && diaNac.value && mesNac && mesNac.value && aStr.length === 4) {
                const d = parseInt(dStr, 10);
                const m = parseInt(mStr, 10);
                const a = parseInt(aStr, 10);

                if (m < 1 || m > 12 || d < 1 || d > 31) {
                    spanCurpError.style.display = 'block';
                    spanCurpError.textContent = "⚠️ Error: Fecha extranjera inválida.";
                    inputEdad.value = '';
                    inputCurp.value = '';
                    return;
                }

                let birthDate = new Date(a, m - 1, d);
                if (birthDate.getFullYear() !== a || birthDate.getMonth() !== (m - 1) || birthDate.getDate() !== d) {
                    spanCurpError.style.display = 'block';
                    spanCurpError.textContent = "⚠️ Error: Calendario extranjero ilógico.";
                    inputEdad.value = '';
                    inputCurp.value = '';
                    return;
                }

                spanCurpError.style.display = 'none';
                let today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                let monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
                inputEdad.value = age > 0 ? age : 0;

                let l1 = ap.substring(0, 2).padEnd(2, 'X');
                let l2 = am.substring(0, 1).padEnd(1, 'X');
                let l3 = n.substring(0, 1).padEnd(1, 'X');
                let yy = aStr.substring(2, 4);

                inputCurp.value = `${l1}${l2}${l3}${yy}${mStr}${dStr}XXXXXX00`.toUpperCase();
            }
        };

        // Procesamiento en tiempo real de la CURP
        inputCurp.addEventListener('input', (e) => {
            let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            e.target.value = v;

            if (chkExtranjero && chkExtranjero.checked) {
                spanCurpError.style.display = 'none';
                return;
            }

            if (v.length === 0) {
                spanCurpError.style.display = 'none';
                inputEdad.value = '';
                return;
            }

            if (v.length >= 10) {
                const yy = parseInt(v.substr(4, 2), 10);
                const mm = parseInt(v.substr(6, 2), 10);
                const dd = parseInt(v.substr(8, 2), 10);
                let char17 = v.charAt(16);

                const esFechaValida = validarFechaRealYCalcularEdad(yy, mm, dd, char17);

                if (esFechaValida && v.length === 18) {
                    const regexCURP = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
                    if (!regexCURP.test(v)) {
                        spanCurpError.style.display = 'block';
                        spanCurpError.textContent = "Formato de CURP inválido";
                    } else {
                        spanCurpError.style.display = 'none';
                    }
                }
            } else {
                inputEdad.value = '';
                spanCurpError.style.display = 'block';
                spanCurpError.textContent = "El CURP debe tener 18 caracteres.";
            }
        });

        // Manejo del control de Extranjeros
        if (chkExtranjero && filaExtranjero) {
            chkExtranjero.addEventListener('change', () => {
                if (chkExtranjero.checked) {
                    filaExtranjero.style.display = 'flex';
                    inputCurp.readOnly = true;
                    inputCurp.style.backgroundColor = '#eee';
                    spanCurpError.style.display = 'none';
                    generarCurpExtranjero();
                } else {
                    filaExtranjero.style.display = 'none';
                    inputCurp.readOnly = false;
                    inputCurp.style.backgroundColor = '#fff';
                    inputCurp.value = '';
                    inputEdad.value = '';
                    spanCurpError.style.display = 'none';
                }
            });

            if (diaNac) diaNac.addEventListener('input', generarCurpExtranjero);
            if (mesNac) mesNac.addEventListener('input', generarCurpExtranjero);
            if (anioNac) anioNac.addEventListener('input', generarCurpExtranjero);
            if (inputNombre) inputNombre.addEventListener('input', generarCurpExtranjero);
            if (inputApPaterno) inputApPaterno.addEventListener('input', generarCurpExtranjero);
            if (inputApMaterno) inputApMaterno.addEventListener('input', generarCurpExtranjero);
        }
    }

    // --- MANEJO DEL SUBMIT (ENVÍO DEL REGISTRO DE PACIENTE) ---
    const formRegistro = document.getElementById('form-registro');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-sync');
            const telefono = document.getElementById('telefono').value;
            const curp = document.getElementById('curp').value.trim().toUpperCase();
            const errorVisible = document.getElementById('curp-error');

            if (telefono.length !== 10) {
                alert('⚠️ Error: El teléfono debe tener exactamente 10 dígitos.');
                return;
            }

            if (errorVisible && errorVisible.style.display === 'block') {
                alert('⚠️ Error: No se puede guardar. Corrija los errores de la CURP o Fecha de nacimiento.');
                return;
            }

            btn.innerText = "Sincronizando...";

            const datos = {
                nombre: document.getElementById('nombre').value,
                apellido_p: document.getElementById('ap-paterno').value,
                apellido_m: document.getElementById('ap-materno').value,
                edad: document.getElementById('edad').value,
                telefono: telefono,
                tipo_sangre: document.getElementById('tipo-sangre').value,
                correo: document.getElementById('email').value,
                curp: curp || null,
                calle: document.getElementById('calle').value,
                colonia: document.getElementById('colonia').value,
                municipio: document.getElementById('municipio').value,
                cp: document.getElementById('cp').value
            };

            try {
                const res = await fetch('https://clinica-virtual-backend.onrender.com/api/pacientes', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(datos)
                });
                const resData = await res.json();
                if (resData.success) {
                    alert("✅ " + resData.mensaje);
                    history.back();
                } else {
                    alert("⚠️ " + resData.mensaje);
                }
            } catch (err) {
                alert("❌ Error de servidor");
            } finally {
                btn.innerText = "Guardar Paciente";
            }
        });
    }

    // --- LLENAR RECETA PARA IMPRESIÓN (PANTALLA 20) ---
    const contenidoReceta = document.getElementById('contenido-receta');
    const fechaReceta = document.getElementById('fecha-receta');
    const nombrePacienteReceta = document.getElementById('nombre-paciente-receta');
    const nombreDoctorReceta = document.getElementById('nombre-doctor-receta');
    const cedulaDoctorReceta = document.getElementById('cedula-doctor-receta');
    const edadPacienteReceta = document.getElementById('edad-paciente-receta');
    const pesoPacienteReceta = document.getElementById('peso-paciente-receta');
    const tallaPacienteReceta = document.getElementById('talla-paciente-receta');
    const imcPacienteReceta = document.getElementById('imc-paciente-receta');
    
    if (contenidoReceta && fechaReceta) {
        const recetaGuardada = localStorage.getItem('recetaTemporal') || 'Sin indicaciones...';
        const fechaGuardada = localStorage.getItem('fechaReceta') || '--/--/----';
        contenidoReceta.textContent = recetaGuardada;
        fechaReceta.textContent = fechaGuardada;
        
        if (nombrePacienteReceta) nombrePacienteReceta.textContent = localStorage.getItem('pacienteTemporal') || 'Paciente no registrado';
        if (nombreDoctorReceta) nombreDoctorReceta.textContent = 'Dr(a). ' + (localStorage.getItem('nombreUsuario') || 'No especificado');
        if (cedulaDoctorReceta) cedulaDoctorReceta.textContent = localStorage.getItem('cedulaUsuario') || 'S/N';
        
        if (edadPacienteReceta) edadPacienteReceta.textContent = localStorage.getItem('edadTemporal') || '--';
        if (pesoPacienteReceta) pesoPacienteReceta.textContent = localStorage.getItem('pesoTemporal') ? localStorage.getItem('pesoTemporal') + ' kg' : '--';
        if (tallaPacienteReceta) tallaPacienteReceta.textContent = localStorage.getItem('tallaTemporal') ? localStorage.getItem('tallaTemporal') + ' m' : '--';
        if (imcPacienteReceta) imcPacienteReceta.textContent = localStorage.getItem('imcTemporal') || '--';
        
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

    // --- RELOJ ACTUAL ---
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
            btnExpandir.innerText = textoReceta.classList.contains('receta-expandida') ? 'Minimizar ⤢' : 'Ampliar ⤢';
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
                        const horaCita = cita.hora.substring(0, 5);
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
                            </div>`;
                    });
                } else {
                    contenedorCitasHoy.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No tiene citas programadas para esta fecha.</p>';
                }
            } catch (error) {
                console.error('Error al cargar agenda:', error);
                contenedorCitasHoy.innerHTML = '<p style="text-align: center; color: #991D27;">Error al conectar con la agenda.</p>';
            }
        };

        const hoy = new Date().toISOString().split('T')[0];
        if (filtroFechaAgenda) {
            filtroFechaAgenda.value = hoy;
            filtroFechaAgenda.addEventListener('change', (e) => cargarCitasDoctor(e.target.value));
        }
        cargarCitasDoctor(filtroFechaAgenda ? filtroFechaAgenda.value : hoy);
    }

    // --- AUTO-CARGAR PACIENTE DESDE LA AGENDA A LA CONSULTA ---
    const inputBusquedaConsulta = document.getElementById('id-busqueda');
    if (inputBusquedaConsulta && window.location.pathname.includes('6-consulta-ahora.html')) {
        const pacienteAgenda = localStorage.getItem('pacienteAtenderAhora');
        if (pacienteAgenda) {
            inputBusquedaConsulta.value = pacienteAgenda;
            setTimeout(() => {
                if (typeof buscarPacienteConsulta === 'function') buscarPacienteConsulta();
                localStorage.removeItem('pacienteAtenderAhora'); 
            }, 300);
        }
    }

    // --- CARGAR CITAS DEL PACIENTE ---
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
                        const fechaCita = new Date(fechaSolo + 'T12:00:00');
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
                                </div>`;
                        } else {
                            const colorEstatus = cita.estatus === 'cancelada' ? '#991D27' : '#2D5A27';
                            contenedorHistorialCitas.innerHTML += `
                                <div class="tarjeta-cita" style="opacity: 0.7;">
                                    <div class="info-cita">
                                        <p style="font-size: 14px; color: #666; text-transform: capitalize;">${fechaFormateada} - ${horaFormateada}</p>
                                        <p><strong>${nombreDoctor}</strong></p>
                                        <p style="font-size: 12px; color: ${colorEstatus}; font-weight: bold; text-transform: uppercase;">${cita.estatus}</p>
                                    </div>
                                </div>`;
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

    if (window.location.pathname.includes('30-lista-usuarios.html')) cargarUsuariosAdmin();
    if (window.location.pathname.includes('28-agenda-enfermero.html')) cargarAgendaEnfermeria();
    if (window.location.pathname.includes('25-editar-horario.html')) cargarHorarioDoctor();
});

// --- FUNCIÓN DE BÚSQUEDA ---
window.simularBusqueda = async function() {
    const termino = document.getElementById('buscar-cedula').value.trim();
    if (!termino) return alert("⚠️ Ingrese una Cédula Profesional o Correo Electrónico.");

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/personal/${termino}`);
        const data = await res.json();

        if (data.success) {
            const p = data.persona;
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

            document.getElementById('nombre').value = p.nombre;
            document.getElementById('apellido_p').value = p.apellido_paterno;
            document.getElementById('apellido_m').value = p.apellido_materno;
            document.getElementById('telefono').value = p.telefono;
            document.getElementById('email').value = p.correo;
            document.getElementById('calle').value = p.direccion_calle;
            document.getElementById('num_ext').value = p.direccion_num_ext;
            document.getElementById('cp').value = p.direccion_cp;
            document.getElementById('colonia').value = p.direccion_colonia;
            
            document.getElementById('display-puesto').value = p.puesto;
            document.getElementById('display-cedula').value = p.cedula_id;

            alert("✅ Datos de " + p.nombre + " cargados.");
        } else {
            alert("❌ Personal no encontrado.");
        }
    } catch (error) {
        alert("❌ Error de conexión al buscar.");
    }
};

// --- CANCELAR CITA PACIENTE ---
window.cancelarCitaPaciente = async function(id_cita) {
    if (confirm("⚠️ ¿Deseas CANCELAR definitivamente esta cita?")) {
        try {
            const res = await fetch('https://clinica-virtual-backend.onrender.com/api/citas/cancelar', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_cita })
            });
            const data = await res.json();
            if(data.success) {
                alert("✅ " + data.mensaje);
                location.reload();
            } else {
                alert("❌ " + data.mensaje);
            }
        } catch(e) {
            alert("❌ Error de conexión al cancelar la cita.");
        }
    }
};

window.iniciarConsultaDesdeAgenda = function(id_paciente) {
    localStorage.setItem('pacienteAtenderAhora', id_paciente);
    window.location.href = '6-consulta-ahora.html';
};

// --- GUARDAR CONSULTA Y RECETA ---
window.guardarYGenerarReceta = async function() {
    const inputBusqueda = document.getElementById('id-busqueda');
    const idReal = inputBusqueda.dataset.idReal; 
    const receta = document.getElementById('texto-receta').value.trim();
    
    if (!idReal) return alert("⚠️ Primero busque un paciente válido.");
    if (!receta) return alert("⚠️ No puede finalizar la consulta sin escribir la receta.");

    const cedulaReal = localStorage.getItem('cedulaUsuario') || '14776894';

    const datosConsulta = {
        id_paciente: parseInt(idReal),
        cedula_doctor: cedulaReal,
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
            try { fetch(`https://clinica-virtual-backend.onrender.com/api/signos/${idReal}`, { method: 'DELETE' }); } catch(e){}
            alert("✅ " + data.mensaje);
            localStorage.setItem('recetaTemporal', receta);
            const ahora = new Date();
            const fechaFormateada = ahora.toLocaleDateString('es-MX') + ' ' + ahora.toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'});
            localStorage.setItem('fechaReceta', fechaFormateada);
            localStorage.setItem('pacienteTemporal', document.getElementById('nombre-paciente').value);
            localStorage.setItem('edadTemporal', document.getElementById('edad-paciente').value);
            localStorage.setItem('pesoTemporal', document.getElementById('input-peso').value);
            localStorage.setItem('tallaTemporal', document.getElementById('input-talla').value);
            localStorage.setItem('imcTemporal', document.getElementById('input-imc').value);
            window.location.href = '20-receta.html';
        } else {
            alert("❌ " + data.mensaje);
        }
    } catch (error) {
        alert("❌ Error de conexión al guardar la consulta.");
    }
};

// --- BÚSQUEDA DE PACIENTE EN CONSULTA ---
window.buscarPacienteConsulta = async function() {
    const idInput = document.getElementById('id-busqueda').value.trim();
    if (!idInput) return alert("⚠️ Ingrese un Teléfono, CURP o Correo del paciente.");
    if (document.getElementById('alerta-signos-faltantes')) document.getElementById('alerta-signos-faltantes').style.display = 'none';

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/pacientes/${idInput}`);
        const data = await res.json();

        if (data.success) {
            const p = data.paciente;
            const nombreCompleto = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.trim();
            
            const currentId = document.getElementById('id-busqueda').dataset.idReal;
            if (currentId != p.id_paciente) {
                localStorage.removeItem('estudiosInterpretadosReceta');
            }
            
            document.getElementById('nombre-paciente').value = nombreCompleto;
            document.getElementById('edad-paciente').value = p.edad + " años";
            document.getElementById('sangre-paciente').value = p.tipo_sangre || "No reg.";
            document.getElementById('id-busqueda').dataset.idReal = p.id_paciente;

            const alertaSignos = document.getElementById('alerta-signos-faltantes');
            const camposSignos = ['input-peso', 'input-talla', 'input-fc', 'input-fr', 'input-sato2'];

            try {
                const resSignos = await fetch(`https://clinica-virtual-backend.onrender.com/api/signos/${p.id_paciente}`);
                const dataSignos = await resSignos.json();

                if (dataSignos.success) {
                    if(alertaSignos) alertaSignos.style.display = 'none';
                    const signos = dataSignos.signos;
                    if(document.getElementById('input-peso')) document.getElementById('input-peso').value = signos.peso || '';
                    if(document.getElementById('input-talla')) document.getElementById('input-talla').value = signos.talla || '';
                    if(document.getElementById('input-fc')) document.getElementById('input-fc').value = signos.fc || '';
                    if(document.getElementById('input-fr')) document.getElementById('input-fr').value = signos.fr || '';
                    if(document.getElementById('input-sato2')) document.getElementById('input-sato2').value = signos.sato2 || '';
                    
                    if(document.getElementById('input-peso')) {
                        document.getElementById('input-peso').dispatchEvent(new Event('input'));
                    }
                    alert("✅ Datos del paciente y SIGNOS VITALES cargados.");
                } else {
                    if(alertaSignos) alertaSignos.style.display = 'block';
                    camposSignos.forEach(id => { if (document.getElementById(id)) document.getElementById(id).value = ''; });
                    if (document.getElementById('input-imc')) document.getElementById('input-imc').value = '';
                }
            } catch(e) {
                alert("✅ Datos del paciente cargados.");
            }
            
            const resEstudios = await fetch(`https://clinica-virtual-backend.onrender.com/api/estudios/${p.id_paciente}/pendientes`);
            const dataEstudios = await resEstudios.json();
            const alertaEstudios = document.getElementById('alerta-estudios');
            const listaEstudios = document.getElementById('lista-estudios-pendientes');
            
            if (dataEstudios.success && dataEstudios.estudios.length > 0) {
                if(alertaEstudios) alertaEstudios.style.display = 'block';
                let htmlEstudios = '';
                let textoPendientesParaReceta = '';
                const nombresEstudios = { 'bh': 'Biometría Hemática', 'qs': 'Química Sanguínea (27 elem.)', 'ego': 'Examen General de Orina', 'rx': 'Radiografía (Rayos X)', 'usg': 'Ultrasonido' };
                
                dataEstudios.estudios.forEach(est => {
                    const nombreEstudio = nombresEstudios[est.tipo_estudio] || est.tipo_estudio;
                    textoPendientesParaReceta += `- ${nombreEstudio}\n`;
                    htmlEstudios += `
                        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ccc;">
                            <p style="color: #0E3B5C;"><strong>${nombreEstudio}</strong></p>
                            <textarea id="notas-estudio-${est.id_estudio}" rows="2" style="width: 100%;" placeholder="Interpretación clínica..."></textarea>
                            <button type="button" class="btn-accion-verde" onclick="completarEstudio(${est.id_estudio}, '${nombreEstudio}')">Guardar</button>
                        </div>`;
                });
                if(listaEstudios) listaEstudios.innerHTML = htmlEstudios;
                localStorage.setItem('estudiosPendientesReceta', textoPendientesParaReceta);
            } else {
                if(alertaEstudios) alertaEstudios.style.display = 'none';
                localStorage.removeItem('estudiosPendientesReceta');
            }
        } else {
            alert("❌ " + data.mensaje);
        }
    } catch (error) {
        alert("❌ Error de conexión al buscar paciente.");
    }
};

window.completarEstudio = async function(id_estudio, nombreEstudio) {
    const notas = document.getElementById(`notas-estudio-${id_estudio}`).value.trim();
    if (!notas) return alert("⚠️ Debe escribir la interpretación clínica.");
    
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
            buscarPacienteConsulta();
        }
    } catch(e) {
        alert("❌ Error al completar estudio.");
    }
};

// --- PACIENTE EN ENFERMERÍA ---
window.buscarPacienteSignos = async function() {
    const idInput = document.getElementById('id-busqueda-signos').value.trim();
    if (!idInput) return alert("⚠️ Ingrese los datos de búsqueda.");

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/pacientes/${idInput}`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('nombre-paciente').value = `${data.paciente.nombre} ${data.paciente.apellido_paterno}`;
            document.getElementById('id-busqueda-signos').dataset.idReal = data.paciente.id_paciente;
            alert("✅ Paciente encontrado.");
        } else {
            alert("❌ " + data.mensaje);
        }
    } catch (error) {
        alert("❌ Error de conexión.");
    }
};

// --- GESTIÓN DE HORARIOS ---
window.guardarHorarioDoctor = async function() {
    const cedula = localStorage.getItem('cedulaUsuario');
    if (!cedula) return alert("No se pudo identificar al doctor.");

    const totalHoras = typeof calcularTotalHoras === 'function' ? calcularTotalHoras() : 40;
    if (totalHoras < 40) {
        alert("⚠️ Debe cubrir un mínimo de 40 horas laborales a la semana.");
        return;
    }

    const horarios = [];
    for (let i = 0; i < 7; i++) {
        if (document.getElementById(`chk-${i}`) && document.getElementById(`chk-${i}`).checked) {
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