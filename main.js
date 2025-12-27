// Simple page wiring for math.js, Plotly, Complex.js, and KaTeX
const exprInput = document.getElementById('expression-input');
const numericOutput = document.getElementById('numeric-output');
const katexOutput = document.getElementById('katex-output');
const plotEl = document.getElementById('plot');
const resetDemoBtn = document.getElementById('reset-demo');
const randomComplexBtn = document.getElementById('random-complex');
const complexAInput = document.getElementById('complex-a');
const complexBInput = document.getElementById('complex-b');
const complexSum = document.getElementById('complex-sum');
const complexProd = document.getElementById('complex-prod');
const complexMag = document.getElementById('complex-mag');

function renderExpression() {
  const expr = exprInput.value || '';
  try {
    const compiled = math.compile(expr);
    const value = compiled.evaluate({ t: 1, s: 1 });
    numericOutput.textContent = formatValue(value);
  } catch (err) {
    numericOutput.textContent = 'Invalid expression';
  }

  try {
    katex.render(expr, katexOutput, { throwOnError: false });
  } catch (err) {
    katexOutput.textContent = 'Cannot render expression.';
  }
}

function formatValue(value) {
  if (typeof value === 'number') return value.toFixed(4);
  if (math.typeOf(value) === 'Complex') {
    const { re, im } = value;
    return `${re.toFixed(3)} ${im >= 0 ? '+' : '-'} ${Math.abs(im).toFixed(3)}i`;
  }
  if (Array.isArray(value) || math.typeOf(value) === 'Matrix') {
    return math.format(value, { precision: 4 });
  }
  return String(value);
}

function drawDemo() {
  const t = math.range(0, 6.3, 0.05).toArray();
  const y1 = t.map((x) => Math.sin(x));
  const y2 = t.map((x) => Math.cos(2 * x));
  const ySum = t.map((_, i) => y1[i] + y2[i]);

  Plotly.newPlot(
    plotEl,
    [
      { x: t, y: ySum, mode: 'lines', name: 'sin(t)+cos(2t)', line: { color: '#34d399' } },
      { x: t, y: y1, mode: 'lines', name: 'sin(t)', line: { color: '#60a5fa', dash: 'dot' } },
      { x: t, y: y2, mode: 'lines', name: 'cos(2t)', line: { color: '#fbbf24', dash: 'dash' } }
    ],
    {
      margin: { l: 40, r: 10, t: 20, b: 40 },
      paper_bgcolor: '#0f172a',
      plot_bgcolor: '#0f172a',
      font: { color: '#e2e8f0' },
      xaxis: { gridcolor: '#1e293b' },
      yaxis: { gridcolor: '#1e293b' },
      legend: { orientation: 'h', x: 0, y: 1.15 }
    },
    { responsive: true }
  );
}

function updateComplex() {
  try {
    const z1 = Complex(complexAInput.value);
    const z2 = Complex(complexBInput.value);
    const sum = z1.add(z2);
    const prod = z1.mul(z2);

    complexSum.textContent = sum.toString();
    complexProd.textContent = prod.toString();
    complexMag.textContent = z1.abs().toFixed(3);
  } catch (err) {
    complexSum.textContent = 'Check inputs';
    complexProd.textContent = 'Check inputs';
    complexMag.textContent = '—';
  }
}

function randomizeComplex() {
  const rand = () => (Math.random() * 4 - 2).toFixed(2);
  complexAInput.value = `${rand()} + ${rand()}i`;
  complexBInput.value = `${rand()} + ${rand()}i`;
  updateComplex();
}

exprInput.addEventListener('input', renderExpression);
resetDemoBtn.addEventListener('click', () => {
  exprInput.value = 'sin(t) + cos(2*t)';
  renderExpression();
  drawDemo();
});
randomComplexBtn.addEventListener('click', randomizeComplex);
complexAInput.addEventListener('input', updateComplex);
complexBInput.addEventListener('input', updateComplex);

// Run once on load after dependencies are ready
window.addEventListener('DOMContentLoaded', () => {
  renderExpression();
  drawDemo();
  updateComplex();
  renderMathInElement(katexOutput, { delimiters: [{ left: '$', right: '$', display: false }] });
});
