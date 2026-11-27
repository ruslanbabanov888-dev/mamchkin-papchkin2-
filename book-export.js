/* MP_BOOK_EXPORT_V1 — dependency-free ZIP writer for a self-contained offline family book */
(function(){
'use strict';
const encoder=new TextEncoder();
const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0}return t})();
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
function u16(v){return [v&255,(v>>>8)&255]}
function u32(v){return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]}
function join(parts){const size=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(size);let at=0;for(const p of parts){out.set(p,at);at+=p.length}return out}
function zipStore(files){
 const locals=[],centrals=[];let offset=0;
 for(const file of files){
  const name=encoder.encode(file.name),data=typeof file.data==='string'?encoder.encode(file.data):file.data,crc=crc32(data);
  const local=join([new Uint8Array([0x50,0x4b,0x03,0x04]),new Uint8Array([...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0)]),name,data]);
  locals.push(local);
  const central=join([new Uint8Array([0x50,0x4b,0x01,0x02]),new Uint8Array([...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset)]),name]);
  centrals.push(central);offset+=local.length;
 }
 const directory=join(centrals),end=new Uint8Array([0x50,0x4b,0x05,0x06,...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(directory.length),...u32(offset),...u16(0)]);
 return new Blob([...locals,directory,end],{type:'application/zip'});
}
window.MPBookExport={
 async createZip(html){
  if(typeof html!=='string'||!html.includes('<html'))throw new Error('Содержимое книги не собрано');
  const readme='МАЛЕНЬКАЯ БОЛЬШАЯ ИСТОРИЯ\n\nЭто самостоятельная интерактивная копия семейной книги.\nРаспакуйте архив и откройте index.html в браузере.\nИнтернет и приложение Мамчкин & Папчкин для просмотра не требуются.\nФотографии, видео и аудиозаписи включены в HTML-файл книги.\n';
  const blob=zipStore([{name:'index.html',data:html},{name:'ПРОЧИТАЙТЕ.txt',data:readme}]);
  if(!blob.size)throw new Error('Не удалось создать ZIP-архив');
  return blob;
 }
};
})();