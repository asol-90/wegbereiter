import type { Aktivitaet, StammAktion, StammKontext } from '@/domain/types'
import { aktivitaetLabel } from '@/domain/aktivitaetKatalog'
import { formatTerminDate, formatDateRange, type AktionBereich } from './newPlanungWizardUtils'
import styles from './NewPlanungWizard.module.css'

// ─── Props ────────────────────────────────────────────────────────────────────

export type WizardStep2KontextProps = {
  activeKontext: StammKontext
  stammAktivitaeten: readonly Aktivitaet[]
  alleAktionenInRange: Array<StammAktion & { bereich: AktionBereich }>
  kontextTreffenInRange: StammKontext['treffen']
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WizardStep2Kontext({
  activeKontext,
  stammAktivitaeten,
  alleAktionenInRange,
  kontextTreffenInRange,
}: WizardStep2KontextProps) {
  function renderKontextAktivitaeten() {
    if (stammAktivitaeten.length === 0) return null
    return (
      <div className={styles.kontextAktivitaetenSection}>
        <span className={styles.kontextSectionLabel}>Vorgeschlagene Aktivitäten</span>
        <div className={styles.kontextAktivitaetenList}>
          {stammAktivitaeten.map((a) => (
            <div key={a.id} className={styles.kontextAktivitaetRow}>
              <span className={styles.kontextAktivitaetTyp}>
                {aktivitaetLabel(a.typ, a.untertyp)}
              </span>
              <span className={styles.kontextAktivitaetName}>{a.name}</span>
              {a.zeitMin > 0 && (
                <span className={styles.kontextAktivitaetDauer}>
                  {a.zeitMin === a.zeitMax
                    ? `${a.zeitMin} Min`
                    : `${a.zeitMin}–${a.zeitMax} Min`}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  /** Kompakte Treffenliste: reguläre Treffen als Datumskette, besondere separat. */
  function renderKontextTreffenCompact() {
    const regulaer = kontextTreffenInRange.filter((t) => {
      // "Besonders" = hat eigenen anfangsBlock oder endBlock (nicht Default)
      return t.anfangsBlock === undefined && t.endBlock === undefined
    })
    const besondere = kontextTreffenInRange.filter((t) => {
      return t.anfangsBlock !== undefined || t.endBlock !== undefined
    })

    return (
      <>
        {regulaer.length > 0 && (
          <p className={styles.kontextTreffenDates}>
            {regulaer.map((t, i) => (
              <span key={t.id}>
                {i > 0 && ' · '}
                {formatTerminDate(t.datum)}
              </span>
            ))}
          </p>
        )}
        {besondere.map((t) => {
          const blocks = [
            ...(t.anfangsBlock ?? []).map((b) => b.name),
            ...(t.endBlock ?? []).map((b) => b.name),
          ]
          return (
            <div key={t.id} className={styles.kontextTreffenBesonders}>
              <span className={styles.kontextAktionDate}>{formatTerminDate(t.datum)}</span>
              <span className={styles.kontextAktionName}>
                Abweichend: {blocks.join(', ')}
              </span>
            </div>
          )
        })}
      </>
    )
  }

  return (
    <div className={styles.section}>
      {/* Thema */}
      <h3 className={styles.kontextThema}>{activeKontext.thema}</h3>
      {activeKontext.themaBeschreibung && (
        <p className={styles.kontextBeschreibung}>{activeKontext.themaBeschreibung}</p>
      )}

      {/* Vorgeschlagene Aktivitäten */}
      {renderKontextAktivitaeten()}

      {/* Aktionen (Stamm + Distrikt + Regional) */}
      {alleAktionenInRange.length > 0 && (
        <div className={styles.kontextAktionen}>
          <span className={styles.kontextSectionLabel}>Aktionen</span>
          {alleAktionenInRange.map((a) => {
            const isExtern = a.bereich !== 'Stamm'
            return (
              <div key={a.id} className={`${styles.kontextAktionRow} ${isExtern ? styles.kontextAktionRowExtern : ''}`}>
                <span className={styles.kontextAktionDate}>
                  {a.beginn !== a.ende ? formatDateRange(a.beginn, a.ende) : formatTerminDate(a.beginn)}
                </span>
                <span className={styles.kontextAktionName}>{a.titel}</span>
                {a.ort && <span className={styles.kontextAktionOrt}>{a.ort}</span>}
                <span className={`${styles.aktionChip} ${isExtern ? styles.aktionChipExtern : styles.aktionChipStamm}`}>
                  {a.bereich}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Treffen — kompakt */}
      {kontextTreffenInRange.length > 0 && (
        <div className={styles.kontextTreffenCompact}>
          <span className={styles.kontextSectionLabel}>
            Treffen · {kontextTreffenInRange.length}
          </span>
          {renderKontextTreffenCompact()}
        </div>
      )}

      {/* Stamm-Blöcke */}
      {(activeKontext.defaultAnfangsBlock.length > 0 || activeKontext.defaultEndBlock.length > 0) && (
        <div className={styles.kontextBloecke}>
          <span className={styles.kontextBloeckeLabel}>Stammzeit pro Treffen:</span>
          {activeKontext.defaultAnfangsBlock.length > 0 && (
            <span>Anfang: {activeKontext.defaultAnfangsBlock.map((b) => `${b.name} (${b.dauerMin} Min)`).join(', ')}</span>
          )}
          {activeKontext.defaultEndBlock.length > 0 && (
            <span>Ende: {activeKontext.defaultEndBlock.map((b) => `${b.name} (${b.dauerMin} Min)`).join(', ')}</span>
          )}
        </div>
      )}
    </div>
  )
}
