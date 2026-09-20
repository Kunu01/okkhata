// A small arithmetic parser: no eval / Function, and no executable input.
// Addition/subtraction percentages are relative: 200 + 10% = 220.
export function calculateAmount(expression: string): number {
  if (!expression.trim() || expression.length > 200) throw new Error('Enter a calculation of up to 200 characters.');
  const source = expression.replaceAll('×', '*').replaceAll('÷', '/').replace(/\s/g, '');
  const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)|[+\-*/()%]/g);
  if (!tokens || tokens.join('') !== source) throw new Error('Use numbers and arithmetic operators only.');
  let pos = 0;
  type Value = { value: number; percent: boolean };
  const primary = (): Value => {
    const t = tokens[pos++]; let result: Value;
    if (t === '+' || t === '-') { result = primary(); result.value *= t === '-' ? -1 : 1; return result; }
    if (t === '(') { result = sum(); if (tokens[pos++] !== ')') throw new Error('Close the parentheses.'); result.percent = false; }
    else { if (!t || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(t)) throw new Error('Complete the calculation.'); result = { value: Number(t), percent: false }; }
    if (tokens[pos] === '%') { pos++; result.value /= 100; result.percent = true; }
    return result;
  };
  const product = (): Value => {
    let left = primary();
    while (tokens[pos] === '*' || tokens[pos] === '/') {
      const op = tokens[pos++], right = primary();
      if (op === '/' && right.value === 0) throw new Error('Cannot divide by zero.');
      left = { value: op === '*' ? left.value * right.value : left.value / right.value, percent: false };
    }
    return left;
  };
  const sum = (): Value => {
    let left = product();
    while (tokens[pos] === '+' || tokens[pos] === '-') {
      const op = tokens[pos++], right = product(), value = right.percent ? left.value * right.value : right.value;
      left = { value: left.value + (op === '+' ? value : -value), percent: false };
    }
    return left;
  };
  const value = sum().value;
  if (pos !== tokens.length) throw new Error('Check the operators and decimal points.');
  if (!Number.isFinite(value)) throw new Error('The result is too large.');
  const minor = Math.round((value + Number.EPSILON * Math.abs(value)) * 100);
  if (minor <= 0 || minor > 10_000_000_000) throw new Error('The amount must be between ₹0.01 and ₹10,00,00,000.');
  return minor / 100;
}
