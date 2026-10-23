// Deklarasi minimal untuk upng-js (paket tidak menyertakan type). Hanya API yang dipakai
// /tools/image: encode RGBA → PNG, dengan `cnum` = jumlah warna palet (0 = lossless).
declare module 'upng-js' {
	const UPNG: {
		encode(imgs: ArrayBuffer[], w: number, h: number, cnum: number, dels?: number[]): ArrayBuffer;
	};
	export default UPNG;
}
