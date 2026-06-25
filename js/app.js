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

    // --- FORMATEO EN TIEMPO REAL A MAYÚSCULAS Y ALERTAS DE IDENTIDAD REAL ---
    const camposIdentidad = ['nombre', 'ap-paterno', 'ap-materno', 'apellido_p', 'apellido_m'];
    camposIdentidad.forEach(id => {
        const input = document.getElementById(id);
        const warnSpan = document.getElementById(`${id}-warn`);
        
        if (input) {
            input.addEventListener('input', (e) => {
                let texto = e.target.value.toUpperCase(); // Forzar mayúsculas automáticamente
                
                // 1. Bloquear 3 letras idénticas seguidas (ej: SSSS)
                if (/([A-ZÁÉÍÓÚÑ])\1\1/i.test(texto)) {
                    texto = texto.substring(0, texto.length - 1);
                    if (warnSpan) {
                        warnSpan.textContent = "⚠️ No se permiten letras consecutivas repetidas.";
                        warnSpan.style.color = '#991D27'; // Rojo estricto
                        warnSpan.style.display = 'block';
                    }
                    e.target.value = texto;
                    return;
                }

                // 2. Alerta naranja preventiva para patrones alternados sospechosos (ej: DKDKDKDK, HCDGJFKBF)
                const textoLimpio = texto.replace(/\s/g, '');
                let esSospechoso = false;

                if (textoLimpio.length >= 5) {
                    // Regla A: Acumulación de consonantes seguidas sin vocales intermedias
                    const excesoConsonantes = /[^AEIOUÁÉÍÓÚÜ]{5,}/i.test(textoLimpio);

                    // Regla B: Tasa de variedad de caracteres baja en textos largos (ej: BIUUHWILILIL)
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
                        warnSpan.style.color = '#d35400'; // Color Naranja preventivo
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
    const inputsDireccionM = ['calle', 'colonia', 'municipio', 'colonia_municipio'];
    inputsDireccionM.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', (e) => {
                let texto = e.target.value.toUpperCase();
                if (/([A-Z0-9áéíóúñÑ])\1\1/i.test(texto)) {
                    texto = texto.substring(0, texto.length - 1);
                }
                e.target.value = texto;
            });
        }
    });

    // --- CATÁLOGO POSTAL LOCAL SEPOMEX (COMPARTIDO PACIENTES / PERSONAL) ---
    const inputCp = document.getElementById('cp');
    const inputMunicipio = document.getElementById('municipio');
    const inputColonia = document.getElementById('colonia');
    const contenedorColMun = document.getElementById('contenedor-colonia-municipio'); // Exclusivo de agregar personal

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

                // CASO A: Pantalla de Registro de Pacientes
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

                // CASO B: Pantalla de Registro de Personal (Estructura de Datos)
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

    // --- BLINDAJE DEL EMAIL / CORREO INSTITUCIONAL ---
    const inputsEmail = ['email', 'correo'];
    inputsEmail.forEach(id => {
        const inputEmailElement = document.getElementById(id);
        const spanEmailError = document.getElementById('email-error');
        
        if (inputEmailElement) {
            inputEmailElement.addEventListener('input', (e) => {
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

            inputEmailElement.addEventListener('blur', (e) => {
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

    // --- VALIDACIÓN DE CURP EN TIEMPO REAL PACIENTES (PANTALLA 10) ---
    const inputCurp = document.getElementById('curp');
    const inputEdad = document.getElementById('edad');
    const spanCurpError = document.getElementById('curp-error');
    const formPersonal = document.getElementById('form-personal'); // Identificador del formulario de personal

    // Ejecutar esta sección de CURP solo si NO estamos en el formulario de personal
    if (inputCurp && inputEdad && spanCurpError && !formPersonal) {
        inputCurp.addEventListener('input', (e) => {
            let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            let i = v.length - 1; 

            if (i >= 0 && i < 4) { 
                if (/[0-9]/.test(v[i])) v = v.substring(0, i);
            } else if (i >= 4 && i < 10) { 
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
            } else if (i >= 10 && i < 16) { 
                if (/[0-9]/.test(v[i])) v = v.substring(0, i);
            }

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
                if (!isNaN(age) && age >= 0) inputEdad.value = age;
            }
        });
    }

    // --- MODULO EXCLUSIVO: BLINDAJE INTEGRADO PARA REGISTRO DE PERSONAL ---
    if (formPersonal) {
        const inputCurpP = document.getElementById('curp');
        const inputEdadP = document.getElementById('edad');
        const spanCurpErrorP = document.getElementById('curp-error');

        if (inputCurpP && inputEdadP && spanCurpErrorP) {
            inputCurpP.addEventListener('input', (e) => {
                let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                let idx = v.length - 1;

                if (idx >= 0 && idx < 4) {
                    if (/[0-9]/.test(v[idx])) v = v.substring(0, idx);
                } else if (idx >= 4 && idx < 10) {
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
                } else if (idx >= 10 && idx < 16) {
                    if (/[0-9]/.test(v[idx])) v = v.substring(0, idx);
                }

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

        // Interceptión del submit para empaquetar los datos del personal
        formPersonal.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-personal');
            const errorCurp = document.getElementById('curp-error');

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
                apellido_p: document.getElementById('apellido_p').value,
                apellido_m: document.getElementById('apellido_m').value,
                correo: document.getElementById('correo').value,
                password: document.getElementById('password').value,
                puesto: document.getElementById('puesto').value,
                telefono: document.getElementById('telefono').value,
                calle: document.getElementById('calle').value,
                num_ext: document.getElementById('num_ext').value,
                cp: document.getElementById('cp').value,
                colonia: colElement ? `${colElement.value}, ${munElement.value}` : document.getElementById('colonia_municipio').value,
                cedula: document.getElementById('cedula').value,
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
            } quarters { btn.innerText = "Sincronizar con Base de Datos"; }
        });
    }

    // --- MANEJO DEL SUBMIT DE PACIENTES ---
    const formRegistro = document.getElementById('form-registro');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-sync');
            const telefono = document.getElementById('telefono').value;
            const curp = document.getElementById('curp').value.trim().toUpperCase();

            if (telefono.length !== 10) {
                alert('⚠️ Error: El teléfono debe tener exactamente 10 dígitos.');
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
                } else alert("⚠️ " + resData.mensaje);
            } catch (err) { alert("❌ Error de servidor"); }
            finally { btn.innerText = "Guardar Paciente"; }
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