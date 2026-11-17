// Helpers for products sold loose by weight (price is per 1 kg, quantity is in kg)
export const r3 = (n) => Math.round(n * 1000) / 1000

// Line price. Loose items are rounded UP to the next whole rupee.
export const lineTotal = (p, qty) => (p.loose ? Math.ceil(p.price * qty - 1e-9) : p.price * qty)

export const weightLabel = (kg) => (kg < 1 ? `${Math.round(kg * 1000)} g` : `${r3(kg)} kg`)

export const lineText = (l, name) => (l.loose ? `${name} (${weightLabel(l.qty)})` : `${l.qty} × ${name}`)

export const QL = {
  en: { custom: 'Custom', grams: 'grams', min: 'min 50 g', inCart: 'In cart', add: 'Add', perKg: '/ kg' },
  hi: { custom: 'अपना वज़न', grams: 'ग्राम', min: 'कम से कम 50 ग्राम', inCart: 'कार्ट में', add: 'जोड़ें', perKg: '/ किलो' },
  mr: { custom: 'स्वतःचे वजन', grams: 'ग्रॅम', min: 'किमान 50 ग्रॅम', inCart: 'कार्टमध्ये', add: 'जोडा', perKg: '/ किलो' },
}
