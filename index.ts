import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

// 1. Import Endpoint secara langsung
import bratHandler from './router/maker/brat';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Load Static Files (HTML, CSS, Image)
app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/src', express.static(path.join(process.cwd(), 'src')));

// Helper untuk membaca config.json
const getConfig = () => {
    try {
        const configPath = path.join(process.cwd(), 'src', 'config.json');
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
        return { settings: { creator: "InuuTyzDev" } };
    }
};

// 3. DAFTARKAN RUTE API DI SINI
app.get('/api/maker/brat', async (req: Request, res: Response) => {
    await bratHandler(req, res);
});

// 4. Rute Halaman Web
app.get('/config', (req, res) => res.json(getConfig()));
app.get('/', (req, res) => res.sendFile(path.join(process.cwd(), 'public', 'landing.html')));
app.get('/docs', (req, res) => res.sendFile(path.join(process.cwd(), 'public', 'docs.html')));

// 5. Penanganan 404 yang Aman
app.use((req, res) => {
    const possible404 = path.join(process.cwd(), 'public', '404.html');
    if (fs.existsSync(possible404)) {
        res.status(404).sendFile(possible404);
    } else {
        res.status(404).json({ status: false, message: "Route not found" });
    }
});

// Jalankan server (Hanya untuk Lokal, Vercel akan abaikan ini)
if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => console.log('Server running on port 3000'));
}

export default app;
