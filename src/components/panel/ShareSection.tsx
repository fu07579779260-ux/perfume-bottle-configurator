import { Check, Copy } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { captureJpegDataUrl } from '@/export/capture'
import { downloadFile } from '@/export/download'
import { fill, useT } from '@/i18n/language'
import { href } from '@/lib/router'
import { DEFAULT_CONFIG } from '@/model/config'
import { useDesign } from '@/model/design-context'
import { designCode } from '@/model/design-number'
import { buildShareUrl, parseDesignFile, parseParameterCode, toDesignFile, toParameterCode } from '@/model/serialize'
import { library, useSavedDesigns } from '@/persistence/library'
import { openDesign, useOpenDesign } from '@/persistence/working'
import { logoStore } from '@/personal/logo-store'

/** Copy text, falling back to selecting it when the clipboard is blocked. */
async function copy(text: string, fallback?: HTMLInputElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    fallback?.select()
    return false
  }
}

export function ShareSection({ onNewDesign }: { onNewDesign?: () => void } = {}) {
  const t = useT()
  const nameId = useId()
  const codeId = useId()
  const { config, load } = useDesign()
  const designs = useSavedDesigns()
  const open = useOpenDesign()
  const current = open ? designs.find((d) => d.id === open.id) : undefined
  const [name, setName] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)
  const [paste, setPaste] = useState('')
  const [codeField, setCodeField] = useState<HTMLInputElement | null>(null)

  const share = buildShareUrl(config, window.location.href)
  const { code } = toParameterCode(config)

  const extras = () => {
    const logo = logoStore.get()
    return {
      thumbnail: captureJpegDataUrl(320),
      logo: logo && config.personal.logoName === logo.name ? logo : null,
    }
  }

  const saveNew = async () => {
    const saved = await library.saveNew(name || t('save.defaultName'), config, extras())
    openDesign.set(saved)
    setStatus(fill(t('save.savedNew'), { name: name || t('save.defaultName') }))
  }

  const saveVersion = async () => {
    if (!open) return
    const saved = await library.saveVersion(open.id, config, extras())
    if (saved) {
      openDesign.set(saved)
      setStatus(fill(t('save.savedVersion'), { n: String(saved.n) }))
    }
  }

  const importFile = async (file: File | undefined) => {
    if (!file) return
    const result = parseDesignFile(await file.text())
    if (!result.ok) return setStatus(t(`save.import.${result.error}`))
    load(result.config)
    openDesign.set(null)
    setStatus(t('save.imported'))
  }

  const openCode = () => {
    const parsed = parseParameterCode(paste)
    if (!parsed) return setStatus(t('save.badCode'))
    load(parsed)
    openDesign.set(null)
    setPaste('')
    setStatus(t('save.codeOpened'))
  }

  const flash = (what: 'link' | 'code') => {
    setCopied(what)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="space-y-3">
      <h2 className="kicker">{t('panel.save')}</h2>

      {current ? (
        <div className="space-y-2">
          <p className="text-xs text-muted">{fill(t('save.editing'), { name: current.name, n: String(open!.n) })}</p>
          <Button onClick={() => void saveVersion()} className="w-full rounded-full">
            {fill(t('save.asVersion'), { n: String(Math.max(...current.versions.map((v) => v.n)) + 1) })}
          </Button>
        </div>
      ) : null}
      <div className="flex gap-2">
        <label htmlFor={nameId} className="sr-only">
          {t('save.name')}
        </label>
        <input
          id={nameId}
          value={name}
          placeholder={t('save.namePlaceholder')}
          onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1 rounded-full bg-canvas px-3 py-1.5 text-sm text-ink ring-1 ring-rule focus:ring-2 focus:ring-gold focus:outline-none"
        />
        <Button onClick={() => void saveNew()} variant={current ? 'secondary' : 'default'} className="rounded-full">
          {current ? t('save.asNew') : t('save.save')}
        </Button>
      </div>
      <p role="status" className="text-xs text-muted">
        {status}{' '}
        {status && (
          <a href={href('/my-designs')} className="text-gold underline underline-offset-2">
            {t('save.toMyDesigns')}
          </a>
        )}
      </p>

      <div className="space-y-1.5 rounded-lg bg-canvas p-3">
        <p className="text-sm text-ink">{t('save.share')}</p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => void copy(share.url).then((ok) => ok && flash('link'))}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-soft/70 px-3 py-1 text-xs text-ink hover:bg-soft"
          >
            {copied === 'link' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {t('save.copyLink')}
          </button>
          <button
            type="button"
            onClick={() => void copy(code, codeField).then((ok) => ok && flash('code'))}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-soft/70 px-3 py-1 text-xs text-ink hover:bg-soft"
          >
            {copied === 'code' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {t('save.copyCode')}
          </button>
        </div>
        <input
          ref={setCodeField}
          readOnly
          value={code}
          aria-label={t('save.code')}
          onFocus={(e) => e.target.select()}
          className="w-full truncate rounded-md bg-surface px-2 py-1 font-mono text-[0.7rem] text-muted"
        />
        <p className="text-xs text-muted">
          {fill(t('save.codeNote'), { code: designCode(config) })}
          {share.droppedLogo && <span className="text-warn"> {t('save.logoNotShared')}</span>}
        </p>
        <div className="flex gap-1.5 pt-1">
          <label htmlFor={codeId} className="sr-only">
            {t('save.pasteCode')}
          </label>
          <input
            id={codeId}
            value={paste}
            placeholder={t('save.pasteCode')}
            onChange={(e) => setPaste(e.target.value)}
            className="min-w-0 flex-1 rounded-full bg-surface px-3 py-1 text-xs text-ink ring-1 ring-rule focus:ring-2 focus:ring-gold focus:outline-none"
          />
          <button type="button" onClick={openCode} disabled={!paste.trim()} className="rounded-full bg-gold px-3 py-1 text-xs text-canvas disabled:opacity-40">
            {t('save.open')}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => downloadFile(toDesignFile(config), `perfume-${designCode(config)}.json`, 'application/json')}
          className="rounded-full bg-soft/70 px-3 py-1 text-xs text-ink hover:bg-soft"
        >
          {t('save.exportJson')}
        </button>
        <label className="cursor-pointer rounded-full bg-soft/70 px-3 py-1 text-xs text-ink hover:bg-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold">
          {t('save.importJson')}
          <input
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(e) => {
              void importFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm(t('save.newConfirm'))) return
            load(DEFAULT_CONFIG)
            openDesign.set(null)
            logoStore.set(null)
            setStatus(null)
            onNewDesign?.()
          }}
          className="rounded-full bg-canvas px-3 py-1 text-xs text-ink ring-1 ring-rule hover:bg-soft"
        >
          {t('save.newDesign')}
        </button>
      </div>
    </div>
  )
}
