// Combining diacritical marks: what is left of a tone or vowel mark once NFD has split it off.
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/**
 * The form of a string that search compares: no tone or vowel marks (`"Kho Hà Nội"` and
 * `"kho ha noi"` read the same), `đ`/`Đ` as `d` (NFD leaves them whole), lower case, no outer space.
 * Mobile only: the web list screens search on the server.
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}
