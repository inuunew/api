import { Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const mediafireDownloader = async (req: Request, res: Response) => {
    try {
        const { url } = req.query;

        // Validasi input parameter
        if (!url || typeof url !== 'string') {
            return res.status(400).json({
                status: false,
                message: 'Parameter "url" wajib diisi!'
            });
        }

        // Validasi apakah link benar-benar dari mediafire
        if (!url.includes('mediafire.com')) {
            return res.status(400).json({
                status: false,
                message: 'URL tidak valid. Harap masukkan link Mediafire.'
            });
        }

        // Fetch halaman HTML Mediafire
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // Load HTML menggunakan cheerio
        const $ = cheerio.load(data);
        
        // Mencari elemen spesifik dari struktur HTML Mediafire
        const downloadLink = $('#downloadButton').attr('href');
        const fileName = $('.dl-btn-label').attr('title') || $('.promo-download-text').text().trim() || 'Unknown File';
        
        // Mengambil teks dari tombol untuk mendapatkan ukuran file, lalu membersihkan teks "Download" dan tanda kurung
        const rawButtonText = $('a#downloadButton').text();
        const fileSize = rawButtonText.replace(/Download|\(|\)/gi, '').trim() || 'Unknown Size';

        if (!downloadLink) {
            return res.status(404).json({
                status: false,
                message: 'Gagal menemukan link download. File mungkin sudah dihapus, kadaluarsa, atau diproteksi kata sandi.'
            });
        }

        // Mengembalikan response (Nama creator otomatis disuntik oleh autoload.ts)
        return res.status(200).json({
            status: true,
            message: 'Berhasil mengambil data Mediafire',
            data: {
                file_name: fileName,
                file_size: fileSize,
                download_url: downloadLink,
                original_url: url
            }
        });

    } catch (error: any) {
        console.error('[!] Mediafire Scraper Error:', error.message);
        return res.status(500).json({
            status: false,
            message: 'Terjadi kesalahan saat memproses link Mediafire. Pastikan link aktif.'
        });
    }
};

export default mediafireDownloader;
