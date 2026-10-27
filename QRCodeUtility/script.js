const themeToggle = document.getElementById('themeToggle');
const contentType = document.getElementById('contentType');
const qrForm = document.getElementById('qrForm');
const qrContent = document.getElementById('qrContent');
const charCount = document.getElementById('charCount');
const formError = document.getElementById('formError');
const resultCard = document.getElementById('resultCard');
const qrCanvas = document.getElementById('qrCanvas');
const resultSummary = document.getElementById('resultSummary');
const toast = document.getElementById('toast');
const scanTab = document.getElementById('scanTab');
const generateTab = document.getElementById('generateTab');
const batchTab = document.getElementById('batchTab');
const generatePanel = document.getElementById('generatePanel');
const scanPanel = document.getElementById('scanPanel');
const batchPanel = document.getElementById('batchPanel');
const scanError = document.getElementById('scanError');
const scanResult = document.getElementById('scanResult');
const scanOutput = document.getElementById('scanOutput');
const scanLinkWrap = document.getElementById('scanLinkWrap');
const openScannedLinkBtn = document.getElementById('openScannedLinkBtn');
const batchForm = document.getElementById('batchForm');
const batchContent = document.getElementById('batchContent');
const batchError = document.getElementById('batchError');
const batchResults = document.getElementById('batchResults');
const batchGrid = document.getElementById('batchGrid');

const fieldGroups = {
    text: ['genericFields'],
    url: ['genericFields'],
    wifi: ['wifiFields'],
    email: ['emailFields'],
    phone: ['phoneFields'],
    sms: ['smsFields'],
    vcard: ['vcardFields'],
    upi: ['upiFields']
};
const allFieldGroupIds = [...new Set(Object.values(fieldGroups).flat())];
let toastTimeout = null;
let scanner = null;
let cameraRunning = false;
let currentPayload = '';
let batchItems = [];
let scannedUrl = '';
let scannedActionLabel = '';
let scannedActionType = '';

const applyTheme = theme => {
    document.documentElement.dataset.theme = theme;
    themeToggle.textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
    try { localStorage.setItem('theme', theme); } catch { }
};

let initialTheme = 'light';
try {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') initialTheme = savedTheme;
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) initialTheme = 'dark';
} catch { }
applyTheme(initialTheme);

themeToggle.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

const showToast = message => {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.hidden = true; }, 2800);
};

const setError = (element, message) => {
    element.textContent = message;
    element.hidden = !message;
};

const switchTab = tab => {
    const entries = [
        [generateTab, generatePanel, 'generate'],
        [scanTab, scanPanel, 'scan'],
        [batchTab, batchPanel, 'batch']
    ];
    entries.forEach(([button, panel, name]) => {
        const active = name === tab;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
        panel.hidden = !active;
    });
    if (tab !== 'scan') stopCamera();
};
generateTab.addEventListener('click', () => switchTab('generate'));
scanTab.addEventListener('click', () => switchTab('scan'));
batchTab.addEventListener('click', () => switchTab('batch'));

const updateTypeFields = () => {
    allFieldGroupIds.forEach(id => { document.getElementById(id).hidden = true; });
    (fieldGroups[contentType.value] || []).forEach(id => { document.getElementById(id).hidden = false; });
    const genericActive = ['text', 'url'].includes(contentType.value);
    qrContent.required = genericActive;
};
contentType.addEventListener('change', updateTypeFields);
updateTypeFields();

const wifiSecurity = document.getElementById('wifiSecurity');
const wifiPassword = document.getElementById('wifiPassword');
const wifiPasswordGroup = document.getElementById('wifiPasswordGroup');

const updateWifiPasswordField = () => {
    const isOpenNetwork = wifiSecurity.value === 'nopass';
    wifiPasswordGroup.hidden = isOpenNetwork;
    wifiPassword.disabled = isOpenNetwork;
    wifiPassword.required = false;
    if (isOpenNetwork) wifiPassword.value = '';
};

wifiSecurity.addEventListener('change', updateWifiPasswordField);
updateWifiPasswordField();

qrContent.addEventListener('input', () => { charCount.textContent = String(qrContent.value.length); });

const escapeWifi = value => value.replace(/([\\;,:"])/g, '\\$1');
const escapeVcard = value => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const getPayload = () => {
    const type = contentType.value;
    const trimmed = value => value.trim();
    if (type === 'text' || type === 'url') {
        const value = trimmed(qrContent.value);
        if (!value) throw new Error('Enter some text or a URL first.');
        if (type === 'url') {
            let url;
            try { url = new URL(value); } catch { throw new Error('Enter a complete URL, such as https://example.com.'); }
            if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS website URLs are supported.');
            return url.href;
        }
        return value;
    }
    if (type === 'wifi') {
        const ssid = trimmed(document.getElementById('wifiSsid').value);
        const password = document.getElementById('wifiPassword').value;
        const security = wifiSecurity.value;
        if (!ssid) throw new Error('Enter the Wi-Fi network name.');
        if (security === 'nopass') {
            return `WIFI:T:nopass;S:${escapeWifi(ssid)};P:;;`;
        }
        if (!password) throw new Error('Enter the Wi-Fi password.');
        return `WIFI:T:${security};S:${escapeWifi(ssid)};P:${escapeWifi(password)};;`;
    }
    if (type === 'email') {
        const address = trimmed(document.getElementById('emailAddress').value);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new Error('Enter a valid email address.');
        const params = new URLSearchParams();
        const subject = trimmed(document.getElementById('emailSubject').value);
        const body = trimmed(document.getElementById('emailBody').value);
        if (subject) params.set('subject', subject);
        if (body) params.set('body', body);
        return `mailto:${address}${params.toString() ? `?${params}` : ''}`;
    }
    if (type === 'phone') {
        const phone = trimmed(document.getElementById('phoneNumber').value);
        if (!/^[+0-9().\-\s]{5,40}$/.test(phone)) throw new Error('Enter a valid phone number.');
        return `tel:${phone.replace(/[()\s.-]/g, '')}`;
    }
    if (type === 'sms') {
        const phone = trimmed(document.getElementById('smsNumber').value);
        if (!/^[+0-9().\-\s]{5,40}$/.test(phone)) throw new Error('Enter a valid phone number.');
        const message = trimmed(document.getElementById('smsMessage').value);
        return `SMSTO:${phone.replace(/[()\s.-]/g, '')}:${message}`;
    }
    if (type === 'vcard') {
        const name = trimmed(document.getElementById('contactName').value);
        if (!name) throw new Error('Enter a contact name.');
        const phone = trimmed(document.getElementById('contactPhone').value);
        const email = trimmed(document.getElementById('contactEmail').value);
        const org = trimmed(document.getElementById('contactOrg').value);
        const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${escapeVcard(name)}`];
        if (phone) lines.push(`TEL;TYPE=CELL:${escapeVcard(phone)}`);
        if (email) lines.push(`EMAIL:${escapeVcard(email)}`);
        if (org) lines.push(`ORG:${escapeVcard(org)}`);
        lines.push('END:VCARD');
        return lines.join('\r\n');
    }
    if (type === 'upi') {
        const id = trimmed(document.getElementById('upiId').value);
        if (!/^[\w.\-]{2,256}@[A-Za-z]{2,64}$/.test(id)) throw new Error('Enter a valid UPI ID, such as name@bank.');
        const name = trimmed(document.getElementById('upiName').value);
        const amount = trimmed(document.getElementById('upiAmount').value);
        if (amount && (!Number.isFinite(Number(amount)) || Number(amount) <= 0)) throw new Error('Amount must be greater than zero.');
        const params = new URLSearchParams({ pa: id, cu: 'INR' });
        if (name) params.set('pn', name);
        if (amount) params.set('am', Number(amount).toFixed(2));
        return `upi://pay?${params.toString()}`;
    }
    throw new Error('Select a supported QR code type.');
};

const getQrOptions = size => ({
    width: size,
    margin: 2,
    errorCorrectionLevel: document.getElementById('qrError').value,
    color: {
        dark: document.getElementById('qrDark').value,
        light: document.getElementById('qrLight').value
    }
});

const makeQrMatrix = payload => {
    if (typeof window.qrcode !== 'function') {
        throw new Error('QR library did not load. Check your internet connection or CDN access, then reload the page.');
    }
    const options = getQrOptions(256);
    const qr = window.qrcode(0, options.errorCorrectionLevel);
    qr.addData(payload);
    qr.make();
    return qr;
};

const drawQrCanvas = (qr, canvas, options) => {
    const size = options.width;
    const count = qr.getModuleCount();
    const margin = options.margin;
    const cells = count + margin * 2;
    const cellSize = size / cells;
    const context = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;
    context.fillStyle = options.color.light;
    context.fillRect(0, 0, size, size);
    context.fillStyle = options.color.dark;
    for (let row = 0; row < count; row++) {
        for (let col = 0; col < count; col++) {
            if (qr.isDark(row, col)) {
                const x1 = Math.round((col + margin) * cellSize);
                const y1 = Math.round((row + margin) * cellSize);
                const x2 = Math.round((col + margin + 1) * cellSize);
                const y2 = Math.round((row + margin + 1) * cellSize);
                context.fillRect(x1, y1, x2 - x1, y2 - y1);
            }
        }
    }
};

const generateQr = async (payload, canvas, size) => {
    const qr = makeQrMatrix(payload);
    drawQrCanvas(qr, canvas, getQrOptions(size));
    return qr;
};

const makeQrSvg = (payload, size) => {
    const options = getQrOptions(size);
    const qr = makeQrMatrix(payload);
    const modules = qr.getModuleCount();
    const margin = options.margin;
    const cells = modules + margin * 2;
    const paths = [];
    for (let row = 0; row < modules; row++) {
        for (let col = 0; col < modules; col++) {
            if (qr.isDark(row, col)) paths.push(`M${col + margin},${row + margin}h1v1h-1z`);
        }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${cells} ${cells}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${options.color.light}"/><path d="${paths.join('')}" fill="${options.color.dark}"/></svg>`;
};

qrForm.addEventListener('submit', async event => {
    event.preventDefault();
    setError(formError, '');
    try {
        const payload = getPayload();
        const size = Number(document.getElementById('qrSize').value);
        await generateQr(payload, qrCanvas, size);
        currentPayload = payload;
        resultSummary.textContent = `${payload.length.toLocaleString()} characters · ${size} × ${size} px`;
        resultCard.hidden = false;
        showToast('QR code generated.');
    } catch (error) {
        setError(formError, error.message || 'Unable to generate this QR code.');
        resultCard.hidden = true;
    }
});

const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const safeFilename = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'qr-code';

document.getElementById('downloadPngBtn').addEventListener('click', () => {
    if (!currentPayload) return;
    qrCanvas.toBlob(blob => {
        if (!blob) { showToast('Could not export PNG.'); return; }
        downloadBlob(blob, `${safeFilename(currentPayload)}.png`);
    }, 'image/png');
});

document.getElementById('downloadSvgBtn').addEventListener('click', async () => {
    if (!currentPayload) return;
    try {
        const svg = makeQrSvg(currentPayload, Number(document.getElementById('qrSize').value));
        downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${safeFilename(currentPayload)}.svg`);
    } catch { showToast('Could not export SVG.'); }
});

document.getElementById('copyContentBtn').addEventListener('click', async () => {
    if (!currentPayload) return;
    try {
        await navigator.clipboard.writeText(currentPayload);
        showToast('QR content copied.');
    } catch { showToast('Clipboard access is unavailable in this browser.'); }
});

document.getElementById('clearBtn').addEventListener('click', () => {
    qrForm.reset();
    qrContent.value = '';
    charCount.textContent = '0';
    currentPayload = '';
    resultCard.hidden = true;
    setError(formError, '');
    updateTypeFields();
    showToast('Generator cleared.');
});

const showScanResult = decodedText => {
    scanOutput.value = decodedText;
    scanResult.hidden = false;
    scannedUrl = '';
    scannedActionLabel = '';
    scannedActionType = '';
    scanLinkWrap.hidden = true;

    const trimmed = decodedText.trim();
    const label = document.getElementById('scanLinkLabel');
    const actionButton = document.getElementById('openScannedLinkBtn');
    actionButton.disabled = false;

    if (/^BEGIN:VCARD\b/i.test(trimmed)) {
        scannedActionType = 'vcard';
        scannedActionLabel = 'Download contact (.vcf)';
        label.textContent = 'Contact card detected. Download the .vcf file, then open it on your device to review and save the contact.';
        actionButton.textContent = scannedActionLabel;
        scanLinkWrap.hidden = false;
    } else if (/^SMSTO:/i.test(trimmed)) {
        const smsContent = trimmed.slice(trimmed.indexOf(':') + 1);
        const separator = smsContent.indexOf(':');
        const phone = (separator === -1 ? smsContent : smsContent.slice(0, separator)).trim();
        const message = separator === -1 ? '' : smsContent.slice(separator + 1);
        if (phone) {
            scannedUrl = `sms:${phone}${message ? `?body=${encodeURIComponent(message)}` : ''}`;
            scannedActionType = 'url';
            scannedActionLabel = 'Open messages';
            label.textContent = 'SMS message detected. Open your messaging app with the recipient and message prefilled, if supported by your device.';
            actionButton.textContent = scannedActionLabel;
            scanLinkWrap.hidden = false;
        }
    } else {
        try {
            const url = new URL(trimmed);
            if (['http:', 'https:', 'tel:', 'mailto:', 'sms:', 'upi:'].includes(url.protocol)) {
                scannedUrl = url.href;
                scannedActionType = 'url';
                scannedActionLabel = ({
                    'http:': 'Open website',
                    'https:': 'Open website',
                    'tel:': 'Open dialer',
                    'mailto:': 'Compose email',
                    'sms:': 'Open messages',
                    'upi:': 'Open UPI app'
                })[url.protocol];
                label.textContent = `Detected: ${scannedActionLabel}. Your device may ask which app to use or require confirmation.`;
                actionButton.textContent = scannedActionLabel;
                scanLinkWrap.hidden = false;
            }
        } catch { }
    }

    if (!scannedActionType && /^WIFI:/i.test(trimmed)) {
        label.textContent = 'This is Wi-Fi network data. For automatic join prompts, scan the QR code with your phone’s built-in camera or Wi-Fi scanner; browsers cannot connect to Wi-Fi directly.';
        actionButton.textContent = 'Wi-Fi QR detected';
        scanLinkWrap.hidden = false;
        actionButton.disabled = true;
    }

    setError(scanError, '');
    showToast('QR code scanned.');
};

openScannedLinkBtn.addEventListener('click', () => {
    if (scannedActionType === 'vcard') {
        const blob = new Blob([scanOutput.value.trim() + '\r\n'], { type: 'text/vcard;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'contact.vcf';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        showToast('Contact file downloaded.');
        return;
    }
    if (scannedActionType === 'url' && /^(https?:|tel:|mailto:|sms:|upi:)/i.test(scannedUrl)) {
        window.location.href = scannedUrl;
    }
});

const stopCamera = async () => {
    if (scanner && cameraRunning) {
        try { await scanner.stop(); } catch { }
        try { await scanner.clear(); } catch { }
    }
    cameraRunning = false;
    document.getElementById('startCameraBtn').disabled = false;
    document.getElementById('stopCameraBtn').disabled = true;
};
document.getElementById('startCameraBtn').addEventListener('click', async () => {
    setError(scanError, '');
    if (!window.Html5Qrcode) {
        setError(scanError, 'Scanner library did not load. Check your internet connection and reload the page.');
        return;
    }
    if (cameraRunning) return;
    try {
        scanner = scanner || new Html5Qrcode('reader');
        await scanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
            decodedText => {
                showScanResult(decodedText);
                stopCamera();
            },
            () => { }
        );
        cameraRunning = true;
        document.getElementById('startCameraBtn').disabled = true;
        document.getElementById('stopCameraBtn').disabled = false;
    } catch (error) {
        setError(scanError, `Could not start the camera. Allow camera permission and use HTTPS or localhost. ${error.message || ''}`.trim());
    }
});
document.getElementById('stopCameraBtn').addEventListener('click', stopCamera);

document.getElementById('scanImage').addEventListener('change', async event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    setError(scanError, '');
    if (!window.Html5Qrcode) {
        setError(scanError, 'Scanner library did not load. Check your internet connection and reload the page.');
        return;
    }
    try {
        if (scanner && cameraRunning) await stopCamera();
        const imageScanner = new Html5Qrcode('reader');
        const result = await imageScanner.scanFile(file, true);
        showScanResult(result);
        await imageScanner.clear();
    } catch {
        setError(scanError, 'No readable QR code was found in that image. Try a clearer image with the full QR code visible.');
    } finally {
        event.target.value = '';
    }
});
document.getElementById('copyScanBtn').addEventListener('click', async () => {
    if (!scanOutput.value) return;
    try { await navigator.clipboard.writeText(scanOutput.value); showToast('Scanned result copied.'); }
    catch { showToast('Clipboard access is unavailable in this browser.'); }
});
document.getElementById('clearScanBtn').addEventListener('click', () => {
    scanOutput.value = '';
    scanResult.hidden = true;
    scanLinkWrap.hidden = true;
    scannedUrl = '';
    scannedActionLabel = '';
    openScannedLinkBtn.disabled = false;
    setError(scanError, '');
    showToast('Scan result cleared.');
});

batchForm.addEventListener('submit', async event => {
    event.preventDefault();
    setError(batchError, '');
    const values = batchContent.value.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
    if (!values.length) {
        setError(batchError, 'Enter at least one item, with each item on a separate line.');
        return;
    }
    if (values.length > 30) {
        setError(batchError, 'Please limit each batch to 30 items for smooth performance.');
        return;
    }
    if (typeof window.qrcode !== 'function') {
        setError(batchError, 'QR library did not load. Check your internet connection or CDN access, then reload the page.');
        return;
    }
    batchGrid.replaceChildren();
    batchItems = [];
    const size = Number(document.getElementById('batchSize').value);
    try {
        for (const [index, value] of values.entries()) {
            const item = document.createElement('article');
            item.className = 'batch-item';
            const canvas = document.createElement('canvas');
            const label = document.createElement('p');
            const downloadButton = document.createElement('button');
            downloadButton.type = 'button';
            downloadButton.className = 'secondary-btn';
            downloadButton.textContent = `Download #${index + 1}`;
            label.textContent = value.length > 100 ? `${value.slice(0, 97)}…` : value;
            const qr = makeQrMatrix(value);
            drawQrCanvas(qr, canvas, { width: size, margin: 2, color: { dark: '#111827', light: '#ffffff' } });
            downloadButton.addEventListener('click', () => {
                canvas.toBlob(blob => { if (blob) downloadBlob(blob, `qr-${index + 1}.png`); }, 'image/png');
            });
            item.append(canvas, label, downloadButton);
            batchGrid.appendChild(item);
            batchItems.push({ canvas, value, index: index + 1 });
        }
        batchResults.hidden = false;
        showToast(`${values.length} QR code${values.length === 1 ? '' : 's'} generated.`);
    } catch (error) {
        setError(batchError, error.message || 'Could not generate this batch.');
        batchResults.hidden = true;
    }
});
document.getElementById('clearBatchBtn').addEventListener('click', () => {
    batchForm.reset();
    batchGrid.replaceChildren();
    batchItems = [];
    batchResults.hidden = true;
    setError(batchError, '');
});
document.getElementById('downloadBatchBtn').addEventListener('click', async () => {
    if (!batchItems.length) return;
    if (!window.JSZip) {
        showToast('ZIP export needs an extra library. Download each PNG using its individual button.');
        return;
    }
    const zip = new JSZip();
    for (const item of batchItems) {
        const blob = await new Promise(resolve => item.canvas.toBlob(resolve, 'image/png'));
        if (blob) zip.file(`qr-${item.index}.png`, blob);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'qr-code-batch.zip');
});