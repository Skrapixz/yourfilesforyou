// script.js
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({ log: true });

const mp3Input = document.getElementById('mp3Input');
const compressBtn = document.getElementById('compressBtn');
const progressBar = document.getElementById('progress');

compressBtn.addEventListener('click', async () => {
  if(mp3Input.files.length === 0) return alert("Choisis un fichier !");
  const file = mp3Input.files[0];

  compressBtn.disabled = true;
  compressBtn.innerText = "Compression…";

  if(!ffmpeg.isLoaded()){
    await ffmpeg.load();
  }

  ffmpeg.FS('writeFile', file.name, await fetchFile(file));

  // compression à 128kbps
  await ffmpeg.run('-i', file.name, '-b:a', '128k', 'output.mp3');

  const data = ffmpeg.FS('readFile', 'output.mp3');
  const url = URL.createObjectURL(new Blob([data.buffer], {type:'audio/mp3'}));

  const a = document.createElement('a');
  a.href = url;
  a.download = `compressed_${file.name}`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  compressBtn.disabled = false;
  compressBtn.innerText = "Compresser et Télécharger";
  progressBar.style.width = "0%";
});
