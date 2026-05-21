/**
 * Andachtsreihe section in WizardStep3Ziele. Four modes: none / reihe (pick
 * from repertoire) / sammlung (pick + activate subset) / new (build inline).
 */
import { useState } from 'react'
import { Input, Select } from '@/ui/primitives'
import type { Andachtsreihe } from '@/domain/types'
import { newId, type AndachtsEinheitId, type AndachtsreiheId } from '@/domain/ids'
import { type AndachtMode } from './newPlanungWizardUtils'
import styles from './NewPlanungWizard.module.css'

const MODI: { key: AndachtMode; label: string }[] = [
  { key: 'none', label: 'Keine' },
  { key: 'reihe', label: 'Reihe wählen' },
  { key: 'sammlung', label: 'Aus Sammlung' },
  { key: 'new', label: 'Neu anlegen' },
]

export type WizardStep3AndachtSectionProps = {
  andachtMode: AndachtMode
  setAndachtMode: (m: AndachtMode) => void
  andachtReiheId: AndachtsreiheId | null
  setAndachtReiheId: (id: AndachtsreiheId | null) => void
  andachtAusgewaehlt: Set<AndachtsEinheitId>
  setAndachtAusgewaehlt: (s: Set<AndachtsEinheitId>) => void
  andachtTitel: string
  setAndachtTitel: (t: string) => void
  andachtEinheiten: { id: AndachtsEinheitId; titel: string }[]
  setAndachtEinheiten: (e: { id: AndachtsEinheitId; titel: string }[]) => void
  availableReihen: readonly Andachtsreihe[]
  availableSammlungen: readonly Andachtsreihe[]
  selectedSammlung: Andachtsreihe | null
  teamAndachtsBedarf: number
  stammandachtenCount: number
  activeMeetingCount: number
  error: string | null
}

function ReihenPicker({
  availableReihen, selected, onSelect,
}: { availableReihen: readonly Andachtsreihe[]; selected: AndachtsreiheId | null; onSelect: (id: AndachtsreiheId) => void }) {
  if (availableReihen.length === 0) {
    return (
      <p className={styles.andachtHint}>
        Keine Andachtsreihen im Repertoire. Lege eine im Repertoire-Tab an oder wähle „Neu anlegen".
      </p>
    )
  }
  return (
    <div className={styles.andachtRepertoireList}>
      {availableReihen.map((r) => (
        <button key={r.id} type="button"
          className={`${styles.andachtRepertoireItem} ${selected === r.id ? styles.andachtRepertoireItemSelected : ''}`}
          onClick={() => onSelect(r.id)}>
          <div className={styles.andachtRepertoireName}>{r.name}</div>
          <div className={styles.andachtRepertoireMeta}>
            {r.einheiten.length} Einheit{r.einheiten.length !== 1 ? 'en' : ''}
            {r.buchquelle?.titel && ` · ${r.buchquelle.titel}`}
          </div>
        </button>
      ))}
    </div>
  )
}

type SammlungPickerProps = Pick<
  WizardStep3AndachtSectionProps,
  | 'availableSammlungen' | 'andachtReiheId' | 'setAndachtReiheId'
  | 'andachtAusgewaehlt' | 'setAndachtAusgewaehlt'
  | 'selectedSammlung' | 'teamAndachtsBedarf' | 'stammandachtenCount'
>

function SammlungPicker({
  availableSammlungen, andachtReiheId, setAndachtReiheId,
  andachtAusgewaehlt, setAndachtAusgewaehlt,
  selectedSammlung, teamAndachtsBedarf, stammandachtenCount,
}: SammlungPickerProps) {
  if (availableSammlungen.length === 0) {
    return <p className={styles.andachtHint}>Keine Sammlungen im Repertoire.</p>
  }
  function toggle(id: AndachtsEinheitId) {
    const next = new Set(andachtAusgewaehlt)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setAndachtAusgewaehlt(next)
  }
  const options = [
    { value: '' as const, label: '— wählen —' },
    ...availableSammlungen.map((s) => ({
      value: s.id,
      label: s.buchquelle?.titel ? `${s.name} (${s.buchquelle.titel})` : s.name,
    })),
  ]
  return (
    <>
      <Select<AndachtsreiheId | ''>
        label="Sammlung" options={options} value={andachtReiheId ?? ''}
        onValueChange={(v) => {
          setAndachtReiheId(v === '' ? null : (v as AndachtsreiheId))
          setAndachtAusgewaehlt(new Set())
        }}
      />
      {selectedSammlung && (
        <>
          <div className={styles.andachtCounter}>
            {andachtAusgewaehlt.size} aktiviert · {teamAndachtsBedarf} Treffen ohne Stammandacht
            {stammandachtenCount > 0 && (
              <span className={styles.andachtCounterMeta}>
                {' '}({stammandachtenCount} Stammandacht{stammandachtenCount !== 1 ? 'en' : ''} bereits gedeckt)
              </span>
            )}
          </div>
          <div className={styles.andachtSammlungList}>
            {selectedSammlung.einheiten.map((einheit) => {
              const aktiv = andachtAusgewaehlt.has(einheit.id)
              return (
                <button key={einheit.id} type="button"
                  className={`${styles.andachtSammlungItem} ${aktiv ? styles.andachtSammlungItemActive : ''}`}
                  onClick={() => toggle(einheit.id)}>
                  <span className={styles.andachtSammlungCheck}>{aktiv ? '✓' : ''}</span>
                  <span className={styles.andachtSammlungTitle}>{einheit.titel}</span>
                  {einheit.bibelstelle && (
                    <span className={styles.andachtSammlungMeta}>{einheit.bibelstelle}</span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

type NewReiheProps = Pick<
  WizardStep3AndachtSectionProps,
  | 'andachtTitel' | 'setAndachtTitel'
  | 'andachtEinheiten' | 'setAndachtEinheiten'
  | 'teamAndachtsBedarf' | 'stammandachtenCount' | 'activeMeetingCount'
>

function NewReiheEditor({
  andachtTitel, setAndachtTitel, andachtEinheiten, setAndachtEinheiten,
  teamAndachtsBedarf, stammandachtenCount, activeMeetingCount,
}: NewReiheProps) {
  const [focusId, setFocusId] = useState<string | null>(null)
  function addEinheit() {
    const next = newId<AndachtsEinheitId>()
    setFocusId(next as string)
    setAndachtEinheiten([...andachtEinheiten, { id: next, titel: '' }])
  }
  function update(i: number, titel: string) {
    const updated = [...andachtEinheiten]
    updated[i] = { ...updated[i], titel }
    setAndachtEinheiten(updated)
  }
  return (
    <>
      <Input label="Titel der Reihe" placeholder="z.B. Frühjahrsfreizeit 2026"
        value={andachtTitel} onChange={(e) => setAndachtTitel(e.target.value)} />
      {teamAndachtsBedarf > 0 && (
        <p className={styles.andachtHint}>
          {teamAndachtsBedarf} Einheit{teamAndachtsBedarf !== 1 ? 'en' : ''} gebraucht ({activeMeetingCount} Treffen
          {stammandachtenCount > 0 && `, ${stammandachtenCount} mit Stammandacht`}).
        </p>
      )}
      <div className={styles.andachtList}>
        {andachtEinheiten.map((einheit, i) => (
          <div key={einheit.id} className={styles.andachtRow}>
            <span className={styles.andachtNumber}>{i + 1}</span>
            <Input
              placeholder="Titel der Einheit"
              value={einheit.titel}
              autoFocus={focusId === (einheit.id as string)}
              onChange={(e) => update(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && i === andachtEinheiten.length - 1 && einheit.titel.trim()) {
                  e.preventDefault()
                  addEinheit()
                }
              }}
            />
            <button type="button" className={styles.andachtRemove}
              onClick={() => setAndachtEinheiten(andachtEinheiten.filter((_, idx) => idx !== i))}
              title="Entfernen">×</button>
          </div>
        ))}
      </div>
      <button type="button" className={styles.addEinheitBtn} onClick={addEinheit}>
        + Einheit hinzufügen
      </button>
    </>
  )
}

export function WizardStep3AndachtSection(props: WizardStep3AndachtSectionProps) {
  const {
    andachtMode, setAndachtMode, setAndachtReiheId, setAndachtAusgewaehlt,
    setAndachtTitel, setAndachtEinheiten, error,
  } = props

  function switchMode(m: AndachtMode) {
    setAndachtMode(m)
    setAndachtReiheId(null)
    setAndachtAusgewaehlt(new Set())
    if (m !== 'new') {
      setAndachtTitel('')
      setAndachtEinheiten([])
    }
  }

  return (
    <div className={`${styles.zieleSectionBody} ${error ? styles.zieleSectionBodyError : ''}`}>
      {error && <p className={styles.zieleSectionError}>{error}</p>}
      <div className={styles.wbTabRow}>
        {MODI.map((m) => (
          <button key={m.key} type="button"
            className={`${styles.wbTab} ${andachtMode === m.key ? styles.wbTabActive : ''}`}
            onClick={() => switchMode(m.key)}>
            {m.label}
          </button>
        ))}
      </div>
      {andachtMode === 'reihe' && (
        <ReihenPicker availableReihen={props.availableReihen}
          selected={props.andachtReiheId} onSelect={props.setAndachtReiheId} />
      )}
      {andachtMode === 'sammlung' && <SammlungPicker {...props} />}
      {andachtMode === 'new' && <NewReiheEditor {...props} />}
    </div>
  )
}
