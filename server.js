const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const jwt = require('jsonwebtoken'); // 👈 El nuevo módulo de seguridad que acabas de instalar
const app = express();
const PORT = 3000;

// CLAVE SECRETA: Se utiliza para firmar los tokens.
const FIRMA_SECRETA = 'mi_clave_secreta_super_segura_123'; 

app.use(express.json());

// 1. CONFIGURACIÓN DE LA BASE DE DATOS (SQLite)
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
});

// 2. DEFINICIÓN DEL MODELO (Tabla Peliculas)
const Pelicula = sequelize.define('Pelicula', {
    title: { type: DataTypes.STRING, allowNull: false },
    director: { type: DataTypes.STRING, allowNull: false },
    year: { type: DataTypes.INTEGER, allowNull: false },
    duration: { type: DataTypes.STRING }
});

// Sincronizar Base de Datos
sequelize.sync()
    .then(() => console.log('👍 Base de datos SQLite conectada con éxito.'))
    .catch(err => console.error('❌ Error de sincronización:', err));


// ========================================================
// MIDDLEWARE: Validación de JWT (Autorización)
// ========================================================
const validarJWT = (req, res, next) => {
    // Buscamos el token en las cabeceras de la petición (Authorization)
    const authHeader = req.headers['authorization'];
    
    // El formato estándar es enviar: "Bearer <token>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: "Acceso denegado. No se proporcionó un token de seguridad." 
        });
    }

    try {
        // Validamos si el token es verídico y no ha expirado
        const datosUsuario = jwt.verify(token, FIRMA_SECRETA);
        req.usuario = datosUsuario; // Guardamos los datos del alumno/usuario por si se ocupan
        next(); // Permitimos que la petición continúe a la ruta protegida
    } catch (error) {
        return res.status(403).json({ 
            success: false, 
            message: "Token inválido o expirado." 
        });
    }
};


// ========================================================
// RUTA NUEVA: Login (Generación de Token JWT)
// ========================================================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // Credenciales de prueba para la entrega de la escuela
    if (username === 'claudia' && password === 'uas123') {
        // Datos públicos del usuario que viajan dentro del tokenencriptado
        const payload = {
            id: 1,
            role: 'admin',
            nombre: 'Claudia Romero'
        };

        // Firmamos el token con una expiración de 2 horas
        const token = jwt.sign(payload, FIRMA_SECRETA, { expiresIn: '2h' });

        return res.status(200).json({
            success: true,
            message: "Autenticación exitosa. ¡Bienvenida!",
            token: token
        });
    } else {
        return res.status(401).json({
            success: false,
            message: "Usuario o contraseña incorrectos."
        });
    }
});


// ========================================================
// RUTAS DE LA API (Películas)
// ========================================================

// GET - Obtener todas las películas (La dejamos PÚBLICA para que cualquiera las consulte)
app.get('/api/peliculas', async (req, res) => {
    try {
        const peliculas = await Pelicula.findAll();
        res.status(200).json(peliculas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST - Crear una nueva película (🔒 PROTEGIDA con el middleware validarJWT)
app.post('/api/peliculas', validarJWT, async (req, res) => {
    try {
        const nuevaPelicula = await Pelicula.create(req.body);
        res.status(201).json({
            message: "Película creada con éxito en la base de datos",
            data: nuevaPelicula
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PUT - Actualizar una película por ID (🔒 PROTEGIDA con el middleware)
app.put('/api/peliculas/:id', validarJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const pelicula = await Pelicula.findByPk(id);
        
        if (!pelicula) {
            return res.status(404).json({ message: "Película no encontrada" });
        }
        
        await pelicula.update(req.body);
        res.status(200).json({
            message: "Película actualizada con éxito",
            data: pelicula
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE - Eliminar una película por ID (🔒 PROTEGIDA con el middleware)
app.delete('/api/peliculas/:id', validarJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const pelicula = await Pelicula.findByPk(id);
        
        if (!pelicula) {
            return res.status(404).json({ message: "Película no encontrada" });
        }
        
        await pelicula.destroy();
        res.status(200).json({ message: "Película eliminada correctamente de la base de datos" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Iniciar el servidor local
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});