export function quelleLabel(q: string): string {
  switch (q) {
    case 'eigene': return 'Eigene'
    case 'vorinstalliert': return 'Vorinstalliert'
    case 'stamm-import': return 'Stamm-Import'
    case 'temporaer': return 'Temporär'
    default: return q
  }
}
