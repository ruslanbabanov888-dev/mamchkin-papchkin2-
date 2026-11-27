import { Printer } from '@capgo/capacitor-printer';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

function safeFileName(value) {
  const clean = String(value || 'Семейная книга').replace(/[\\/:*?"<>|]+/g, '-').trim().slice(0, 90) || 'Семейная книга';
  return /\\.html$/i.test(clean) ? clean : clean + '.html';
}

function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function browserDownload(html, name) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

window.MPPrinter = {
  async printHtml(html, name = 'Семейная книга') {
    return Printer.printHtml({ html, name });
  },

  async saveHtml(html, fileName = 'Семейная книга.html') {
    const name = safeFileName(fileName);
    if (!Capacitor.isNativePlatform()) {
      browserDownload(html, name);
      return { saved: true, method: 'browser-download' };
    }
    const result = await Filesystem.writeFile({
      path: name,
      data: toBase64(html),
      directory: Directory.Cache,
      encoding: Encoding.BASE64,
      recursive: true
    });
    await Share.share({
      title: name,
      text: 'Семейная книга',
      url: result.uri,
      dialogTitle: 'Сохранить семейную книгу'
    });
    return { saved: true, method: 'android-share' };
  }
};
