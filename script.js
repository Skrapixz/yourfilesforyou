// ---------------------- INITIALISATION ----------------------
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

// Elements Compression / Conversion
const audioInput = document.getElementById('audioInput');
const outputFormat = document.getElementById('outputFormat');
const processBtn = document.getElementById('processBtn');
const processProgress = document.getElementById('processProgress');

// Elements Metadata
const metaInput = document.getElementById('metaInput');
const titleInput = document.getElementById('titleInput');
const artistInput = document.getElementById('artistInput');
const coverInput = document.getElementById('coverInput');
const metaBtn = document.getElementById('metaBtn');

// Elements Cut Audio
const cutInput = document.getElementById('cutInput');
const startTime = document.getElementById('startTime');
const endTime = document.getElementById('endTime');
const cutFormat = document.getElementById('cutFormat');
const cutBtn = document.getElementById('cutBtn');
const cutProgress = document.getElementById('cutProgress');

// ---------------------- CHARGER FFmpeg ----------------------
async function loadFFmpeg() {
    if(!ffmpeg.isLoaded()) await ffmpeg.load();
}

// ---------------------- UTILITAIRE : WRITE FILE ----------------------
async function writeFileToFS(file) {
    const fileData = new Uint8Array(await file.arrayBuffer());
    ffmpeg.FS('writeFile', file.name, fileData);
    return file.name;
}

// ---------------------- UTILITAIRE : GET MIME ----------------------
function getMime(ext) {
    ext = ext.toLowerCase();
    if(ext === 'mp3') return 'audio/mpeg';
    if(ext === 'wav') return 'audio/wav';
    if(ext === 'm4a') return 'audio/mp4';
    if(ext === 'flac') return 'audio/flac';
    return `audio/${ext}`;
}

// ---------------------- COMPRESSION / CONVERSION ----------------------
processBtn.addEventListener('click', async () => {
    if(audioInput.files.length === 0) return alert("Choisis un fichier !");
    const file = audioInput.files[0];
    const outputExt = outputFormat.value.toLowerCase();
    const outputName = `${file.name.split('.')[0]}.${outputExt}`;

    processBtn.disabled = true;
    processBtn.innerText = "Processing…";

    await loadFFmpeg();
    await writeFileToFS(file);

    let args = ['-i', file.name];

    if(outputExt === 'mp3'){
        args.push('-b:a', '128k', outputName); // Compression MP3
    } else if(outputExt === 'wav') {
        // Copy en WAV standard PCM 16bit
        args.push('-c:a', 'pcm_s16le', outputName);
    } else {
        // M4A, FLAC ou autres
        args.push(outputName);
    }

    await ffmpeg.run(...args);

    const data = ffmpeg.FS('readFile', outputName);
    const blob = new Blob([data.buffer], { type: getMime(outputExt) });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = outputName;
    a.click();

    processBtn.disabled = false;
    processBtn.innerText = "Compresser / Convertir et Télécharger";
    processProgress.style.width = "0%";
});

// ---------------------- METADATA ----------------------
metaBtn.addEventListener('click', async () => {
    if(metaInput.files.length === 0) return alert("Choisis un fichier !");
    const file = metaInput.files[0];
    const arrayBuffer = await file.arrayBuffer();
    const writer = new ID3Writer(arrayBuffer);

    if(titleInput.value) writer.setFrame('TIT2', titleInput.value);
    if(artistInput.value) writer.setFrame('TPE1', [artistInput.value]);

    if(coverInput.files.length > 0){
        const coverFile = coverInput.files[0];
        const coverArray = await coverFile.arrayBuffer();
        writer.setFrame('APIC', {type:3, data:coverArray, description:'cover'});
    }

    writer.addTag();
    const taggedBlob = writer.getBlob();
    const url = URL.createObjectURL(taggedBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `meta_${file.name}`;
    a.click();
});

// ---------------------- COUPER AUDIO ----------------------
cutBtn.addEventListener('click', async () => {
    if(cutInput.files.length === 0) return alert("Choisis un fichier !");
    const file = cutInput.files[0];
    const start = parseFloat(startTime.value) || 0;
    const end = parseFloat(endTime.value) || 0;
    const outputExt = cutFormat.value.toLowerCase();
    const outputName = `${file.name.split('.')[0]}_cut.${outputExt}`;

    cutBtn.disabled = true;
    cutBtn.innerText = "Processing…";

    await loadFFmpeg();
    await writeFileToFS(file);

    let args = ['-i', file.name];
    if(end > start) args.push('-ss', start.toString(), '-to', end.toString());

    // Commande spéciale pour WAV pour assurer compatibilité
    if(outputExt === 'wav'){
        args.push('-c:a','pcm_s16le', outputName);
    } else {
        args.push(outputName);
    }

    await ffmpeg.run(...args);

    const data = ffmpeg.FS('readFile', outputName);
    const blob = new Blob([data.buffer], { type: getMime(outputExt) });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = outputName;
    a.click();

    cutBtn.disabled = false;
    cutBtn.innerText = "Couper et Télécharger";
    cutProgress.style.width = "0%";
});
