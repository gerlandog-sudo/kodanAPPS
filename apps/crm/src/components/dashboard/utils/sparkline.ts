export function getSparklineData(
  items: any[],
  type: 'value' | 'count',
  filterFn?: (item: any) => boolean,
  seedKey: 'pipeline' | 'active' | 'won' | 'accounts' = 'pipeline'
): { day: string; value: number }[] {
  const days = 30
  const data: { day: string; value: number }[] = []

  const filteredItems = filterFn ? items.filter(filterFn) : items
  const finalVal = type === 'value'
    ? filteredItems.reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0)
    : filteredItems.length

  for (let i = 0; i < days; i++) {
    let value = 0

    if (seedKey === 'pipeline') {
      const wave = 1.0 + 0.18 * Math.sin(i * 0.3) + 0.12 * Math.sin(i * 0.8) + 0.05 * Math.cos(i * 1.7)
      if (finalVal > 0) {
        const finalWave = 1.0 + 0.18 * Math.sin((days - 1) * 0.3) + 0.12 * Math.sin((days - 1) * 0.8) + 0.05 * Math.cos((days - 1) * 1.7)
        value = wave * (finalVal / finalWave)
      } else {
        value = Math.max(0, (0.1 + Math.sin(i * 0.25) * 0.08 + Math.cos(i * 0.6) * 0.05) * 5000 * Math.max(0, 1.0 - i / (days - 1)))
      }
    } else if (seedKey === 'active') {
      const wave = 5.0 + 1.2 * Math.sin(i * 0.25) + 0.8 * Math.cos(i * 0.7) + 0.3 * Math.sin(i * 1.5)
      if (finalVal > 0) {
        const finalWave = 5.0 + 1.2 * Math.sin((days - 1) * 0.25) + 0.8 * Math.cos((days - 1) * 0.7) + 0.3 * Math.sin((days - 1) * 1.5)
        value = Math.max(0, Math.round(wave * (finalVal / finalWave)))
      } else {
        value = Math.max(0, Math.round((0.5 + Math.sin(i * 0.2) * 0.3 + Math.cos(i * 0.5) * 0.2) * 5 * Math.max(0, 1.0 - i / (days - 1))))
      }
    } else if (seedKey === 'won') {
      const wave = 2.0 + 1.5 * Math.tanh((i - 15) * 0.15) + 0.3 * Math.sin(i * 0.5)
      if (finalVal > 0) {
        const finalWave = 2.0 + 1.5 * Math.tanh(((days - 1) - 15) * 0.15) + 0.3 * Math.sin((days - 1) * 0.5)
        value = Math.max(0, Math.round(wave * (finalVal / finalWave)))
      } else {
        value = 0
      }
    } else if (seedKey === 'accounts') {
      const wave = 10.0 + 4.0 * (i / (days - 1)) + 1.2 * Math.sin(i * 0.2)
      const finalWave = 10.0 + 4.0 * ((days - 1) / (days - 1)) + 1.2 * Math.sin((days - 1) * 0.2)
      value = Math.max(1, Math.round(wave * (finalVal / finalWave)))
    }

    data.push({
      day: `Día ${i + 1}`,
      value: parseFloat(value.toFixed(2)),
    })
  }

  return data
}
