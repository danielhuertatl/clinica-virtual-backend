const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'clinica_virtual',
    password: 'admin123', 
    port: 5432,
});

// LOGIN UNIFICADO
app.post('/api/login', async (req, res) => {
    const { correo, password } = req.body;
    try {
        const result = await pool.query(
            `SELECT u.rol, COALESCE(p.nombre, pac.nombre, 'Usuario') as nombre 
             FROM usuarios u 
             LEFT JOIN personal p ON u.id_usuario = p.id_usuario 
             LEFT JOIN pacientes pac ON u.id_usuario = pac.id_usuario
             WHERE u.correo = $1 AND u.password_hash = $2 AND u.estatus = true`,
            [correo, password]
        );
        if (result.rows.length > 0) {
            res.json({ success: true, rol: result.rows[0].rol, nombre: result.rows[0].nombre });
        } else {
            res.json({ success: false, mensaje: 'Usuario o contraseña incorrectos' });
        }
    } catch (error) {
        res.status(500).json({ success: false, mensaje: 'Error en el servidor' });
    }
});

// REGISTRO DE PACIENTES (VÍA PROCEDURE)
app.post('/api/pacientes', async (req, res) => {
    const d = req.body;
    try {
        await pool.query(
            `SELECT registrar_paciente_completo($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [d.correo, d.telefono, d.nombre, d.apellido_p, d.apellido_m, parseInt(d.edad), d.tipo_sangre, d.curp, d.calle, d.colonia, d.municipio, d.cp]
        );
        res.json({ success: true, mensaje: 'Paciente registrado correctamente.' });
    } catch (error) {
        res.status(500).json({ success: false, mensaje: error.message });
    }
});

// BUSCAR PERSONAL POR CORREO
app.get('/api/personal/buscar/:correo', async (req, res) => {
    const { correo } = req.params;
    try {
        const result = await pool.query(
            `SELECT p.*, u.correo FROM personal p 
             JOIN usuarios u ON p.id_usuario = u.id_usuario 
             WHERE LOWER(u.correo) = LOWER($1)`, [correo]
        );
        if (result.rows.length > 0) res.json({ success: true, persona: result.rows[0] });
        else res.json({ success: false, mensaje: 'No se encontró personal con ese correo.' });
    } catch (error) {
        res.status(500).json({ success: false, mensaje: 'Error al buscar.' });
    }
});

// ACTUALIZAR PERSONAL (VÍA PROCEDURE)
app.put('/api/personal/update', async (req, res) => {
    const d = req.body;
    try {
        await pool.query(
            `CALL editar_personal_completo($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [d.cedula, d.nombre, d.apellido_p, d.apellido_m, d.telefono, d.correo, d.calle, d.num_ext, d.cp, d.colonia]
        );
        res.json({ success: true, mensaje: 'Datos actualizados correctamente.' });
    } catch (error) {
        res.status(500).json({ success: false, mensaje: 'Error al actualizar.' });
    }
});

app.listen(3000, '0.0.0.0', () => console.log('✅ SERVIDOR ACTIVO EN PUERTO 3000'));