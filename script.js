// ---------------------- INITIALISATION ----------------------
// Utilisation de la syntaxe compatible v0.11 (la plus courante en local)
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ 
    log: true,
    // Indispensable pour éviter les blocages sur de gros fichiers comme "Ciel gris.wav"
    mainName: 'main' 
});

// Sélecteurs d'UI
const elements = {
    processBtn: document.getElementById('processBtn'),
    audioInput: document.getElementById('audioInput'),
    outputFormat: document.getElementById('outputFormat'),
    // Métadonnées
    metaBtn: document.getElementById('metaBtn'),
    metaInput: document.getElementById('metaInput'),
    titleInput: document.getElementById('titleInput'),
    artistInput: document.getElementById('artistInput'),
    // Cut
    cutBtn: document.getElementById('cutBtn'),
    cutInput: document.getElementById('cutInput'),
    startTime: document.getElementById('startTime'),
    endTime: document.getElementById('endTime')
};

// ---------------------- CHARGEMENT ASYNCHRONE ----------------------
async function initFFmpeg() {
    if (!ffmpeg.isLoaded()) {
        try {
            await ffmpeg.load();
        } catch (e) {
            console.error("Erreur de chargement FFmpeg (Vérifiez les en-têtes COOP/COEP) :", e);
            alert("FFmpeg n'a pas pu démarrer. Vérifiez votre configuration serveur local.");
        }
    }
}

// Nettoyage du système de fichiers virtuel pour libérer la RAM
function cleanupFS(filenames) {
    filenames.forEach(name => {
        try { ffmpeg.FS('unlink', name); } catch(e) {}
    });
}

// ---------------------- LOGIQUE DE TRAITEMENT ----------------------

async function runAudioTask(file, outputExt, customArgs, isCut = false) {
    const inputName = file.name;
    const outputName = `${isCut ? 'cut_' : 'converted_'}${inputName.split('.')[0]}.${outputExt}`;
    
    await initFFmpeg();

    // Lecture du fichier en ArrayBuffer (plus stable pour les gros .wav)
    const data = await file.arrayBuffer();
    ffmpeg.FS('writeFile', inputName, new Uint8Array(data));

    // Construction des arguments
    // Note : Placer -ss AVANT -i rend le découpage instantané
    let args = [...customArgs];

    await ffmpeg.run(...args, outputName);

    // Récupération du résultat
    const resultData = ffmpeg.FS('readFile', outputName);
    const blob = new Blob([resultData.buffer], { type: `audio/${outputExt}` });
    const url = URL.createObjectURL(blob);

    // Téléchargement
    const a = document.createElement('a');
    a.href = url;
    a.download = outputName;
    a.click();

    // Nettoyage mémoire
    cleanupFS([inputName, outputName]);
}

// ---------------------- ÉVÉNEMENTS ----------------------

// 1. Compression / Conversion
elements.processBtn.addEventListener('click', async () => {
    const file = elements.audioInput.files[0];
    if (!file) return alert("Sélectionnez un fichier !");

    elements.processBtn.disabled = true;
    const ext = elements.outputFormat.value;
    
    let args = ['-i', file.name];
    if (ext === 'mp3') args.push('-b:a', '192k');
    else if (ext === 'wav') args.push('-c:a', 'pcm_s16le', '-ar', '44100');

    await runAudioTask(file, ext, args);
    elements.processBtn.disabled = false;
});

// 2. Métadonnées (Via FFmpeg pour une meilleure compatibilité WAV/MP3)
elements.metaBtn.addEventListener('click', async () => {
    const file = elements.metaInput.files[0];
    if (!file) return alert("Sélectionnez un fichier !");

    elements.metaBtn.disabled = true;
    const title = elements.titleInput.value || "";
    const artist = elements.artistInput.value || "";

    // On utilise l'extension d'origine pour ne pas changer le format
    const ext = file.name.split('.').pop();
    const args = [
        '-i', file.name,
        '-metadata', `title=${title}`,
        '-metadata', `artist=${artist}`,
        '-c', 'copy' // 'copy' permet de ne pas ré-encoder (ultra rapide)
    ];

    await runAudioTask(file, ext, args);
    elements.metaBtn.disabled = false;
});

// 3. Couper l'audio
elements.cutBtn.addEventListener('click', async () => {
    const file = elements.cutInput.files[0];
    if (!file) return alert("Sélectionnez un fichier !");

    elements.cutBtn.disabled = true;
    const start = elements.startTime.value || "0";
    const end = elements.endTime.value;
    const ext = file.name.split('.').pop();

    // -ss avant -i pour la vitesse
    let args = ['-ss', start];
    if (end) args.push('-to', end);
    args.push('-i', file.name, '-c', 'copy');

    await runAudioTask(file, ext, args, true);
    elements.cutBtn.disabled = false;
});
