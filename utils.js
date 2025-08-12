// utils.js - shared utility functions

// Generate UUID (v4) for unique IDs
function generateUUID() {
  // https://stackoverflow.com/a/2117523/355230
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Parse date string from dd/mm/yyyy to Date object
function parseDateDMY(str) {
  const parts = str.split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy) return null;
  return new Date(yyyy, mm - 1, dd);
}

// Format Date object to dd/mm/yyyy string
function formatDateDMY(date) {
  if (!(date instanceof Date)) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Format Date object to short string like "Aug 1"
function formatDateShort(date) {
  if (!(date instanceof Date)) return '';
  const options = { month: 'short', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
}

// Delay helper for debounce
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Download visible page as PNG using html2canvas
function downloadPageAsImage(filename = 'download.png') {
  const body = document.body;
  html2canvas(body, { scrollY: -window.scrollY }).then(canvas => {
    canvas.toBlob(blob => {
      const link = document.createElement('a');
      link.download = filename;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    });
  });
}
