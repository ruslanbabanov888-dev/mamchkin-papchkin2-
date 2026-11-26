import { registerPlugin } from '@capacitor/core';
const NativePrinter = registerPlugin('Printer', {
  web: () => ({ async printHtml({ html }) {
    const frame=document.createElement('iframe');frame.style.cssText='position:fixed;width:0;height:0;border:0';document.body.appendChild(frame);
    frame.contentDocument.open();frame.contentDocument.write(html);frame.contentDocument.close();
    await new Promise(resolve=>setTimeout(resolve,500));frame.contentWindow.focus();frame.contentWindow.print();setTimeout(()=>frame.remove(),60000);
  }})
});
window.MPPrinter={printHtml(html,name='Семейная книга'){return NativePrinter.printHtml({html,name})}};
