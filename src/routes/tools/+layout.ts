// Semua tool berjalan 100% di browser (DOMParser, WebCrypto, canvas, CompressionStream, …),
// jadi SSR dimatikan untuk /tools/* — auth tetap dicek di hooks.server.ts sebelum shell dikirim.
export const ssr = false;
