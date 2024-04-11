import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import * as docxtemplater from 'docxtemplater';
import * as FileSaver from 'file-saver';
import * as PizZip from 'pizzip';
import readXlsxFile from 'read-excel-file';
import { BehaviorSubject, map } from 'rxjs';
import { RowInfo } from './row.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'excel-parser';

  rowsInfo$ = new BehaviorSubject<RowInfo[]>([]);

  rowsInfoKeys$ = this.rowsInfo$.pipe(
    map((data) => {
      if (data[0]) {
        return Object.keys(data[0]);
      }
      return [];
    })
  );

  constructor(private htttpService: HttpClient) {}

  print() {
    const exl = document.getElementById('excel') as HTMLInputElement;

    const excelF = exl.files?.item(0);

    if (!excelF) {
      alert('No files selected');
      return;
    }
    readXlsxFile(excelF).then((rows) => {
      const headerIndex = rows.findIndex(
        (row) => row[1] && row[2] && row[3] && row[5]
      );
      const membersList = rows.filter(
        (row) => row[1] && row[2] && row[3] && row[5]
      ) as string[][];
      const mappedRows = membersList.map(
        ([
          ,
          rowNumber,
          street,
          houseNumber,
          areaNumber,
          fullName,
          space,
          comment,
          debt,
          debtCurrentYear,
          vaste,
          measurementWays,
          measurementOutside,
          waysOwnPayment,
          payed,
          payDate,
          document,
          leftAmount,
        ]) => ({
          rowNumber,
          street,
          houseNumber,
          areaNumber,
          fullName,
          space,
          comment,
          debt,
          debtCurrentYear,
          vaste,
          measurementWays,
          measurementOutside,
          waysOwnPayment,
          payed,
          payDate,
          document,
          leftAmount,
        })
      );

      console.log('[ excelRows ]', mappedRows, '[ unmapped ]', membersList);

      const templateData = rows
        .filter((row) => row[0])
        .map(([first_name, last_name, phone, description]) => {
          return { first_name, last_name, phone, description };
        });
      // this.printDoc(templateData);
    });
  }

  printDoc(data: any[]): void {
    const docs = document.getElementById('doc') as HTMLInputElement;
    const reader = new FileReader();
    const fileD = docs.files?.item(0);
    if (!fileD) {
      alert('No files selected');
      return;
    }
    reader.readAsBinaryString(fileD);

    reader.onerror = function (evt) {
      console.log('error reading file', evt);
      alert('error reading file' + evt);
    };
    reader.onload = function (evt) {
      console.log('[ loadedFile ]', evt.target?.result);
      const content = evt.target?.result as any;
      const zip = new PizZip(content);
      const doc = new docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      doc.setData({
        raw_loop_pagebreak: `<w:br w:type="page"/>`,
        dataLoop: [
          ...data,
          // {
          //   first_name: 'Alytus',
          //   last_name: 'Doe',
          //   phone: '0652455478',
          //   description: 'New aaa',
          // },
          // {
          //   first_name: 'Klaipeda',
          //   last_name: 'Jonas',
          //   phone: '222',
          //   description: 'New kalll',
          //   raw_loop_pagebreak: '',
          // },
        ],
      });

      doc.render();

      const blob = doc.getZip().generate({
        type: 'blob',
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE',
      });

      FileSaver.saveAs(blob, 'output.docx');
    };
  }
}
