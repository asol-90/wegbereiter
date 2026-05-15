/**
 * WBIntensitySegment — 4-step segmented bar for picking intensity (– / etwas /
 * mittel / stark). Values correspond to WB_STEPS in the domain layer.
 */
import {WB_CSS_VAR, WB_STEPS, type WBKey} from '@/domain/wb'
import clsx from '../utils/clsx'
import styles from './WBIntensitySegment.module.css'

export type WBIntensitySegmentProps = {
  wb: WBKey
  value: number
  onChange: (value: number) => void
  sizeVariant?: 'sm' | 'md'
  ariaLabel?: string
  className?: string
}

export function WBIntensitySegment({
  wb,
  value,
  onChange,
  sizeVariant = 'md',
  ariaLabel,
  className,
}: WBIntensitySegmentProps) {
  // Snap the incoming value to the closest step so there is always exactly one
  // active segment. Default of `–` (step 0) is the natural fallback for
  // value 0 or undefined/NaN, per design.
  const safeValue = Number.isFinite(value) ? value : 0
  const activeIndex = WB_STEPS.reduce((best, step, idx) => {
    return Math.abs(step.value - safeValue) <
      Math.abs(WB_STEPS[best].value - safeValue)
      ? idx
      : best
  }, 0)

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={clsx(styles.group, styles[`s-${sizeVariant}`], className)}
    >
      {WB_STEPS.map((step, idx) => {
        const active = idx === activeIndex
        return (
          <button
            key={step.label}
            type="button"
            role="radio"
            aria-checked={active}
            className={clsx(styles.seg, active && styles.active)}
            style={
              active
                ? ({
                    ['--seg-color' as string]: `var(${WB_CSS_VAR[wb]})`,
                  } as React.CSSProperties)
                : undefined
            }
            onClick={() => onChange(step.value)}
          >
            {step.label}
          </button>
        )
      })}
    </div>
  )
}
