// Variable global para detectar cambios en edición
let personaOriginal = null;

document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DE LOGIN ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const feedbackDiv = document.getElementById('login-feedback');
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const usuarioInput = document.getElementById('usuario').value.trim().toLowerCase(); // Forzar minúsculas al enviar
            const contrasenaInput = document.getElementById('contrasena').value;

            try {
                const respuesta = await fetch('https://clinica-virtual-backend.onrender.com/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo: usuarioInput, password: contrasenaInput })
                });

                const datos = await respuesta.json();

                if (feedbackDiv) {
                    feedbackDiv.className = 'login-feedback-message';
                }

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
                console.error('🛑 Error en fetch (Login):', error);
                if (feedbackDiv) {
                    feedbackDiv.textContent = '❌ Error de conexión con el servidor.';
                    feedbackDiv.classList.add('error');
                } else {
                    alert('❌ Error de conexión con el servidor.');
                }
            }
        });
    }

    // --- FORMATEO EN TIEMPO REAL (MAYÚSCULAS / MINÚSCULAS) ---
    const inputsMayusculas = ['nombre', 'ap-paterno', 'ap-materno', 'calle', 'colonia', 'municipio'];
    inputsMayusculas.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }
    });

    const inputEmail = document.getElementById('email');
    if (inputEmail) {
        inputEmail.addEventListener('input', (e) => {
            e.target.value = e.target.value.toLowerCase().replace(/\s/g, ''); // Sin espacios y en minúsculas
        });
    }

    // --- VALIDACIÓN DE CURP COMPLETA Y CÁLCULO DE EDAD ESTRICTO (PANTALLA 10) ---
    const inputCurp = document.getElementById('curp');
    const inputEdad = document.getElementById('edad');
    const spanCurpError = document.getElementById('curp-error');
    const chkExtranjero = document.getElementById('chk-extranjero-reg');
    const filaExtranjero = document.getElementById('fila-extranjero');

    const diaNac = document.getElementById('dia-nac');
    const mesNac = document.getElementById('mes-nac');
    const anioNac = document.getElementById('anio-nac');
    const inputNombre = document.getElementById('nombre');
    const inputApPaterno = document.getElementById('ap-paterno');
    const inputApMaterno = document.getElementById('ap-materno');

    if (inputCurp && inputEdad && spanCurpError) {
        
        const validarFechaRealYCalcularEdad = (yy, mm, dd, char17) => {
            if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
                return { valido: false, msg: "⚠️ Error: Mes o día inexistente." };
            }

            let year = yy;
            if (char17 && char17.match(/[0-9]/)) year += 1900;
            else if (char17 && char17.match(/[A-Z]/)) year += 2000;
            else {
                let currentYear = new Date().getFullYear() % 100;
                year += (yy > currentYear ? 1900 : 2000);
            }

            let birthDate = new Date(year, mm - 1, dd);
            if (birthDate.getFullYear() !== year || birthDate.getMonth() !== (mm - 1) || birthDate.getDate() !== dd) {
                return { valido: false, msg: "⚠️ Error: Calendario inválido para ese mes/año." };
            }

            let today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            let monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;

            if (!isNaN(age) && age >= 0 && age <= 120) {
                inputEdad.value = age;
                return { valido: true };
            } else {
                return { valido: false, msg: "⚠️ Error: Edad calculada incoherente." };
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

        // Escucha en tiempo real CURP - NO DEJA ESCRIBIR FECHAS LOGICAMENTE INCORRECTAS
        inputCurp.addEventListener('input', (e) => {
            let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            
            if (chkExtranjero && chkExtranjero.checked) {
                e.target.value = v;
                spanCurpError.style.display = 'none';
                return;
            }

            // Validar mes en tiempo real (posiciones 6 y 7)
            if (v.length >= 7) {
                const mm = parseInt(v.substr(6, 2), 10);
                if (mm < 1 || mm > 12) {
                    v = v.substring(0, v.length - 1); // Borrar el dígito inválido inmediatamente
                    e.target.value = v;
                    spanCurpError.style.display = 'block';
                    spanCurpError.textContent = "⚠️ Formato de Mes inválido (01-12).";
                    return;
                }
            }

            // Validar día en tiempo real (posiciones 8 y 9)
            if (v.length >= 9) {
                const dd = parseInt(v.substr(8, 2), 10);
                if (dd < 1 || dd > 31) {
                    v = v.substring(0, v.length - 1); // Borrar dígito inválido
                    e.target.value = v;
                    spanCurpError.style.display = 'block';
                    spanCurpError.textContent = "⚠️ Formato de Día inválido (01-31).";
                    return;
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
                let char17 = v.charAt(16);

                const resFecha = validarFechaRealYCalcularEdad(yy, mm, dd, char17);

                if (resFecha.valido && v.length === 18) {
                    const regexCURP = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
                    if (!regexCURP.test(v)) {
                        spanCurpError.style.display = 'block';
                        spanCurpError.textContent = "Formato de CURP inválido estructuralmente";
                    } else {
                        spanCurpError.style.display = 'none';
                    }
                } else if (!resFecha.valido) {
                    spanCurpError.style.display = 'block';
                    spanCurpError.textContent = resFecha.msg;
                }
            } else {
                inputEdad.value = '';
                spanCurpError.style.display = 'block';
                spanCurpError.textContent = "El CURP debe tener 18 caracteres.";
            }
        });

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

    // --- MANEJO DEL SUBMIT CON FILTRO DE DIRECCIONES BASURA ("111") ---
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

            // Evitar entradas repetitivas de prueba como "111", "aaa" o puramente numéricas cortas en texto
            const regexInvalido = /^([A-Z0-9áéíóúñÑ])\1+$/i; 
            if (regexInvalido.test(calleVal) || regexInvalido.test(coloniaVal) || regexInvalido.test(municipioVal) || /^\d+$/.test(municipioVal) || /^\d+$/.test(coloniaVal)) {
                alert('⚠️ Error: Ingrese información de dirección válida y coherente. No se aceptan secuencias repetidas (ej. 111) ni datos únicamente numéricos en municipio/colonia.');
                return;
            }

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

    // --- OTRAS FUNCIONES (Mantenidas intactas) ---
    if (window.location.pathname.includes('30-lista-usuarios.html')) cargarUsuariosAdmin();
    if (window.location.pathname.includes('28-agenda-enfermero.html')) cargarAgendaEnfermeria();
    if (window.location.pathname.includes('25-editar-horario.html')) cargarHorarioDoctor();
});