export const SERVICE_LABELS = {
  luggage: '🧳 Luggage',
  escort: '🚶 Seat Escort',
  language: '🗣️ Language Help',
  wheelchair: '♿ Wheelchair',
  snacks: '🍱 Snacks & Water',
  transport: '🛺 Exit Transport',
};

export const STATIONS = [
  { code: 'KZJ', name: 'Kazipet Jn', division: 'Secunderabad' },
  { code: 'WL', name: 'Warangal', division: 'Secunderabad' },
  { code: 'BZA', name: 'Vijayawada Jn', division: 'Vijayawada' },
  { code: 'SC', name: 'Secunderabad Jn', division: 'Secunderabad' },
];

export const activeServices = (services = {}) =>
  Object.entries(services)
    .filter(([, v]) => (typeof v === 'number' ? v > 0 : v))
    .map(([k, v]) => ({ key: k, label: SERVICE_LABELS[k] || k, value: typeof v === 'number' ? `${v} item(s)` : 'Yes' }));