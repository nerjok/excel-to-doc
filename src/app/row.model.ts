export interface RowInfo {
  rowNumber: string;
  street: string;
  houseNumber: string;
  areaNumber: string;
  fullName: string;
  space: string;
  comment: string;
  debt: string;
  debtCurrentYear?: string;
  vasteWinter: string;
  measurementWays: string;
  measurementOutside: string;
  waysOwnPayment: string;
  payed: string;
  payDate: string;
  document: string;
  leftAmount: string;
  memberPayment: string | number;
  [index: string]: any;
}