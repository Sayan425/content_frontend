// Shared HTML-escaping helper. Use on ANY user- or database-sourced string
// that gets interpolated into an innerHTML template literal, so stored
// content can never inject markup or scripts into the page.
export function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
