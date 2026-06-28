// Variable global para detectar cambios en edición
let personaOriginal = null;

document.addEventListener('DOMContentLoaded', () => {
    // --- RELOJ ACTUAL GLOBAL ---
    setInterval(() => {
        const reloj = document.getElementById('reloj-actual');
        if (reloj) {
            const ahora = new Date();
            const horas = String(ahora.getHours()).padStart(2, '0');
            const minutes = String(ahora.getMinutes()).padStart(2, '0');
            reloj.textContent = `${horas}:${minutes}`;
        }
    }, 1000);

    // --- LÓGICA DE LOGIN ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const usuarioInput = document.getElementById('usuario');
        const contrasenaInput = document.getElementById('contrasena');
        const feedbackDiv = document.getElementById('login-feedback');
        const capsLockWarning = document.getElementById('caps-lock-warning');

        // 1. Forzar minúsculas en el campo de correo en tiempo real.
        if (usuarioInput) {
            usuarioInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toLowerCase();
            });
        }

        // 2. Detectar si el bloqueo de mayúsculas está activado en el campo de contraseña.
        if (contrasenaInput && capsLockWarning) {
            contrasenaInput.addEventListener('keyup', (e) => {
                if (e.getModifierState('CapsLock')) {
                    capsLockWarning.style.display = 'block';
                } else {
                    capsLockWarning.style.display = 'none';
                }
            });
        }

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const correoValue = usuarioInput.value.trim();
            const passwordValue = contrasenaInput.value;
            try {
                const respuesta = await fetch('https://clinica-virtual-backend.onrender.com/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo: correoValue, password: passwordValue })
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

    // --- FORMATEO ESTRICTO Y ALERTAS DE IDENTIDAD (TIEMPO REAL) ---
    const camposIdentidad = ['nombre', 'apellido_p', 'apellido_m', 'ap-paterno', 'ap-materno'];
    camposIdentidad.forEach(id => {
        const input = document.getElementById(id);
        const warnSpan = document.getElementById(`${id}-warn`);
        
        if (input) {
            input.addEventListener('input', (e) => {
                let texto = e.target.value.toUpperCase();
                
                // 1. Bloquear inmediatamente 3 letras idénticas seguidas (ej: SSSS)
                if (/([A-ZÁÉÍÓÚÑ])\1\1/i.test(texto)) {
                    texto = texto.substring(0, texto.length - 1);
                    if (warnSpan) {
                        warnSpan.textContent = "⚠️ No se permiten 3 letras consecutivas idénticas.";
                        warnSpan.style.display = 'block';
                    }
                    e.target.value = texto;
                    return;
                }

                // 2. Alertar dinámicamente si hay patrones alternados o consonantes basura
                const textoLimpio = texto.replace(/\s/g, '');
                let esSospechoso = false;

                if (textoLimpio.length >= 5) {
                    const excesoConsonantes = /[^AEIOUÁÉÍÓÚÜ]{5,}/i.test(textoLimpio);
                    const caracteresUnicos = new Set(textoLimpio).size;
                    const bajaVariedad = (textoLimpio.length >= 7 && caracteresUnicos <= 3);

                    if (excesoConsonantes || bajaVariedad) {
                        esSospechoso = true;
                    }
                }

                if (warnSpan) {
                    if (esSospechoso) {
                        const tipoEtiqueta = (id === 'nombre') ? '¿NOMBRE REAL?' : '¿APELLIDO REAL?';
                        warnSpan.textContent = `🤔 ${tipoEtiqueta} Verifique que la información sea verídica.`;
                        warnSpan.style.color = '#d35400'; 
                        warnSpan.style.display = 'block';
                    } else {
                        warnSpan.style.display = 'none';
                    }
                }

                e.target.value = texto;
            });
        }
    });

    // --- FORMATEO GENERAL A MAYÚSCULAS PARA DIRECCIONES ---
    const inputsDireccionM = ['calle', 'colonia', 'municipio', 'colonia_municipio', 'num_ext'];
    inputsDireccionM.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^A-Z0-9#.\-\s]/gi, '');
                e.target.value = e.target.value.toUpperCase();
            });
        }
    });

    // --- FORMATEO Y BLINDAJE DE DIRECCIONES CONTRA REPETICIONES ---
    const inputsDireccionCampos = ['calle', 'colonia', 'municipio', 'colonia_municipio'];
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
    const contenedorColMun = document.getElementById('contenedor-colonia-municipio');

    const baseDatosPostales = {
        "56580": {
            municipio: "IXTAPALUCA, ESTADO DE MÉXICO",
            colonias: ["AYOTLA", "ALBORADA", "CENTRO", "EMILIANO ZAPATA", "LA VENTA"]
        },
        "56560": {
            municipio: "IXTAPALUCA, ESTADO DE MÉXICO",
            colonias: ["LOS HÉROES", "SAN JERÓNIMO", "CUATRO VIENTOS"]
        },
        "06000": {
            municipio: "CUAUHTÉMOC, CIUDAD DE MÉXICO",
            colonias: ["CENTRO I", "CENTRO II", "CENTRO III"]
        }
    };

    if (inputCp) {
        inputCp.addEventListener('input', (e) => {
            const cp = e.target.value.replace(/[^0-9]/g, '');
            e.target.value = cp;

            if (cp.length === 5) {
                let datosPostales = baseDatosPostales[cp];
                if (!datosPostales) {
                    datosPostales = {
                        municipio: "MUNICIPIO CENTRAL, ESTADO DE MÉXICO",
                        colonias: ["SECCIÓN CENTRO", "ZONA VALLE", "COLONIA INDUSTRIAL"]
                    };
                }

                if (inputMunicipio && inputColonia) {
                    inputMunicipio.value = datosPostales.municipio;
                    inputMunicipio.readOnly = true;
                    inputMunicipio.style.backgroundColor = '#eee';

                    const selectColonia = document.createElement('select');
                    selectColonia.id = 'colonia';
                    selectColonia.style.width = '100%';
                    selectColonia.style.padding = '5px';
                    selectColonia.style.height = '33px';
                    selectColonia.style.border = '1px solid #0E3B5C';
                    
                    datosPostales.colonias.forEach(col => {
                        const opt = document.createElement('option');
                        opt.value = col;
                        opt.textContent = col;
                        selectColonia.appendChild(opt);
                    });

                    const currentColoniaNode = document.getElementById('colonia');
                    currentColoniaNode.parentNode.replaceChild(selectColonia, currentColoniaNode);
                }

                if (contenedorColMun) {
                    contenedorColMun.innerHTML = `
                        <input type="text" id="municipio_p" value="${datosPostales.municipio}" style="flex:1; background-color:#eee;" readonly>
                        <select id="colonia_p" style="flex:1; height:35px; border:1px solid #0E3B5C;">
                            ${datosPostales.colonias.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    `;
                }
            }
        });
    }

    // --- BLINDAJE DEL EMAIL / CORREO DE PERSONAL ---
    const inputsEmails = ['email', 'correo'];
    inputsEmails.forEach(id => {
        const emailInput = document.getElementById(id);
        const spanEmailError = document.getElementById('email-error');
        
        if (emailInput) {
            emailInput.addEventListener('input', (e) => {
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

            emailInput.addEventListener('blur', (e) => {
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
    });

    // --- VALIDACIÓN DE CURP EN TIEMPO REAL (PACIENTES) ---
    const inputCurp = document.getElementById('curp');
    const inputEdad = document.getElementById('edad');
    const spanCurpError = document.getElementById('curp-error');
    const formPersonal = document.getElementById('form-personal');

    if (inputCurp && inputEdad && spanCurpError && !formPersonal) {
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

            if (i >= 0 && i < 4) { if (/[0-9]/.test(v[i])) v = v.substring(0, i); }
            else if (i >= 4 && i < 10) { 
                if (/[A-Z]/.test(v[i])) v = v.substring(0, i);
                if (v.length === 7 && !/^[01]$/.test(v[6])) v = v.substring(0, 6);
                if (v.length === 8) {
                    const mm = parseInt(v.substr(6, 2), 10);
                    if (mm < 1 || mm > 12) v = v.substring(0, 7);
                }
                if (v.length === 9 && !/^[0-3]$/.test(v[8])) v = v.substring(0, 8);
                if (v.length === 10) {
                    const mm = parseInt(v.substr(6, 2), 10);
                    const dd = parseInt(v.substr(8, 2), 10);
                    if (dd < 1 || dd > 31) v = v.substring(0, 9);
                    else {
                        const yy = parseInt(v.substr(4, 2), 10);
                        let currentYear = new Date().getFullYear() % 100;
                        let year = yy + (yy > currentYear ? 1900 : 2000);
                        let testDate = new Date(year, mm - 1, dd);
                        if (testDate.getDate() !== dd) v = v.substring(0, 9);
                    }
                }
            }
            else if (i >= 10 && i < 16) { if (/[0-9]/.test(v[i])) v = v.substring(0, i); }

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
                if (!isNaN(age) && age >= 0 && age <= 120) inputEdad.value = age;

                if (v.length === 18) {
                    const regexCURP = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
                    spanCurpError.style.display = regexCURP.test(v) ? 'none' : 'block';
                    spanCurpError.textContent = "⚠️ Formato de CURP inválido estructuralmente.";
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

    // --- REGISTRO DE PERSONAL ---
    if (formPersonal) {
        const inputCurpP = document.getElementById('curp');
        const inputEdadP = document.getElementById('edad');
        const spanCurpErrorP = document.getElementById('curp-error');

        if (inputCurpP && inputEdadP && spanCurpErrorP) {
            inputCurpP.addEventListener('input', (e) => {
                let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                let idx = v.length - 1;

                if (idx >= 0 && idx < 4) { if (/[0-9]/.test(v[idx])) v = v.substring(0, idx); } 
                else if (idx >= 4 && idx < 10) {
                    if (/[A-Z]/.test(v[idx])) v = v.substring(0, idx);
                    if (v.length === 7 && !/^[01]$/.test(v[6])) v = v.substring(0, 6);
                    if (v.length === 8) {
                        const mm = parseInt(v.substr(6, 2), 10);
                        if (mm < 1 || mm > 12) v = v.substring(0, 7);
                    }
                    if (v.length === 9 && !/^[0-3]$/.test(v[8])) v = v.substring(0, 8);
                    if (v.length === 10) {
                        const mm = parseInt(v.substr(6, 2), 10);
                        const dd = parseInt(v.substr(8, 2), 10);
                        if (dd < 1 || dd > 31) v = v.substring(0, 9);
                        else {
                            const yy = parseInt(v.substr(4, 2), 10);
                            let currentYear = new Date().getFullYear() % 100;
                            let year = yy + (yy > currentYear ? 1900 : 2000);
                            let testDate = new Date(year, mm - 1, dd);
                            if (testDate.getDate() !== dd) v = v.substring(0, 9);
                        }
                    }
                } else if (idx >= 10 && idx < 16) { if (/[0-9]/.test(v[idx])) v = v.substring(0, idx); }

                e.target.value = v;

                if (v.length >= 10) {
                    const yy = parseInt(v.substr(4, 2), 10);
                    const mm = parseInt(v.substr(6, 2), 10);
                    const dd = parseInt(v.substr(8, 2), 10);
                    let currentYear = new Date().getFullYear() % 100;
                    let year = yy + (yy > currentYear ? 1900 : 2000);
                    let birthDate = new Date(year, mm - 1, dd);
                    let today = new Date();
                    let age = today.getFullYear() - birthDate.getFullYear();
                    let m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
                    if (!isNaN(age) && age >= 0) inputEdadP.value = age;

                    if (v.length === 18) {
                        const regexCURP = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;
                        spanCurpErrorP.style.display = regexCURP.test(v) ? 'none' : 'block';
                        spanCurpErrorP.textContent = "⚠️ Formato de CURP inválido estructuralmente.";
                    } else {
                        spanCurpErrorP.style.display = 'block';
                        spanCurpErrorP.textContent = "La CURP debe tener 18 caracteres.";
                    }
                } else {
                    inputEdadP.value = '';
                    spanCurpErrorP.style.display = 'none';
                }
            });
        }

        formPersonal.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-personal');
            const errorCurp = document.getElementById('curp-error');

            const apellidoP = document.getElementById('apellido_p').value;
            const apellidoM = document.getElementById('apellido_m').value;
            if (apellidoP.split(' ').filter(p => p.length > 1).length > 1 || apellidoM.split(' ').filter(p => p.length > 1).length > 1) {
                alert('⚠️ Error: Los campos de apellido no deben contener el mismo apellido dos veces.');
                return;
            }

            const password = document.getElementById('password').value;
            if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
                alert('⚠️ La contraseña es débil. Debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.');
                return;
            }

            const cedula = document.getElementById('cedula').value;
            if (cedula.length < 7 || cedula.length > 8) {
                alert('⚠️ La Cédula Profesional debe tener entre 7 y 8 caracteres.');
                return;
            }

            const calle = document.getElementById('calle').value;
            if (/[^A-Z0-9\s#.-]/.test(calle)) {
                alert('⚠️ Error: El campo "Calle" contiene caracteres no permitidos.');
                return;
            }

            const numExt = document.getElementById('num_ext').value;
            if (numExt.length > 0 && !/\d/.test(numExt)) {
                alert('⚠️ Error: El "Número Exterior" debe contener al menos un dígito si no está vacío.');
                return;
            }

            if (errorCurp && errorCurp.style.display === 'block') {
                alert('⚠️ Error: Corrija las advertencias de la CURP antes de sincronizar.');
                return;
            }

            if (document.getElementById('telefono').value.length !== 10) {
                alert('⚠️ El teléfono debe tener exactamente 10 dígitos.');
                return;
            }

            btn.innerText = "Sincronizando...";
            const colElement = document.getElementById('colonia_p');
            const munElement = document.getElementById('municipio_p');

            const datosPersonal = {
                nombre: document.getElementById('nombre').value,
                apellido_p: apellidoP,
                apellido_m: apellidoM,
                correo: document.getElementById('correo').value,
                password: password,
                puesto: document.getElementById('puesto').value,
                telefono: document.getElementById('telefono').value,
                calle: calle,
                num_ext: numExt,
                cp: document.getElementById('cp').value,
                colonia: colElement ? `${colElement.value}, ${munElement.value}` : document.getElementById('colonia_municipio').value,
                cedula: cedula,
                curp: document.getElementById('curp').value.toUpperCase()
            };

            try {
                const res = await fetch('https://clinica-virtual-backend.onrender.com/api/personal', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(datosPersonal)
                });
                const resData = await res.json();
                alert("✅ " + resData.mensaje);
                if (resData.success) history.back();
            } catch (err) {
                alert("❌ Error de conexión al servidor");
            } finally {
                btn.innerText = "Sincronizar con Base de Datos";
            }
        });
    }

    // --- MANEJO DEL SUBMIT PACIENTES ---
    const formRegistro = document.getElementById('form-registro');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-sync');
            const telefono = document.getElementById('telefono').value;
            const curp = document.getElementById('curp').value.trim().toUpperCase();
            const errorVisible = document.getElementById('curp-error');
            const errorEmailVisible = document.getElementById('email-error');

            const apPaterno = document.getElementById('ap-paterno').value.trim();
            const apMaterno = document.getElementById('ap-materno').value.trim();
            if ((apPaterno.split(' ').length > 1 && new Set(apPaterno.split(' ')).size === 1) || (apMaterno.split(' ').length > 1 && new Set(apMaterno.split(' ')).size === 1)) {
                alert('⚠️ Error: Un mismo apellido no puede repetirse en un solo campo (ej: "GARCIA GARCIA").');
                return;
            }

            if (/[^A-Z0-9\s#.-]/i.test(document.getElementById('calle').value)) {
                alert('⚠️ Error: El campo "Calle" contiene caracteres no permitidos.');
                return;
            }

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
                apellido_p: apPaterno,
                apellido_m: apMaterno,
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

    // --- FORMULARIO EDITAR PERSONAL ---
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

    // --- RUTEADOR DE VISTAS POR PATHNAME ---
    if (window.location.pathname.includes('30-lista-usuarios.html')) cargarUsuariosAdmin();
    if (window.location.pathname.includes('28-agenda-enfermero.html')) cargarAgendaEnfermeria();
    if (window.location.pathname.includes('18-borrar-personal.html')) prepararPaginaBorrado();
    if (window.location.pathname.includes('15-mostrar-estudios.html')) cargarEstudiosPaciente();
    if (window.location.pathname.includes('13-historial-citas.html')) cargarHistorialCitasPaciente();
    if (window.location.pathname.includes('9-historial.html')) prepararPaginaHistorial();
});

// --- FUNCIONES ASÍNCRONAS GLOBALES ---

async function cargarAgendaEnfermeria() {
    const contenedor = document.getElementById('contenedor-agenda-enfermeria');
    if (!contenedor) return;

    const fechaHoy = new Date().toISOString().split('T')[0];
    contenedor.innerHTML = '<p style="text-align: center;">Cargando agenda de hoy...</p>';

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/citas/fecha/${fechaHoy}`);
        const data = await res.json();

        if (data.success && data.citas.length > 0) {
            contenedor.innerHTML = data.citas.map(cita => `
                <div class="tarjeta-paciente" id="cita-${cita.id_cita}">
                    <div class="info-paciente">
                        <p><strong>${cita.nombre} ${cita.apellido_paterno}</strong></p>
                        <p>Hora: ${cita.hora} - Dr(a). ${cita.doctor_apellido}</p>
                    </div>
                    <div class="botones-control">
                        <button class="btn-accion-verde" onclick="marcarAsistencia(${cita.id_cita}, 'presente')">Presente</button>
                        <button class="btn-accion-rojo" onclick="marcarAsistencia(${cita.id_cita}, 'ausente')">Ausente</button>
                    </div>
                </div>
            `).join('');
        } else {
            contenedor.innerHTML = '<p style="text-align: center; color: #0E3B5C;">No hay citas agendadas para hoy.</p>';
        }
    } catch (error) {
        console.error("Error cargando agenda de enfermería:", error);
        contenedor.innerHTML = '<p style="text-align: center; color: #991D27;">Error de conexión al cargar la agenda.</p>';
    }
}

async function buscarPersonalParaEditar() {
    const termino = document.getElementById('buscar-cedula').value.trim();
    if (!termino) {
        alert("Por favor, ingrese una cédula o correo para buscar.");
        return;
    }

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/personal/${encodeURIComponent(termino)}`);
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

            document.getElementById('nombre').value = p.nombre || '';
            document.getElementById('apellido_p').value = p.apellido_paterno || '';
            document.getElementById('apellido_m').value = p.apellido_materno || '';
            document.getElementById('telefono').value = p.telefono || '';
            document.getElementById('email').value = p.correo || '';
            document.getElementById('calle').value = p.direccion_calle || '';
            document.getElementById('num_ext').value = p.direccion_num_ext || '';
            document.getElementById('cp').value = p.direccion_cp || '';
            document.getElementById('colonia').value = p.direccion_colonia || '';
            document.getElementById('display-puesto').value = p.puesto || '';
            document.getElementById('display-cedula').value = p.cedula_id || '';

            alert("✅ Personal encontrado y cargado en el formulario.");
        } else {
            alert("⚠️ " + data.mensaje);
            document.getElementById('form-editar-personal').reset();
            personaOriginal = null;
        }
    } catch (error) {
        alert("❌ Error de conexión al buscar el personal.");
    }
}

function prepararPaginaBorrado() {
    const btnBuscar = document.getElementById('btn-buscar-borrar');
    if (btnBuscar) btnBuscar.addEventListener('click', buscarPersonalParaBorrar);
}

async function buscarPersonalParaBorrar() {
    const termino = document.getElementById('termino-borrar').value.trim();
    const resultadosDiv = document.getElementById('resultados-borrado');
    resultadosDiv.innerHTML = '';

    if (!termino) {
        alert("Por favor, ingrese una cédula o correo para buscar.");
        return;
    }

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/personal/${encodeURIComponent(termino)}`);
        const data = await res.json();

        if (data.success) {
            const p = data.persona;
            resultadosDiv.innerHTML = `
                <div class="tarjeta-paciente" style="border-left-color: #991D27; background-color: #fff3f4; margin-top: 20px;">
                    <div class="info-paciente">
                        <p><strong>Nombre:</strong> ${p.nombre} ${p.apellido_paterno}</p>
                        <p><strong>Cédula:</strong> ${p.cedula_id}</p>
                        <p><strong>Puesto:</strong> ${p.puesto}</p>
                        <p><strong>Correo:</strong> ${p.correo}</p>
                    </div>
                    <div class="botones-control">
                        <button class="btn-accion-rojo" onclick="confirmarBorradoPersonal(${p.id_usuario}, '${p.nombre} ${p.apellido_paterno}')">
                            Confirmar Baja
                        </button>
                    </div>
                </div>
            `;
        } else {
            resultadosDiv.innerHTML = `<p style="text-align: center; color: #991D27; margin-top: 20px;">${data.mensaje}</p>`;
        }
    } catch (error) {
        alert("❌ Error de conexión al buscar el personal.");
    }
}

async function confirmarBorradoPersonal(idUsuario, nombreCompleto) {
    const confirmacion = confirm(`❓ ¿Está completamente seguro de que desea dar de baja a ${nombreCompleto}?\n\nEsta acción es irreversible.`);
    if (confirmacion) {
        try {
            const res = await fetch('https://clinica-virtual-backend.onrender.com/api/admin/usuarios/baja', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_usuario: idUsuario })
            });
            const data = await res.json();
            if (data.success) {
                alert("✅ " + data.mensaje);
                document.getElementById('resultados-borrado').innerHTML = '<p style="text-align: center; color: #2D5A27; margin-top: 20px;">El usuario ha sido dado de baja.</p>';
            } else {
                alert("⚠️ " + data.mensaje);
            }
        } catch (error) {
            alert("❌ Error de conexión.");
        }
    }
}

async function cargarUsuariosAdmin() {
    const contenedor = document.getElementById('lista-usuarios-admin');
    if (!contenedor) return;

    try {
        const res = await fetch('https://clinica-virtual-backend.onrender.com/api/admin/usuarios');
        const data = await res.json();
        if (data.success && data.usuarios.length > 0) {
            contenedor.innerHTML = data.usuarios.map(u => `
                <div class="tarjeta-usuario ${u.estatus ? '' : 'inactivo'}" style="border-left-color: ${u.estatus ? '#0E3B5C' : '#991D27'};">
                    <div class="info-paciente">
                        <p><strong>${u.nombre ? (u.nombre + ' ' + (u.apellido_paterno || '')) : 'Usuario sin Perfil'}</strong> (${u.rol})</p>
                        <p>${u.correo} - <span style="font-weight: bold; color: ${u.estatus ? '#2D5A27' : '#991D27'}">${u.estatus ? 'Activo' : 'Inactivo'}</span></p>
                    </div>
                </div>`).join('');
        } else {
            contenedor.innerHTML = '<p style="text-align: center;">No se encontraron usuarios registrados.</p>';
        }
    } catch (error) { 
        contenedor.innerHTML = '<p style="text-align: center; color: #991D27;">Error de conexión al cargar la lista de usuarios.</p>'; 
    }
}
 
async function cargarEstudiosPaciente() {
    const idPaciente = localStorage.getItem('idPaciente');
    const contenedor = document.getElementById('contenedor-estudios');
    if (!idPaciente) {
        contenedor.innerHTML = '<p style="text-align: center; color: #991D27;">Error: No se encontró identificador de paciente.</p>';
        return;
    }

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/estudios/${idPaciente}`);
        const data = await res.json();

        if (data.success && data.estudios.length > 0) {
            contenedor.innerHTML = '';
            data.estudios.forEach(estudio => {
                const fecha = new Date(estudio.fecha_solicitud).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
                const estadoClass = estudio.estado.toLowerCase() === 'pendiente' ? 'pendiente' : 'completado';

                contenedor.innerHTML += `
                    <div class="tarjeta-estudio">
                        <p><strong>Tipo de Estudio:</strong> ${estudio.tipo_estudio}</p>
                        <p><strong>Fecha de Solicitud:</strong> ${fecha}</p>
                        <p><strong>Estado:</strong> <span class="estado ${estadoClass}">${estudio.estado}</span></p>
                        <p><strong>Indicaciones:</strong> ${estudio.indicaciones || 'Sin indicaciones adicionales.'}</p>
                        ${estudio.estado.toLowerCase() === 'completado' ? `<p style="background-color: #eef5f9; padding: 8px; border-radius: 4px; margin-top: 8px;"><strong>Notas del Médico:</strong> ${estudio.notas_medico || 'Sin notas.'}</p>` : ''}
                    </div>
                `;
            });
        } else {
            contenedor.innerHTML = '<p style="text-align: center; color: #0E3B5C; margin-top: 20px;">No tiene estudios médicos registrados.</p>';
        }
    } catch (error) {
        contenedor.innerHTML = '<p style="text-align: center; color: #991D27;">Hubo un error de conexión al cargar estudios.</p>';
    }
}

async function buscarPacienteConsulta() {
    const termino = document.getElementById('id-busqueda').value.trim();
    if (!termino) {
        alert("Por favor, ingrese un dato para buscar al paciente.");
        return;
    }

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/pacientes/${encodeURIComponent(termino)}`);
        const data = await res.json();

        if (data.success) {
            const p = data.paciente;
            document.getElementById('nombre-paciente').value = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.trim();
            document.getElementById('edad-paciente').value = p.edad;
            document.getElementById('sangre-paciente').value = p.tipo_sangre;
            document.getElementById('nombre-paciente').dataset.idPaciente = p.id_paciente;

            alert("✅ Paciente encontrado.");

            const resSignos = await fetch(`https://clinica-virtual-backend.onrender.com/api/signos/${p.id_paciente}`);
            const dataSignos = await resSignos.json();
            if (dataSignos.success && dataSignos.signos) {
                const signos = dataSignos.signos;
                document.getElementById('peso').value = signos.peso || '';
                document.getElementById('talla').value = signos.talla || '';
                document.getElementById('fc').value = signos.fc || '';
                document.getElementById('fr').value = signos.fr || '';
                document.getElementById('sato2').value = signos.sato2 || '';
                document.getElementById('alerta-signos-faltantes').style.display = 'none';
            } else {
                document.getElementById('alerta-signos-faltantes').style.display = 'block';
            }
        } else {
            alert("⚠️ " + data.mensaje);
            document.querySelector('form.datos-paciente-grid').reset();
        }
    } catch (error) {
        alert("❌ Error de conexión al buscar el paciente.");
    }
}

async function buscarPacienteEstudio() {
    const termino = document.getElementById('id-busqueda-estudio').value.trim();
    const nombreInput = document.getElementById('nombre-paciente-estudio');
    if (!termino) {
        alert("Por favor, ingrese un dato para buscar al paciente.");
        return;
    }

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/pacientes/${encodeURIComponent(termino)}`);
        const data = await res.json();

        if (data.success) {
            const p = data.paciente;
            nombreInput.value = `${p.nombre} ${p.apellido_paterno} ${p.apellido_materno || ''}`.trim();
            nombreInput.dataset.idPaciente = p.id_paciente;
            alert("✅ Paciente encontrado y seleccionado.");
        } else {
            alert("⚠️ " + data.mensaje);
            nombreInput.value = "Esperando paciente...";
            delete nombreInput.dataset.idPaciente;
        }
    } catch (error) {
        alert("❌ Error de conexión.");
    }
}

function prepararPaginaHistorial() {
    const btnBuscar = document.getElementById('btn-buscar-historial');
    if (btnBuscar) btnBuscar.addEventListener('click', buscarHistorialPaciente);
}

async function buscarHistorialPaciente() {
    const termino = document.getElementById('termino-historial').value.trim();
    const contenedor = document.getElementById('contenedor-historial');
    contenedor.innerHTML = '<p style="text-align: center; color: #666;">Buscando...</p>';

    if (!termino) {
        alert("Por favor, ingrese un dato para buscar al paciente.");
        contenedor.innerHTML = '<p style="text-align: center; color: #666;">Ingrese un Teléfono, CURP o Correo.</p>';
        return;
    }

    try {
        const resPaciente = await fetch(`https://clinica-virtual-backend.onrender.com/api/pacientes/${encodeURIComponent(termino)}`);
        const dataPaciente = await resPaciente.json();

        if (!dataPaciente.success) {
            contenedor.innerHTML = `<p style="text-align: center; color: #991D27;">${dataPaciente.mensaje}</p>`;
            return;
        }

        const idPaciente = dataPaciente.paciente.id_paciente;
        const nombrePaciente = `${dataPaciente.paciente.nombre} ${dataPaciente.paciente.apellido_paterno}`;

        const resConsultas = await fetch(`https://clinica-virtual-backend.onrender.com/api/consultas/${idPaciente}`);
        const dataConsultas = await resConsultas.json();

        if (dataConsultas.success && dataConsultas.consultas.length > 0) {
            contenedor.innerHTML = `<h3 style="color: #0E3B5C; margin-bottom: 15px;">Historial de: ${nombrePaciente}</h3>`;
            dataConsultas.consultas.forEach(c => {
                const fecha = new Date(c.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
                contenedor.innerHTML += `
                    <div class="tarjeta-historial">
                        <div class="fecha-historial">${fecha}</div>
                        <div class="detalle-historial">
                            <p><strong>Atendido por:</strong> Dr(a). ${c.doctor_nombre} ${c.doctor_apellido}</p>
                            <p><strong>Signos Vitales:</strong> Peso: ${c.peso}kg, Talla: ${c.talla}m, FC: ${c.fc}ppm, FR: ${c.fr}rpm, SatO2: ${c.sato2}%</p>
                            <div class="receta-historial">
                                <strong>Receta / Indicaciones:</strong>
                                <pre>${c.receta || 'Sin indicaciones.'}</pre>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            contenedor.innerHTML = `<p style="text-align: center; color: #0E3B5C;">El paciente <strong>${nombrePaciente}</strong> no tiene consultas registradas.</p>`;
        }
    } catch (error) {
        contenedor.innerHTML = '<p style="text-align: center; color: #991D27;">Error de conexión al buscar el historial.</p>';
    }
}

async function solicitarEstudio() {
    const idPaciente = document.getElementById('nombre-paciente-estudio').dataset.idPaciente;
    const cedulaDoctor = localStorage.getItem('cedulaUsuario');
    const tipoEstudio = document.getElementById('tipo-estudio').value;
    const indicaciones = document.getElementById('indicaciones-estudio').value;

    if (!idPaciente) {
        alert("⚠️ Primero debe buscar y seleccionar un paciente.");
        return;
    }
    if (!tipoEstudio) {
        alert("⚠️ Debe seleccionar un tipo de estudio.");
        return;
    }

    const datosEstudio = { id_paciente: idPaciente, cedula_doctor: cedulaDoctor, tipo_estudio: tipoEstudio, indicaciones: indicaciones };

    try {
        const res = await fetch('https://clinica-virtual-backend.onrender.com/api/estudios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosEstudio)
        });
        const data = await res.json();
        alert(data.success ? `✅ ${data.mensaje}` : `⚠️ ${data.mensaje}`);
        if (data.success) history.back();
    } catch (error) {
        alert("❌ Error de conexión al solicitar el estudio.");
    }
}

async function cargarHistorialCitasPaciente() {
    const idPaciente = localStorage.getItem('idPaciente');
    const contenedor = document.getElementById('contenedor-citas-historial');
    if (!idPaciente) {
        contenedor.innerHTML = '<p style="text-align: center; color: #991D27;">Error: No se encontró identificador de paciente.</p>';
        return;
    }

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/citas/paciente/${idPaciente}`);
        const data = await res.json();

        const nombreUsuario = localStorage.getItem('nombreUsuario');
        const titulo = document.querySelector('.header-consulta h3');
        if (titulo && nombreUsuario) titulo.textContent = `Bienvenido(a), ${nombreUsuario}`;

        if (data.success && data.citas.length > 0) {
            contenedor.innerHTML = '';
            data.citas.forEach(cita => {
                const fecha = new Date(cita.fecha).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const estadoClass = cita.estatus.toLowerCase();

                contenedor.innerHTML += `
                    <div class="tarjeta-cita-historial">
                        <p><strong>Fecha:</strong> ${fecha} a las <strong>${cita.hora}</strong></p>
                        <p><strong>Médico:</strong> Dr(a). ${cita.nombre} ${cita.apellido_paterno}</p>
                        <p><strong>Estado:</strong> <span class="estatus ${estadoClass}">${cita.estatus}</span></p>
                        ${cita.estatus.toLowerCase() === 'cancelada' ? `<p style="font-size: 12px; color: #666;"><em>Cita cancelada.</em></p>` : ''}
                    </div>
                `;
            });
        } else if (data.success) {
            contenedor.innerHTML = '<p style="text-align: center; color: #0E3B5C; margin-top: 20px;">No tiene citas registradas en su historial.</p>';
        } else {
            contenedor.innerHTML = `<p style="text-align: center; color: #991D27;">${data.mensaje}</p>`;
        }
    } catch (error) {
        contenedor.innerHTML = '<p style="text-align: center; color: #991D27;">Hubo un error de conexión.</p>';
    }
}

async function marcarAsistencia(idCita, nuevoEstatus) {
    try {
        const res = await fetch('https://clinica-virtual-backend.onrender.com/api/citas/estatus', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_cita: idCita, estatus: nuevoEstatus })
        });
        const data = await res.json();

        if (data.success) {
            const tarjeta = document.getElementById(`cita-${idCita}`);
            if (tarjeta) {
                tarjeta.classList.remove('estado-presente', 'estado-ausente');
                tarjeta.classList.add(`estado-${nuevoEstatus}`);
                tarjeta.querySelector('.botones-control').innerHTML = `<p style="font-weight: bold; color: ${nuevoEstatus === 'presente' ? '#2D5A27' : '#991D27'};">Marcado como ${nuevoEstatus.toUpperCase()}</p>`;
            }
        } else {
            alert(`⚠️ ${data.mensaje}`);
        }
    } catch (error) {
        alert('❌ Error de conexión al actualizar el estado de la cita.');
    }
}