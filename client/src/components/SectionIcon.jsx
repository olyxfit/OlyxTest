import {
  Bone, Apple, Activity, Dumbbell, Layers, ClipboardList, Repeat, Flag, Heart,
  Landmark, Scan, Sprout, Shield, Brain, Star, Gauge, Cross, AlertTriangle,
  Users, Stethoscope, Zap, Rocket, Scale,
} from 'lucide-react'

const ICONS = {
  bone: Bone,
  apple: Apple,
  activity: Activity,
  dumbbell: Dumbbell,
  clipboard: ClipboardList,
  repeat: Repeat,
  flag: Flag,
  heart: Heart,
  landmark: Landmark,
  scan: Scan,
  sprout: Sprout,
  shield: Shield,
  brain: Brain,
  star: Star,
  gauge: Gauge,
  cross: Cross,
  alert: AlertTriangle,
  users: Users,
  stethoscope: Stethoscope,
  zap: Zap,
  rocket: Rocket,
  scale: Scale,
  all: Layers,
}

const COLORS = {
  rose: 'from-rose-400 to-rose-600 text-rose-600 bg-rose-500/10 border-rose-500/30',
  emerald: 'from-emerald-400 to-emerald-600 text-emerald-600 bg-emerald-500/10 border-emerald-500/30',
  sky: 'from-sky-400 to-sky-600 text-sky-600 bg-sky-500/10 border-sky-500/30',
  amber: 'from-amber-400 to-amber-600 text-amber-500 bg-amber-500/10 border-amber-500/30',
  indigo: 'from-indigo-400 to-indigo-600 text-indigo-600 bg-indigo-500/10 border-indigo-500/30',
  slate: 'from-slate-300 to-slate-500 text-slate-700 bg-slate-500/10 border-slate-500/30',
  pink: 'from-pink-400 to-pink-600 text-pink-400 bg-pink-500/10 border-pink-500/30',
  violet: 'from-violet-400 to-violet-600 text-violet-600 bg-violet-500/10 border-violet-500/30',
  teal: 'from-teal-400 to-teal-600 text-teal-600 bg-teal-500/10 border-teal-500/30',
  orange: 'from-orange-400 to-orange-600 text-orange-600 bg-orange-500/10 border-orange-500/30',
  red: 'from-red-400 to-red-600 text-red-600 bg-red-500/10 border-red-500/30',
  cyan: 'from-cyan-400 to-cyan-600 text-cyan-600 bg-cyan-500/10 border-cyan-500/30',
  lime: 'from-lime-400 to-lime-600 text-lime-600 bg-lime-500/10 border-lime-500/30',
  all: 'from-indigo-400 to-indigo-600 text-indigo-600 bg-indigo-500/10 border-indigo-500/30',
}

export function sectionGradient(color) {
  return (COLORS[color] || COLORS.all).split(' ').slice(0, 2).join(' ')
}
export function sectionSoft(color) {
  return (COLORS[color] || COLORS.all).split(' ').slice(2).join(' ')
}

export default function SectionIcon({ icon, color, className = 'size-5' }) {
  const Icon = ICONS[icon] || Layers
  return <Icon className={className} strokeWidth={2.2} />
}
