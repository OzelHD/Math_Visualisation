// Numeric inverse Laplace using a simple Bromwich integral rectangle rule
export function inverseLaplace(G, t, options = {}) {
  const sigma = options.sigma ?? 1;
  const wMax = options.wMax ?? 50;
  const N = options.N ?? 2000;

  const dw = wMax / N;
  let sum = 0;

  for (let k = 0; k < N; k++) {
    const w = k * dw;
    const s = math.complex(sigma, w);
    const F = G(s);

    // Ensure we are working with a math.js Complex instance
    const Fc = math.typeOf(F) === 'Complex' ? F : math.complex(F);
    const real = Fc.re * Math.cos(w * t);
    const imag = Fc.im * Math.sin(w * t);

    sum += real - imag;
  }

  return (Math.exp(sigma * t) / Math.PI) * sum * dw;
}
