// Variable global para detectar cambios en edición
let personaOriginal = null;

document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DE LOGIN ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const feedbackDiv = document.getElementById('login-feedback');
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const usuarioInput = document.getElementById('usuario').value.trim().toLowerCase();
            const contrasenaInput = document.getElementById('contrasena').value;

            try {
                const respuesta = await fetch('https://clinica-virtual-backend.onrender.com/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo: usuarioInput, password: contrasenaInput })
                });
                const datos = await respuesta.json();

                if (feedbackDiv) feedbackDiv.className = 'login-feedback-message';

                if (datos.success) {
                    localStorage.removeItem('cedulaUsuario');
                    localStorage.removeItem('idPaciente');
                    localStorage.setItem('nombreUsuario', datos.nombre); 
                    localStorage.setItem('rolUsuario', datos.rol); 
                    if (datos.cedula) localStorage.setItem('cedulaUsuario', datos.cedula);
                    if (datos.id_paciente) localStorage.setItem('idPaciente', datos.id_paciente);
                    
                    if (feedbackDiv) {
                        feedbackDiv.textContent = '✅ ¡Acceso concedido! Redirigiendo...';
                        feedbackDiv.classList.add('success');
                    } else {
                        alert('✅ ¡Acceso concedido! Redirigiendo...');
                    }

                    setTimeout(() => {
                        if (datos.rol === 'admin') window.location.href = 'pages/5-admin.html';
                        else if (datos.rol === 'doctor') window.location.href = 'pages/2-doctor.html';
                        else if (datos.rol === 'enfermero') window.location.href = 'pages/4-enfermero.html';
                        else window.location.href = 'pages/3-paciente.html'; 
                    }, 1000);
                } else {
                    if (feedbackDiv) {
                        feedbackDiv.textContent = '⚠️ ' + datos.mensaje;
                        feedbackDiv.classList.add('error');
                    } else {
                        alert('⚠️ ' + datos.mensaje);
                    }
                }
            } catch (error) {
                if (feedbackDiv) {
                    feedbackDiv.textContent = '❌ Error de conexión con el servidor.';
                    feedbackDiv.classList.add('error');
                } else {
                    alert('❌ Error de conexión con el servidor.');
                }
            }
        });
    }

    // --- FORMATEO Y BLOQUEO DE REPETICIONES EN DIRECCIONES ---
    const inputsDireccion = ['calle', 'colonia', 'municipio'];
    inputsDireccion.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            let errSpan = document.getElementById(`${id}-dir-error`);
            if (!errSpan) {
                errSpan = document.createElement('span');
                errSpan.id = `${id}-dir-error`;
                errSpan.style.color = '#991D27';
                errSpan.style.fontSize = '11px';
                errSpan.style.display = 'none';
                errSpan.style.fontWeight = 'bold';
                input.parentNode.appendChild(errSpan);
            }

            input.addEventListener('input', (e) => {
                let texto = e.target.value.toUpperCase();
                
                if (/([A-Z0-9áéíóúñÑ])\1\1/i.test(texto)) {
                    texto = texto.substring(0, texto.length - 1);
                    errSpan.textContent = "⚠️ ¡Caracteres repetidos no permitidos!";
                    errSpan.style.display = 'block';
                    e.target.value = texto;
                    return;
                }

                if ((id === 'colonia' || id === 'municipio') && /^\d+$/.test(texto) && texto.length > 0) {
                    texto = "";
                    errSpan.textContent = "⚠️ Este campo no puede contener solo números.";
                    errSpan.style.display = 'block';
                    e.target.value = texto;
                    return;
                }

                errSpan.style.display = 'none';
                e.target.value = texto;
            });
        }
    });

    const inputEmail = document.getElementById('email');
    if (inputEmail) {
        inputEmail.addEventListener('input', (e) => {
            e.target.value = e.target.value.toLowerCase().replace(/\s/g, '');
        });
    }

    // --- VALIDACIÓN DE CURP EN TIEMPO REAL CARÁCTER POR CARÁCTER ---
    const inputCurp = document.getElementById('curp');
    const inputEdad = document.getElementById('edad');
    const spanCurpError = document.getElementById('curp-error');
    const chkExtranjero = document.getElementById('chk-extranjero-reg');
    const filaExtranjero = document.getElementById('fila-extranjero');

    if (inputCurp && inputEdad && spanCurpError) {
        
        const calcularEdadReal = (yy, mm, dd, char17) => {
            let year = yy;
            if (char17 && char17.match(/[0-9]/)) year += 1900;
            else if (char17 && char17.match(/[A-Z]/)) year += 2000;
            else {
                let currentYear = new Date().getFullYear() % 100;
                year += (yy > currentYear ? 1900 : 2000);
            }
            let birthDate = new Date(year, mm - 1, dd);
            let today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            let monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
            return age;
        };

        inputCurp.addEventListener('input', (e) => {
            let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            let i = v.length - 1; 
            
            if (chkExtranjero && chkExtranjero.checked) {
                e.target.value = v;
                return;
            }

            if (i >= 0 && i < 4) { 
                if (/[0-9]/.test(v[i])) {
                    v = v.substring(0, i);
                    spanCurpError.textContent = "⚠️ ¡El formato va incorrecto! Los primeros 4 caracteres deben ser letras.";
                    spanCurpError.style.display = 'block';
                }
            }
            else if (i >= 4 && i < 10) { 
                if (/[A-Z]/.test(v[i])) {
                    v = v.substring(0, i);
                    spanCurpError.textContent = "⚠️ ¡El formato va incorrecto! Esta sección requiere números de fecha.";
                    spanCurpError.style.display = 'block';
                }
                
                if (v.length === 7 && !/^[01]$/.test(v[6])) {
                    v = v.substring(0, 6);
                    spanCurpError.textContent = "⚠️ ¡El formato va incorrecto! El mes debe iniciar con 0 o 1.";
                    spanCurpError.style.display = 'block';
                }
                if (v.length === 8) {
                    const mm = parseInt(v.substr(6, 2), 10);
                    if (mm < 1 || mm > 12) {
                        v = v.substring(0, 7);
                        spanCurpError.textContent = "⚠️ ¡El formato va incorrecto! Mes inexistente.";
                        spanCurpError.style.display = 'block';
                    }
                }
                if (v.length === 9 && !/^[0-3]$/.test(v[8])) {
                    v = v.substring(0, 8);
                    spanCurpError.textContent = "⚠️ ¡El formato va incorrecto! El día debe iniciar con un rango de 0 a 3.";
                    spanCurpError.style.display = 'block';
                }
                if (v.length === 10) {
                    const mm = parseInt(v.substr(6, 2), 10);
                    const dd = parseInt(v.substr(8, 2), 10);
                    if (dd < 1 || dd > 31) {
                        v = v.substring(0, 9);
                        spanCurpError.textContent = "⚠️ ¡El formato va incorrecto! Día fuera de rango.";
                        spanCurpError.style.display = 'block';
                    } else {
                        const yy = parseInt(v.substr(4, 2), 10);
                        let currentYear = new Date().getFullYear() % 100;
                        let year = yy + (yy > currentYear ? 1900 : 2000);
                        let testDate = new Date(year, mm - 1, dd);
                        if (testDate.getDate() !== dd) {
                            v = v.substring(0, 9); 
                            spanCurpError.textContent = `⚠️ ¡El formato va incorrecto! El mes ${mm} no tiene día ${dd}.`;
                            spanCurpError.style.display = 'block';
                        }
                    }
                }
            }
            else if (i >= 10 && i < 16) { 
                if (/[0-9]/.test(v[i])) {
                    v = v.substring(0, i);
                    spanCurpError.textContent = "⚠️ ¡El formato va incorrecto! Se requieren letras.";
                    spanCurpError.style.display = 'block';
                }
            }

            e.target.value = v;

            if (v.length === 0) {
                spanCurpError.style.display = 'none';
                inputEdad.value = '';
                return;
            }

            if (v.length >= 10) {
                const yy = parseInt(v.substr(4, 2), 10);
                const mm = parseInt(v.substr(6, 2), 10);
                const dd = parseInt(v.substr(8, 2), 10);
                let age = calcularEdadReal(yy, mm, dd, v.charAt(16));
                
                if (!isNaN(age) && age >= 0 && age <= 120) {
                    inputEdad.value = age;
                }

                if (v.length === 18) {
                    const regexCURP = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
                    if (!regexCURP.test(v)) {
                        spanCurpError.style.display = 'block';
                        spanCurpError.textContent = "⚠️ Formato de CURP inválido estructuralmente.";
                    } else {
                        spanCurpError.style.display = 'none';
                    }
                } else {
                    spanCurpError.style.display = 'block';
                    spanCurpError.textContent = "El CURP debe tener 18 caracteres.";
                }
            } else {
                inputEdad.value = '';
                spanCurpError.style.display = 'block';
                spanCurpError.textContent = "El CURP debe tener 18 caracteres.";
            }
        });
    }

    // --- MANEJO DEL SUBMIT CON EVALUACIÓN DE BLOQUEO DE ERRORES ---
    const formRegistro = document.getElementById('form-registro');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-sync');
            const telefono = document.getElementById('telefono').value;
            const curp = document.getElementById('curp').value.trim().toUpperCase();
            const errorVisible = document.getElementById('curp-error');

            const calleVal = document.getElementById('calle').value.trim();
            const coloniaVal = document.getElementById('colonia').value.trim();
            const municipioVal = document.getElementById('municipio').value.trim();

            const regexInvalido = /^([A-Z0-9áéíóúñÑ])\1+$/i; 
            if (regexInvalido.test(calleVal) || regexInvalido.test(coloniaVal) || regexInvalido.test(municipioVal) || calleVal.length < 4 || coloniaVal.length < 3 || municipioVal.length < 3) {
                alert('⚠️ Error: La información de la dirección no cumple con los estándares mínimos reales.');
                return;
            }

            if (telefono.length !== 10) {
                alert('⚠️ Error: El teléfono debe tener exactamente 10 dígitos.');
                return;
            }

            if (errorVisible && errorVisible.style.display === 'block') {
                alert('⚠️ Error: No se puede guardar. Corrija las advertencias del formato antes de proceder.');
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
                calle: calleVal,
                colonia: coloniaVal,
                municipio: municipioVal,
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

            const huboCambios = Object.keys(datosEditados).some(key => String(datosEditados[key]) !== String(personaOriginal[key]));
            if (!huboCambios) return alert("ℹ️ No se detectaron cambios. No se requiere actualizar.");

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
                } else alert("⚠️ " + resData.mensaje);
            } catch (err) { alert("❌ Error al actualizar."); }
        });
    }

    // --- LLENAR RECETA PARA IMPRESIÓN ---
    const contenidoReceta = document.getElementById('contenido-receta');
    const fechaReceta = document.getElementById('fecha-receta');
    
    if (contenidoReceta && fechaReceta) {
        contenidoReceta.textContent = localStorage.getItem('recetaTemporal') || 'Sin indicaciones...';
        fechaReceta.textContent = localStorage.getItem('fechaReceta') || '--/--/----';
        
        const campos = ['nombre-paciente-receta', 'nombre-doctor-receta', 'cedula-doctor-receta', 'edad-paciente-receta', 'peso-paciente-receta', 'talla-paciente-receta', 'imc-paciente-receta'];
        campos.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                if(id === 'nombre-doctor-receta') el.textContent = 'Dr(a). ' + (localStorage.getItem('nombreUsuario') || 'No especificado');
                else if(id === 'cedula-doctor-receta') el.textContent = localStorage.getItem('cedulaUsuario') || 'S/N';
                else el.textContent = localStorage.getItem(id.replace('-receta', '').replace('nombre-paciente', 'pacienteTemporal').replace('edad-paciente', 'edadTemporal').replace('peso-paciente', 'pesoTemporal').replace('talla-paciente', 'tallaTemporal').replace('imc-paciente', 'imcTemporal')) || '--';
            }
        });
    }

    if (window.location.pathname.includes('30-lista-usuarios.html')) cargarUsuariosAdmin();
    if (window.location.pathname.includes('28-agenda-enfermero.html')) cargarAgendaEnfermeria();
    if (window.location.pathname.includes('25-editar-horario.html')) cargarHorarioDoctor();
});

//