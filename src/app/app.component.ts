import {
  Component,
  ElementRef,
  TemplateRef,
  ViewChild,
  inject,
  isDevMode,
} from '@angular/core';
import { Row } from 'read-excel-file';
import { BehaviorSubject, map } from 'rxjs';
import { RowInfo } from './row.model';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import * as Sentry from '@sentry/browser';
import { filetypeValidator } from './app.utils';
import { FilesUtil, mapToCollumns } from './files.util';
import { Table } from 'primeng/table';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'excel-parser';
  private modalService = inject(NgbModal);
  closeResult = '';
  selectedRows: Row[] = [];
  rowsInfo$ = new BehaviorSubject<RowInfo[]>([]);
  paymentCoef$ = new BehaviorSubject<number>(0.13);
  tableHeader$ = new BehaviorSubject<Row | null>(null);

  @ViewChild('templateFile', { static: false })
  templateFileInput!: ElementRef<HTMLInputElement>;

  rowsInfoKeys$ = this.rowsInfo$.pipe(
    map((data) => {
      if (data[0]) {
        return Object.keys(data[0]);
      }
      return [];
    })
  );

  rowsData$ = this.rowsInfo$.pipe(
    map((data) => {
      return data.map((row) => Object.values(row));
    })
  );

  showExcelContent(event: Event): void {
    const excelF = filetypeValidator(event, '.xlsx');
    if (!excelF) return;

    FilesUtil.parseExcelFile(excelF)
      .then((data) => {
        if (data.mappedRows) {
          this.tableHeader$.next(data.header);
          if (data.paymentCoef !== null && !isNaN(data.paymentCoef))
            this.paymentCoef$.next(data.paymentCoef);
          this.rowsInfo$.next(data.mappedRows);
          this.logError(
            `ExcelFile Uploaded ${data.mappedRows?.length} succesfully`
          );
        }
      })
      .catch((error) => {
        this.logError(`ExcelFile Uploaded ${error.toString()} succesfully`);
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

  generateDraft(): void {
    const templateFile: HTMLInputElement = this.templateFileInput.nativeElement;
    const selectedFile: File | null = templateFile.files
      ? templateFile.files[0]
      : null;

    if (selectedFile) {
      // @ts-ignore
      if (!window?.isAuthorisedGapi()) return;
      const data = this.getSelectedData();
      data.forEach((data) => {
        FilesUtil.wordFileGenerator(
          selectedFile,
          [data],
          this.logError,
          (blob: Blob) => {
            const df = new File([blob], `sklypo-${data.areaNumber}-sask.docx`);
            // @ts-ignore
            window?.sendDraft(df, data.fullName);
          }
        );
      });
    }
  }

  getSelectedData = (): RowInfo[] =>
    this.selectedRows.length
      ? mapToCollumns(this.selectedRows)
      : this.rowsInfo$.value;

  logError = (data: any) => {
    if (!isDevMode()) {
      Sentry.captureMessage(data?.toString());
    }
  };

  clear(table: Table): void {
    table.clear();
  }

  filterGlobal(event: Event, table: Table): void {
    table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }
}
