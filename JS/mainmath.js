import { inverseLaplace } from './inverseLaplace.js';

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
const inverseExprInput = document.getElementById('inverse-expr');
const sigmaInput = document.getElementById('sigma');
const wMaxInput = document.getElementById('w-max');
const samplesInput = document.getElementById('samples');
const inversePlotEl = document.getElementById('inverse-plot');
const inverseSPlotEl = document.getElementById('inverse-s-plot');
const inverseStatus = document.getElementById('inverse-status');
const inverseRunBtn = document.getElementById('inverse-run');
const inverseTexEl = document.getElementById('inverse-tex');

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

function buildTransferFunction(expr) {
  const compiled = math.compile(expr);
  return (s) => {
    const result = compiled.evaluate({ s });
    return math.typeOf(result) === 'Complex' ? result : math.complex(result);
  };
}

function renderGTex(expr) {
  try {
    const parsed = math.parse(expr);
    const tex = parsed.toTex({ parenthesis: 'auto' });
    katex.render(tex, inverseTexEl, { throwOnError: false });
  } catch (err) {
    inverseTexEl.textContent = 'Cannot render G(s).';
  }
}

function polyFromNode(node) {
  const add = (a, b) => {
    const len = Math.max(a.length, b.length);
    const out = new Array(len).fill(0);
    for (let i = 0; i < len; i++) {
      out[i] = (a[i] || 0) + (b[i] || 0);
    }
    return out;
  };

  const scale = (a, k) => a.map((v) => v * k);

  const multiply = (a, b) => {
    const out = new Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        out[i + j] += a[i] * b[j];
      }
    }
    return out;
  };

  if (node.type === 'ParenthesisNode') return polyFromNode(node.content);
  if (node.type === 'ConstantNode') return [Number(node.value)];
  if (node.type === 'SymbolNode') {
    if (node.name !== 's') throw new Error('Unsupported symbol');
    return [0, 1];
  }
  if (node.type === 'OperatorNode') {
    if (node.isUnary()) {
      if (node.op === '-') return scale(polyFromNode(node.args[0]), -1);
    }
    if (node.op === '+') return add(polyFromNode(node.args[0]), polyFromNode(node.args[1]));
    if (node.op === '-') return add(polyFromNode(node.args[0]), scale(polyFromNode(node.args[1]), -1));
    if (node.op === '*') return multiply(polyFromNode(node.args[0]), polyFromNode(node.args[1]));
    if (node.op === '^') {
      const base = node.args[0];
      const expNode = node.args[1];
      if (base.type === 'SymbolNode' && base.name === 's' && expNode.type === 'ConstantNode') {
        const n = Number(expNode.value);
        if (!Number.isInteger(n) || n < 0 || n > 12) throw new Error('Power too high');
        const out = new Array(n + 1).fill(0);
        out[n] = 1;
        return out;
      }
    }
  }
  throw new Error('Unsupported expression for polynomial extraction');
}

function trimLeadingZeros(arr) {
  let i = arr.length - 1;
  while (i > 0 && Math.abs(arr[i]) < 1e-12) i--;
  return arr.slice(0, i + 1);
}

function computePolesZeros(expr) {
  const detailed = math.rationalize(expr, { s: 1 }, true);
  const numPoly = trimLeadingZeros(polyFromNode(detailed.numerator));
  const denPoly = trimLeadingZeros(polyFromNode(detailed.denominator));

  // math.roots expects highest-first coefficients
  const numCoeffs = [...numPoly].reverse();
  const denCoeffs = [...denPoly].reverse();

  const zeros = numCoeffs.length > 1 ? math.roots(numCoeffs) : [];
  const poles = denCoeffs.length > 1 ? math.roots(denCoeffs) : [];

  const toPoints = (roots) => roots.map((r) => {
    if (typeof r === 'number') return { re: r, im: 0 };
    if (r.re !== undefined && r.im !== undefined) return { re: r.re, im: r.im };
    return { re: 0, im: 0 };
  });

  return { zeros: toPoints(zeros), poles: toPoints(poles) };
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

function computeInverseLaplace() {
  const expr = inverseExprInput.value.trim();
  if (!expr) {
    inverseStatus.textContent = 'Enter a transfer function in s.';
    return;
  }

  const sigma = Number(sigmaInput.value) || 1;
  const wMax = Number(wMaxInput.value) || 40;
  const samples = Number(samplesInput.value) || 800;

  try {
    renderGTex(expr);
    const G = buildTransferFunction(expr);
    const tValues = math.range(0, 10, 0.05).toArray();
    const yValues = tValues.map((t) => inverseLaplace(G, t, { sigma, wMax, N: samples }));

    let zeros = [];
    let poles = [];
    try {
      const pz = computePolesZeros(expr);
      zeros = pz.zeros;
      poles = pz.poles;
    } catch (pzErr) {
      // If parsing fails, skip plotting poles/zeros
    }

    Plotly.newPlot(
      inversePlotEl,
      [
        {
          x: tValues,
          y: yValues,
          mode: 'lines',
          name: 'f(t)',
          line: { color: '#34d399' }
        }
      ],
      {
        margin: { l: 50, r: 10, t: 20, b: 40 },
        paper_bgcolor: '#0f172a',
        plot_bgcolor: '#0f172a',
        font: { color: '#e2e8f0' },
        xaxis: { title: 't', gridcolor: '#1e293b' },
        yaxis: { title: 'f(t)', gridcolor: '#1e293b' }
      },
      { responsive: true }
    );

    if (inverseSPlotEl) {
      Plotly.newPlot(
        inverseSPlotEl,
        [
          {
            x: zeros.map((z) => z.re),
            y: zeros.map((z) => z.im),
            mode: 'markers',
            name: 'zeros',
            marker: { color: '#60a5fa', symbol: 'circle-open', size: 10, line: { width: 2 } }
          },
          {
            x: poles.map((p) => p.re),
            y: poles.map((p) => p.im),
            mode: 'markers',
            name: 'poles',
            marker: { color: '#f87171', symbol: 'x', size: 10, line: { width: 2 } }
          }
        ],
        {
          margin: { l: 50, r: 10, t: 20, b: 40 },
          paper_bgcolor: '#0f172a',
          plot_bgcolor: '#0f172a',
          font: { color: '#e2e8f0' },
          xaxis: { title: 'Re(s)', zeroline: true, zerolinecolor: '#334155', gridcolor: '#1e293b' },
          yaxis: { title: 'Im(s)', zeroline: true, zerolinecolor: '#334155', gridcolor: '#1e293b' },
          showlegend: true
        },
        { responsive: true }
      );
    }

    inverseStatus.textContent = `Computed ${yValues.length} samples (sigma=${sigma}, wMax=${wMax}, N=${samples}).`;
  } catch (err) {
    inverseStatus.textContent = 'Could not compute inverse Laplace. Check the expression and parameters.';
  }
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
inverseRunBtn.addEventListener('click', computeInverseLaplace);

// Run once on load after dependencies are ready
window.addEventListener('DOMContentLoaded', () => {
  renderExpression();
  drawDemo();
  updateComplex();
  renderMathInElement(katexOutput, { delimiters: [{ left: '$', right: '$', display: false }] });
  computeInverseLaplace();
});
