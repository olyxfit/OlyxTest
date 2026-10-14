import { useEffect, useRef, useState } from 'react'
import { Check, Crop, Expand, Loader2, Move, X, ZoomIn } from 'lucide-react'

const OUT = 320 // خروجی نهایی: JPEG مربع ۳۲۰×۳۲۰

// مودال ویرایش عکس پروفایل — کاربر بعد از انتخاب فایل، عکس را با درگ جابه‌جا و با اسلایدر زوم می‌کند.
// دو حالت دارد: «پر کردن» (cover — کل کادر با عکس پر می‌شود) و «تصویر کامل» (contain — کل عکس
// دیده می‌شود و حاشیه‌های خالی با نسخهٔ بلارِ خود عکس پر می‌شود)
export default function AvatarEditor({ src, onConfirm, onCancel, busy }) {
  const vpRef = useRef(null)
  const drag = useRef(null)
  const [img, setImg] = useState(null)
  const [size, setSize] = useState(0) // پهنای واقعی ویوپورت
  const [mode, setMode] = useState('cover')
  const [zoom, setZoom] = useState(1)
  const [off, setOff] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const el = new Image()
    el.onload = () => setImg({ el, w: el.naturalWidth, h: el.naturalHeight })
    el.onerror = () => onCancel()
    el.src = src
  }, [src]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!vpRef.current) return
    const ro = new ResizeObserver(([e]) => setSize(e.contentRect.width))
    ro.observe(vpRef.current)
    return () => ro.disconnect()
  }, [])

  // scale پایه: cover یعنی ضلع کوچک‌تر کادر را بپوشاند؛ contain یعنی ضلع بزرگ‌تر داخل کادر بماند
  const base = img && size ? size / (mode === 'cover' ? Math.min(img.w, img.h) : Math.max(img.w, img.h)) : 1
  const scale = base * zoom

  // در cover عکس همیشه کل کادر را می‌پوشاند؛ در contain داخل کادر می‌ماند
  const clampOff = (o, s) => {
    if (!img || !size) return o
    const bx = Math.abs(img.w * s - size) / 2
    const by = Math.abs(img.h * s - size) / 2
    return { x: Math.min(bx, Math.max(-bx, o.x)), y: Math.min(by, Math.max(-by, o.y)) }
  }

  const onPointerDown = (e) => {
    drag.current = { px: e.clientX, py: e.clientY, ox: off.x, oy: off.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!drag.current) return
    const d = drag.current
    setOff(clampOff({ x: d.ox + e.clientX - d.px, y: d.oy + e.clientY - d.py }, scale))
  }
  const onPointerUp = () => { drag.current = null }

  const setFit = (m) => { setMode(m); setZoom(1); setOff({ x: 0, y: 0 }) }
  const onZoom = (v) => { setZoom(v); setOff((o) => clampOff(o, base * v)) }

  // همان چیدمانِ پیش‌نمایش، در ابعاد خروجی رندر می‌شود
  const exportDataUrl = () => {
    const k = OUT / size
    const c = document.createElement('canvas')
    c.width = c.height = OUT
    const ctx = c.getContext('2d')
    if (mode === 'contain') {
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, OUT, OUT)
      const bs = OUT / Math.min(img.w, img.h)
      ctx.save()
      try { ctx.filter = 'blur(20px)' } catch { /* WebViewهای قدیمی بدون بلار هم می‌کشند */ }
      ctx.drawImage(img.el, (OUT - img.w * bs) / 2 - 8, (OUT - img.h * bs) / 2 - 8, img.w * bs + 16, img.h * bs + 16)
      ctx.restore()
    }
    const s = scale * k
    ctx.drawImage(img.el, OUT / 2 + off.x * k - (img.w * s) / 2, OUT / 2 + off.y * k - (img.h * s) / 2, img.w * s, img.h * s)
    return c.toDataURL('image/jpeg', 0.85)
  }

  const imgStyle = {
    transform: `translate(-50%, -50%) translate(${off.x}px, ${off.y}px) scale(${scale})`,
    transformOrigin: 'center',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => !busy && onCancel()}
    >
      <div
        className="w-full max-w-md bg-white border border-[#e6e8f0] rounded-t-3xl sm:rounded-3xl p-5 pb-8 space-y-4 animate-pop shadow-2xl shadow-indigo-900/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <Crop className="size-4.5 text-indigo-600" /> ویرایش عکس پروفایل
          </h3>
          <button
            onClick={() => !busy && onCancel()}
            className="size-9 rounded-xl bg-[#f1f2f6] border border-[#e6e8f0] grid place-items-center text-slate-500"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ویوپورت کراپ — عکس با درگ جابه‌جا می‌شود */}
        <div
          ref={vpRef}
          className="relative mx-auto aspect-square w-full max-w-[300px] overflow-hidden rounded-3xl bg-slate-900 touch-none select-none cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {img && mode === 'contain' && (
            <img
              src={src}
              alt=""
              draggable={false}
              className="absolute left-1/2 top-1/2 max-w-none blur-xl opacity-80"
              style={{ width: size, height: size, objectFit: 'cover', transform: 'translate(-50%, -50%) scale(1.15)', transformOrigin: 'center' }}
            />
          )}
          {img && size ? (
            <img src={src} alt="" draggable={false} className="absolute left-1/2 top-1/2 max-w-none" style={imgStyle} />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <Loader2 className="size-7 animate-spin text-white/60" />
            </div>
          )}
          {/* قاب راهنما + خطوط یک‌سوم */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-2 ring-inset ring-white/70" />
          <div className="pointer-events-none absolute inset-0 opacity-25">
            <div className="absolute inset-y-0 right-1/3 w-px bg-white" />
            <div className="absolute inset-y-0 left-1/3 w-px bg-white" />
            <div className="absolute inset-x-0 top-1/3 h-px bg-white" />
            <div className="absolute inset-x-0 bottom-1/3 h-px bg-white" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
            <span className="flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white/90">
              <Move className="size-3" /> برای جابه‌جایی بکشید
            </span>
          </div>
        </div>

        {/* زوم */}
        <div className="flex items-center gap-3">
          <ZoomIn className="size-4.5 text-slate-400 shrink-0" />
          <input
            type="range"
            dir="ltr"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => onZoom(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
        </div>

        {/* حالت نمایش: پر کردن کادر یا دیده‌شدن کل عکس */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#f1f2f6] p-1">
          {[
            ['cover', Crop, 'پر کردن کادر'],
            ['contain', Expand, 'تصویر کامل'],
          ].map(([m, Ic, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setFit(m)}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-colors ${
                mode === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              <Ic className="size-4" /> {label}
            </button>
          ))}
        </div>

        <button onClick={() => onConfirm(exportDataUrl())} disabled={busy || !img} className="btn-primary">
          {busy ? <Loader2 className="size-4.5 animate-spin" /> : <Check className="size-4.5" />}
          {busy ? 'در حال ذخیره…' : 'تایید و ذخیره عکس'}
        </button>
      </div>
    </div>
  )
}
