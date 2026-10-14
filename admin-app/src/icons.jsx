// آیکون‌های خطی به سبک Lucide — SVG خام با currentColor، بدون هیچ وابستگی
const P = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /><path d="M16 3.1a4 4 0 0 1 0 7.8" /></>,
  money: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M5.5 12h.01M18.5 12h.01" /></>,
  star: <path d="m12 2.5 2.95 5.98 6.6.96-4.78 4.65 1.13 6.57L12 17.57l-5.9 3.1 1.13-6.58L2.45 9.44l6.6-.96L12 2.5z" />,
  mega: <><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
  table: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M3 15.5h18" /><path d="M9.5 10v10" /></>,
  cards: <><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="10" y="4" width="5" height="11" rx="1.5" /><rect x="17" y="4" width="5" height="14" rx="1.5" /></>,
  chart: <><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M7 14v3" /><path d="M12 10v7" /><path d="M17 6v11" /></>,
  funnel: <path d="M4 4h16l-6.5 7.5V19l-3 2v-9.5L4 4z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  check: <path d="m4 12.5 5 5L20 6.5" />,
  checkC: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12.2 2.4 2.4 4.8-4.8" /></>,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  plus: <><path d="M5 12h14" /><path d="M12 5v14" /></>,
  back: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
  shield: <path d="M12 2.7 4.5 5.5v5.6c0 5 3.2 8.4 7.5 9.9 4.3-1.5 7.5-4.9 7.5-9.9V5.5L12 2.7z" />,
  crown: <path d="m3 8 4 4 5-6 5 6 4-4-1.5 11h-15L3 8z" />,
  exam: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /><path d="M9 13h6" /><path d="M9 17h6" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /></>,
  trophy: <><path d="M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M7 6H4a3 3 0 0 0 3 4" /><path d="M17 6h3a3 3 0 0 1-3 4" /><path d="M12 14v3" /><path d="M10 17h4v3.5h-4z" /></>,
  fire: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.3 9a2.8 2.8 0 0 1 5.5.7c0 1.8-2.8 2.4-2.8 4" /><path d="M12 17.5h.01" /></>,
  layers: <><path d="m12 2 9 5-9 5-9-5 9-5z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></>,
  message: <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  receipt: <><path d="M5 2v20l2-1.4L9 22l2-1.4L13 22l2-1.4L17 22l2-1.4V2l-2 1.4L15 2l-2 1.4L11 2 9 3.4 7 2 5 3.4z" /><path d="M9 8h6" /><path d="M9 12h6" /></>,
  timer: <><path d="M10 2.5h4" /><circle cx="12" cy="13.5" r="7.5" /><path d="M12 9.5v4l2.5 1.5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4" /><path d="M16 3v4" /><path d="M3 10h18" /></>,
  trend: <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  hourglass: <><path d="M6 2.5h12" /><path d="M6 21.5h12" /><path d="M7.5 2.5v3.8L12 12l4.5-5.7V2.5" /><path d="M7.5 21.5v-3.8L12 12l4.5 5.7v3.8" /></>,
  pie: <><path d="M12 2v10h10a10 10 0 0 0-10-10z" /><path d="M21.2 14.8A10 10 0 1 1 9.2 2.8" /></>,
  filter: <path d="M4 5h16l-6 7v6l-4-2v-4L4 5z" />,
  phone: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M12 18h.01" /></>,
  trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M10 11v6" /><path d="M14 11v6" /></>,
}

export default function Icon({ n, s = 16, w = 1.8 }) {
  return (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor"
      strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"
      style={{ flex: 'none', display: 'block' }} aria-hidden="true">
      {P[n]}
    </svg>
  )
}
