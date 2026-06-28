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

        if (usuarioInput) {
            usuarioInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toLowerCase();
            });
        }

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
                
                // Bloquear inmediatamente 3 letras idénticas seguidas (ej: SSSS)
                if (/([A-ZÁÉÍÓÚÑ])\1\1/i.test(texto)) {
                    texto = texto.substring(0, texto.length - 1);
                    if (warnSpan) {
                        warnSpan.textContent = "⚠️ No se permiten 3 letras consecutivas idénticas.";
                        warnSpan.style.display = 'block';
                    }
                    e.target.value = texto;
                    return;
                }

                // Alertar dinámicamente si hay patrones alternados o consonantes basura
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

    // --- CÁLCULO DE IMC EN TIEMPO REAL (PANTALLA DE CONSULTA MÉDICA) ---
    const pInput = document.getElementById('input-peso');
    const tInput = document.getElementById('input-talla');
    const imcInput = document.getElementById('input-imc');
    if (pInput && tInput && imcInput) {
        const calcularIMC = () => {
            const peso = parseFloat(pInput.value);
            const talla = parseFloat(tInput.value);
            if (peso > 0 && talla > 0) {
                const imc = peso / (talla * talla);
                imcInput.value = imc.toFixed(2);
            } else {
                imcInput.value = '';
            }
        };
        pInput.addEventListener('input', calcularIMC);
        tInput.addEventListener('input', calcularIMC);
    }

    // --- LÓGICA DE AMPLIACIÓN DE TEXTAREA DE RECETA ---
    const btnExpandir = document.getElementById('btn-expandir');
    const txtReceta = document.getElementById('texto-receta');
    if (btnExpandir && txtReceta) {
        btnExpandir.addEventListener('click', () => {
            txtReceta.classList.toggle('receta-expandida');
            if (txtReceta.classList.contains('receta-expandida')) {
                btnExpandir.textContent = 'Minimizar ⤢';
                btnExpandir.classList.add('btn-flotante');
            } else {
                btnExpandir.textContent = 'Ampliar ⤢';
                btnExpandir.classList.remove('btn-flotante');
            }
        });
    }

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
                errSpan.style.fontSize = '11px';
                errSpan.style.display = 'none';
                errSpan.style.fontWeight = 'bold';
                input.parentNode.appendChild(errSpan);
            }

            input.addEventListener('input', (e) => {
                let texto = e.target.value.toUpperCase(); 
                
                // 1. Bloqueo inmediato de 3 caracteres idénticos consecutivos
                if (/([A-Z0-9ÁÉÍÓÚÑ])\1\1/i.test(texto)) {
                    texto = texto.substring(0, texto.length - 1);
                    errSpan.textContent = "⚠️ ¡Caracteres repetidos no permitidos!";
                    errSpan.style.color = '#991D27';
                    errSpan.style.display = 'block';
                    e.target.value = texto;
                    return;
                }

                // 2. LA VALIDACIÓN CON CARITA: Detectar exceso de consonantes basura seguidas en la calle
                const textoLimpio = texto.replace(/\s/g, '');
                let esSospechoso = false;
                if (textoLimpio.length >= 6) {
                    esSospechoso = /[^AEIOUÁÉÍÓÚÜ0-9#.-]{6,}/i.test(textoLimpio);
                }

                if (esSospechoso) {
                    errSpan.textContent = "🤔 ¿DIRECCIÓN REAL? Verifique que la información sea verídica.";
                    errSpan.style.color = '#d35400'; // Naranja preventivo
                    errSpan.style.display = 'block';
                } else {
                    errSpan.style.display = 'none';
                }

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

            // --- VALIDACIONES DE SUBMIT ---
            // 1.1 y 6. APELLIDOS DUPLICADOS (CON PREGUNTA DE CONFIRMACIÓN DE SEGURIDAD)
            const apellidoP = document.getElementById('apellido_p').value.trim();
            const apellidoM = document.getElementById('apellido_m').value.trim();
            
            const dupP = apellidoP.split(' ').filter(p => p.length > 1).length > 1;
            const dupM = apellidoM.split(' ').filter(p => p.length > 1).length > 1;

            if (dupP || dupM) {
                const proceder = confirm("🤔 Detectamos un apellido repetido en el mismo campo (Ej: MARQUÉS MARQUÉS).\n\n¿La información es correcta y verídica para este miembro del personal?");
                if (!proceder) return; // Detiene el registro para corregir
            }

            // CONTRASEÑA FUERTE
            const password = document.getElementById('password').value;
            if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
                alert('⚠️ La contraseña es débil. Debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.');
                return;
            }

            // CÉDULA PROFESIONAL
            const cedula = document.getElementById('cedula').value;
            if (cedula.length < 7 || cedula.length > 8) {
                alert('⚠️ La Cédula Profesional debe tener entre 7 y 8 caracteres.');
                return;
            }

            // 4. CALLE CON CARACTERES ESPECIALES
            const calle = document.getElementById('calle').value;
            if (/[^A-Z0-9\s#.-]/.test(calle)) {
                alert('⚠️ Error: El campo "Calle" contiene caracteres no permitidos.');
                return;
            }

            // 5. NÚMERO EXTERIOR ACEPTA LETRAS (se valida que no sea solo texto)
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
            // --- FIN DE VALIDACIONES ---
            
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

            // --- VALIDACIONES DE SUBMIT PARA PACIENTES ---
            // 6. APELLIDOS DUPLICADOS (CON PREGUNTA DE CONFIRMACIÓN DE SEGURIDAD INTERACTIVA)
            const apPaterno = document.getElementById('ap-paterno').value.trim();
            const apMaterno = document.getElementById('ap-materno').value.trim();
            
            const dupPaterno = apPaterno.split(' ').filter(p => p.length > 1).length > 1;
            const dupMaterno = apMaterno.split(' ').filter(p => p.length > 1).length > 1;

            if (dupPaterno || dupMaterno) {
                const proceder = confirm("🤔 Detectamos un apellido repetido en el mismo campo (Ej: MÁRQUEZ MÁRQUEZ).\n\n¿La información es correcta y verídica para este paciente?");
                if (!proceder) return; // Detiene el registro si el usuario quiere corregir
            }

            // 7. CALLE CON CARACTERES ESPECIALES (PACIENTE)
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
            // --- FIN DE VALIDACIONES ---

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
    if (window.location.pathname.includes('26-mis-citas.html') || window.location.pathname.includes('13-historial-citas.html')) cargarHistorialCitasPaciente();
    if (window.location.pathname.includes('9-historial.html')) prepararPaginaHistorial();
    if (window.location.pathname.includes('25-editar-horario.html')) cargarHorarioDoctor();
    if (window.location.pathname.includes('29-agenda-admin.html')) {
        cargarDirectorioReal();
        cargarBuzonIncidencias();
    }
    if (window.location.pathname.includes('11-agenda-chat.html')) {
        renderizarCitaPacienteAgenda();
        cargarDirectorioPaciente();
    }
    // 25. LÓGICA DE DISPONIBILIDAD DE HORARIOS PARA AGENDAR CITA
    if (window.location.pathname.includes('27-agendar-cita.html')) {
        cargarDisponibilidadParaAgendar();
    }
    // 24. ACTIVAR LÓGICA DE RECUPERACIÓN DE CONTRASEÑA
    const formRecuperar = document.getElementById('form-recuperar');
    if (formRecuperar) {
        formRecuperar.addEventListener('submit', enviarSolicitudRecuperacion);
    }

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
                        <button class="btn-accion-verde" onclick=\"marcarAsistencia(${cita.id_cita}, 'presente')\">Presente</button>
                        <button class="btn-accion-rojo" onclick=\"marcarAsistencia(${cita.id_cita}, 'ausente')\">Ausente</button>
                    </div>
                </div>
            `).join('');
        } else {
            contenedor.innerHTML = '<p style="text-align: center; color: #0E3B5C;">No hay citas agendadas para hoy.</p>';
        }
    } catch (error) {
        contenedor.innerHTML = '<p style="text-align: center; color: #991D27;">Error de conexión al cargar la agenda.</p>';
    }
}

async function buscarPersonalParaEditar() {
    const inputBuscar = document.getElementById('buscar-cedula');
    if (!inputBuscar) return;

    let termino = inputBuscar.value.trim();
    if (!termino) {
        alert("Por favor, ingrese una cédula o correo para buscar.");
        return;
    }

    // BLINDAJE INGENIOSO: Si el término contiene un '@', es un correo, por lo que forzamos minúsculas automáticamente
    if (termino.includes('@')) {
        termino = termino.toLowerCase();
        inputBuscar.value = termino; // Lo pintamos en minúsculas en la interfaz
    }

    // Validación contra ráfagas de texto basura en el buscador
    const textoLimpio = termino.replace(/\s/g, '');
    if (textoLimpio.length >= 6 && /[^AEIOUÁÉÍÓÚÜ0-9#.-]{6,}/i.test(textoLimpio)) {
        alert("🤔 ¿DATO REAL? Verifique que la cédula o correo ingresado sea verídico.");
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
            const form = document.getElementById('form-editar-personal');
            if (form) form.reset();
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
    const inputBorrar = document.getElementById('termino-borrar');
    const resultadosDiv = document.getElementById('resultados-borrado');
    if (!resultadosDiv || !inputBorrar) return;
    resultadosDiv.innerHTML = '';

    let termino = inputBorrar.value.trim();
    if (!termino) {
        alert("Por favor, ingrese una cédula o correo para buscar.");
        return;
    }

    // BLINDAJE INGENIOSO: Si contiene '@', convertimos a minúsculas para coincidir con la Base de Datos
    if (termino.includes('@')) {
        termino = termino.toLowerCase();
        inputBorrar.value = termino;
    }

    // Validación contra ráfagas de texto basura
    const textoLimpio = termino.replace(/\s/g, '');
    if (textoLimpio.length >= 6 && /[^AEIOUÁÉÍÓÚÜ0-9#.-]{6,}/i.test(textoLimpio)) {
        alert("🤔 ¿DATO REAL? Verifique que la cédula o correo ingresado sea verídico.");
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
    if (confirm(`❓ ¿Está seguro de dar de baja a ${nombreCompleto}?`)) {
        try {
            const res = await fetch('https://clinica-virtual-backend.onrender.com/api/admin/usuarios/baja', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_usuario: idUsuario })
            });
            const data = await res.json();
            if (data.success) {
                alert("✅ " + data.mensaje);
                location.reload();
            } else { alert("⚠️ " + data.mensaje); }
        } catch (error) { alert("❌ Error de conexión."); }
    }
}

async function cargarUsuariosAdmin() {
    const contenedor = document.getElementById('contenedor-usuarios-admin') || document.getElementById('lista-usuarios-admin');
    if (!contenedor) return;

    try {
        const res = await fetch('https://clinica-virtual-backend.onrender.com/api/admin/usuarios');
        const data = await res.json();
        if (data.success && data.usuarios.length > 0) {
            contenedor.innerHTML = data.usuarios.map(u => `
                <div class="tarjeta-usuario ${u.estatus ? '' : 'inactivo'}" style="border-left-color: ${u.estatus ? '#0E3B5C' : '#991D27'}; margin-bottom:10px; padding:10px; background:white; border-radius:5px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div class="info-paciente">
                        <p><strong>${u.nombre ? (u.nombre + ' ' + (u.apellido_paterno || '')) : 'Usuario sin Perfil'}</strong> (${u.rol})</p>
                        <p>${u.correo} - <span style="font-weight: bold; color: ${u.estatus ? '#2D5A27' : '#991D27'}">${u.estatus ? 'Activo' : 'Inactivo'}</span></p>
                    </div>
                </div>`).join('');
        } else {
            contenedor.innerHTML = '<p style="text-align: center;">No se encontraron usuarios registrados.</p>';
        }
    } catch (error) { 
        contenedor.innerHTML = '<p style="text-align: center; color: #991D27;">Error de conexión.</p>'; 
    }
}
 
async function cargarEstudiosPaciente() {
    const contenedor = document.getElementById('contenedor-estudios');
    const rol = localStorage.getItem('rolUsuario');
    const idPacienteSesion = localStorage.getItem('idPaciente');

    if (!contenedor) return; // Si no hay contenedor principal, no hacemos nada.

    // Contenedor para la barra de búsqueda que debe existir en 15-mostrar-estudios.html
    const searchContainerHTML = `
        <div id="search-container-estudios" class="input-inline" style="margin-bottom: 20px;">
            <input type="text" id="termino-estudios" placeholder="Buscar por Teléfono, CURP o Correo del Paciente">
            <button id="btn-buscar-estudios" class="btn-ok">Buscar</button>
        </div>`;

    if (rol === 'paciente' && idPacienteSesion) {
        // Si es paciente, carga sus estudios directamente
        const headerTitle = document.querySelector('.header-consulta h3');
        if(headerTitle) headerTitle.textContent = 'Mis Estudios Clínicos';
        await buscarYRenderizarEstudios(idPacienteSesion, contenedor);

    } else if (rol === 'doctor' || rol === 'admin' || rol === 'enfermero') {
        // Si es personal médico, inyectamos y activamos la barra de búsqueda
        contenedor.insertAdjacentHTML('beforebegin', searchContainerHTML);
        
        const btnBuscar = document.getElementById('btn-buscar-estudios');
        if (btnBuscar) {
            btnBuscar.addEventListener('click', async () => {
                const termino = document.getElementById('termino-estudios').value.trim();
                if (!termino) return alert('Por favor, ingrese un dato del paciente para buscar.');

                try {
                    const resPaciente = await fetch(`https://clinica-virtual-backend.onrender.com/api/pacientes/${encodeURIComponent(termino)}`);
                    const dataPaciente = await resPaciente.json();

                    if (dataPaciente.success) {
                        const headerTitle = document.querySelector('.header-consulta h3');
                        if(headerTitle) headerTitle.textContent = `Estudios de: ${dataPaciente.paciente.nombre} ${dataPaciente.paciente.apellido_paterno}`;
                        await buscarYRenderizarEstudios(dataPaciente.paciente.id_paciente, contenedor);
                    } else {
                        contenedor.innerHTML = `<p style="text-align: center; color: #991D27;">${dataPaciente.mensaje}</p>`;
                    }
                } catch (error) {
                    contenedor.innerHTML = `<p style="text-align: center; color: #991D27;">Error de conexión al buscar paciente.</p>`;
                }
            });
        } else {
            contenedor.innerHTML = '<p style="text-align: center; color: #666;">Ingrese un dato para buscar los estudios de un paciente.</p>';
        }
    }
}

async function buscarYRenderizarEstudios(idPaciente, contenedor) {
    contenedor.innerHTML = '<p style="text-align: center;">Cargando estudios...</p>';
    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/estudios/${idPaciente}`);
        const data = await res.json();

        if (data.success && data.estudios.length > 0) {
            contenedor.innerHTML = data.estudios.map(estudio => {
                const fecha = new Date(estudio.fecha_solicitud).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
                return `
                    <div class="tarjeta-estudio" style="background:white; padding:15px; border-radius:5px; margin-bottom:10px; border-left: 5px solid #0E3B5C;">
                        <p><strong>Tipo de Estudio:</strong> ${estudio.tipo_estudio.toUpperCase()}</p>
                        <p><strong>Fecha de Solicitud:</strong> ${fecha}</p>
                        <p><strong>Estado:</strong> <span class="estado ${estudio.estado.toLowerCase()}" style="font-weight:bold; color:${estudio.estado.toLowerCase() === 'pendiente' ? '#d35400' : '#2D5A27'};">${estudio.estado}</span></p>
                        <p><strong>Indicaciones:</strong> ${estudio.indicaciones || 'Sin indicaciones.'}</p>
                        ${estudio.estado.toLowerCase() === 'completado' ? `<p style="margin-top:10px; padding-top:10px; border-top:1px solid #eee;"><strong>Notas del Médico:</strong> ${estudio.notas_medico || 'Sin notas.'}</p>` : ''}
                    </div>`;
            }).join('');
        } else {
            contenedor.innerHTML = '<p style="text-align: center;">No se encontraron estudios para este paciente.</p>';
        }
    } catch (error) {
        contenedor.innerHTML = '<p style="text-align: center; color: #991D27;">Error de conexión al cargar los estudios.</p>';
    }
}

async function buscarPacienteConsulta() {
    const term = document.getElementById('id-busqueda').value.trim();
    if (!term) return alert("Por favor, ingrese un dato para buscar.");

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/pacientes/${encodeURIComponent(term)}`);
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
                const s = dataSignos.signos;
                document.getElementById('input-peso').value = s.peso || '';
                document.getElementById('input-talla').value = s.talla || '';
                document.getElementById('input-fc').value = s.fc || '';
                document.getElementById('input-fr').value = s.fr || '';
                document.getElementById('input-sato2').value = s.sato2 || '';
                document.getElementById('alerta-signos-faltantes').style.display = 'none';
                
                // Disparar cálculo automático de IMC al rellenar los datos pre-cargados
                if(s.peso && s.talla) {
                    document.getElementById('input-imc').value = (s.peso / (s.talla * s.talla)).toFixed(2);
                }
            } else {
                document.getElementById('alerta-signos-faltantes').style.display = 'block';
            }
        } else { alert("⚠️ " + data.mensaje); }
    } catch (error) { alert("❌ Error al buscar."); }
}

// --- BUSCAR PACIENTE DESDE LA PANTALLA DE ENFERMERÍA (CORRECCIÓN DE BÚSQUEDA) ---
async function buscarPacienteSignos() {
    const term = document.getElementById('id-busqueda-signos').value.trim();
    if (!term) return alert("Por favor, ingrese un dato para buscar.");

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/pacientes/${encodeURIComponent(term)}`);
        const data = await res.json();

        if (data.success) {
            document.getElementById('nombre-paciente').value = `${data.paciente.nombre} ${data.paciente.apellido_paterno} ${data.paciente.apellido_materno || ''}`.trim();
            document.getElementById('id-busqueda-signos').dataset.idReal = data.paciente.id_paciente;
            alert("✅ Paciente encontrado.");
        } else {
            alert("⚠️ " + data.mensaje);
        }
    } catch(e) { alert("❌ Error de conexión al buscar."); }
}

// --- FINALIZAR CONSULTA Y GUARDAR RECETA (CORRECCIÓN MÉDICA) ---
async function guardarYGenerarReceta() {
    const idPaciente = document.getElementById('nombre-paciente').dataset.idPaciente;
    const cedulaDoctor = localStorage.getItem('cedulaUsuario');
    const peso = document.getElementById('input-peso').value;
    const talla = document.getElementById('input-talla').value;
    const fc = document.getElementById('input-fc').value;
    const fr = document.getElementById('input-fr').value;
    const sato2 = document.getElementById('input-sato2').value;
    const imc = document.getElementById('input-imc').value;
    const receta = document.getElementById('texto-receta').value.trim();

    if (!idPaciente) return alert("⚠️ Error: Primero debe buscar y cargar un paciente.");
    if (!peso || !talla || !receta) return alert("⚠️ Error: Los campos de Peso, Talla y las indicaciones de la Receta son obligatorios.");

    const datosConsulta = { id_paciente: idPaciente, cedula_doctor: cedulaDoctor, peso, talla, fc, fr, sato2, imc, receta };

    try {
        const res = await fetch('https://clinica-virtual-backend.onrender.com/api/consultas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosConsulta)
        });
        const data = await res.json();

        if (data.success) {
            localStorage.setItem('recetaTemporal', receta);
            localStorage.setItem('fechaReceta', new Date().toLocaleString('es-MX'));
            localStorage.setItem('pacienteTemporal', document.getElementById('nombre-paciente').value);
            localStorage.setItem('edadTemporal', document.getElementById('edad-paciente').value);
            localStorage.setItem('pesoTemporal', peso + " kg");
            localStorage.setItem('tallaTemporal', talla + " m");
            localStorage.setItem('imcTemporal', imc);

            // Eliminar signos del triaje temporal al completarse la consulta
            await fetch(`https://clinica-virtual-backend.onrender.com/api/signos/${idPaciente}`, { method: 'DELETE' });

            alert("✅ Consulta médica finalizada exitosamente.");
            window.location.href = '20-receta.html';
        } else {
            alert("⚠️ " + data.mensaje);
        }
    } catch (error) { alert("❌ Error de conexión al intentar cerrar la consulta."); }
}

async function buscarPacienteEstudio() {
    const term = document.getElementById('id-busqueda-estudio').value.trim();
    const inputNom = document.getElementById('nombre-paciente-estudio');
    if (!term) return alert("Por favor, ingrese un dato.");

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/pacientes/${encodeURIComponent(term)}`);
        const data = await res.json();

        if (data.success) {
            inputNom.value = `${data.paciente.nombre} ${data.paciente.apellido_paterno}`.trim();
            inputNom.dataset.idPaciente = data.paciente.id_paciente;
            alert("✅ Paciente seleccionado.");
        } else {
            alert("⚠️ " + data.mensaje);
            inputNom.value = "Esperando paciente...";
        }
    } catch (error) { alert("❌ Error de conexión."); }
}

function prepararPaginaHistorial() {
    const rol = localStorage.getItem('rolUsuario');
    const idPaciente = localStorage.getItem('idPaciente');

    if (rol === 'paciente' && idPaciente) {
        // Si es un paciente, cargamos su historial directamente
        const searchContainer = document.querySelector('.input-inline');
        if (searchContainer) searchContainer.style.display = 'none'; // Ocultamos la barra de búsqueda

        const titulo = document.querySelector('.header-consulta h3');
        if (titulo) titulo.textContent = 'Mi Historial de Consultas';

        buscarHistorialPaciente(idPaciente); // Llamamos a la función con el ID del paciente
    } else if (rol === 'doctor' || rol === 'admin' || rol === 'enfermero') {
        // Si es personal médico, mantenemos la funcionalidad de búsqueda
        const btn = document.getElementById('btn-buscar-historial');
        if (btn) btn.addEventListener('click', () => buscarHistorialPaciente());
    }
}

async function buscarHistorialPaciente(idPacienteDirecto) {
    // Determina si se usará el ID directo (paciente) o el campo de texto (médico)
    const terminoDeBusqueda = idPacienteDirecto 
        ? String(idPacienteDirecto) 
        : document.getElementById('termino-historial').value.trim();

    const cont = document.getElementById('contenedor-historial');
    if (!cont) return;
    cont.innerHTML = '<p style="text-align: center;">Buscando...</p>';

    if (!terminoDeBusqueda) {
        cont.innerHTML = '<p style="text-align: center;">Ingrese un Teléfono, CURP o Correo.</p>';
        if (!idPacienteDirecto) alert("Por favor, rellene el campo de búsqueda."); // Solo alerta al médico
        return;
    }

    try {
        const resP = await fetch(`https://clinica-virtual-backend.onrender.com/api/pacientes/${encodeURIComponent(terminoDeBusqueda)}`);
        const dataP = await resP.json();

        if (!dataP.success) {
            cont.innerHTML = `<p style="text-align: center; color: #991D27;">${dataP.mensaje}</p>`;
            return;
        }

        const idPac = dataP.paciente.id_paciente;
        const nomPac = `${dataP.paciente.nombre} ${dataP.paciente.apellido_paterno}`;

        const resC = await fetch(`https://clinica-virtual-backend.onrender.com/api/consultas/${idPac}`);
        const dataC = await resC.json();

        if (dataC.success && dataC.consultas.length > 0) {
            cont.innerHTML = `<h3 style="color: #0E3B5C; margin-bottom: 15px;">Historial de: ${nomPac}</h3>`;
            dataC.consultas.forEach(c => {
                const f = new Date(c.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
                cont.innerHTML += `
                    <div class="tarjeta-historial">
                        <div class="fecha-historial">${f}</div>
                        <div class="detalle-historial">
                            <p><strong>Atendido por:</strong> Dr(a). ${c.doctor_nombre} ${c.doctor_apellido}</p>
                            <p><strong>Signos:</strong> Peso: ${c.peso}kg, Talla: ${c.talla}m, FC: ${c.fc}ppm, SatO2: ${c.sato2}%</p>
                            <div class="receta-historial"><pre>${c.receta || 'Sin indicaciones.'}</pre></div>
                        </div>
                    </div>`;
            });
        } else {
            cont.innerHTML = `<p style="text-align: center;">El paciente <strong>${nomPac}</strong> no registra consultas pasadas.</p>`;
        }
    } catch (error) { cont.innerHTML = '<p style="text-align: center; color: #991D27;">Error de conexión.</p>'; }
}

async function solicitarEstudio() {
    const idPac = document.getElementById('nombre-paciente-estudio').dataset.idPaciente;
    const cedDoc = localStorage.getItem('cedulaUsuario');
    const tipo = document.getElementById('tipo-estudio').value;
    const ind = document.getElementById('indicaciones-estudio').value;

    if (!idPac || !tipo) return alert("⚠️ Debe seleccionar un paciente y el tipo de estudio.");

    try {
        const res = await fetch('https://clinica-virtual-backend.onrender.com/api/estudios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_paciente: idPac, cedula_doctor: cedDoc, tipo_estudio: tipo, indicaciones: ind })
        });
        const data = await res.json();
        alert(data.success ? `✅ ${data.mensaje}` : `⚠️ ${data.mensaje}`);
        if (data.success) history.back();
    } catch (error) { alert("❌ Error de conexión."); }
}

// --- CARGAR CITAS (INTEGRACIÓN UNIFICADA PANTALLA 13 Y PANTALLA 26) ---
async function cargarHistorialCitasPaciente() {
    const idPaciente = localStorage.getItem('idPaciente');
    const contHistorialCompleto = document.getElementById('contenedor-citas-historial'); // Pantalla 13
    const contProximaCita = document.getElementById('contenedor-proxima-cita'); // Pantalla 26
    const contHistorialCitas = document.getElementById('contenedor-historial-citas'); // Pantalla 26
    const msgSinCitas = document.getElementById('mensaje-sin-citas'); // Pantalla 26

    if (!idPaciente) return;

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/citas/paciente/${idPaciente}`);
        const data = await res.json();

        // Actualizar saludo del encabezado si aplica
        const nomUsr = localStorage.getItem('nombreUsuario');
        const tit = document.querySelector('.header-consulta h3');
        if (tit && nomUsr) tit.textContent = `Bienvenido(a), ${nomUsr}`;

        if (data.success && data.citas.length > 0) {
            if (contHistorialCompleto) contHistorialCompleto.innerHTML = '';
            if (contProximaCita) contProximaCita.innerHTML = '';
            if (contHistorialCitas) contHistorialCitas.innerHTML = '';
            if (msgSinCitas) msgSinCitas.style.display = 'none';

            let proximaCitaEncontrada = false;

            data.citas.forEach(cita => {
                const fStr = new Date(cita.fecha).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const estClass = cita.estatus.toLowerCase();

                const HTMLCard = `
                    <div class="tarjeta-cita-historial">
                        <p><strong>Fecha:</strong> ${fStr} a las <strong>${cita.hora} hrs</strong></p>
                        <p><strong>Médico:</strong> Dr(a). ${cita.nombre} ${cita.apellido_paterno}</p>
                        <p><strong>Estado:</strong> <span class="estatus ${estClass}">${cita.estatus}</span></p>
                    </div>`;

                // Si es la pantalla 13 (Ver lista plana)
                if (contHistorialCompleto) {
                    contHistorialCompleto.innerHTML += HTMLCard;
                }

                // Si es la pantalla 26 (Portal del paciente con división de estados)
                if (contProximaCita && contHistorialCitas) {
                    if (cita.estatus.toLowerCase() === 'agendada' && !proximaCitaEncontrada) {
                        // Es la cita vigente del paciente
                        contProximaCita.innerHTML = `
                            <div class="tarjeta-cita-destacada">
                                <p style="font-size:18px; color:#0E3B5C;">📅 <strong>Próxima Cita Confirmada</strong></p>
                                <p style="margin-top:10px;"><strong>Fecha:</strong> ${fStr}</p>
                                <p><strong>Hora:</strong> ${cita.hora} hrs</p>
                                <p><strong>Especialista:</strong> Dr(a). ${cita.nombre} ${cita.apellido_paterno}</p>
                                <button class="btn-accion-rojo" style="margin-top:15px; width:100%;" onclick=\"if(confirm('¿Desea cancelar esta cita?')){ fetch('https://clinica-virtual-backend.onrender.com/api/citas/cancelar',{method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id_cita:${cita.id_cita}})}).then(()=>location.reload()); }\">❌ Cancelar esta Cita</button>
                            </div>`;
                        proximaCitaEncontrada = true;
                    } else {
                        // Va al historial de pasadas / canceladas
                        contHistorialCitas.innerHTML += HTMLCard;
                    }
                }
            });

            if (contProximaCita && !proximaCitaEncontrada && msgSinCitas) {
                msgSinCitas.style.display = 'block';
            }
        } else {
            if (msgSinCitas) msgSinCitas.style.display = 'block';
            if (contHistorialCompleto) contenedor.innerHTML = '<p style="text-align: center;">No registra historial de citas.</p>';
        }
    } catch (error) { console.error(error); }
}

async function cargarHorarioDoctor() {
    const cedula = localStorage.getItem('cedulaUsuario');
    if (!cedula) return;

    try {
        if (typeof calcularTotalHoras === "function") calcularTotalHoras();
    } catch (error) { console.error(error); }
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/horarios/${cedula}`);
        const data = await res.json();

        if (data.success && data.horario) {
            // Limpiar todos los checkboxes y horas antes de popular
            for (let i = 0; i < 7; i++) {
                const chk = document.getElementById(`chk-${i}`);
                if(chk) chk.checked = false;
            }

            data.horario.forEach(h => {
                const chk = document.getElementById(`chk-${h.dia_semana}`);
                if (chk) {
                    chk.checked = true;
                    document.getElementById(`inicio-${h.dia_semana}`).value = h.hora_inicio;
                    document.getElementById(`fin-${h.dia_semana}`).value = h.hora_fin;
                }
            });
        }
        // Finalmente, calculamos las horas totales con los datos cargados
        if (typeof calcularTotalHoras === "function") calcularTotalHoras(); 
    } catch (error) { console.error("Error al cargar horario:", error); }
}

async function guardarHorarioDoctor() {
    const cedula = localStorage.getItem('cedulaUsuario');
    if (!cedula) return alert("❌ Error: Sesión de usuario inválida.");

    let totalHoras = 0;
    if (typeof calcularTotalHoras === "function") totalHoras = calcularTotalHoras();

    if (totalHoras < 40) {
        alert("⚠️ No se puede guardar: Debe cubrir un mínimo de 40 horas semanales.");
        return;
    }

    const listaHorarios = [];
    for (let i = 0; i < 7; i++) {
        const checkbox = document.getElementById(`chk-${i}`);
        if (checkbox && checkbox.checked) {
            listaHorarios.push({
                dia_semana: i,
                hora_inicio: document.getElementById(`inicio-${i}`).value,
                hora_fin: document.getElementById(`fin-${i}`).value
            });
        }
    }

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/horarios/${encodeURIComponent(cedula)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(listaHorarios)
        });
        const data = await res.json();
        if (data.success) {
            alert("✅ " + data.mensaje);
            history.back();
        } else { alert("⚠️ " + data.mensaje); }
    } catch (error) { alert("❌ Error al guardar el horario."); }
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
        } else { alert(`⚠️ ${data.mensaje}`); }
    } catch (error) { alert('❌ Error de conexión.'); }
}

// =================================================================
// 🔄 RESTAURACIÓN DE AGENDA, CONTACTOS Y BUZÓN ADMINISTRATIVO
// =================================================================

// 1. Cargar el directorio médico real en la pantalla 29 (Admin)
async function cargarDirectorioReal() {
    const tbody = document.getElementById('cuerpo-directorio');
    if (!tbody) return; // Si no está en la pantalla 29, no hace nada

    try {
        const res = await fetch('https://clinica-virtual-backend.onrender.com/api/doctores');
        const data = await res.json();

        if (data.success && data.doctores.length > 0) {
            tbody.innerHTML = data.doctores.map(doc => `
                <tr id="doctor-row-${doc.cedula_id.replace(/\s+/g, '')}">
                    <td style="font-weight: bold; color: #0E3B5C;">Dr(a). ${doc.nombre} ${doc.apellido_paterno}</td>
                    <td><code style="background: #eef5f9; padding: 2px 6px; border-radius: 4px;">${doc.cedula_id}</code></td>
                    <td>
                        <a href="tel:${doc.telefono}" style="color: #2D5A27; text-decoration: none; font-weight: bold;">
                            📞 ${doc.telefono || 'Sin registrar'}
                        </a>
                    </td>
                    <td style="text-align:center;">
                        <button class="btn-accion-rojo" style="padding: 4px 8px; font-size: 12px;" onclick="ocultarDoctor('${doc.cedula_id}', '${doc.nombre} ${doc.apellido_paterno}')">
                            Ocultar
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #991D27;">No hay médicos activos registrados.</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #991D27;">❌ Error de conexión al cargar directorio.</td></tr>`;
    }
    // Añadir fila para agregar nuevo doctor
    tbody.innerHTML += `
        <tr style="background-color: #f9f9f9;">
            <td colspan="4" style="text-align: center; padding: 10px;"><a href="16-agregar-personal.html" class="btn-accion-verde" style="text-decoration: none; display: inline-block; padding: 8px 16px;">+ Añadir Nuevo Personal Médico</a></td>
        </tr>`;
}

// 2. Cargar el buzón de incidencias reales en la pantalla 29 (Admin)
async function cargarBuzonIncidencias() {
    const contenedor = document.getElementById('lista-incidencias');
    if (!contenedor) return;

    try {
        const res = await fetch('https://clinica-virtual-backend.onrender.com/api/admin/incidencias');
        const data = await res.json();

        if (data.success) {
            let htmlContenido = "";
            const { bajas, recuperaciones } = data.incidencias;

            bajas.forEach(u => {
                htmlContenido += `
                    <div style="padding: 15px; background: #fff9f9; border: 1px solid #f5c6cb; border-radius: 6px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <strong style="color: #991D27;">🚫 Acceso Revocado (Baja Confirmada)</strong>
                            <span class="indicador-nuevo" style="background: #666; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Historial</span>
                        </div>
                        <p style="font-size: 14px; margin: 8px 0;">"La cuenta asociada al correo <strong>${u.correo}</strong> (${u.rol}) fue dada de baja de manera lógica."</p>
                        <div style="display: flex; gap: 10px; font-size: 12px; color: #666;">
                            <span>👤 ID: ${u.id_usuario}</span>
                            <span>⚙️ Auditoría</span>
                        </div>
                    </div>`;
            });

            recuperaciones.forEach(msg => {
                htmlContenido += `
                    <div style="padding: 15px; background: #fbf9f1; border: 1px solid #f3ebd0; border-radius: 6px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <strong style="color: #d35400;">🔑 Solicitud de Restablecimiento</strong>
                            <span class="indicador-nuevo" style="background: #d35400; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Pendiente</span>
                        </div>
                        <p style="font-size: 14px; margin: 8px 0;">${msg.contenido}</p>
                        <div style="display: flex; gap: 10px; font-size: 12px; color: #666;">
                            <span>🌐 Origen: Portal Pacientes</span>
                            <span>📅 ${new Date(msg.fecha_envio).toLocaleDateString('es-MX')}</span>
                        </div>
                    </div>`;
            });

            if (htmlContenido === "") contenedor.innerHTML = `<p style="text-align: center; color: #666;">No hay alertas en el buzón.</p>`;
            else contenedor.innerHTML = htmlContenido;
        } else {
            contenedor.innerHTML = `<p style="text-align: center; color: #666;">No hay alertas en el buzón.</p>`;
        }
    } catch (error) {
        contenedor.innerHTML = `<p style="text-align: center; color: #991D27;">❌ Error de enlace con el buzón.</p>`;
    }
}

// 3. Cargar la cita del paciente omitiendo el bloqueo estricto del año en la pantalla 11
async function renderizarCitaPacienteAgenda() {
    const idPaciente = localStorage.getItem('idPaciente');
    const contenedor = document.getElementById('bloque-cita-dinamica');
    const titulo = document.getElementById('titulo-estado-cita');
    if (!idPaciente || !contenedor) return;

    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/citas/paciente/${idPaciente}`);
        const data = await res.json();

        if (data.success && data.citas.length > 0) {
            // Buscamos cualquier cita activa (agendada) sin importar la restricción estricta de año escolar
            const ahora = new Date();
            ahora.setHours(0, 0, 0, 0); // Para comparar solo fechas

            const citaActiva = data.citas.find(c => c.estatus.toLowerCase() === 'agendada' && new Date(c.fecha.split('T')[0] + 'T00:00:00') >= ahora);

            if (citaActiva) {
                const fechaLimpia = citaActiva.fecha.split('T')[0].replace(/-/g, '/');
                const fechaObj = new Date(fechaLimpia);
                const listameses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

                contenedor.innerHTML = `
                    <div class="card-cita">
                        <div class="info-cita">
                            <div class="fecha-box">
                                <small>${listameses[fechaObj.getMonth()]}</small>
                                <span>${fechaObj.getDate()}</span>
                                <small>${fechaObj.getFullYear()}</small>
                            </div>
                            <div>
                                <h3 style="margin: 0; color: #0E3B5C;">Consulta General</h3>
                                <p style="margin: 5px 0; color: #444;"><strong>Hora:</strong> ${citaActiva.hora} hrs</p>
                                <p style="margin: 0; color: #666; font-size: 14px;">Dr(a). ${citaActiva.nombre} ${citaActiva.apellido_paterno}</p>
                            </div>
                        </div>
                        <div style="font-size: 14px; color: #555;">
                            <p>📍 <strong>Ubicación:</strong> Consultorio 2 - Planta de Especialistas</p>
                            <p style="margin-top:5px;">📝 <strong>Estatus:</strong> <span class="estatus agendada" style="font-weight:bold; color:#2D5A27;">Confirmada</span></p>
                        </div>
                    </div>`;
                if (titulo) titulo.innerText = "Tu Próxima Cita";
                return;
            }
        }

        if (titulo) titulo.innerText = "Sin Citas Programadas";
        contenedor.innerHTML = `
            <div class="card-cita" style="border-top-color:#666; text-align:center; padding:25px;">
                <p style="font-size:16px; color:#555; font-weight:bold;">📅 No registras citas pendientes</p>
                <p style="font-size:13px; color:#777; margin-top:8px;">Si requieres atención médica o tienes una orden, acude al área de Somatometría para asignación directa.</p>
            </div>`;
    } catch (error) {
        contenedor.innerHTML = `<div class="card-cita"><p style="color:#991D27; text-align:center;">Error de sincronización con la API.</p></div>`;
    }
}

// 4. Cargar los teléfonos reales de la base de datos en la pantalla 11
async function cargarDirectorioPaciente() {
    const divDir = document.getElementById('directorio-paciente-view');
    if (!divDir) return;

    try {
        const res = await fetch('https://clinica-virtual-backend.onrender.com/api/doctores');
        const data = await res.json();

        if (data.success && data.doctores.length > 0) {
            divDir.innerHTML = data.doctores.map(doc => `
                <div class="item-contacto-paciente" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f4f4f4;">
                    <div>
                        <span style="font-weight:bold; color:#0E3B5C; font-size:14px;">Dr(a). ${doc.nombre} ${doc.apellido_paterno.split(' ')[0]}</span>
                        <br><small style="color:#777; font-size:11px;">Cédula: ${doc.cedula_id}</small>
                    </div>
                    <a href="tel:${doc.telefono}" style="color:#2D5A27; font-weight:bold; font-size:14px; text-decoration:none;">
                        📞 ${doc.telefono}
                    </a>
                </div>
            `).join('');
        } else {
            divDir.innerHTML = `<div style="text-align:center; padding: 10px; color:#777; font-size:13px;">Clínica Central: 5512345678</div>`;
        }
    } catch (e) {
        divDir.innerHTML = `<p style="color:#991D27; font-size:12px; text-align:center;">Directorio fuera de línea.</p>`;
    }
}

// --- FUNCIONES NUEVAS PARA INTERACTIVIDAD ---

/**
 * Oculta un doctor del directorio público (baja lógica en la tabla 'personal').
 * @param {string} cedula - La cédula del doctor a ocultar.
 * @param {string} nombre - El nombre completo para el mensaje de confirmación.
 */
async function ocultarDoctor(cedula, nombre) {
    if (confirm(`❓ ¿Está seguro de que desea ocultar al Dr(a). ${nombre} del directorio?\n\nEl doctor ya no aparecerá como disponible para agendar citas.`)) {
        try {
            const res = await fetch('https://clinica-virtual-backend.onrender.com/api/doctores/ocultar', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cedula_doctor: cedula })
            });
            const data = await res.json();
            if (data.success) {
                alert('✅ ' + data.mensaje);
                // Ocultar la fila de la tabla visualmente
                const fila = document.getElementById(`doctor-row-${cedula.replace(/\s+/g, '')}`);
                if (fila) fila.style.display = 'none';
            } else {
                alert('⚠️ ' + data.mensaje);
            }
        } catch (error) {
            alert('❌ Error de conexión al intentar ocultar al doctor.');
        }
    }
}

/**
 * Envía la solicitud de recuperación de contraseña desde la página 24.
 * @param {Event} e - El evento del formulario.
 */
async function enviarSolicitudRecuperacion(e) {
    e.preventDefault();
    const correo = document.getElementById('correo-recuperar').value;
    const feedback = document.getElementById('recuperar-feedback');
    if (!correo) return alert('Por favor, ingrese su correo electrónico.');

    try {
        const res = await fetch('https://clinica-virtual-backend.onrender.com/api/recuperar-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo })
        });
        const data = await res.json();
        feedback.textContent = '✅ ' + data.mensaje;
        feedback.className = 'login-feedback-message success';
    } catch (error) {
        feedback.textContent = '❌ Error de conexión con el servidor.';
        feedback.className = 'login-feedback-message error';
    }
}

/**
 * Carga la lista de doctores y configura los listeners para mostrar la disponibilidad de horarios al agendar una cita.
 */
async function cargarDisponibilidadParaAgendar() {
    const selectDoctor = document.getElementById('doctor-cita');
    const selectFecha = document.getElementById('fecha-cita');
    const divHorarios = document.getElementById('horarios-disponibles');
    const idPaciente = localStorage.getItem('idPaciente');

    if (!selectDoctor || !selectFecha || !divHorarios || !idPaciente) return;

    // 1. Cargar doctores en el select
    try {
        const res = await fetch('https://clinica-virtual-backend.onrender.com/api/doctores');
        const data = await res.json();
        if (data.success) {
            selectDoctor.innerHTML = '<option value="">-- Seleccione un especialista --</option>';
            data.doctores.forEach(doc => {
                selectDoctor.innerHTML += `<option value="${doc.cedula_id}">Dr(a). ${doc.nombre} ${doc.apellido_paterno}</option>`;
            });
        }
    } catch (error) {
        selectDoctor.innerHTML = '<option value="">Error al cargar doctores</option>';
    }

    // 2. Función para obtener y mostrar horarios
    const mostrarHorarios = async () => {
        const cedulaDoctor = selectDoctor.value;
        const fechaSeleccionada = selectFecha.value;

        if (!cedulaDoctor || !fechaSeleccionada) {
            divHorarios.innerHTML = '<p class="alerta-info">Seleccione un doctor y una fecha.</p>';
            return;
        }

        divHorarios.innerHTML = '<p>Buscando horarios...</p>';
        const diaSemana = new Date(fechaSeleccionada + 'T00:00:00-06:00').getDay(); // Ajuste para zona horaria de México

        try {
            const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/horarios/${cedulaDoctor}`);
            const data = await res.json();

            if (data.success && data.horario.length > 0) {
                const horarioDelDia = data.horario.find(h => h.dia_semana === diaSemana);

                if (horarioDelDia) {
                    const slots = generarSlotsDeTiempo(horarioDelDia.hora_inicio, horarioDelDia.hora_fin);
                    divHorarios.innerHTML = slots.map(slot => `
                        <button class="btn-horario" data-hora="${slot}">${slot}</button>
                    `).join('');

                    // Añadir evento a los botones de horario
                    document.querySelectorAll('.btn-horario').forEach(btn => {
                        btn.addEventListener('click', async () => {
                            const horaSeleccionada = btn.dataset.hora;
                            if (confirm(`¿Confirmar cita a las ${horaSeleccionada} con el doctor seleccionado?`)) {
                                const datosCita = {
                                    id_paciente: idPaciente,
                                    cedula_doctor: cedulaDoctor,
                                    fecha: fechaSeleccionada,
                                    hora: horaSeleccionada,
                                    motivo: document.getElementById('motivo-cita').value || 'Consulta General'
                                };

                                const resCita = await fetch('https://clinica-virtual-backend.onrender.com/api/citas', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(datosCita)
                                });
                                const dataCita = await resCita.json();
                                alert(dataCita.mensaje);
                                if (dataCita.success) window.location.href = '26-mis-citas.html';
                            }
                        });
                    });

                } else {
                    divHorarios.innerHTML = '<p class="alerta-error">El doctor no tiene agenda para el día seleccionado.</p>';
                }
            } else {
                divHorarios.innerHTML = '<p class="alerta-error">El doctor no tiene un horario configurado.</p>';
            }
        } catch (error) {
            divHorarios.innerHTML = '<p class="alerta-error">Error de conexión al obtener el horario.</p>';
        }
    };

    // 3. Añadir listeners a los selects
    selectDoctor.addEventListener('change', mostrarHorarios);
    selectFecha.addEventListener('change', mostrarHorarios);
}

/**
 * Genera una lista de intervalos de tiempo de 30 minutos.
 * @param {string} inicio - Hora de inicio (ej. "09:00:00").
 * @param {string} fin - Hora de fin (ej. "17:00:00").
 * @returns {string[]} - Array de strings con los horarios.
 */
function generarSlotsDeTiempo(inicio, fin) {
    const slots = [];
    let [h, m] = inicio.split(':').map(Number);
    const [hFin, mFin] = fin.split(':').map(Number);

    while (h < hFin || (h === hFin && m < mFin)) {
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        m += 30;
        if (m >= 60) {
            h++;
            m -= 60;
        }
    }
    return slots;
}