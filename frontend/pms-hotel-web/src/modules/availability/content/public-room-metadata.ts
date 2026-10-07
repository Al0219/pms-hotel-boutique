/** Editorial presentation only. Exact codes; no UUID, capacity, pricing or policies. */
interface RoomPresentation {
  images: string[];
  description: string;
  category?: 'DELUXE' | 'SUITE' | 'SUPERIOR';
}

const photos = (name: string) => [1, 2, 3].map(n => `/images/rooms/demo/${name}${n === 1 ? '' : `-${n}`}.webp`);

// Exact code associations are presentation only; never identity, ATS or pricing.
const licensed = (ids: number[]) => ids.map(id => `/images/rooms/local-demo/pexels-${id}.jpg`);
const metadata: Readonly<Record<string, RoomPresentation>> = {
  STD: { images: licensed([7061675, 6186819, 30075355]), description: 'Un espacio acogedor para descansar durante tu estancia.' },
  CLASSIC: { images: licensed([30075355, 7061675, 6186819]), description: 'Una estancia tranquila con una presentación clásica.' },
  TWIN: { images: licensed([23916838, 20666872, 29000012]), description: 'Una opción cómoda para disfrutar de tu visita.' },
  KING: { images: licensed([5883725, 5883728, 17948132]), description: 'Un ambiente luminoso para una estancia relajada.' },
  DLX: { images: licensed([17948132, 18285947, 7061675]), description: 'Detalles cálidos para acompañar tu descanso.', category: 'DELUXE' },
  SUITE: { images: licensed([18285947, 17948132, 5883728]), description: 'Una alternativa para disfrutar de tu próxima estancia.', category: 'SUITE' },
  'DLX-KNG': { images: photos('deluxe-king'), description: 'Un espacio luminoso y tranquilo, con detalles cálidos y vistas al jardín.', category: 'DELUXE' },
  'STE-TER': { images: photos('terrace-suite'), description: 'Una suite amplia para disfrutar de la calma y de tu propia terraza.', category: 'SUITE' },
  'SUP-DBL': { images: photos('double-superior'), description: 'Comodidad compartida en una habitación serena, práctica y acogedora.', category: 'SUPERIOR' },
  'STE-JNR': { images: photos('junior-suite'), description: 'Más espacio para una estancia en familia, con una cómoda zona de descanso.', category: 'SUITE' },
};

export function roomPresentationFor(code: string): RoomPresentation | undefined {
  return Object.hasOwn(metadata, code) ? metadata[code] : undefined;
}
