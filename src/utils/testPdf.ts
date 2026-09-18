import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';

export const testHtmlToPdf = async () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const element = document.createElement('div');
    element.innerHTML = `<h1 style="color: red; font-family: serif; font-size: 36px; text-align: center; width: 595px; padding: 20px;">میاں خان ٹریڈرز</h1>`;
    document.body.appendChild(element);
    
    try {
        const canvas = await html2canvas(element);
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 0, 0, 595, canvas.height * (595 / canvas.width));
        
        const arrayBuffer = doc.output('arraybuffer');
        await writeFile('C:/Users/User/Desktop/test_urdu.pdf', new Uint8Array(arrayBuffer));
        console.log('Saved PDF');
    } catch (e) {
        console.error(e);
    } finally {
        document.body.removeChild(element);
    }
}
