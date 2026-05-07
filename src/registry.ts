// src/registry.ts

// 1. Import file router yang sudah kamu buat
import brat from '../router/maker/brat';
// import kuroneko from '../router/ai/kuroneko';
// import ssweb from '../router/tools/ssweb';
// import mediafire from '../router/download/mediafire';

// 2. Daftarkan ke dalam object registry
// Format key: "nama_folder/nama_file" (harus sama persis dengan yang ada di config.json)
export const routeRegistry: Record<string, any> = {
    'maker/brat': brat,
    // 'ai/kuroneko': kuroneko,
    // 'tools/ssweb': ssweb,
    // 'download/mediafire': mediafire,
       
};
