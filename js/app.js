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
                const respuesta = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ correo: usuarioInput, password: contrasenaInput })
                });

                const datos = await respuesta.json();

                if (datos.success) {
                    localStorage.setItem('nombreUsuario', datos.nombre); 
                    alert('¡Acceso concedido! Entrando como: ' + datos.rol);
                    
                    if (datos.rol === 'admin') window.location.href = 'pages/5-admin.html';
                    else if (datos.rol === 'doctor') window.location.href = 'pages/2-doctor.html';
                    else if (datos.rol === 'enfermero') window.location.href = 'pages/4-enfermero.html';
                    else window.location.href = 'pages/3-paciente.html'; 
                } else {
                    alert('⚠️ ' + datos.mensaje);
                }
            } catch (error) {
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
                const res = await fetch('http://localhost:3000/api/personal/update', {
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
                alert("❌ Error al conectar para actualizar.");
            }
        });
    }
});

// --- FUNCIÓN DE BÚSQUEDA (Global para el botón onclick) ---
window.simularBusqueda = async function() {
    const cedula = document.getElementById('buscar-cedula').value.trim();
    if (!cedula) return alert("⚠️ Ingrese una cédula profesional.");

    try {
        const res = await fetch(`http://localhost:3000/api/personal/${cedula}`);
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
        alert("❌ Error de conexión al buscar.");
    }
};