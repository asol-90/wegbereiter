import { useState } from 'react'
import { AccordionGroup, Input, Select } from '@/ui/primitives'
import { Icon } from '@/ui/primitives/Icon'
import type { Altersstufe, Andachtsreihe, WbSchwerpunktModus } from '@/domain/types'
import { newId, type AbzeichenId, type AndachtsEinheitId, type AndachtsreiheId } from '@/domain/ids'
import { WB_CSS_VAR, WB_KEYS, WB_LABELS, type WBKey } from '@/domain/wb'
import { ALTERSSTUFE_LABELS, abzeichenFuerStufe } from '@/domain/abzeichenKatalog'
import type { AndachtMode } from './newPlanungWizardUtils'
import styles from './NewPlanungWizard.module.css'

// ─── Props ────────────────────────────────────────────────────────────────────

export type WizardStep3ZieleProps = {
  wbModus: WbSchwerpunktModus
  setWbModus: (m: WbSchwerpunktModus) => void
  wbBereiche: WBKey[]
  setWbBereiche: (b: WBKey[]) => void
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
  selectedAltersstufe: Altersstufe | null
  setSelectedAltersstufe: (s: Altersstufe | null) => void
  selectedAbzeichenId: AbzeichenId | null
  setSelectedAbzeichenId: (id: AbzeichenId | null) => void
  availableReihen: Andachtsreihe[]
  availableSammlungen: Andachtsreihe[]
  selectedSammlung: Andachtsreihe | null
  teamAndachtsBedarf: number
  stammandachtenCount: number
  activeMeetingCount: number
  wbError: string | null
  andachtError: string | null
  abzeichenError: string | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WizardStep3Ziele({
  wbModus,
  setWbModus,
  wbBereiche,
  setWbBereiche,
  andachtMode,
  setAndachtMode,
  andachtReiheId,
  setAndachtReiheId,
  andachtAusgewaehlt,
  setAndachtAusgewaehlt,
  andachtTitel,
  setAndachtTitel,
  andachtEinheiten,
  setAndachtEinheiten,
  selectedAltersstufe,
  setSelectedAltersstufe,
  selectedAbzeichenId,
  setSelectedAbzeichenId,
  availableReihen,
  availableSammlungen,
  selectedSammlung,
  teamAndachtsBedarf,
  stammandachtenCount,
  activeMeetingCount,
  wbError,
  andachtError,
  abzeichenError,
}: WizardStep3ZieleProps) {
  const [andachtFocusId, setAndachtFocusId] = useState<string | null>(null)
  const [openIds, setOpenIds] = useState<string[]>(['wb'])
  const [prevErrors, setPrevErrors] = useState<{ wb: string | null; andacht: string | null; abzeichen: string | null }>({ wb: wbError, andacht: andachtError, abzeichen: abzeichenError })

  // Wenn Validierungsfehler neu eingehen: betroffene Sektion aufklappen,
  // damit der Hinweistext sichtbar ist. Render-Phase-Pattern statt useEffect,
  // um cascading renders zu vermeiden.
  if (prevErrors.wb !== wbError || prevErrors.andacht !== andachtError || prevErrors.abzeichen !== abzeichenError) {
    setPrevErrors({ wb: wbError, andacht: andachtError, abzeichen: abzeichenError })
    const next = new Set(openIds)
    if (wbError) next.add('wb')
    if (andachtError) next.add('andacht')
    if (abzeichenError) next.add('abzeichen')
    if (next.size !== openIds.length) setOpenIds(Array.from(next))
  }

  const warnTrailing = (
    <span className={styles.accordionWarn} aria-label="Fehler in dieser Sektion">
      <Icon name="warning" size={12} />
    </span>
  )

  return (
    <div className={styles.section}>
      <AccordionGroup
        mode="multi"
        openIds={openIds}
        onOpenChange={setOpenIds}
        items={[
          {
            id: 'wb',
            title: <span className={styles.kontextSectionLabel}>Wachstumsbereich</span>,
            trailing: wbError ? warnTrailing : undefined,
            children: (
              <div className={`${styles.zieleSectionBody} ${wbError ? styles.zieleSectionBodyError : ''}`}>
                {wbError && <p className={styles.zieleSectionError}>{wbError}</p>}
                {/* Tab-Leiste für Modus */}
                <div className={styles.wbTabRow}>
                  {(['ausgewogen', 'tendenz', 'fokus', 'haupt-neben', 'dominant'] as WbSchwerpunktModus[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`${styles.wbTab} ${wbModus === m ? styles.wbTabActive : ''}`}
                      onClick={() => { setWbModus(m); if (m === 'ausgewogen') setWbBereiche([]) }}
                    >
                      {m === 'ausgewogen' && 'Ausgewogen'}
                      {m === 'tendenz' && 'Tendenz'}
                      {m === 'fokus' && 'Fokus'}
                      {m === 'haupt-neben' && 'Haupt+Neben'}
                      {m === 'dominant' && 'Dominant'}
                    </button>
                  ))}
                </div>
                {/* Beschreibung */}
                <p className={styles.wbModeDesc}>
                  {wbModus === 'ausgewogen' && 'Alle Wachstumsbereiche werden gleichgewichtig behandelt.'}
                  {wbModus === 'tendenz' && 'Wähle ein bis zwei Bereiche, die tendenziell im Fokus stehen.'}
                  {wbModus === 'fokus' && 'Wähle einen Bereich, der klar im Fokus steht.'}
                  {wbModus === 'haupt-neben' && 'Wähle einen Haupt- und einen Nebenbereich.'}
                  {wbModus === 'dominant' && 'Wähle einen Bereich, der dominant im Vordergrund steht.'}
                </p>
                {/* Checkbox-Liste */}
                <div className={styles.wbCheckList}>
                  {WB_KEYS.map((key) => {
                    const isAusgewogen = wbModus === 'ausgewogen'
                    const selectedIndex = wbBereiche.indexOf(key)
                    const isSelected = isAusgewogen || selectedIndex >= 0
                    const maxSelectable =
                      wbModus === 'tendenz' ? 2
                      : wbModus === 'fokus' ? 1
                      : wbModus === 'haupt-neben' ? 2
                      : wbModus === 'dominant' ? 1
                      : 0
                    const checkLabel = wbModus === 'haupt-neben'
                      ? (selectedIndex === 0 ? 'H' : selectedIndex === 1 ? 'N' : '')
                      : (isSelected ? '✓' : '')
                    return (
                      <button
                        key={key}
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        disabled={isAusgewogen}
                        className={styles.wbCheckRow}
                        onClick={() => {
                          if (selectedIndex >= 0) {
                            setWbBereiche(wbBereiche.filter((k) => k !== key))
                          } else if (wbBereiche.length < maxSelectable) {
                            setWbBereiche([...wbBereiche, key])
                          }
                        }}
                      >
                        <span
                          className={`${styles.wbCheckIcon} ${isSelected ? styles.wbCheckIconChecked : ''}`}
                          style={isSelected ? { ['--wb-check-color' as string]: `var(${WB_CSS_VAR[key]})` } : undefined}
                        >
                          {checkLabel}
                        </span>
                        <span
                          className={styles.wbColorBar}
                          style={{ backgroundColor: `var(${WB_CSS_VAR[key]})` }}
                        />
                        <span className={styles.wbCheckLabel}>{WB_LABELS[key]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ),
          },
          {
            id: 'andacht',
            title: <span className={styles.kontextSectionLabel}>Andachtsreihe</span>,
            trailing: andachtError ? warnTrailing : undefined,
            children: (
              <div className={`${styles.zieleSectionBody} ${andachtError ? styles.zieleSectionBodyError : ''}`}>
                {andachtError && <p className={styles.zieleSectionError}>{andachtError}</p>}
                <div className={styles.wbTabRow}>
                  {(['none', 'reihe', 'sammlung', 'new'] as AndachtMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`${styles.wbTab} ${andachtMode === m ? styles.wbTabActive : ''}`}
                      onClick={() => {
                        setAndachtMode(m)
                        setAndachtReiheId(null)
                        setAndachtAusgewaehlt(new Set())
                        if (m !== 'new') {
                          setAndachtTitel('')
                          setAndachtEinheiten([])
                        }
                      }}
                    >
                      {m === 'none' && 'Keine'}
                      {m === 'reihe' && 'Reihe wählen'}
                      {m === 'sammlung' && 'Aus Sammlung'}
                      {m === 'new' && 'Neu anlegen'}
                    </button>
                  ))}
                </div>
                {andachtMode === 'reihe' && (
                  availableReihen.length === 0 ? (
                    <p className={styles.andachtHint}>
                      Keine Andachtsreihen im Repertoire. Lege eine im Repertoire-Tab an oder wähle „Neu anlegen".
                    </p>
                  ) : (
                    <div className={styles.andachtRepertoireList}>
                      {availableReihen.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className={`${styles.andachtRepertoireItem} ${andachtReiheId === r.id ? styles.andachtRepertoireItemSelected : ''}`}
                          onClick={() => setAndachtReiheId(r.id)}
                        >
                          <div className={styles.andachtRepertoireName}>{r.name}</div>
                          <div className={styles.andachtRepertoireMeta}>
                            {r.einheiten.length} Einheit{r.einheiten.length !== 1 ? 'en' : ''}
                            {r.buchquelle?.titel && ` · ${r.buchquelle.titel}`}
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                )}
                {andachtMode === 'sammlung' && (
                  availableSammlungen.length === 0 ? (
                    <p className={styles.andachtHint}>
                      Keine Sammlungen im Repertoire.
                    </p>
                  ) : (
                    <>
                      <Select<AndachtsreiheId | ''>
                        label="Sammlung"
                        options={[
                          { value: '', label: '— wählen —' },
                          ...availableSammlungen.map((s) => ({
                            value: s.id,
                            label: s.buchquelle?.titel ? `${s.name} (${s.buchquelle.titel})` : s.name,
                          })),
                        ]}
                        value={andachtReiheId ?? ''}
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
                                <button
                                  key={einheit.id}
                                  type="button"
                                  className={`${styles.andachtSammlungItem} ${aktiv ? styles.andachtSammlungItemActive : ''}`}
                                  onClick={() => {
                                    const next = new Set(andachtAusgewaehlt)
                                    if (aktiv) next.delete(einheit.id)
                                    else next.add(einheit.id)
                                    setAndachtAusgewaehlt(next)
                                  }}
                                >
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
                )}
                {andachtMode === 'new' && (
                  <>
                    <Input
                      label="Titel der Reihe"
                      placeholder="z.B. Frühjahrsfreizeit 2026"
                      value={andachtTitel}
                      onChange={(e) => setAndachtTitel(e.target.value)}
                    />
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
                            autoFocus={andachtFocusId === (einheit.id as string)}
                            onChange={(e) => {
                              const updated = [...andachtEinheiten]
                              updated[i] = { ...einheit, titel: e.target.value }
                              setAndachtEinheiten(updated)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const isLast = i === andachtEinheiten.length - 1
                                if (isLast && einheit.titel.trim()) {
                                  const next = newId<AndachtsEinheitId>()
                                  setAndachtFocusId(next as string)
                                  setAndachtEinheiten([...andachtEinheiten, { id: next, titel: '' }])
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            className={styles.andachtRemove}
                            onClick={() => setAndachtEinheiten(andachtEinheiten.filter((_, idx) => idx !== i))}
                            title="Entfernen"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={styles.addEinheitBtn}
                      onClick={() => {
                        const next = newId<AndachtsEinheitId>()
                        setAndachtFocusId(next as string)
                        setAndachtEinheiten([...andachtEinheiten, { id: next, titel: '' }])
                      }}
                    >
                      + Einheit hinzufügen
                    </button>
                  </>
                )}
              </div>
            ),
          },
          {
            id: 'abzeichen',
            title: <span className={styles.kontextSectionLabel}>Abzeichen</span>,
            trailing: abzeichenError ? warnTrailing : undefined,
            children: (
              <div className={`${styles.zieleSectionBody} ${abzeichenError ? styles.zieleSectionBodyError : ''}`}>
                {abzeichenError && <p className={styles.zieleSectionError}>{abzeichenError}</p>}
                <div className={styles.wbTabRow}>
                  <button
                    type="button"
                    className={`${styles.wbTab} ${!selectedAltersstufe ? styles.wbTabActive : ''}`}
                    onClick={() => { setSelectedAltersstufe(null); setSelectedAbzeichenId(null) }}
                  >
                    Ohne
                  </button>
                  {(['kundschafter', 'pfadfinder'] as Altersstufe[]).map((stufe) => (
                    <button
                      key={stufe}
                      type="button"
                      className={`${styles.wbTab} ${selectedAltersstufe === stufe ? styles.wbTabActive : ''}`}
                      onClick={() => { setSelectedAltersstufe(stufe); setSelectedAbzeichenId(null) }}
                    >
                      {ALTERSSTUFE_LABELS[stufe]}
                    </button>
                  ))}
                </div>
                {selectedAltersstufe && (
                  <div className={styles.andachtRepertoireList}>
                    {abzeichenFuerStufe(selectedAltersstufe).map((abz) => (
                      <button
                        key={abz.id}
                        type="button"
                        className={`${styles.andachtRepertoireItem} ${selectedAbzeichenId === abz.id ? styles.andachtRepertoireItemSelected : ''}`}
                        onClick={() => setSelectedAbzeichenId(abz.id)}
                      >
                        <div className={styles.andachtRepertoireName}>{abz.name}</div>
                        <div className={styles.andachtRepertoireMeta}>
                          {abz.anforderungen.length} Anforderung{abz.anforderungen.length !== 1 ? 'en' : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
