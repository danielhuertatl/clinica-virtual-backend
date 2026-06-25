// Variable global para detectar cambios en edición
let personaOriginal = null;

document.addEventListener('DOMContentLoaded', () => {
    // --- RELOJ ACTUAL GLOBAL ---
    setInterval(() => {
        const reloj = document.getElementById('reloj-actual');
        if (reloj) {
            const ahora = new Date();
            const horas = String(ahora.getHours()).padStart(2, '0');
            const minutos = String(ahora.getMinutes()).padStart(2, '0');
            reloj.textContent = `${horas}:${minutos}`;
        }
    }, 1000);

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

    // --- FORMATEO ESTRICTO EN TIEMPO REAL A MAYÚSCULAS ---
    const inputsMayusculas = ['nombre', 'ap-paterno', 'ap-materno', 'calle', 'colonia', 'municipio'];
    inputsMayusculas.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }
    });

    // --- FORMATEO Y BLINDAJE DE DIRECCIONES CONTRA REPETICIONES ---
    const inputsDireccionCampos = ['calle', 'colonia', 'municipio'];
    inputsDireccionCampos.forEach(id => {
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
                let texto = e.target.value; 
                
                if (/([A-Z0-9áéíóúñÑ])\1\1/i.test(texto)) {
                    texto = texto.substring(0, texto.length - 1);
                    errSpan.textContent = "⚠️ ¡Caracteres repetidos no permitidos!";
                    errSpan.style.display = 'block';
                    e.target.value = texto;
                    return;
                }
                errSpan.style.display = 'none';
                e.target.value = texto;
            });
        }
    });

    // --- INTEGRACIÓN DE CATÁLOGO AUTOMÁTICO SEPOMEX POR C.P. ---
    const inputCp = document.getElementById('cp');
    const inputMunicipio = document.getElementById('municipio');
    const inputColonia = document.getElementById('colonia');

    if (inputCp && inputMunicipio && inputColonia) {
        inputCp.addEventListener('input', async (e) => {
            const cp = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = cp;

            if (cp.length === 5) {
                try {
                    // Consultamos la API oficial de SEPOMEX mediante Copomex
                    const response = await fetch(`https://api.copomex.com/query/info_cp/${cp}?token=pruebas`);
                    const data = await response.json();

                    if (data && data[0] && data[0].error === false) {
                        const info = data[0].response;
                        
                        // Autollenar Municipio / Entidad y bloquear para evitar datos basura
                        inputMunicipio.value = `${info.municipio.toUpperCase()}, ${info.estado.toUpperCase()}`;
                        inputMunicipio.readOnly = true;
                        inputMunicipio.style.backgroundColor = '#eee';

                        // Transformar dinámicamente la caja de texto de Colonia a un Select con datos reales
                        const selectColonia = document.createElement('select');
                        selectColonia.id = 'colonia';
                        selectColonia.style.width = '100%';
                        selectColonia.style.padding = '5px';
                        selectColonia.style.height = '33px';
                        selectColonia.style.border = '1px solid #0E3B5C';
                        
                        info.asentamiento.forEach(col => {
                            const opt = document.createElement('option');
                            opt.value = col.toUpperCase();
                            opt.textContent = col.toUpperCase();
                            selectColonia.appendChild(opt);
                        });

                        const currentColoniaNode = document.getElementById('colonia');
                        currentColoniaNode.parentNode.replaceChild(selectColonia, currentColoniaNode);
                    } else {
                        inputMunicipio.value = '';
                        inputMunicipio.placeholder = 'C.P. No encontrado';
                        inputMunicipio.readOnly = false;
                        inputMunicipio.style.backgroundColor = '#fff';
                    }
                } catch (error) {
                    console.error("Error al consultar el catálogo postal de SEPOMEX.");
                }
            }
        });
    }

    // --- BLINDAJE DEL EMAIL (PURA MINÚSCULA Y ARROBA AL PERDER FOCO) ---
    const inputEmail = document.getElementById('email');
    const spanEmailError = document.getElementById('email-error');
    if (inputEmail) {
        inputEmail.addEventListener('input', (e) => {
            let texto = e.target.value.toLowerCase().replace(/\s/g, ''); 

            if (/([a-z0-9._%+-])\1\1/i.test(texto) || /\.\./.test(texto)) {
                texto = texto.substring(0, texto.length - 1); 
                if (spanEmailError) {
                    spanEmailError.textContent = "⚠️ Caracteres repetidos o puntos consecutivos inválidos.";
                    spanEmailError.style.display = 'block';
                }
            } else {
                if (spanEmailError) spanEmailError.style.display = 'none';
            }
            e.target.value = texto;
        });

        inputEmail.addEventListener('blur', (e) => {
            const texto = e.target.value;
            const regexCorreoReal = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (texto.length > 0 && !regexCorreoReal.test(texto)) {
                if (spanEmailError) {
                    spanEmailError.textContent = "⚠️ Formato de correo inválido (Falta '@' o dominio real).";
                    spanEmailError.style.display = 'block';
                }
            }
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
                    spanCurpError.textContent = "⚠️ ¡El formato va incorrecto! El dia debe iniciar con un rango de 0 a 3.";
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

    // --- MANEJO DEL SUBMIT (ENVÍO REESTRUCTURADO PARA MENÚ SELECT DE COLONIA) ---
    const formRegistro = document.getElementById('form-registro');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-sync');
            const telefono = document.getElementById('telefono').value;
            const curp = document.getElementById('curp').value.trim().toUpperCase();
            const errorVisible = document.getElementById('curp-error');
            const errorEmailVisible = document.getElementById('email-error');

            const calleVal = document.getElementById('calle').value.trim();
            const coloniaElement = document.getElementById('colonia');
            const coloniaVal = coloniaElement.value.trim(); // Esto ahora lee correctamente el option seleccionado
            const municipioVal = document.getElementById('municipio').value.trim();

            if (telefono.length !== 10) {
                alert('⚠️ Error: El teléfono debe tener exactamente 10 dígitos.');
                return;
            }

            if ((errorVisible && errorVisible.style.display === 'block') || (errorEmailVisible && errorEmailVisible.style.display === 'block')) {
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

    // --- MÓDULOS DE EDICIÓN Y AGENDAS ---
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

    if (window.location.pathname.includes('30-lista-usuarios.html')) cargarUsuariosAdmin();
    if (window.location.pathname.includes('28-agenda-enfermero.html')) cargarAgendaEnfermeria();
    if (window.location.pathname.includes('25-editar-horario.html')) cargarHorarioDoctor();
});
//