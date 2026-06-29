require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// 👇 aquí usas la variable del .env
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Esta es la configuración recomendada para servicios como Render.
    // Si la URL de conexión ya incluye "?ssl=true", esto asegura que se use SSL
    // sin generar el warning de 'rejectUnauthorized'.
    ssl: process.env.DATABASE_URL ? true : false
});

const PORT = process.env.PORT || 3000;

// CREAR TABLA DE SIGNOS VITALES PENDIENTES AUTOMÁTICAMENTE SI NO EXISTE
pool.query(`
    CREATE TABLE IF NOT EXISTS signos_vitales_pendientes (
        id_paciente INTEGER PRIMARY KEY,
        peso NUMERIC(5,2),
        talla NUMERIC(4,2),
        fc INTEGER,
        fr INTEGER,
        sato2 INTEGER,
        temp NUMERIC(4,2),
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`).catch(err => console.error("Error creando tabla signos_vitales_pendientes:", err));

// CREAR TABLA DE HORARIOS DE DOCTORES AUTOMÁTICAMENTE SI NO EXISTE
pool.query(`
    CREATE TABLE IF NOT EXISTS horarios_doctores (
        id_horario SERIAL PRIMARY KEY,
        cedula_doctor VARCHAR(20) NOT NULL,
        dia_semana INTEGER NOT NULL, -- 0=Domingo, 1=Lunes, ..., 6=Sábado
        hora_inicio TIME,
        hora_fin TIME,
        UNIQUE(cedula_doctor, dia_semana)
    )
`).catch(err => console.error("Error creando tabla horarios_doctores:", err));

// CREAR TABLA DE MENSAJES TEMPORALES PARA ADMINISTRACIÓN Y QUEJAS
pool.query(`
    CREATE TABLE IF NOT EXISTS mensajes (
        id_mensaje SERIAL PRIMARY KEY,
        id_usuario_emisor INTEGER,
        asunto TEXT NOT NULL,
        contenido TEXT NOT NULL,
        fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        leido BOOLEAN DEFAULT false,
        expiracion TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 days')
    )
`).catch(err => console.error("Error creando tabla mensajes:", err));

// CREAR TABLA DE CONTACTOS ADMINISTRATIVOS TEMPORALES
pool.query(`
    CREATE TABLE IF NOT EXISTS contactos_admin (
        id_contacto SERIAL PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL,
        telefono VARCHAR(40) NOT NULL,
        tipo VARCHAR(50) DEFAULT 'GENERAL',
        activo BOOLEAN DEFAULT true,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_expiracion TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 days')
    )
`).catch(err => console.error("Error creando tabla contactos_admin:", err));

// CREAR TABLA DE SOLICITUDES DE REAGENDACIÓN
pool.query(`
    CREATE TABLE IF NOT EXISTS reagendaciones (
        id_reagendacion SERIAL PRIMARY KEY,
        id_cita INTEGER NOT NULL,
        id_paciente INTEGER NOT NULL,
        cedula_doctor VARCHAR(20) NOT NULL,
        fecha_solicitada DATE NOT NULL,
        hora_solicitada TIME NOT NULL,
        motivo TEXT NOT NULL,
        estatus VARCHAR(30) DEFAULT 'pendiente',
        fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_respuesta TIMESTAMP NULL,
        comentario_respuesta TEXT
    )
`).catch(err => console.error("Error creando tabla reagendaciones:", err));

// SERVIR LOS ARCHIVOS FRONTEND (HTML, CSS, JS) DESDE EL MISMO SERVIDOR
app.use(express.static(__dirname));

// 1. LOGIN UNIFICADO
app.post('/api/login', async (req, res) => {
    const { correo, password } = req.body;
    try {
        const result = await pool.query(
            `SELECT u.password_hash, u.rol, u.correo,
                    COALESCE(p.nombre, pac.nombre, 'Usuario') as nombre, 
                    p.cedula_id, 
                    pac.id_paciente 
             FROM usuarios u 
             LEFT JOIN personal p ON u.id_usuario = p.id_usuario 
             LEFT JOIN pacientes pac ON u.id_usuario = pac.id_usuario
             WHERE u.correo = $1 AND u.estatus = true`,
            [correo]
        );
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            // Verifica si la contraseña coincide (ya sea encriptada o la anterior en texto plano)
            const esPasswordValido = await bcrypt.compare(password, user.password_hash) || password === user.password_hash;
            
            if (esPasswordValido) {
                res.json({ success: true, rol: user.rol, nombre: user.nombre, correo: user.correo, cedula: user.cedula_id, id_paciente: user.id_paciente });
            } else {
                res.json({ success: false, mensaje: 'Usuario o contraseña incorrectos' });
            }
        } else {
            res.json({ success: false, mensaje: 'Usuario o contraseña incorrectos' });
        }
    } catch (error) {
        console.error('Error en /api/login:', error);
        res.status(500).json({ success: false, mensaje: 'Error en el servidor' });
    }
});

// 2. REGISTRO DE PERSONAL (NUEVA RUTA RESTAURADA)
app.post('/api/personal', async (req, res) => {
    const d = req.body;
    try {
        // Encriptar la contraseña antes de guardarla
        const passwordEncriptada = await bcrypt.hash(d.password, 10);
        
        // Primero creamos el usuario
        const userRes = await pool.query(
            'INSERT INTO usuarios (correo, password_hash, rol, estatus) VALUES ($1, $2, $3, true) RETURNING id_usuario',
            [d.correo, passwordEncriptada, d.puesto]
        );
        
        const idU = userRes.rows[0].id_usuario;
        
        // Luego insertamos en la tabla personal con tus columnas reales
        await pool.query(
            `INSERT INTO personal 
            (cedula_id, id_usuario, nombre, apellido_paterno, apellido_materno, telefono, direccion_calle, direccion_num_ext, direccion_cp, direccion_colonia, puesto, curp) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [d.cedula, idU, d.nombre, d.apellido_p, d.apellido_m, d.telefono, d.calle, d.num_ext, d.cp, d.colonia, d.puesto, d.curp]
        );
        
        res.json({ success: true, mensaje: 'Personal registrado con éxito.' });
    } catch (error) {
        console.error('Error en /api/personal:', error);
        res.status(500).json({ success: false, mensaje: 'Error al registrar personal: ' + error.message });
    }
});

// 3. REGISTRO DE PACIENTES (VÍA PROCEDURE)
app.post('/api/pacientes', async (req, res) => {
    const d = req.body;
    try {
        await pool.query(
            `SELECT registrar_paciente_completo($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [d.correo, d.telefono, d.nombre, d.apellido_p, d.apellido_m, parseInt(d.edad), d.tipo_sangre, d.curp, d.calle, d.colonia, d.municipio, d.cp]
        );
        res.json({ success: true, mensaje: 'Paciente registrado correctamente.' });
    } catch (error) {
        console.error('Error en /api/pacientes:', error);
        res.status(500).json({ success: false, mensaje: error.message });
    }
});

// 4. BUSCAR PERSONAL POR CÉDULA
app.get('/api/personal/:termino', async (req, res) => {
    const { termino } = req.params;
    try {
        const result = await pool.query(
            `SELECT p.*, u.correo, u.id_usuario FROM personal p 
             JOIN usuarios u ON p.id_usuario = u.id_usuario 
             WHERE p.cedula_id = $1 OR LOWER(u.correo) = LOWER($1)`, [termino]
        );
        if (result.rows.length > 0) res.json({ success: true, persona: result.rows[0] });
        else res.json({ success: false, mensaje: 'No se encontró personal con esa Cédula o Correo.' });
    } catch (error) {
        console.error('Error en /api/personal/:cedula:', error);
        res.status(500).json({ success: false, mensaje: 'Error al buscar.' });
    }
});

// 5. ACTUALIZAR PERSONAL (VÍA PROCEDURE)
app.put('/api/personal/update', async (req, res) => {
    const d = req.body;
    try {
        await pool.query(
            `CALL editar_personal_completo($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [d.cedula, d.nombre, d.apellido_p, d.apellido_m, d.telefono, d.correo, d.calle, d.num_ext, d.cp, d.colonia]
        );
        res.json({ success: true, mensaje: 'Datos actualizados correctamente.' });
    } catch (error) {
        console.error('Error en /api/personal/update:', error);
        res.status(500).json({ success: false, mensaje: 'Error al actualizar: ' + error.message });
    }
});

// 6. BUSCAR PACIENTE POR ID O CURP
app.get('/api/pacientes/:id', async (req, res) => {
    const { id } = req.params;
    const idNumerico = parseInt(id.replace(/\D/g, ''), 10); 
    try {
        const result = await pool.query(
            `SELECT p.id_paciente, p.nombre, p.apellido_paterno, p.apellido_materno, p.edad, p.tipo_sangre 
             FROM pacientes p
             LEFT JOIN usuarios u ON p.id_usuario = u.id_usuario
             WHERE p.id_paciente = $1 OR UPPER(p.curp) = UPPER($2) OR p.telefono = $2 OR UPPER(u.correo) = UPPER($2)`, 
             [idNumerico || -1, id]
        );
        if (result.rows.length > 0) res.json({ success: true, paciente: result.rows[0] });
        else res.json({ success: false, mensaje: 'No se encontró paciente con ese Teléfono, CURP o Correo.' });
    } catch (error) {
        console.error('Error en /api/pacientes/:id:', error);
        res.status(500).json({ success: false, mensaje: 'Error al buscar paciente.' });
    }
});

// 7. GUARDAR CONSULTA Y RECETA
app.post('/api/consultas', async (req, res) => {
    const d = req.body;
    try {
        await pool.query(
            `INSERT INTO consultas (id_paciente, cedula_doctor, peso, talla, fc, fr, sato2, imc, receta) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [d.id_paciente, d.cedula_doctor, d.peso, d.talla, d.fc, d.fr, d.sato2, d.imc, d.receta]
        );
        res.json({ success: true, mensaje: 'Consulta finalizada y receta guardada.' });
    } catch (error) {
        console.error('Error en /api/consultas:', error);
        res.status(500).json({ success: false, mensaje: 'Error al guardar la consulta.' });
    }
});

// 8. SOLICITAR ESTUDIO MÉDICO
app.post('/api/estudios', async (req, res) => {
    const d = req.body;
    try {
        await pool.query(
            `INSERT INTO estudios (id_paciente, cedula_doctor, tipo_estudio, indicaciones) 
             VALUES ($1, $2, $3, $4)`,
            [d.id_paciente, d.cedula_doctor, d.tipo_estudio, d.indicaciones]
        );
        res.json({ success: true, mensaje: 'Estudio solicitado y guardado en el expediente.' });
    } catch (error) {
        console.error('Error en /api/estudios:', error);
        res.status(500).json({ success: false, mensaje: 'Error al solicitar el estudio.' });
    }
});

// 9. OBTENER ESTUDIOS DE UN PACIENTE
app.get('/api/estudios/:id_paciente', async (req, res) => {
    const { id_paciente } = req.params;
    try {
        const result = await pool.query(
            `SELECT * FROM estudios WHERE id_paciente = $1 ORDER BY fecha_solicitud DESC`,
            [id_paciente]
        );
        res.json({ success: true, estudios: result.rows });
    } catch (error) {
        console.error('Error en /api/estudios/get:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener estudios.' });
    }
});

// 10. OBTENER ESTUDIOS PENDIENTES DE UN PACIENTE
app.get('/api/estudios/:id_paciente/pendientes', async (req, res) => {
    const { id_paciente } = req.params;
    try {
        const result = await pool.query(
            `SELECT * FROM estudios WHERE id_paciente = $1 AND estado = 'Pendiente' ORDER BY fecha_solicitud DESC`,
            [id_paciente]
        );
        res.json({ success: true, estudios: result.rows });
    } catch (error) {
        console.error('Error en /api/estudios/pendientes:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener estudios pendientes.' });
    }
});

// 11. MARCAR ESTUDIO COMO COMPLETADO Y GUARDAR NOTAS
app.put('/api/estudios/completar', async (req, res) => {
    const { id_estudio, notas_medico } = req.body;
    try {
        await pool.query(
            `UPDATE estudios SET estado = 'Completado', notas_medico = $1 WHERE id_estudio = $2`,
            [notas_medico, id_estudio]
        );
        res.json({ success: true, mensaje: 'Estudio interpretado y guardado en historial.' });
    } catch (error) {
        console.error('Error al completar estudio:', error);
        res.status(500).json({ success: false, mensaje: 'Error al actualizar el estudio.' });
    }
});

// 12. OBTENER HISTORIAL DE CONSULTAS DE UN PACIENTE
app.get('/api/consultas/:id_paciente', async (req, res) => {
    const { id_paciente } = req.params;
    try {
        const result = await pool.query(
            `SELECT c.*, p.nombre as doctor_nombre, p.apellido_paterno as doctor_apellido 
             FROM consultas c 
             LEFT JOIN personal p ON c.cedula_doctor = p.cedula_id
             WHERE c.id_paciente = $1 ORDER BY c.fecha DESC`,
            [id_paciente]
        );
        res.json({ success: true, consultas: result.rows });
    } catch (error) {
        console.error('Error en /api/consultas/get:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener consultas.' });
    }
});

// 13. OBTENER CITAS DEL DOCTOR POR FECHA
app.get('/api/citas/doctor/:cedula/fecha/:fecha', async (req, res) => {
    const { cedula, fecha } = req.params;
    try {
        const result = await pool.query(
            `SELECT c.id_cita, c.hora, c.estatus, p.id_paciente, p.nombre, p.apellido_paterno, p.apellido_materno
             FROM citas c
             JOIN pacientes p ON c.id_paciente = p.id_paciente
             WHERE c.cedula_doctor = $1 AND c.fecha = $2
             ORDER BY c.hora ASC`,
            [cedula, fecha]
        );
        res.json({ success: true, citas: result.rows });
    } catch (error) {
        console.error('Error en /api/citas/doctor/fecha:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener citas.' });
    }
});

// 14. OBTENER LISTA DE DOCTORES (Para agendar cita)
app.get('/api/doctores', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT cedula_id, nombre, apellido_paterno, apellido_materno, telefono 
             FROM personal WHERE puesto = 'doctor' AND activo = true`
        );
        res.json({ success: true, doctores: result.rows });
    } catch (error) {
        console.error('Error al obtener doctores:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener lista de doctores.' });
    }
});

// 15. OBTENER DOCTOR CON MAYOR DISPONIBILIDAD (MENOS CITAS HOY)
app.get('/api/doctores/disponibilidad', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                p.cedula_id, p.nombre, p.apellido_paterno, COUNT(c.id_cita) as num_citas
             FROM personal p
             LEFT JOIN citas c ON p.cedula_id = c.cedula_doctor AND c.fecha = CURRENT_DATE
             WHERE p.puesto = 'doctor' AND p.activo = true
             GROUP BY p.cedula_id, p.nombre, p.apellido_paterno
             ORDER BY num_citas ASC
             LIMIT 1`
        );
        if (result.rows.length > 0) {
            res.json({ success: true, doctor: result.rows[0] });
        } else {
            res.json({ success: false, mensaje: 'No hay doctores activos en el sistema.' });
        }
    } catch (error) { res.status(500).json({ success: false, mensaje: 'Error de servidor al buscar disponibilidad.' }); }
});

// 15. AGENDAR UNA NUEVA CITA
app.post('/api/citas', async (req, res) => {
    const d = req.body;

    if (!d.id_paciente || !d.cedula_doctor || !d.fecha || !d.hora || !d.motivo) {
        return res.status(400).json({ success: false, mensaje: 'Todos los campos son obligatorios para agendar la cita.' });
    }

    try {
        const citaActivaPaciente = await pool.query(
            `SELECT id_cita, fecha, hora, cedula_doctor FROM citas WHERE id_paciente = $1 AND LOWER(estatus) = 'agendada' LIMIT 1`,
            [d.id_paciente]
        );

        if (citaActivaPaciente.rows.length > 0) {
            return res.status(409).json({
                success: false,
                requires_reagendacion: true,
                mensaje: 'Ya tiene una cita activa. Use el flujo de reagendación para solicitar un cambio de horario.',
                cita_actual: citaActivaPaciente.rows[0]
            });
        }

        const conflictoDoctor = await pool.query(
            `SELECT id_cita FROM citas WHERE cedula_doctor = $1 AND fecha = $2 AND hora = $3 AND LOWER(estatus) <> 'cancelada'`,
            [d.cedula_doctor, d.fecha, d.hora]
        );

        if (conflictoDoctor.rows.length > 0) {
            return res.status(400).json({ success: false, mensaje: 'El horario seleccionado ya está ocupado para ese doctor.' });
        }

        await pool.query(
            `INSERT INTO citas (id_paciente, cedula_doctor, fecha, hora, motivo, estatus) 
             VALUES ($1, $2, $3, $4, $5, 'agendada')`,
            [d.id_paciente, d.cedula_doctor, d.fecha, d.hora, d.motivo]
        );
        res.json({ success: true, mensaje: 'Cita agendada correctamente.' });
    } catch (error) {
        console.error('Error al agendar cita:', error);
        res.status(500).json({ success: false, mensaje: 'Error al agendar la cita.' });
    }
});

// 16. OBTENER CITAS DE UN PACIENTE
app.get('/api/citas/paciente/:id_paciente', async (req, res) => {
    const { id_paciente } = req.params;
    try {
        const result = await pool.query(
            `SELECT c.id_cita, c.fecha, c.hora, c.estatus, p.nombre, p.apellido_paterno, p.apellido_materno
             FROM citas c
             JOIN personal p ON c.cedula_doctor = p.cedula_id
             WHERE c.id_paciente = $1
             ORDER BY c.fecha DESC, c.hora DESC`,
            [id_paciente]
        );
        res.json({ success: true, citas: result.rows });
    } catch (error) {
        console.error('Error en /api/citas/paciente:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener citas del paciente.' });
    }
});

// 17. CANCELAR UNA CITA
app.put('/api/citas/cancelar', async (req, res) => {
    const { id_cita } = req.body;
    try {
        await pool.query(
            `UPDATE citas SET estatus = 'cancelada' WHERE id_cita = $1`,
            [id_cita]
        );
        res.json({ success: true, mensaje: 'Cita cancelada correctamente.' });
    } catch (error) {
        console.error('Error al cancelar cita:', error);
        res.status(500).json({ success: false, mensaje: 'Error al cancelar la cita.' });
    }
});

// 18. OBTENER HORARIO DE UN DOCTOR
app.get('/api/horarios/:cedula', async (req, res) => {
    const { cedula } = req.params;
    try {
        const result = await pool.query('SELECT dia_semana, hora_inicio, hora_fin FROM horarios_doctores WHERE cedula_doctor = $1', [cedula]);
        res.json({ success: true, horario: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, mensaje: 'Error al obtener el horario.' });
    }
});

// 19. ACTUALIZAR HORARIO DE UN DOCTOR
app.put('/api/horarios/:cedula', async (req, res) => {
    const { cedula } = req.params;
    const horarios = req.body; // Se espera un array de objetos {dia_semana, hora_inicio, hora_fin}

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Primero borramos el horario viejo para evitar conflictos
        await client.query('DELETE FROM horarios_doctores WHERE cedula_doctor = $1', [cedula]);
        // Insertamos el nuevo horario
        for (const h of horarios) {
            await client.query('INSERT INTO horarios_doctores (cedula_doctor, dia_semana, hora_inicio, hora_fin) VALUES ($1, $2, $3, $4)', [cedula, h.dia_semana, h.hora_inicio, h.hora_fin]);
        }
        await client.query('COMMIT');
        res.json({ success: true, mensaje: 'Horario actualizado con éxito.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al actualizar horario:', error);
        res.status(500).json({ success: false, mensaje: 'Error al guardar el horario.' });
    } finally {
        client.release();
    }
});

// 18. OBTENER TODAS LAS CITAS DE UNA FECHA (PARA ENFERMERÍA/RECEPCIÓN)
app.get('/api/citas/fecha/:fecha', async (req, res) => {
    const { fecha } = req.params;
    try {
        const result = await pool.query(
            `SELECT c.id_cita, c.hora, c.estatus, p.id_paciente, p.nombre, p.apellido_paterno, p.apellido_materno,
                    doc.nombre as doctor_nombre, doc.apellido_paterno as doctor_apellido
             FROM citas c
             JOIN pacientes p ON c.id_paciente = p.id_paciente
             LEFT JOIN personal doc ON c.cedula_doctor = doc.cedula_id
             WHERE c.fecha = $1
             ORDER BY c.hora ASC`,
            [fecha]
        );
        res.json({ success: true, citas: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, mensaje: 'Error al obtener citas del día.' });
    }
});

// 19. ACTUALIZAR ESTATUS DE UNA CITA (PARA ENFERMERÍA)
app.put('/api/citas/estatus', async (req, res) => {
    const { id_cita, estatus } = req.body;
    try {
        await pool.query(
            `UPDATE citas SET estatus = $1 WHERE id_cita = $2`,
            [estatus, id_cita]
        );
        res.json({ success: true, mensaje: 'Estatus de la cita actualizado.' });
    } catch (error) {
        res.status(500).json({ success: false, mensaje: 'Error al actualizar el estatus.' });
    }
});

// 18. SOLICITUD DE RECUPERACIÓN DE CONTRASEÑA
app.post('/api/recuperar-password', async (req, res) => {
    const { correo } = req.body;
    try {
        const userRes = await pool.query('SELECT id_usuario FROM usuarios WHERE correo = $1', [correo]);
        
        if (userRes.rows.length > 0) {
            const idUsuario = userRes.rows[0].id_usuario;
            // Insertamos un mensaje automático para el administrador
            await pool.query(
                `INSERT INTO mensajes (id_usuario_emisor, asunto, contenido) VALUES ($1, $2, $3)`,
                [idUsuario, 'Recuperación de Contraseña', `El usuario con correo ${correo} ha solicitado restablecer su acceso al sistema.`]
            );
        }
        // Por seguridad estándar, siempre se dice que se envió para no revelar si el correo existe o no a los hackers.
        res.json({ success: true, mensaje: 'Si el correo está registrado, se ha enviado la solicitud al administrador.' });
    } catch (error) {
        console.error('Error al solicitar recuperación:', error);
        res.status(500).json({ success: false, mensaje: 'Error al procesar la solicitud.' });
    }
});

// 19. OBTENER LISTA DE TODOS LOS USUARIOS (PARA ADMINISTRADOR)
app.get('/api/admin/usuarios', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id_usuario, u.correo, u.rol, u.estatus, 
                    COALESCE(p.nombre, pac.nombre) as nombre, 
                    COALESCE(p.apellido_paterno, pac.apellido_paterno) as apellido_paterno
             FROM usuarios u 
             LEFT JOIN personal p ON u.id_usuario = p.id_usuario 
             LEFT JOIN pacientes pac ON u.id_usuario = pac.id_usuario ORDER BY u.rol, nombre`
        );
        res.json({ success: true, usuarios: result.rows });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener la lista de usuarios.' });
    }
});

// 21. GUARDAR SIGNOS VITALES TEMPORALES (ENFERMERÍA)
app.post('/api/signos', async (req, res) => {
    const { id_paciente, peso, talla, fc, fr, sato2, temp } = req.body;
    try {
        await pool.query(
            `INSERT INTO signos_vitales_pendientes (id_paciente, peso, talla, fc, fr, sato2, temp) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id_paciente) 
             DO UPDATE SET peso = EXCLUDED.peso, talla = EXCLUDED.talla, fc = EXCLUDED.fc, fr = EXCLUDED.fr, sato2 = EXCLUDED.sato2, temp = EXCLUDED.temp, fecha = CURRENT_TIMESTAMP`,
            [id_paciente, peso, talla, fc, fr, sato2, temp]
        );
        res.json({ success: true, mensaje: 'Signos guardados en la base de datos.' });
    } catch (error) {
        console.error('Error al guardar signos:', error);
        res.status(500).json({ success: false, mensaje: 'Error al guardar los signos vitales.' });
    }
});

// 22. OBTENER SIGNOS VITALES PENDIENTES (DOCTOR)
app.get('/api/signos/:id_paciente', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM signos_vitales_pendientes WHERE id_paciente = $1', [req.params.id_paciente]);
        if (result.rows.length > 0) res.json({ success: true, signos: result.rows[0] });
        else res.json({ success: false, mensaje: 'Sin signos previos.' });
    } catch (error) { res.status(500).json({ success: false }); }
});

// 23. BORRAR SIGNOS VITALES (DESPUÉS DE LA CONSULTA)
app.delete('/api/signos/:id_paciente', async (req, res) => {
    try {
        await pool.query('DELETE FROM signos_vitales_pendientes WHERE id_paciente = $1', [req.params.id_paciente]);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

// 20. DAR DE BAJA A UN USUARIO
app.put('/api/admin/usuarios/baja', async (req, res) => {
    const { id_usuario } = req.body;
    try {
        await pool.query('UPDATE usuarios SET estatus = false WHERE id_usuario = $1', [id_usuario]);
        res.json({ success: true, mensaje: 'Usuario dado de baja correctamente. Ya no tendrá acceso.' });
    } catch (error) {
        console.error('Error al dar de baja:', error);
        res.status(500).json({ success: false, mensaje: 'Error al actualizar el estatus.' });
    }
});

// 24. OBTENER INCIDENCIAS PARA EL BUZÓN DEL ADMIN
app.get('/api/admin/incidencias', async (req, res) => {
    try {
        // Obtenemos usuarios inactivos
        const inactivosRes = await pool.query(
            `SELECT id_usuario, correo, rol FROM usuarios WHERE estatus = false`
        );

        // Obtenemos las solicitudes de recuperación de contraseña
        const recuperacionRes = await pool.query(
            `SELECT * FROM mensajes WHERE asunto ILIKE 'Recuperación de Contraseña' AND leido = false ORDER BY fecha_envio DESC`
        );

        res.json({
            success: true,
            incidencias: {
                bajas: inactivosRes.rows,
                recuperaciones: recuperacionRes.rows
            }
        });
    } catch (error) { res.status(500).json({ success: false, mensaje: 'Error al cargar incidencias.' }); }
});

// 26. OBTENER CONTACTOS ADMINISTRATIVOS PARA EL PANEL DE ADMIN
app.get('/api/admin/contactos', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id_contacto, nombre, telefono, tipo, activo, fecha_creacion, fecha_expiracion
             FROM contactos_admin
             WHERE activo = true AND fecha_expiracion > CURRENT_TIMESTAMP
             ORDER BY fecha_creacion DESC`
        );
        res.json({ success: true, contactos: result.rows });
    } catch (error) {
        console.error('Error al obtener contactos admin:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener contactos administrativos.' });
    }
});

// 27. AGREGAR CONTACTO ADMINISTRATIVO TEMPORAL
app.post('/api/admin/contactos', async (req, res) => {
    const { nombre, telefono, tipo } = req.body;
    if (!nombre || !telefono) return res.status(400).json({ success: false, mensaje: 'Nombre y teléfono son requeridos.' });
    try {
        await pool.query(
            `INSERT INTO contactos_admin (nombre, telefono, tipo) VALUES ($1, $2, $3)`,
            [nombre, telefono, tipo || 'GENERAL']
        );
        res.json({ success: true, mensaje: 'Contacto administrativo agregado correctamente.' });
    } catch (error) {
        console.error('Error al agregar contacto admin:', error);
        res.status(500).json({ success: false, mensaje: 'Error al guardar el contacto administrativo.' });
    }
});

// 28. ELIMINAR CONTACTO ADMINISTRATIVO (BAJA LÓGICA)
app.delete('/api/admin/contactos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE contactos_admin SET activo = false WHERE id_contacto = $1', [id]);
        res.json({ success: true, mensaje: 'Contacto administrativo desactivado correctamente.' });
    } catch (error) {
        console.error('Error al desactivar contacto admin:', error);
        res.status(500).json({ success: false, mensaje: 'Error al desactivar el contacto administrativo.' });
    }
});

// 29. OBTENER CONTACTOS PÚBLICOS PARA PACIENTES
app.get('/api/contactos', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT nombre, telefono, tipo
             FROM contactos_admin
             WHERE activo = true AND fecha_expiracion > CURRENT_TIMESTAMP
             ORDER BY fecha_creacion DESC`
        );
        res.json({ success: true, contactos: result.rows });
    } catch (error) {
        console.error('Error al obtener contactos públicos:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener los contactos públicos.' });
    }
});

// 30. OBTENER MENSAJES DE PACIENTES PARA EL ADMIN
app.get('/api/admin/mensajes', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT m.id_mensaje, m.id_usuario_emisor, u.correo, m.asunto, m.contenido, m.fecha_envio, m.leido
             FROM mensajes m
             LEFT JOIN usuarios u ON m.id_usuario_emisor = u.id_usuario
             ORDER BY m.leido ASC, m.fecha_envio DESC`
        );
        res.json({ success: true, mensajes: result.rows });
    } catch (error) {
        console.error('Error al obtener mensajes admin:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener mensajes de pacientes.' });
    }
});

// 31. MARCAR MENSAJE COMO LEÍDO
app.put('/api/admin/mensajes/:id/leido', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE mensajes SET leido = true WHERE id_mensaje = $1', [id]);
        res.json({ success: true, mensaje: 'Mensaje marcado como leído.' });
    } catch (error) {
        console.error('Error al marcar mensaje como leído:', error);
        res.status(500).json({ success: false, mensaje: 'Error al actualizar el estado del mensaje.' });
    }
});

// 32. ENVIAR MENSAJE / QUEJA DESDE PACIENTE
app.post('/api/mensajes', async (req, res) => {
    const { correo, asunto, contenido } = req.body;
    if (!asunto || !contenido) return res.status(400).json({ success: false, mensaje: 'Asunto y contenido son obligatorios.' });
    try {
        let idUsuario = null;
        if (correo) {
            const userRes = await pool.query('SELECT id_usuario FROM usuarios WHERE correo = $1', [correo]);
            if (userRes.rows.length > 0) idUsuario = userRes.rows[0].id_usuario;
        }

        await pool.query(
            `INSERT INTO mensajes (id_usuario_emisor, asunto, contenido) VALUES ($1, $2, $3)`,
            [idUsuario, asunto, contenido]
        );
        res.json({ success: true, mensaje: 'Mensaje de paciente enviado correctamente.' });
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        res.status(500).json({ success: false, mensaje: 'Error al enviar el mensaje.' });
    }
});

// 33. SOLICITAR REAGENDACIÓN DE CITA (PACIENTE)
app.post('/api/reagendaciones', async (req, res) => {
    const { id_cita, id_paciente, fecha_solicitada, hora_solicitada, motivo } = req.body;
    if (!id_cita || !id_paciente || !fecha_solicitada || !hora_solicitada || !motivo) {
        return res.status(400).json({ success: false, mensaje: 'Todos los campos de la solicitud son obligatorios.' });
    }

    try {
        const citaRes = await pool.query(
            `SELECT cedula_doctor, estatus FROM citas WHERE id_cita = $1 AND id_paciente = $2`,
            [id_cita, id_paciente]
        );
        if (citaRes.rows.length === 0) {
            return res.status(404).json({ success: false, mensaje: 'No se encontró la cita solicitada.' });
        }

        const cita = citaRes.rows[0];
        if (cita.estatus.toLowerCase() !== 'agendada') {
            return res.status(400).json({ success: false, mensaje: 'Solo se pueden reagendar citas que estén agendadas.' });
        }

        const existingReq = await pool.query(
            `SELECT id_reagendacion FROM reagendaciones WHERE id_cita = $1 AND estatus = 'pendiente'`,
            [id_cita]
        );
        if (existingReq.rows.length > 0) {
            return res.status(400).json({ success: false, mensaje: 'Ya existe una solicitud de reagendación pendiente para esta cita.' });
        }

        const conflictRes = await pool.query(
            `SELECT id_cita FROM citas WHERE cedula_doctor = $1 AND fecha = $2 AND hora = $3 AND estatus <> 'cancelada' AND id_cita <> $4`,
            [cita.cedula_doctor, fecha_solicitada, hora_solicitada, id_cita]
        );
        if (conflictRes.rows.length > 0) {
            return res.status(400).json({ success: false, mensaje: 'El horario solicitado ya está ocupado en la agenda del doctor.' });
        }

        await pool.query(
            `INSERT INTO reagendaciones (id_cita, id_paciente, cedula_doctor, fecha_solicitada, hora_solicitada, motivo)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id_cita, id_paciente, cita.cedula_doctor, fecha_solicitada, hora_solicitada, motivo]
        );

        res.json({ success: true, mensaje: 'Solicitud de reagendación enviada correctamente. El administrador la revisará pronto.' });
    } catch (error) {
        console.error('Error al crear solicitud de reagendación:', error);
        res.status(500).json({ success: false, mensaje: 'Error al procesar la solicitud de reagendación.' });
    }
});

// 34. OBTENER SOLICITUDES DE REAGENDACIÓN PARA ADMIN
app.get('/api/admin/reagendaciones', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT r.*, p.nombre as paciente_nombre, p.apellido_paterno, p.apellido_materno, u.correo as correo_usuario
             FROM reagendaciones r
             JOIN pacientes p ON r.id_paciente = p.id_paciente
             LEFT JOIN usuarios u ON p.id_usuario = u.id_usuario
             ORDER BY r.fecha_solicitud DESC`
        );
        res.json({ success: true, reagendaciones: result.rows });
    } catch (error) {
        console.error('Error al obtener solicitudes de reagendación:', error);
        res.status(500).json({ success: false, mensaje: 'Error al obtener las solicitudes de reagendación.' });
    }
});

// 35. ACEPTAR SOLICITUD DE REAGENDACIÓN
app.put('/api/admin/reagendaciones/:id/aceptar', async (req, res) => {
    const { id } = req.params;
    try {
        const reqRes = await pool.query('SELECT * FROM reagendaciones WHERE id_reagendacion = $1', [id]);
        if (reqRes.rows.length === 0) return res.status(404).json({ success: false, mensaje: 'Solicitud no encontrada.' });

        const solicitud = reqRes.rows[0];
        if (solicitud.estatus !== 'pendiente') return res.status(400).json({ success: false, mensaje: 'La solicitud ya fue procesada.' });

        const conflictRes = await pool.query(
            `SELECT id_cita FROM citas WHERE cedula_doctor = $1 AND fecha = $2 AND hora = $3 AND estatus <> 'cancelada' AND id_cita <> $4`,
            [solicitud.cedula_doctor, solicitud.fecha_solicitada, solicitud.hora_solicitada, solicitud.id_cita]
        );
        if (conflictRes.rows.length > 0) {
            return res.status(400).json({ success: false, mensaje: 'El horario solicitado ya no está disponible. Verifique antes de aceptar.' });
        }

        await pool.query('BEGIN');
        await pool.query(
            `UPDATE citas SET fecha = $1, hora = $2 WHERE id_cita = $3`,
            [solicitud.fecha_solicitada, solicitud.hora_solicitada, solicitud.id_cita]
        );
        await pool.query(
            `UPDATE reagendaciones SET estatus = 'aceptada', fecha_respuesta = CURRENT_TIMESTAMP, comentario_respuesta = 'Reagendación aceptada por el administrador.'
             WHERE id_reagendacion = $1`,
            [id]
        );
        await pool.query('COMMIT');

        res.json({ success: true, mensaje: 'Solicitud de reagendación aceptada y cita actualizada.' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error al aceptar solicitud de reagendación:', error);
        res.status(500).json({ success: false, mensaje: 'Error al procesar la aceptación de reagendación.' });
    }
});

// 36. RECHAZAR SOLICITUD DE REAGENDACIÓN
app.put('/api/admin/reagendaciones/:id/rechazar', async (req, res) => {
    const { id } = req.params;
    const { comentario } = req.body;
    try {
        const reqRes = await pool.query('SELECT * FROM reagendaciones WHERE id_reagendacion = $1', [id]);
        if (reqRes.rows.length === 0) return res.status(404).json({ success: false, mensaje: 'Solicitud no encontrada.' });

        const solicitud = reqRes.rows[0];
        if (solicitud.estatus !== 'pendiente') return res.status(400).json({ success: false, mensaje: 'La solicitud ya fue procesada.' });

        await pool.query(
            `UPDATE reagendaciones SET estatus = 'rechazada', fecha_respuesta = CURRENT_TIMESTAMP, comentario_respuesta = $1
             WHERE id_reagendacion = $2`,
            [comentario || 'Solicitud rechazada por el administrador.', id]
        );

        res.json({ success: true, mensaje: 'Solicitud de reagendación rechazada.' });
    } catch (error) {
        console.error('Error al rechazar solicitud de reagendación:', error);
        res.status(500).json({ success: false, mensaje: 'Error al procesar el rechazo de reagendación.' });
    }
});

// 25. OCULTAR UN DOCTOR DEL DIRECTORIO (BAJA LÓGICA EN PERSONAL)
app.put('/api/doctores/ocultar', async (req, res) => {
    const { cedula_doctor } = req.body;
    try {
        await pool.query('UPDATE personal SET activo = false WHERE cedula_id = $1', [cedula_doctor]);
        res.json({ success: true, mensaje: 'Doctor ocultado del directorio correctamente.' });
    } catch (error) {
        console.error('Error al ocultar doctor:', error);
        res.status(500).json({ success: false, mensaje: 'Error al actualizar el estado del doctor.' });
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`✅ SERVIDOR ACTIVO EN PUERTO ${PORT}`));
