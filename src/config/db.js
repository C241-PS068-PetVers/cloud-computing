// src/config/db.js
const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json'); // Sesuaikan dengan lokasi berkas kredensial Anda

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports = db;