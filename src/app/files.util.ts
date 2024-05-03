import { toValidNumber } from './app.utils';
import readXlsxFile, { Row } from 'read-excel-file';
import { RowInfo } from './row.model';
import * as PizZip from 'pizzip';
import * as docxtemplater from 'docxtemplater';
import * as FileSaver from 'file-saver';

export const mapToCollumns = (rows: Row[]): RowInfo[] => {
  // TODO mapp to generic columns like col0, col1
  return rows.map((columns) => {
    const [
      // empty,
      rowNumber,
      street,
      houseNumber,
      areaNumber,
      fullName,
      space,
      comment,
      // debt,
      // debtCurrentYear,
      // vasteWinter,
      // measurementWays,
      // measurementOutside,
      // waysOwnPayment,
      // payed,
      // payDate,
      // document,
      // leftAmount,
      ...rest
    ] = columns;

    const firstRestIndex = columns.length - rest?.length;
    const restColumns = rest?.length
      ? rest.reduce<{ [index: string]: any }>((acc, value, index) => {
          const cellValue = toValidNumber(value);
          return { ...acc, ['col' + (firstRestIndex + index)]: cellValue };
        }, {})
      : {};

    // const memberPayment = this.paymentCoef$.value * +space;
    // const memberPayment = debtCurrentYear;
    const mappedCol = {
      rowNumber: rowNumber ?? '',
      street: street ?? '',
      houseNumber: houseNumber ?? '',
      areaNumber: areaNumber ?? '',
      fullName,
      space: space ?? '',
      comment: comment ?? '',
      // debt: toValidNumber(debt) ?? '',
      // memberPayment: toValidNumber(debtCurrentYear),
      // // debtCurrentYear,
      // vasteWinter: toValidNumber(vasteWinter),
      // measurementWays: toValidNumber(measurementWays),
      // measurementOutside: toValidNumber(measurementOutside),
      // waysOwnPayment: toValidNumber(waysOwnPayment),
      // payed: toValidNumber(payed),
      // payDate: payDate ?? '',
      // document: document ?? '',
      // leftAmount: toValidNumber(leftAmount),
      ...restColumns,
    } as RowInfo;

    return mappedCol;
  });
};

export class FilesUtil {
  static parseExcelFile(excelFile: File): Promise<{
    header: Row | null;
    mappedRows: RowInfo[];
    paymentCoef: number | null;
  }> {
    return readXlsxFile(excelFile)
      .then((rows) => {
        const headerIndex = rows.findIndex((row) => {
          if (row.length >= 5) {
            return row.filter((item) => item).length > 4;
          } else {
            return false;
          }
        });
        const header = rows[headerIndex];

        const paymentCoef = rows[4][14] as number;

        const notEmptyRows = rows.filter(
          (row) => row[1] && row[2] && row[3] && row[5]
        ) as string[][];

        // NOTE remove first item since first column is empty
        const mappedRows = mapToCollumns(
          notEmptyRows.map((arr) => arr.slice(1))
        );

        return { header, mappedRows, paymentCoef };
      })
      .catch((err) => {
        return { header: null, mappedRows: [], paymentCoef: null };
      });
  }

  static wordFileGenerator(
    wordFile: File,
    data: RowInfo[],
    log?: (dt: any) => void,
    cb?: (blob: Blob) => void
  ): void {
    if (!wordFile) return;
    const reader = new FileReader();

    reader.readAsArrayBuffer(wordFile);

    reader.onerror = function (evt) {
      console.error('error reading file', evt);
      if (log) log(evt.toString());
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

      if (!cb) FileSaver.saveAs(blob, 'saskaitos.docx');
      if (log) log(`word downloaded succesfully`);
      if (cb) {
        cb(blob);
      }
    };
  }
}
