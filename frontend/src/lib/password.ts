const hasLower = (p: string) => /[a-z]/.test(p);
const hasUpper = (p: string) => /[A-Z]/.test(p);
const hasDigit = (p: string) => /\d/.test(p);
const hasSymbol = (p: string) => /[^A-Za-z0-9]/.test(p);

export function meetsAllPasswordRequirements(pw: string, minLength = 8) {
  return (
    pw.length >= minLength &&
    hasLower(pw) &&
    hasUpper(pw) &&
    hasDigit(pw) &&
    hasSymbol(pw)
  );
}

export function checkPasswordParts(pw: string, minLength = 8) {
  return {
    length: pw.length >= minLength,
    lower: hasLower(pw),
    upper: hasUpper(pw),
    digit: hasDigit(pw),
    symbol: hasSymbol(pw)
  };
}
