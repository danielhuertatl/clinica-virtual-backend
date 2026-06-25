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

    // --- FORMATEO Y RESTRICCIÓN AGRESIVA EN DIRECCIONES ---
    const inputsDireccion = ['calle', 'colonia', 'municipio'];
    inputsDireccion.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', (e) => {
                let texto = e.target.value.toUpperCase();
                
                // Si el profesor intenta meter 3 caracteres idénticos seguidos (ej: 111, HHH), se lo corta
                if (/([A-Z0-9áéíóúñÑ])\1\1/i.test(texto)) {
                    texto = texto.substring(0, texto.length - 1);
                }
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

    // --- BLINDAJE CARÁCTER POR CARÁCTER DE LA CURP (PANTALLA 10) ---
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

            // Validar la estructura estricta posición por posición en tiempo real
            if (i >= 0 && i < 4) { // Primeros 4 caracteres: Solo letras
                if (/[0-9]/.test(v[i])) v = v.substring(0, i);
            }
            else if (i >= 4 && i < 10) { // Siguientes 6 caracteres: Solo números (Año, Mes, Día)
                if (/[A-Z]/.test(v[i])) v = v.substring(0, i);
                
                // Validar mes lógico al escribir el segundo dígito del mes (posición 7)
                if (v.length === 8) {
                    const mm = parseInt(v.substr(6, 2), 10);
                    if (mm < 1 || mm > 12) v = v.substring(0, 7);
                }
                // Validar día lógico al escribir el segundo dígito del día (posición 9)
                if (v.length === 10) {
                    const mm = parseInt(v.substr(6, 2), 10);
                    const dd = parseInt(v.substr(8, 2), 10);
                    if (dd < 1 || dd > 31) {
                        v = v.substring(0, 9);
                    } else {
                        // Forzar el chequeo del calendario real (ej: evitar 30 de febrero)
                        const yy = parseInt(v.substr(4, 2), 10);
                        let currentYear = new Date().getFullYear() % 100;
                        let year = yy + (yy > currentYear ? 1900 : 2000);
                        let testDate = new Date(year, mm - 1, dd);
                        if (testDate.getDate() !== dd) v = v.substring(0, 9);
                    }
                }
            }
            else if (i >= 10 && i < 16) { // Siguientes 6 caracteres: Solo letras
                if (/[0-9]/.test(v[i])) v = v.substring(0, i);
            }

            e.target.value = v;

            // Procesar mensajes y edad si pasó los filtros iniciales
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
                        spanCurpError.textContent = "Formato de CURP inválido estructuralmente";
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

    // --- EL RESTO DE TUS MÓDULOS ACTIVOS ---
    if (window.location.pathname.includes('30-lista-usuarios.html')) cargarUsuariosAdmin();
    if (window.location.pathname.includes('28-agenda-enfermero.html')) cargarAgendaEnfermeria();
    if (window.location.pathname.includes('25-editar-horario.html')) cargarHorarioDoctor();
});

// --- REPLICACIÓN DE TUS BOTONES GLOBALES ---
window.buscarPacienteConsulta = async function() {
    const idInput = document.getElementById('id-busqueda').value.trim();
    if (!idInput) return alert("⚠️ Ingrese un Teléfono, CURP o Correo del paciente.");
    try {
        const res = await fetch(`https://clinica-virtual-backend.onrender.com/api/pacientes/${idInput}`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('nombre-paciente').value = `${data.paciente.nombre} ${data.paciente.apellido_paterno}`;
            document.getElementById('edad-paciente').value = data.paciente.edad + " años";
            document.getElementById('id-busqueda').dataset.idReal = data.paciente.id_paciente;
            alert("✅ Datos del paciente cargados.");
        } else {
            alert("❌ " + data.mensaje);
        }
    } catch (error) { alert("❌ Error de conexión."); }
};