import { Printer } from '@capgo/capacitor-printer';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

function safeFileName(value) {
  const clean = String(value || 'Семейная книга').replace(/[\\/:*?"<>|]+/g, '-').trim().slice(0, 90) || 'Семейная книга';
  return /\.html$/i.test(clean) ? clean : clean + '.html';
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

function completeHtmlDocument(input, name = 'Семейная книга') {
  const source = String(input || '');
  const parsed = new DOMParser().parseFromString(source, 'text/html');
  parsed.documentElement.lang = parsed.documentElement.lang || 'ru';
  if (!parsed.querySelector('meta[charset]')) {
    const charset = parsed.createElement('meta');
    charset.setAttribute('charset', 'utf-8');
    parsed.head.prepend(charset);
  }
  if (!parsed.title) parsed.title = String(name || 'Семейная книга');
  parsed.querySelectorAll('script').forEach(node => node.remove());
  const printStyle = parsed.createElement('style');
  printStyle.textContent = '@page{size:A4;margin:14mm}html,body{height:auto!important;min-height:0!important}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}img,video,figure,article,section{break-inside:avoid}';
  parsed.head.appendChild(printStyle);
  return '<!doctype html>\n' + parsed.documentElement.outerHTML;
}

function browserDownload(html, name) {
  const readyHtml = completeHtmlDocument(html, name);\n  const blob = new Blob([readyHtml], { type: 'text/html;charset=utf-8' });
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
    const readyHtml = completeHtmlDocument(html, name);\n    if (!readyHtml.includes('<body')) throw new Error('Не удалось подготовить содержимое книги к печати');\n    return Printer.printHtml({ html: readyHtml, name });
  },

  async saveHtml(html, fileName = 'Семейная книга.html') {
    const name = safeFileName(fileName);
    if (!Capacitor.isNativePlatform()) {
      browserDownload(html, name);
      return { saved: true, method: 'browser-download' };
    }
    const result = await Filesystem.writeFile({
      path: name,
      data: toBase64(completeHtmlDocument(html, name)),
      directory: Directory.Documents,
      encoding: Encoding.BASE64,
      recursive: true
    });
    await Share.share({
      title: name,
      text: 'Семейная книга',
      files: [result.uri],
      dialogTitle: 'Сохранить семейную книгу в файлы или отправить'
    });
    return { saved: true, method: 'android-share' };
  }
};
