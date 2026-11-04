import { capLayout } from '@/geometry/cap'
import { designChecks } from '@/geometry/checks'
import { jointInfo } from '@/geometry/parts'
import { checkWall, shellSize } from '@/geometry/shell'
import { fill } from '@/i18n/language'
import { STRINGS, type Language, type StringKey } from '@/i18n/strings'
import type { DesignConfig } from '@/model/config'
import { designCode } from '@/model/design-number'

// The design described in words, for the design card and the spec sheet.

export interface Summary {
  code: string
  title: string
  note: string
  rows: [label: string, value: string][]
  printTips: string[]
  finishing: string[]
  assembly: string
  checks: string[]
}

const mm = (v: number) => `${v.toFixed(1)} mm`

export function designSummary(config: DesignConfig, lang: Language): Summary {
  const t = (k: StringKey) => STRINGS[lang][k]
  const tk = (k: string) => STRINGS[lang][k as StringKey] ?? k
  const { bottle, shape, texture, cap, personal, manufacturing: m, assembly } = config
  const size = shellSize(config)
  const wall = checkWall(config)
  const capL = capLayout(config)
  const joint = jointInfo(config)

  const textureValue =
    shape.silhouette === 'exoskeleton'
      ? fill(t('sheet.frame'), { n: String(shape.strutCount), w: String(shape.strutWidth) })
      : shape.silhouette === 'coral'
        ? fill(t('sheet.coral'), { g: String(shape.grooveDepth), d: String(Math.round(shape.holeDensity * 100)) })
        : tk(`texture.${texture.type}`) + (texture.zone !== 'whole' ? ` · ${tk(`texture.zone.${texture.zone}`)}` : '')

  const rows: [string, string][] = [
    [t('panel.silhouette'), tk(`sil.${shape.silhouette}`) + (config.mode.advanced && shape.profilePoints ? ` · ${t('sheet.drawn')}` : '')],
    [t('panel.bottle'), `${bottle.preset === 'custom' ? t('sheet.custom') : bottle.preset.replace('ml', ' ml')} · Ø ${bottle.bodyDiameter} × ${bottle.bodyHeight} mm · ${bottle.neckFinish.replace('-', '/')}`],
    [t('panel.assembly'), tk(`assembly.${assembly.method}`) + (assembly.method === 'bottom' ? ` · ${tk(`assembly.${assembly.baseFixing}`)}` : '') + (joint.kind !== 'none' && joint.fits ? ` · ${joint.count} × ${tk(`assembly.${joint.kind === 'dowels' ? 'snaps' : 'magnets'}`)}` : '')],
    [t('viewport.shell'), `${size.width.toFixed(1)} × ${size.depth.toFixed(1)} × ${size.height.toFixed(1)} mm`],
    [t('viewport.wall'), mm(wall.minWall)],
    [t('panel.texture'), textureValue + (texture.windowCount && shape.silhouette !== 'exoskeleton' ? ` · ${texture.windowCount} × ${tk(`texture.window.${texture.windowShape}`)}` : '')],
    [t('panel.cap'), `${tk(`cap.form.${cap.form}`)} · ${tk(`cap.fit.${cap.fit}`)} · ${mm(capL.topY - capL.baseY)}`],
    [t('param.clearance'), `${mm(assembly.clearance)} · ${t('param.capClearance')} ${mm(cap.clearance)}`],
    [t('panel.print'), `${tk(`tech.${m.technology}`)} · ${tk(`printer.${m.printer}`)} · ${tk(`material.${m.material}`)}`],
    [t('personal.shellColour'), `${personal.shellColour} · ${t('personal.capColour')} ${personal.capColour} · ${tk(`finish.${personal.finish}`)}`],
  ]
  if (personal.text.trim()) {
    rows.push([t('personal.text'), `“${personal.text.replace('\n', ' / ')}” · ${tk(`position.${personal.textPosition}`)} · ${tk(`mode.${personal.textMode}`)}`])
  }
  if (personal.logoName) rows.push([t('personal.logo'), `${personal.logoName} · ${tk(`position.${personal.logoPosition}`)} · ${personal.logoSize} mm`])

  return {
    code: designCode(config),
    title: tk(`sil.${shape.silhouette}`),
    note: tk(`sil.${shape.silhouette}.note`),
    rows,
    printTips: [1, 2, 3].map((n) => tk(`export.tip.${m.technology}.${n}`)),
    finishing: [1, 2].map((n) => tk(`finishing.${m.technology}.${n}`)),
    assembly: tk(`export.assembly.${assembly.method}`),
    checks: designChecks(config).map((c) => fill(tk(`check.${c.id}`), { ...c.values, ...(c.values.part ? { part: tk(`part.${c.values.part}`) } : {}) })),
  }
}
