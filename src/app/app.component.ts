import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import * as docxtemplater from 'docxtemplater';
import * as FileSaver from 'file-saver';
import * as PizZip from 'pizzip';
import readXlsxFile from 'read-excel-file';
import { BehaviorSubject, map } from 'rxjs';
import { RowInfo } from './row.model';
import { FormBuilder } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'excel-parser';

  rowsInfo$ = new BehaviorSubject<RowInfo[]>([]);

  paymentCoef$ = new BehaviorSubject<number>(0.13);

  rowsInfoKeys$ = this.rowsInfo$.pipe(
    map((data) => {
      if (data[0]) {
        return Object.keys(data[0]);
      }
      return [];
    })
  );

  form = this.fb.group({
    rows: this.fb.array<boolean>([]),
  });

  rowsData$ = this.rowsInfo$.pipe(
    map((data) => {
      return data.map((row) => Object.values(row));
    })
  );

  constructor(private htttpService: HttpClient, private fb: FormBuilder) {}

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

      const paymentCoef = rows[4][14] as number;

      if (!isNaN(paymentCoef)) this.paymentCoef$.next(paymentCoef);

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
          vasteWinter,
          measurementWays,
          measurementOutside,
          waysOwnPayment,
          payed,
          payDate,
          document,
          leftAmount,
        ]) => {
          const memberPayment = this.paymentCoef$.value * +space;
          return {
            rowNumber,
            street,
            houseNumber,
            areaNumber,
            fullName,
            space,
            memberPayment,
            comment: comment ?? '',
            debt: debt ?? '',
            debtCurrentYear,
            vasteWinter: vasteWinter ?? '',
            measurementWays,
            measurementOutside,
            waysOwnPayment,
            payed,
            payDate,
            document,
            leftAmount,
          };
        }
      );
      this.addRowControls(mappedRows);
      this.rowsInfo$.next(mappedRows);
      console.log(
        '[ excelRows ]',
        mappedRows,
        '[ unmapped ]',
        membersList,
        '[kof]',
        paymentCoef
      );

      const templateData = rows
        .filter((row) => row[0])
        .map(([first_name, last_name, phone, description]) => {
          return { first_name, last_name, phone, description };
        });
      // this.printDoc(templateData);
    });
  }

  addRowControls(rows: RowInfo[]): void {
    rows.forEach((row, index) => {
      this.form.controls.rows.push(this.fb.control(false));
    });
  }

  generateDocs(): void {
    const docs = document.getElementById('doc') as HTMLInputElement;
    const reader = new FileReader();
    const fileD = docs.files?.item(0);
    if (!fileD) {
      alert('No files selected');
      return;
    }
    const checkboxes = this.form.controls.rows.value;
    const selecedIndexes = checkboxes.reduce<number[]>(
      (indexes, value, index) => {
        if (value) {
          indexes.push(index);
        }
        return indexes;
      },
      []
    );

    if (selecedIndexes.length) {
      const selectedData = this.rowsInfo$.value.filter((value, index) => {
        return selecedIndexes.includes(index);
      });
      this.printDoc(selectedData);
    } else {
      this.printDoc(this.rowsInfo$.value);
    }
    console.log('[ selectedRows ]', checkboxes);
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
