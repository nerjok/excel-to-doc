import { Component, TemplateRef, inject } from '@angular/core';
import * as docxtemplater from 'docxtemplater';
import * as FileSaver from 'file-saver';
import * as PizZip from 'pizzip';
import readXlsxFile, { Row } from 'read-excel-file';
import { BehaviorSubject, map } from 'rxjs';
import { RowInfo } from './row.model';
import { FormBuilder } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import * as Sentry from '@sentry/browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'excel-parser';
  private modalService = inject(NgbModal);
  closeResult = '';

  rowsInfo$ = new BehaviorSubject<RowInfo[]>([]);
  paymentCoef$ = new BehaviorSubject<number>(0.13);
  tableHeader$ = new BehaviorSubject<Row | null>(null);
  // tableHeader$: = combineLatest([this.rowsInfo$, this.headerIndex$]).pipe(
  //   map(([rows, index]) => {
  //     return rows[index];
  //   })
  // );

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

  constructor(private fb: FormBuilder) {}

  print(event?: Event) {
    if (!event) return;
    const input = event.target as HTMLInputElement;
    const excelF = input.files?.item(0);

    if (!excelF) {
      // TODO add file extension check
      alert('No files selected');
      return;
    }

    readXlsxFile(excelF)
      .then((rows) => {
        const headerIndex = rows.findIndex(
          (row) => {
            if (row.length >= 5) {
              return row.filter(item => item).length > 4;
            } else {
              return false;
            }
          }
        );

        this.tableHeader$.next(rows[headerIndex]);


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
            // TODO no calculation on app
            // const memberPayment = this.paymentCoef$.value * +space;
            const memberPayment = debtCurrentYear;
            return {
              rowNumber,
              street,
              houseNumber,
              areaNumber,
              fullName,
              space,
              comment: comment ?? '',
              debt: debt ?? '',
              memberPayment: debtCurrentYear,
              // debtCurrentYear,
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
        Sentry.captureMessage(`ExcelFile Uploaded ${mappedRows?.length} succesfully`);
      })
      .catch((err) => {
        console.log('[ failed to loadExcel file]', err);
      });
  }

  private addRowControls(rows: RowInfo[]): void {
    rows.forEach((row, index) => {
      this.form.controls.rows.push(this.fb.control(false));
    });
  }

  open(content: TemplateRef<any>) {
    this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title' });
  }

  saveDocFile(event?: Event): void {
    if (!event) return;
    const input = event.target as HTMLInputElement;
    const docFile = input.files?.item(0);

    if (!docFile) return;
    this.modalService.dismissAll();

    const reader = new FileReader();
    if (!docFile) {
      return;
    }
    const data = this.getSelectedData();
    // reader.readAsBinaryString(docFile);
    reader.readAsArrayBuffer(docFile);

    reader.onerror = function (evt) {
      console.error('error reading file', evt);
    };
    reader.onload = function (evt) {
      const content = evt.target?.result as any;
      const zip = new PizZip(content);
      const doc = new docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      doc.setData({
        raw_loop_pagebreak: `<w:br w:type="page"/>`,
        dataLoop: [...data],
      });

      doc.render();

      const blob = doc.getZip().generate({
        type: 'blob',
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE',
      });

      FileSaver.saveAs(blob, 'saskaitos.docx');
      Sentry.captureMessage(`word downloaded succesfully`);
    };
  }

  getSelectedData = (): RowInfo[] => {
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
      return selectedData;
    } else {
      return this.rowsInfo$.value;
    }
  };
}
