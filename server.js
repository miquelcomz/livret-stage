const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'livrets.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'prof2024';

if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}));

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function readData() {
    try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; }
}
function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── ÉLÈVE ──────────────────────────────────────────────────

app.post('/api/login', (req, res) => {
    const { nom, prenom, classe, code } = req.body;
    if (!nom || !prenom || !classe || !code)
        return res.status(400).json({ error: 'Tous les champs sont requis.' });

    const data = readData();
    const id = code.toLowerCase().trim();

    if (!data[id]) {
        data[id] = { id, nom, prenom, classe, code, createdAt: new Date().toISOString(), lastSaved: null, livret: {} };
        writeData(data);
    } else {
        if (data[id].nom.toLowerCase() !== nom.toLowerCase() ||
            data[id].prenom.toLowerCase() !== prenom.toLowerCase()) {
            return res.status(401).json({ error: 'Ce code existe déjà avec un autre nom. Vérifiez vos informations.' });
        }
    }
    const e = data[id];
    res.json({ success: true, eleveId: id, lastSaved: e.lastSaved, hasData: Object.keys(e.livret).length > 0 });
});

app.post('/api/save/:id', (req, res) => {
    const data = readData();
    if (!data[req.params.id]) return res.status(404).json({ error: 'Élève non trouvé.' });
    data[req.params.id].livret = req.body.livret;
    data[req.params.id].lastSaved = new Date().toISOString();
    writeData(data);
    res.json({ success: true, lastSaved: data[req.params.id].lastSaved });
});

app.get('/api/load/:id', (req, res) => {
    const data = readData();
    if (!data[req.params.id]) return res.status(404).json({ error: 'Élève non trouvé.' });
    const e = data[req.params.id];
    res.json({ success: true, livret: e.livret, lastSaved: e.lastSaved });
});

// ── PROFESSEUR ─────────────────────────────────────────────

app.post('/api/admin/login', (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD)
        return res.status(401).json({ error: 'Mot de passe incorrect.' });
    res.json({ success: true });
});

app.post('/api/admin/eleves', (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD)
        return res.status(401).json({ error: 'Non autorisé.' });
    const data = readData();
    const eleves = Object.values(data).map(e => ({
        id: e.id, nom: e.nom, prenom: e.prenom, classe: e.classe,
        lastSaved: e.lastSaved, hasData: Object.keys(e.livret).length > 0
    }));
    res.json({ success: true, eleves });
});

app.post('/api/admin/eleve/:id', (req, res) => {
    if (req.body.password !== ADMIN_PASSWORD)
        return res.status(401).json({ error: 'Non autorisé.' });
    const data = readData();
    if (!data[req.params.id]) return res.status(404).json({ error: 'Élève non trouvé.' });
    res.json({ success: true, eleve: data[req.params.id] });
});

app.listen(PORT, () => console.log(`✅ Serveur démarré sur le port ${PORT}`));
