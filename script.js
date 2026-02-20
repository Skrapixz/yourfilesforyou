const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log:true });

const audioInput = document.getElementById('audioInput');
const outputFormat = document.getElementById('outputFormat');
const processBtn = document.getElementById('processBtn');
const processProgress = document.getElementById('processProgress');

const metaInput = document.getElementById('metaInput');
const titleInput = document.getElementById('titleInput');
const artistInput = document.getElementById('artistInput');
const coverInput = document.getElementById('coverInput');
const metaBtn = document.getElementById('metaBtn');

const cutInput = document.getElementById('cutInput');
const startTime = document.getElementById('startTime');
const endTime = document.getElementById('endTime');
const cutFormat = document.getElementById('cutFormat');
const cutBtn = document.getElementById('cutBtn');
const cutProgress = document.getElementById('cutProgress');

async function loadFFmpeg() {
  if(!ffmpeg.isLoaded()) await ffmpeg.load();
}

// ---------------- COMPRESSION / CONVERSION ----------------
processBtn.addEventListener('click', async () => {
  if(audioInput.files.length === 0) return alert("Choisis un fichier !");
  const file = audioInput.files[0];
  const outputExt = outputFormat.value.toLowerCase();
  const outputName = `${file.name.split('.')[0]}.${outputExt}`;

  processBtn.disabled = true;
  processBtn.innerText = "Processing…";

  await loadFFmpeg();
  ffmpeg.FS('writeFile', file.name, await fetchFile(file));

  if(outputExt === 'mp3'){
    await ffmpeg.run('-i', file.name, '-b:a', '128k', outputName);
  } else {
    await ffmpeg.run('-i', file.name, outputName);
  }

  const data = ffmpeg.FS('readFile', outputName);
  const url = URL.createObjectURL(new Blob([data.buffer], {type:`audio/${outputExt}`}));
  const a = document.createElement('a');
  a.href = url;
  a.download = outputName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  processBtn.disabled = false;
  processBtn.innerText = "Compresser / Convertir et Télécharger";
  processProgress.style.width = "0%";
});

// ---------------- METADATA ----------------
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
    writer.setFrame('APIC', {type:3,data:coverArray,description:'cover'});
  }

  writer.addTag();
  const taggedBlob = writer.getBlob();
  const url = URL.createObjectURL(taggedBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `meta_${file.name}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
});

// ---------------- COUPER AUDIO ----------------
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
  ffmpeg.FS('writeFile', file.name, await fetchFile(file));

  const args = ['-i', file.name];
  if(end > start) args.push('-ss', start.toString(), '-to', end.toString());
  args.push(outputName);

  await ffmpeg.run(...args);

  const data = ffmpeg.FS('readFile', outputName);
  const url = URL.createObjectURL(new Blob([data.buffer], {type:`audio/${outputExt}`}));
  const a = document.createElement('a');
  a.href = url;
  a.download = outputName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  cutBtn.disabled = false;
  cutBtn.innerText = "Couper et Télécharger";
  cutProgress.style.width = "0%";
});
