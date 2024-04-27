import { Component, TemplateRef, inject, isDevMode } from '@angular/core';
import { Row } from 'read-excel-file';
import { BehaviorSubject, map } from 'rxjs';
import { RowInfo } from './row.model';
import { FormBuilder } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import * as Sentry from '@sentry/browser';
import { filetypeValidator } from './app.utils';
import { FilesUtil } from './files.util';

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

  showExcelContent(event: Event): void {
    const excelF = filetypeValidator(event, '.xlsx');
    if (!excelF) return;

    FilesUtil.parseExcelFile(excelF)
      .then((data) => {
        if (data.mappedRows) {
          this.tableHeader$.next(data.header);
          if (data.paymentCoef !== null && !isNaN(data.paymentCoef))
            this.paymentCoef$.next(data.paymentCoef);
          this.addRowControls(data.mappedRows);
          this.rowsInfo$.next(data.mappedRows);
          this.logError(
            `ExcelFile Uploaded ${data.mappedRows?.length} succesfully`
          );
        }
      })
      .catch((error) => {
        `ExcelFile Uploaded ${error.toString()} succesfully`;
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

  saveDocFile(event: Event): void {
    const docFile = filetypeValidator(event, '.docx');
    if (!docFile) return;
    this.modalService.dismissAll();

    const data = this.getSelectedData();
    FilesUtil.wordFileGenerator(docFile, data, this.logError);
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

  logError = (data: any) => {
    if (!isDevMode()) {
      Sentry.captureMessage(data?.toString());
    }
  };
}
