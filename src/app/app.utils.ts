const roundUpToHigherPoint = (number: number) => Math.ceil(number * 100) / 100;

const roundBy4Number = (number :number): string => {
  const roundedTo3 = number.toFixed(3);
  return (+roundedTo3).toFixed(2);
}

export const toValidNumber = (numericValue: any): string => {
  if (typeof numericValue === 'number') return roundBy4Number(numericValue);
  else if (parseFloat(numericValue)) {
    return roundBy4Number(parseFloat(numericValue));
  }
  return numericValue ?? '';
};
