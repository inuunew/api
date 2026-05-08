import { Request, Response } from 'express';
import axios from 'axios';

export default async function bratHandler(req: Request, res: Response) {
    const text = (req.query.text || req.body.text) as string;

    if (!text) {
        return res.status(400).json({ status: false, message: "Parameter 'text' diperlukan." });
    }

    try {
        const url = `https://brat.siputzx.my.id/image?text=${encodeURIComponent(text)}`;
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        res.set('Content-Type', 'image/png');
        res.send(response.data);
    } catch (error: any) {
        res.status(500).json({ status: false, message: error.message });
    }
}
