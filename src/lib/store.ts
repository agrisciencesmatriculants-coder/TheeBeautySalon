/**
 * YSL Mega Beauty Salon — demo data layer (FROZEN for page agents).
 * Typed localStorage-persisted store with a React subscription hook.
 * Page agents: consume the exported API only — do NOT modify this file.
 */
import { useSyncExternalStore, useCallback, useRef } from 'react';

// ───────────────────────────────────────────────────────────── Types ────

export type Role = 'customer' | 'owner' | 'admin';
export type Theme = 'light' | 'dark';
export type CategoryKey = 'braids' | 'nails' | 'lashes' | 'makeup' | 'barber' | 'skin';
export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type BookingStatus =
  | 'held' // slot held, 10-min countdown running
  | 'code-issued' // payment code issued, awaiting Vault payment
  | 'confirming' // Vault payment received, awaiting instant confirmation
  | 'confirmed' // ticket issued
  | 'completed' // visit done
  | 'cancelled'
  | 'expired'
  | 'no-show';
export type SpecialStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type PaymentCodeStatus = 'issued' | 'paid' | 'confirmed' | 'expired';

export interface User {
  id: string;
  name: string;
  email: string; // gmail only for signups
  password: string; // demo plaintext
  role: Role;
  salonId?: string; // owners
  favourites: string[]; // salon ids
  createdAt: number;
}

export interface DaySchedule {
  open: boolean;
  start: string; // "09:00"
  end: string; // "19:00"
}
export type WeeklySchedule = Record<DayKey, DaySchedule>;

export interface Salon {
  id: string;
  slug: string;
  name: string;
  ownerId: string;
  ownerName: string;
  avatar: string; // /avatar-*.png
  cover: string; // /salon-cover-*.png
  area: string;
  distanceKm: number;
  blurb: string;
  categories: CategoryKey[];
  schedule: WeeklySchedule;
  gallery: string[];
  approved: boolean;
  featured: boolean;
  ratingSum: number; // aggregate (seeded + live)
  ratingCount: number;
  createdAt: number;
}

export interface Service {
  id: string;
  salonId: string;
  name: string;
  category: CategoryKey;
  blurb: string;
  durationMin: number;
  price: number; // ZAR, e.g. 250
  image: string; // /work-*.png
  active: boolean;
}

export interface Special {
  id: string;
  serviceId: string;
  salonId: string;
  kind: 'percent' | 'amount';
  value: number; // 30 (=30%) or 50 (=R50 off)
  startsAt: number;
  endsAt: number;
  status: SpecialStatus;
  createdBy: 'admin' | 'owner';
  graduation: boolean;
  createdAt: number;
}

export interface Booking {
  id: string;
  userId: string;
  salonId: string;
  serviceId: string;
  date: string; // ISO yyyy-mm-dd
  time: string; // "14:30"
  status: BookingStatus;
  priceCharged: number; // ZAR at booking time (special applied)
  specialId?: string;
  holdExpiresAt?: number; // epoch ms while held
  paymentCodeId?: string;
  ticketCode?: string;
  createdAt: number;
}

export interface PaymentCode {
  id: string;
  code: string; // YSL-XXXX-XXXX (single use)
  bookingId: string;
  amount: number;
  status: PaymentCodeStatus;
  issuedAt: number;
  paidAt?: number;
}

export interface Review {
  id: string;
  salonId: string;
  userId: string;
  userName: string;
  rating: number; // 1..5
  text: string;
  serviceName?: string;
  verified: boolean;
  createdAt: number;
}

export interface SiteSettings {
  theme: Theme;
  gradTheme: boolean;
}

export interface AcademicEvent {
  id: string;
  title: string;
  date: string; // ISO yyyy-mm-dd
  kind: 'graduation' | 'academic';
  bellRung: boolean;
  createdAt: number;
}

export interface AppNotification {
  id: string;
  userId: string; // 'all-owners' broadcast resolved at creation
  title: string;
  body: string;
  kind: 'bell' | 'booking' | 'special' | 'system';
  read: boolean;
  createdAt: number;
}

export interface AuditEntry {
  id: string;
  actor: string; // email or 'system'
  action: string;
  detail: string;
  createdAt: number;
}

export interface PasswordReset {
  token: string;
  email: string;
  expiresAt: number;
}

export interface StoreState {
  version: number;
  users: User[];
  salons: Salon[];
  services: Service[];
  specials: Special[];
  bookings: Booking[];
  paymentCodes: PaymentCode[];
  reviews: Review[];
  settings: SiteSettings;
  events: AcademicEvent[];
  notifications: AppNotification[];
  audit: AuditEntry[];
  resets: PasswordReset[];
  sessionUserId: string | null;
}

// ─────────────────────────────────────────────────────────── Constants ────

export const STORE_KEY = 'ysl-store-v1';
export const STORE_VERSION = 1;
export const ADMIN_EMAIL = 'youngagripreneurs.ng@gmail.com';
export const ADMIN_PASSWORD = 'ysl-admin-2026';
export const HOLD_MS = 10 * 60 * 1000; // 10-minute slot hold
export const BAYES_M = 10; // Bayesian prior weight
export const AREAS = ['High Street', 'New Street', 'Kingsway', 'Oatlands', 'Fiddlers', 'Campus res'] as const;
export const CATEGORIES: { key: CategoryKey; label: string; icon: string; from: number }[] = [
  { key: 'braids', label: 'Braids & Hair', icon: '/cat-braids.svg', from: 100 },
  { key: 'nails', label: 'Nails', icon: '/cat-nails.svg', from: 80 },
  { key: 'lashes', label: 'Lashes & Brows', icon: '/cat-lashes.svg', from: 80 },
  { key: 'makeup', label: 'Makeup', icon: '/cat-makeup.svg', from: 150 },
  { key: 'barber', label: 'Barber', icon: '/cat-barber.svg', from: 60 },
  { key: 'skin', label: 'Skin & Facials', icon: '/cat-skin.svg', from: 120 },
];
export const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
export const DAY_SHORT: Record<DayKey, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

// ──────────────────────────────────────────────────────────── Helpers ─────

let idCounter = 0;
export function uid(prefix = 'id'): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${(idCounter + Math.floor(Math.random() * 1e6)).toString(36)}`;
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function isGmail(email: string): boolean {
  return /^[a-z0-9._%+-]+@gmail\.com$/i.test(email.trim());
}

function genPaymentCode(): string {
  const seg = () => Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '0').slice(0, 4);
  return `YSL-${seg()}-${seg()}`;
}

function genTicketCode(): string {
  return `T-${Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '7').slice(0, 8)}`;
}

export function dayKeyOf(dateIso: string): DayKey {
  // dateIso "yyyy-mm-dd" — local time
  const d = new Date(dateIso + 'T12:00:00');
  const idx = (d.getDay() + 6) % 7; // Mon=0
  return DAY_KEYS[idx];
}

export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ──────────────────────────────────────────────────────── Seed builder ────

function sched(openWeek = true): WeeklySchedule {
  const day = (open: boolean, start = '09:00', end = '19:00'): DaySchedule => ({ open, start, end });
  return {
    mon: day(openWeek), tue: day(openWeek), wed: day(openWeek),
    thu: day(openWeek), fri: day(openWeek), sat: day(true, '09:00', '17:00'),
    sun: day(false),
  };
}

function buildSeed(): StoreState {
  const now = Date.now();
  const DAY = 24 * 3600 * 1000;
  const HOUR = 3600 * 1000;

  // ── users ──
  const admin: User = {
    id: 'user_admin', name: 'YSL Admin', email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
    role: 'admin', favourites: [], createdAt: now - 90 * DAY,
  };
  const mkOwner = (id: string, name: string, email: string, salonId: string): User => ({
    id, name, email, password: 'ysl-owner-2026', role: 'owner', salonId, favourites: [], createdAt: now - 60 * DAY,
  });
  const owners: User[] = [
    mkOwner('user_ama', 'Ama Owusu', 'ama.glow@gmail.com', 'salon_glow'),
    mkOwner('user_naledi', 'Naledi Mokoena', 'naledi.braids@gmail.com', 'salon_braids'),
    mkOwner('user_sipho', 'Sipho Dlamini', 'sipho.chair@gmail.com', 'salon_barber'),
    mkOwner('user_lerato', 'Lerato Kgosi', 'lerato.lash@gmail.com', 'salon_lash'),
    mkOwner('user_thandi', 'Thandi Ngcobo', 'thandi.nails@gmail.com', 'salon_nails'),
    mkOwner('user_zandi', 'Zandi Mahlangu', 'zandi.curls@gmail.com', 'salon_curls'),
    mkOwner('user_mila', 'Mila Petersen', 'mila.makeup@gmail.com', 'salon_makeup'),
    mkOwner('user_brian', 'Brian Chikore', 'brian.kingsway@gmail.com', 'salon_kingsway'),
  ];
  const demoCustomer: User = {
    id: 'user_lufuno', name: 'Lufuno Mulaudzi', email: 'lufuno.m@gmail.com',
    password: 'ysl-demo-2026', role: 'customer', favourites: ['salon_braids'], createdAt: now - 30 * DAY,
  };

  // ── salons ──
  const mkSalon = (
    id: string, name: string, ownerId: string, ownerName: string, avatar: string,
    area: string, distanceKm: number, blurb: string, categories: CategoryKey[],
    gallery: string[], avg: number, count: number, featured = false,
  ): Salon => ({
    id, slug: slugify(name), name, ownerId, ownerName, avatar,
    cover: `/salon-cover-${id.replace('salon_', '')}.png`,
    area, distanceKm, blurb, categories, schedule: sched(), gallery,
    approved: true, featured, ratingSum: Math.round(avg * count), ratingCount: count,
    createdAt: now - 45 * DAY,
  });

  const salons: Salon[] = [
    mkSalon('salon_glow', 'Glow by Ama', 'user_ama', 'Ama Owusu', '/avatar-ama.png',
      'High Street', 0.4, 'Facials, brows and glow-ups in a plant-filled boutique corner on High Street. Walk out luminous.',
      ['skin', 'makeup'], ['/work-makeup.png', '/work-nails.png'], 4.7, 52, true),
    mkSalon('salon_braids', 'Braids by Naledi', 'user_naledi', 'Naledi Mokoena', '/avatar-naledi.png',
      'New Street', 0.7, 'Knotless, box braids, cornrows and wig installs — immaculate parts, gentle hands, student prices.',
      ['braids'], ['/work-braids.png', '/work-wig.png'], 4.9, 128, true),
    mkSalon('salon_barber', "The Gentleman's Chair", 'user_sipho', 'Sipho Dlamini', '/avatar-sipho.png',
      'High Street', 0.5, 'Vintage chair, sharp fades, clean beard work. Grahamstown’s gentleman HQ since 2026.',
      ['barber'], ['/work-fade.png'], 4.7, 88, true),
    mkSalon('salon_lash', 'Lash Loft', 'user_lerato', 'Lerato Kgosi', '/avatar-lerato.png',
      'Oatlands', 1.2, 'Classic and volume lash sets in a calm blush-and-violet loft. Nap included.',
      ['lashes'], ['/work-lashes.png'], 4.8, 96, true),
    mkSalon('salon_nails', 'Nails by Thandi', 'user_thandi', 'Thandi Ngcobo', '/avatar-thandi.png',
      'Fiddlers', 0.9, 'Gel, acrylic and chrome sets with campus-famous nail art. Your hands, but better.',
      ['nails'], ['/work-nails.png', '/work-gel.png'], 4.8, 74),
    mkSalon('salon_curls', 'Campus Curls Co.', 'user_zandi', 'Zandi Mahlangu', '/avatar-zandi.png',
      'Campus res', 0.2, 'Natural-hair studio right on campus — curl definition, silk presses and honest product advice.',
      ['braids', 'skin'], ['/work-curls.png'], 4.6, 33),
    mkSalon('salon_makeup', 'Makeup by Mila', 'user_mila', 'Mila Petersen', '/avatar-mila.png',
      'Kingsway', 1.5, 'Soft glam to full graduation glam under Hollywood bulbs. Camera-ready, always.',
      ['makeup'], ['/work-makeup.png'], 4.9, 41),
    mkSalon('salon_kingsway', 'Kingsway Kuts', 'user_brian', 'Brian Chikore', '/avatar-brian.png',
      'Kingsway', 1.4, 'Clean modern unisex cuts, colour touch-ups and quick trims between lectures.',
      ['barber', 'braids'], ['/work-fade.png', '/work-curls.png'], 4.5, 60),
  ];

  // ── services ──
  const svc = (
    id: string, salonId: string, name: string, category: CategoryKey, blurb: string,
    durationMin: number, price: number, image: string,
  ): Service => ({ id, salonId, name, category, blurb, durationMin, price, image, active: true });

  const services: Service[] = [
    svc('svc_glow_facial', 'salon_glow', 'Signature Glow Facial', 'skin', 'Deep-cleanse, steam and glow mask for tired study skin.', 45, 180, '/work-makeup.png'),
    svc('svc_glow_brows', 'salon_glow', 'Brow Shape & Tint', 'lashes', 'Crisp shaping with a tint that lasts weeks.', 20, 80, '/work-lashes.png'),
    svc('svc_glow_glam', 'salon_glow', 'Full Glam Makeup', 'makeup', 'Full face glam for birthdays and big nights out.', 60, 350, '/work-makeup.png'),
    svc('svc_braids_knotless', 'salon_braids', 'Knotless Braids (Waist)', 'braids', 'Waist-length knotless braids, hair included. Painless parts.', 240, 450, '/work-braids.png'),
    svc('svc_braids_box', 'salon_braids', 'Box Braids (Mid-back)', 'braids', 'Classic mid-back box braids, neat and light.', 210, 380, '/work-braids.png'),
    svc('svc_braids_cornrows', 'salon_braids', 'Cornrows', 'braids', 'Clean straight-backs or freestyle patterns.', 60, 150, '/work-braids.png'),
    svc('svc_braids_wig', 'salon_braids', 'Wig Install', 'braids', 'Lace melt, plucked hairline, styled to finish.', 90, 350, '/work-wig.png'),
    svc('svc_barber_fade', 'salon_barber', 'Skin Fade', 'barber', 'Zero-fade with razor-crisp lines.', 40, 120, '/work-fade.png'),
    svc('svc_barber_beard', 'salon_barber', 'Beard Sculpt', 'barber', 'Shape, line-up and hot-towel finish.', 20, 60, '/work-fade.png'),
    svc('svc_barber_full', 'salon_barber', 'Cut + Fade + Beard', 'barber', 'The full gentleman service, one chair, one hour.', 60, 160, '/work-fade.png'),
    svc('svc_lash_classic', 'salon_lash', 'Classic Lash Set', 'lashes', 'Natural 1:1 classic extensions, soft and fluttery.', 90, 280, '/work-lashes.png'),
    svc('svc_lash_volume', 'salon_lash', 'Volume Lash Set', 'lashes', 'Handmade fans for a full, dramatic look.', 120, 350, '/work-lashes.png'),
    svc('svc_lash_fill', 'salon_lash', 'Lash Fill (2–3 weeks)', 'lashes', 'Top-up for existing sets, good as new.', 60, 150, '/work-lashes.png'),
    svc('svc_nails_gel', 'salon_nails', 'Gel Overlay', 'nails', 'Chip-proof gel on natural nails, art optional.', 60, 180, '/work-gel.png'),
    svc('svc_nails_acrylic', 'salon_nails', 'Acrylic Full Set', 'nails', 'Length, shape and colour — your design or ours.', 90, 250, '/work-nails.png'),
    svc('svc_nails_chrome', 'salon_nails', 'Chrome Nails', 'nails', 'Mirror-chrome finish that catches every light.', 75, 220, '/work-gel.png'),
    svc('svc_curls_definition', 'salon_curls', 'Curl Definition Session', 'braids', 'Wash, deep-condition and defined coil set.', 60, 150, '/work-curls.png'),
    svc('svc_curls_silk', 'salon_curls', 'Silk Press', 'braids', 'Silky-smooth press with heat protection, no damage.', 90, 220, '/work-curls.png'),
    svc('svc_curls_wash', 'salon_curls', 'Wash & Treat', 'skin', 'Clarifying wash and scalp treatment between styles.', 40, 100, '/work-curls.png'),
    svc('svc_makeup_grad', 'salon_makeup', 'Graduation Glam', 'makeup', 'The ceremony look — long-wear, photo-proof, lashes included.', 75, 400, '/work-makeup.png'),
    svc('svc_makeup_soft', 'salon_makeup', 'Soft Glam', 'makeup', 'Everyday-soft glam for brunch or date night.', 50, 300, '/work-makeup.png'),
    svc('svc_makeup_shoot', 'salon_makeup', 'Photoshoot Beat', 'makeup', 'HD camera-ready full beat for shoots and grad portraits.', 80, 450, '/work-makeup.png'),
    svc('svc_kingsway_gents', 'salon_kingsway', "Gent's Cut", 'barber', 'Quick, clean gents cut between lectures.', 30, 100, '/work-fade.png'),
    svc('svc_kingsway_ladies', 'salon_kingsway', 'Ladies Trim & Style', 'braids', 'Dust-off trim with a blowout finish.', 45, 130, '/work-curls.png'),
    svc('svc_kingsway_colour', 'salon_kingsway', 'Colour Touch-up', 'makeup', 'Root touch-up or tone refresh, patch test included.', 75, 250, '/work-curls.png'),
  ];

  // ── specials (live) ──
  const sp = (
    id: string, serviceId: string, salonId: string, kind: 'percent' | 'amount', value: number,
    endsInDays: number, createdBy: 'admin' | 'owner', status: SpecialStatus, graduation = false,
  ): Special => ({
    id, serviceId, salonId, kind, value,
    startsAt: now - 1 * DAY, endsAt: now + endsInDays * DAY + 4 * HOUR,
    status, createdBy, graduation, createdAt: now - 1 * DAY,
  });
  const specials: Special[] = [
    sp('sp_braids', 'svc_braids_knotless', 'salon_braids', 'percent', 30, 2, 'admin', 'approved'),
    sp('sp_nails', 'svc_nails_acrylic', 'salon_nails', 'percent', 25, 1, 'admin', 'approved'),
    sp('sp_barber', 'svc_barber_fade', 'salon_barber', 'amount', 20, 3, 'admin', 'approved'),
    sp('sp_lash', 'svc_lash_classic', 'salon_lash', 'percent', 20, 2, 'admin', 'approved'),
    sp('sp_grad', 'svc_makeup_grad', 'salon_makeup', 'percent', 30, 6, 'admin', 'approved', true),
    sp('sp_curls_pending', 'svc_curls_definition', 'salon_curls', 'percent', 15, 4, 'owner', 'pending'),
  ];

  // ── reviews (display docs; aggregates live on salons) ──
  const rv = (
    salonId: string, userName: string, rating: number, text: string, serviceName: string, daysAgo: number,
  ): Review => ({
    id: uid('rev'), salonId, userId: 'user_lufuno', userName, rating, text, serviceName,
    verified: true, createdAt: now - daysAgo * DAY,
  });
  const reviews: Review[] = [
    rv('salon_braids', 'Lufuno M.', 5, 'My knotless braids are immaculate — parts so clean my mom thought I went home to Joburg. Zero pain, zero tension.', 'Knotless Braids (Waist)', 3),
    rv('salon_braids', 'Anelisa K.', 5, 'Naledi finished waist-length braids in four hours flat and they lasted me the whole term. Best R450 I have spent at Rhodes.', 'Knotless Braids (Waist)', 9),
    rv('salon_braids', 'Tendai R.', 5, 'Booked at 8am, paid with the Vault code in res, braids done by lunch. The system just works.', 'Box Braids (Mid-back)', 15),
    rv('salon_lash', 'Micaela D.', 5, 'Fell asleep in the loft, woke up with the softest classic set. Three weeks later they still look fresh.', 'Classic Lash Set', 4),
    rv('salon_lash', 'Kagiso P.', 5, 'Volume set survived graduation photos AND the after-party. Lerato is an artist.', 'Volume Lash Set', 11),
    rv('salon_nails', 'Zinhle N.', 5, 'Thandi hand-painted tiny proteas on my acrylics for grad. I cannot stop staring at my hands.', 'Acrylic Full Set', 2),
    rv('salon_nails', 'Robyn S.', 4, 'Chrome set is unreal in sunlight. Only note: book early, her Saturdays go fast.', 'Chrome Nails', 8),
    rv('salon_barber', 'Siya M.', 5, 'Sharpest fade in Makhanda, no debate. The hot towel finish is elite.', 'Skin Fade', 5),
    rv('salon_barber', 'Daniel O.', 5, 'Walked in scruffy before a job interview, walked out employable. R120 well spent.', 'Cut + Fade + Beard', 12),
    rv('salon_glow', 'Hannah B.', 5, 'The glow facial rescued my exam-season skin. Ama is gentle and the space is gorgeous.', 'Signature Glow Facial', 6),
    rv('salon_glow', 'Lerato M.', 4, 'Brow shape and tint for R80?? On High Street?? Unbeatable.', 'Brow Shape & Tint', 14),
    rv('salon_makeup', 'Emma V.', 5, 'Mila did my grad glam at 6am with a smile. Photos look like a magazine cover.', 'Graduation Glam', 7),
    rv('salon_makeup', 'Nandi T.', 5, 'Soft glam that lasted through a whole wedding. Booked again for ball.', 'Soft Glam', 16),
    rv('salon_curls', 'Palesa J.', 5, 'Zandi actually taught me how to care for my curls instead of just styling them. Definition for days.', 'Curl Definition Session', 10),
    rv('salon_kingsway', 'Josh W.', 4, 'In and out in 25 minutes between lectures, clean cut every time.', "Gent's Cut", 13),
    rv('salon_kingsway', 'Ayesha F.', 4, 'Colour touch-up was quick and my curls stayed healthy. Great value.', 'Colour Touch-up', 20),
  ];

  // ── graduation event (approaching; bell not yet rung) ──
  const gradDate = new Date(now + 12 * DAY);
  const p = (n: number) => String(n).padStart(2, '0');
  const events: AcademicEvent[] = [{
    id: 'event_grad_2026', title: 'Rhodes University Graduation Ceremony 2026',
    date: `${gradDate.getFullYear()}-${p(gradDate.getMonth() + 1)}-${p(gradDate.getDate())}`,
    kind: 'graduation', bellRung: false, createdAt: now - 5 * DAY,
  }];

  // ── one confirmed demo booking for the demo customer ──
  const bkId = 'bk_demo_1';
  const pcId = 'pc_demo_1';
  const inTwoDays = new Date(now + 2 * DAY);
  const bookings: Booking[] = [{
    id: bkId, userId: 'user_lufuno', salonId: 'salon_braids', serviceId: 'svc_braids_cornrows',
    date: `${inTwoDays.getFullYear()}-${p(inTwoDays.getMonth() + 1)}-${p(inTwoDays.getDate())}`,
    time: '10:00', status: 'confirmed', priceCharged: 150, paymentCodeId: pcId,
    ticketCode: 'T-GRAD0427', createdAt: now - 1 * DAY,
  }];
  const paymentCodes: PaymentCode[] = [{
    id: pcId, code: 'YSL-7K2Q-9D4M', bookingId: bkId, amount: 150,
    status: 'confirmed', issuedAt: now - 1 * DAY, paidAt: now - 1 * DAY + 5 * 60000,
  }];

  const audit: AuditEntry[] = [{
    id: uid('aud'), actor: 'system', action: 'seed',
    detail: 'Demo store seeded with 8 salons, 25 services and live specials.', createdAt: now,
  }];

  return {
    version: STORE_VERSION,
    users: [admin, ...owners, demoCustomer],
    salons, services, specials, bookings, paymentCodes, reviews,
    settings: { theme: 'light', gradTheme: false },
    events, notifications: [], audit, resets: [],
    sessionUserId: null,
  };
}

// ───────────────────────────────────────────── Store core (persist+pub/sub) ────

function loadState(): StoreState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoreState;
      if (parsed && parsed.version === STORE_VERSION && Array.isArray(parsed.salons)) return parsed;
    }
  } catch {
    /* corrupted storage → reseed */
  }
  const seed = buildSeed();
  try { localStorage.setItem(STORE_KEY, JSON.stringify(seed)); } catch { /* ignore */ }
  return seed;
}

let state: StoreState = loadState();

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Mutate via updater, then persist + notify. All API writes go through commit(). */
function commit(mutate: (s: StoreState) => void): void {
  mutate(state);
  state = { ...state };
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

/** Read the raw state snapshot (stable reference between commits). */
export function getState(): StoreState {
  return state;
}

/** Reset everything back to seed data (used by admin "reset demo"). */
export function resetStore(): void {
  const seed = buildSeed();
  commit((s) => { Object.assign(s, seed); });
}

/**
 * React hook — subscribe components to the store.
 * Per-hook cache: the selector result recomputes only when the store state
 * changes, so derived arrays/objects stay reference-stable between commits
 * (safe with useSyncExternalStore). Selectors must depend ONLY on store
 * state (close over stable ids, not changing props) — or use useStoreState()
 * and derive locally with useMemo.
 */
export function useStore<T>(selector: (s: StoreState) => T): T {
  const cache = useRef<{ state: StoreState | null; result: T | null }>({ state: null, result: null });
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const getSnapshot = useCallback((): T => {
    if (cache.current.state !== state || cache.current.result === null) {
      cache.current = { state, result: selectorRef.current(state) };
    }
    return cache.current.result as T;
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** Whole-state subscription (stable snapshot reference between commits). */
export function useStoreState(): StoreState {
  return useSyncExternalStore(subscribe, () => state);
}

// ─────────────────────────────────────────────────────────── Theme sync ────

export function applyThemeToDocument(settings: SiteSettings): void {
  const el = document.documentElement;
  el.setAttribute('data-theme', settings.theme);
  el.setAttribute('data-grad', settings.gradTheme ? 'on' : 'off');
}

/** Call once in App: keeps <html data-theme data-grad> synced with the store. */
export function useThemeSync(): SiteSettings {
  const settings = useStore((s) => s.settings);
  applyThemeToDocument(settings);
  return settings;
}
applyThemeToDocument(state.settings); // paint correct theme before first render

// ─────────────────────────────────────────────────────────────── Audit ────

export function logAudit(actor: string, action: string, detail: string): void {
  commit((s) => { s.audit.unshift({ id: uid('aud'), actor, action, detail, createdAt: Date.now() }); });
}
export function getAuditLog(): AuditEntry[] { return state.audit; }

// ──────────────────────────────────────────────────────────── Auth/Users ────

export interface AuthResult { ok: boolean; error?: string; user?: User }

export function signup(input: { name: string; email: string; password: string; role?: Role; ageConfirmed?: boolean }): AuthResult {
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim()) return { ok: false, error: 'Please enter your name.' };
  if (!isGmail(email)) return { ok: false, error: 'Please use your personal Gmail address (e.g. example@gmail.com).' };
  if (input.password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
  if (input.role !== 'owner' && !input.ageConfirmed) return { ok: false, error: 'Please confirm you are 18 or older.' };
  if (state.users.some((u) => u.email.toLowerCase() === email)) return { ok: false, error: 'An account with this Gmail already exists — try signing in.' };
  const user: User = {
    id: uid('user'), name: input.name.trim(), email, password: input.password,
    role: input.role ?? 'customer', favourites: [], createdAt: Date.now(),
  };
  if (user.role === 'owner') {
    const salonId = uid('salon');
    user.salonId = salonId;
    commit((s) => {
      s.users.push(user);
      s.salons.push({
        id: salonId, slug: slugify(`${input.name}-salon-${salonId.slice(-4)}`),
        name: `${input.name.trim()}'s Salon`, ownerId: user.id, ownerName: user.name,
        avatar: '/avatar-ama.png', cover: '/salon-cover-glow.png', area: 'High Street',
        distanceKm: 0.5, blurb: 'A brand-new student salon on Young Space Lighty.',
        categories: ['braids'], schedule: sched(), gallery: [], approved: false, featured: false,
        ratingSum: 0, ratingCount: 0, createdAt: Date.now(),
      });
      s.sessionUserId = user.id;
      s.audit.unshift({ id: uid('aud'), actor: email, action: 'signup', detail: `New owner account + salon pending vetting.`, createdAt: Date.now() });
    });
  } else {
    commit((s) => { s.users.push(user); s.sessionUserId = user.id; });
  }
  return { ok: true, user };
}

export function login(email: string, password: string): AuthResult {
  const e = email.trim().toLowerCase();
  const user = state.users.find((u) => u.email.toLowerCase() === e);
  if (!user) return { ok: false, error: 'No account found for this Gmail address.' };
  if (user.password !== password) return { ok: false, error: 'Incorrect password — try again or reset it.' };
  commit((s) => { s.sessionUserId = user.id; });
  return { ok: true, user };
}

/** Admin console gate — accepts only the seeded admin credentials. */
export function adminLogin(email: string, password: string): AuthResult {
  const e = email.trim().toLowerCase();
  if (e !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return { ok: false, error: 'Invalid admin credentials.' };
  }
  const user = state.users.find((u) => u.email.toLowerCase() === ADMIN_EMAIL);
  commit((s) => { s.sessionUserId = user ? user.id : null; });
  logAudit(ADMIN_EMAIL, 'admin-login', 'Admin signed in to the console.');
  return { ok: true, user };
}

export function logout(): void {
  commit((s) => { s.sessionUserId = null; });
}

export function getCurrentUser(): User | null {
  if (!state.sessionUserId) return null;
  return state.users.find((u) => u.id === state.sessionUserId) ?? null;
}

export function requestPasswordReset(email: string): { ok: boolean; error?: string; resetLink?: string } {
  const e = email.trim().toLowerCase();
  const user = state.users.find((u) => u.email.toLowerCase() === e);
  if (!user) return { ok: false, error: 'No account found for this Gmail address.' };
  const token = uid('reset');
  commit((s) => { s.resets.push({ token, email: e, expiresAt: Date.now() + 3600_000 }); });
  return { ok: true, resetLink: `/reset-password?token=${token}` };
}

export function resetPassword(token: string, newPassword: string): AuthResult {
  const reset = state.resets.find((r) => r.token === token);
  if (!reset) return { ok: false, error: 'This reset link is invalid.' };
  if (reset.expiresAt < Date.now()) return { ok: false, error: 'This reset link has expired — request a new one.' };
  if (newPassword.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
  commit((s) => {
    const u = s.users.find((x) => x.email === reset.email);
    if (u) u.password = newPassword;
    s.resets = s.resets.filter((r) => r.token !== token);
  });
  return { ok: true };
}

export function toggleFavourite(salonId: string): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  let added = false;
  commit((s) => {
    const u = s.users.find((x) => x.id === user.id);
    if (!u) return;
    if (u.favourites.includes(salonId)) u.favourites = u.favourites.filter((f) => f !== salonId);
    else { u.favourites.push(salonId); added = true; }
  });
  return added;
}

export function getUserById(id: string): User | undefined {
  return state.users.find((u) => u.id === id);
}
export function getUsers(): User[] { return state.users; }

// ─────────────────────────────────────────────────────────────── Salons ────

export function getSalons(opts?: { approvedOnly?: boolean }): Salon[] {
  const list = opts?.approvedOnly === false ? state.salons : state.salons.filter((s) => s.approved);
  return list;
}
export function getSalon(id: string): Salon | undefined { return state.salons.find((s) => s.id === id); }
export function getSalonBySlug(slug: string): Salon | undefined { return state.salons.find((s) => s.slug === slug); }

export function updateSalon(id: string, patch: Partial<Salon>): void {
  commit((s) => {
    const salon = s.salons.find((x) => x.id === id);
    if (salon) Object.assign(salon, patch, { id });
  });
}

export function setSalonApproved(id: string, approved: boolean): void {
  commit((s) => {
    const salon = s.salons.find((x) => x.id === id);
    if (salon) salon.approved = approved;
  });
  const salon = getSalon(id);
  logAudit(getCurrentUser()?.email ?? 'admin', approved ? 'salon-approved' : 'salon-suspended', salon?.name ?? id);
}

/** Live rating aggregate for a salon (seeded aggregates + live reviews). */
export function getSalonRating(salonId: string): { avg: number; count: number; bayes: number } {
  const salon = getSalon(salonId);
  if (!salon || salon.ratingCount === 0) return { avg: 0, count: 0, bayes: 0 };
  const avg = salon.ratingSum / salon.ratingCount;
  return { avg, count: salon.ratingCount, bayes: bayesianScore(avg, salon.ratingCount) };
}

function globalMeanRating(): number {
  const total = state.salons.reduce((acc, s) => ({ sum: acc.sum + s.ratingSum, n: acc.n + s.ratingCount }), { sum: 0, n: 0 });
  return total.n ? total.sum / total.n : 4.5;
}

export function bayesianScore(avg: number, count: number): number {
  const C = globalMeanRating();
  return (count / (count + BAYES_M)) * avg + (BAYES_M / (count + BAYES_M)) * C;
}

export interface LeaderboardEntry {
  salon: Salon;
  rank: number;
  avg: number;
  count: number;
  score: number; // 0..5 bayesian
  scorePct: number; // 0..100 for bars
}

/** Top-N leaderboard, Bayesian-ranked. */
export function getLeaderboard(limit = 5): LeaderboardEntry[] {
  return state.salons
    .filter((s) => s.approved && s.ratingCount > 0)
    .map((s) => {
      const r = getSalonRating(s.id);
      return { salon: s, rank: 0, avg: r.avg, count: r.count, score: r.bayes, scorePct: (r.bayes / 5) * 100 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

/** True if the salon is open at this very moment (per its weekly schedule). */
export function isOpenNow(salon: Salon): boolean {
  const now = new Date();
  const key = DAY_KEYS[(now.getDay() + 6) % 7];
  const d = salon.schedule[key];
  if (!d.open) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = d.start.split(':').map(Number);
  const [eh, em] = d.end.split(':').map(Number);
  return cur >= sh * 60 + sm && cur < eh * 60 + em;
}

/** Human caption: "Open now · until 19:00" or "Opens Sat 10:00". */
export function openCaption(salon: Salon): string {
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7;
  const today = salon.schedule[DAY_KEYS[todayIdx]];
  if (isOpenNow(salon)) return `Open now · until ${today.end}`;
  for (let i = 0; i < 7; i++) {
    const idx = (todayIdx + i) % 7;
    const d = salon.schedule[DAY_KEYS[idx]];
    if (d.open) {
      const cur = now.getHours() * 60 + now.getMinutes();
      const [sh, sm] = d.start.split(':').map(Number);
      if (i === 0 && cur < sh * 60 + sm) return `Opens today ${d.start}`;
      if (i > 0) return `Opens ${DAY_SHORT[DAY_KEYS[idx]]} ${d.start}`;
    }
  }
  return 'Closed this week';
}

/** Lowest current (special-aware) price across a salon's active services. */
export function fromPrice(salonId: string): number | null {
  const prices = getServicesBySalon(salonId).map((sv) => getDiscountedPrice(sv.id).price);
  return prices.length ? Math.min(...prices) : null;
}

// ───────────────────────────────────────────────────────────── Services ────

export function getServicesBySalon(salonId: string): Service[] {
  return state.services.filter((sv) => sv.salonId === salonId && sv.active);
}
export function getService(id: string): Service | undefined { return state.services.find((s) => s.id === id); }
export function getAllServices(): Service[] { return state.services.filter((s) => s.active); }

export function createService(input: Omit<Service, 'id'>): Service {
  const service: Service = { ...input, id: uid('svc') };
  commit((s) => { s.services.push(service); });
  return service;
}
export function updateService(id: string, patch: Partial<Service>): void {
  commit((s) => {
    const sv = s.services.find((x) => x.id === id);
    if (sv) Object.assign(sv, patch, { id });
  });
}
export function deleteService(id: string): void {
  commit((s) => { s.services = s.services.filter((x) => x.id !== id); });
}

// ───────────────────────────────────────────────────────────── Specials ────

export function isSpecialLive(sp: Special, now = Date.now()): boolean {
  return sp.status === 'approved' && sp.startsAt <= now && sp.endsAt > now;
}

export function getActiveSpecials(): Special[] {
  const now = Date.now();
  return state.specials.filter((sp) => isSpecialLive(sp, now));
}
export function getPendingSpecials(): Special[] {
  return state.specials.filter((sp) => sp.status === 'pending');
}
export function getAllSpecials(): Special[] { return state.specials; }
export function getSpecialsBySalon(salonId: string): Special[] {
  return state.specials.filter((sp) => sp.salonId === salonId);
}

/** The live special applying to a service right now (best discount wins), or null. */
export function getSpecialForService(serviceId: string): Special | null {
  const live = getActiveSpecials().filter((sp) => sp.serviceId === serviceId);
  if (!live.length) return null;
  const svc = getService(serviceId);
  if (!svc) return live[0];
  return live.sort((a, b) => discountedAmount(svc.price, b) - discountedAmount(svc.price, a))[0];
}

function discountedAmount(base: number, sp: Special): number {
  const v = sp.kind === 'percent' ? base * (1 - sp.value / 100) : base - sp.value;
  return Math.max(0, Math.round(v));
}

/** Special-aware price resolution for a service. */
export function getDiscountedPrice(serviceId: string): {
  price: number; original: number; special: Special | null; percentOff: number | null;
} {
  const svc = getService(serviceId);
  if (!svc) return { price: 0, original: 0, special: null, percentOff: null };
  const special = getSpecialForService(serviceId);
  if (!special) return { price: svc.price, original: svc.price, special: null, percentOff: null };
  const price = discountedAmount(svc.price, special);
  const percentOff = special.kind === 'percent' ? special.value : Math.round((1 - price / svc.price) * 100);
  return { price, original: svc.price, special, percentOff };
}

/** Create a special: admin-created go live instantly; owner-created wait for approval. */
export function createSpecial(input: {
  serviceId: string; salonId: string; kind: 'percent' | 'amount'; value: number;
  endsAt: number; graduation?: boolean; createdBy: 'admin' | 'owner';
}): Special {
  const special: Special = {
    id: uid('sp'), serviceId: input.serviceId, salonId: input.salonId,
    kind: input.kind, value: input.value, startsAt: Date.now(), endsAt: input.endsAt,
    status: input.createdBy === 'admin' ? 'approved' : 'pending',
    createdBy: input.createdBy, graduation: input.graduation ?? false, createdAt: Date.now(),
  };
  commit((s) => { s.specials.push(special); });
  logAudit(getCurrentUser()?.email ?? 'system', 'special-created',
    `${input.kind === 'percent' ? `${input.value}%` : `R${input.value}`} off ${getService(input.serviceId)?.name ?? input.serviceId} (${special.status}).`);
  return special;
}

export function approveSpecial(id: string): void {
  commit((s) => {
    const sp = s.specials.find((x) => x.id === id);
    if (sp) { sp.status = 'approved'; sp.startsAt = Date.now(); }
  });
  logAudit(getCurrentUser()?.email ?? 'admin', 'special-approved', id);
}
export function rejectSpecial(id: string): void {
  commit((s) => {
    const sp = s.specials.find((x) => x.id === id);
    if (sp) sp.status = 'rejected';
  });
  logAudit(getCurrentUser()?.email ?? 'admin', 'special-rejected', id);
}
export function endSpecial(id: string): void {
  commit((s) => {
    const sp = s.specials.find((x) => x.id === id);
    if (sp) sp.status = 'expired';
  });
}

// ───────────────────────────────────────────────────────────── Bookings ────

/** Is a slot free for this salon (no overlapping active booking at that date/time)? */
export function isSlotAvailable(salonId: string, date: string, time: string): boolean {
  const now = Date.now();
  return !state.bookings.some(
    (b) => b.salonId === salonId && b.date === date && b.time === time &&
      (['code-issued', 'confirming', 'confirmed'] as BookingStatus[]).includes(b.status) ||
      (b.status === 'held' && (b.holdExpiresAt ?? 0) > now && b.salonId === salonId && b.date === date && b.time === time),
  );
}

/** Create a booking hold (10-minute countdown). Returns the booking or an error. */
export function createBooking(input: {
  userId: string; salonId: string; serviceId: string; date: string; time: string;
}): { ok: boolean; error?: string; booking?: Booking } {
  const svc = getService(input.serviceId);
  if (!svc) return { ok: false, error: 'Service not found.' };
  if (!isSlotAvailable(input.salonId, input.date, input.time)) {
    return { ok: false, error: 'That slot was just taken — pick another time.' };
  }
  const { price, special } = getDiscountedPrice(input.serviceId);
  const booking: Booking = {
    id: uid('bk'), userId: input.userId, salonId: input.salonId, serviceId: input.serviceId,
    date: input.date, time: input.time, status: 'held', priceCharged: price,
    specialId: special?.id, holdExpiresAt: Date.now() + HOLD_MS, createdAt: Date.now(),
  };
  commit((s) => { s.bookings.push(booking); });
  return { ok: true, booking };
}

/** Issue the single-use payment code for a held booking (moves to code-issued). */
export function issuePaymentCode(bookingId: string): PaymentCode | null {
  const booking = state.bookings.find((b) => b.id === bookingId);
  if (!booking || (booking.status !== 'held' && booking.status !== 'code-issued')) return null;
  if (booking.status === 'code-issued' && booking.paymentCodeId) {
    return state.paymentCodes.find((c) => c.id === booking.paymentCodeId) ?? null;
  }
  const code: PaymentCode = {
    id: uid('pc'), code: genPaymentCode(), bookingId, amount: booking.priceCharged,
    status: 'issued', issuedAt: Date.now(),
  };
  commit((s) => {
    s.paymentCodes.push(code);
    const b = s.bookings.find((x) => x.id === bookingId);
    if (b) { b.status = 'code-issued'; b.paymentCodeId = code.id; b.holdExpiresAt = Date.now() + HOLD_MS; }
  });
  return code;
}

/** Simulated Youna Venture Vault payment — code moves to paid, booking to confirming. */
export function payWithVault(codeId: string): { ok: boolean; error?: string } {
  const code = state.paymentCodes.find((c) => c.id === codeId);
  if (!code || code.status !== 'issued') return { ok: false, error: 'This code is no longer payable.' };
  commit((s) => {
    const c = s.paymentCodes.find((x) => x.id === codeId);
    if (c) { c.status = 'paid'; c.paidAt = Date.now(); }
    const b = s.bookings.find((x) => x.id === code.bookingId);
    if (b) b.status = 'confirming';
  });
  return { ok: true };
}

/** Confirm a paid code (auto-callback or manual admin action) → confirmed ticket. */
export function confirmPaymentCode(codeId: string): { ok: boolean; error?: string } {
  const code = state.paymentCodes.find((c) => c.id === codeId);
  if (!code || (code.status !== 'paid' && code.status !== 'issued')) {
    return { ok: false, error: 'This code cannot be confirmed.' };
  }
  const ticket = genTicketCode();
  commit((s) => {
    const c = s.paymentCodes.find((x) => x.id === codeId);
    if (c) c.status = 'confirmed';
    const b = s.bookings.find((x) => x.id === code.bookingId);
    if (b) { b.status = 'confirmed'; b.ticketCode = ticket; b.holdExpiresAt = undefined; }
  });
  const b = state.bookings.find((x) => x.id === code.bookingId);
  if (b) {
    const salon = getSalon(b.salonId);
    notify(b.userId, 'Booking confirmed', `Your booking at ${salon?.name ?? 'the salon'} is confirmed. Ticket ${ticket}.`, 'booking');
  }
  logAudit(getCurrentUser()?.email ?? 'vault', 'payment-confirmed', `${code.code} → ticket ${ticket}`);
  return { ok: true };
}

export function cancelBooking(id: string): void {
  commit((s) => {
    const b = s.bookings.find((x) => x.id === id);
    if (b && ['held', 'code-issued', 'confirmed'].includes(b.status)) {
      b.status = 'cancelled';
      if (b.paymentCodeId) {
        const c = s.paymentCodes.find((x) => x.id === b.paymentCodeId);
        if (c && c.status === 'issued') c.status = 'expired';
      }
    }
  });
}

export function markBookingCompleted(id: string): void {
  commit((s) => {
    const b = s.bookings.find((x) => x.id === id);
    if (b && b.status === 'confirmed') b.status = 'completed';
  });
}
export function markBookingNoShow(id: string): void {
  commit((s) => {
    const b = s.bookings.find((x) => x.id === id);
    if (b && b.status === 'confirmed') b.status = 'no-show';
  });
}

export function getBooking(id: string): Booking | undefined { return state.bookings.find((b) => b.id === id); }
export function getBookingsByUser(userId: string): Booking[] {
  return state.bookings.filter((b) => b.userId === userId).sort((a, b2) => b2.createdAt - a.createdAt);
}
export function getBookingsBySalon(salonId: string): Booking[] {
  return state.bookings.filter((b) => b.salonId === salonId).sort((a, b2) => b2.createdAt - a.createdAt);
}
export function getAllBookings(): Booking[] { return [...state.bookings].sort((a, b) => b.createdAt - a.createdAt); }
export function getPaymentCode(id: string): PaymentCode | undefined { return state.paymentCodes.find((c) => c.id === id); }
export function getAllPaymentCodes(): PaymentCode[] { return [...state.paymentCodes].sort((a, b) => b.issuedAt - a.issuedAt); }

/** Milliseconds left on a held booking (0 if expired/none). */
export function holdRemaining(booking: Booking): number {
  if (booking.status !== 'held' && booking.status !== 'code-issued') return 0;
  return Math.max(0, (booking.holdExpiresAt ?? 0) - Date.now());
}

/** Sweep: expire stale holds/codes and lapsed specials; notifies affected users. */
export function sweep(): void {
  const now = Date.now();
  const expiredBookings: Booking[] = [];
  const expiredSpecials: Special[] = [];
  for (const b of state.bookings) {
    if ((b.status === 'held' || b.status === 'code-issued') && (b.holdExpiresAt ?? Infinity) <= now) {
      expiredBookings.push(b);
    }
  }
  for (const sp of state.specials) {
    if (sp.status === 'approved' && sp.endsAt <= now) expiredSpecials.push(sp);
  }
  if (!expiredBookings.length && !expiredSpecials.length) return;
  commit((s) => {
    for (const eb of expiredBookings) {
      const b = s.bookings.find((x) => x.id === eb.id);
      if (b) b.status = 'expired';
      if (eb.paymentCodeId) {
        const c = s.paymentCodes.find((x) => x.id === eb.paymentCodeId);
        if (c && c.status === 'issued') c.status = 'expired';
      }
    }
    for (const esp of expiredSpecials) {
      const sp = s.specials.find((x) => x.id === esp.id);
      if (sp) sp.status = 'expired';
    }
  });
  for (const b of expiredBookings) {
    notify(b.userId, 'Slot hold expired', 'Your 10-minute slot hold expired — the slot was released. Book again anytime.', 'booking');
  }
}

// ────────────────────────────────────────────────────────────── Reviews ────

export function addReview(input: {
  salonId: string; userId: string; rating: number; text: string; serviceName?: string;
}): Review | null {
  const user = getUserById(input.userId);
  const salon = getSalon(input.salonId);
  if (!user || !salon) return null;
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const review: Review = {
    id: uid('rev'), salonId: input.salonId, userId: input.userId, userName: user.name,
    rating, text: input.text.trim(), serviceName: input.serviceName, verified: true, createdAt: Date.now(),
  };
  commit((s) => {
    s.reviews.unshift(review);
    const sl = s.salons.find((x) => x.id === input.salonId);
    if (sl) { sl.ratingSum += rating; sl.ratingCount += 1; }
  });
  return review;
}

export function getReviewsBySalon(salonId: string): Review[] {
  return state.reviews.filter((r) => r.salonId === salonId).sort((a, b) => b.createdAt - a.createdAt);
}
export function getReviewsByUser(userId: string): Review[] {
  return state.reviews.filter((r) => r.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
}
export function getAllReviews(): Review[] { return [...state.reviews].sort((a, b) => b.createdAt - a.createdAt); }

// ───────────────────────────────────────────────────── Settings / themes ────

export function getSettings(): SiteSettings { return state.settings; }

/** Dark-mode toggle (available to all users in the nav). */
export function setTheme(theme: Theme): void {
  commit((s) => { s.settings.theme = theme; });
}

/** Graduation theme overlay (admin only — composes with light/dark). */
export function setGradTheme(on: boolean): void {
  commit((s) => { s.settings.gradTheme = on; });
  logAudit(getCurrentUser()?.email ?? 'admin', on ? 'grad-theme-on' : 'grad-theme-off', 'Graduation theme overlay toggled.');
}

// ─────────────────────────────────────────────────────── Academic events ────

export function getEvents(): AcademicEvent[] { return state.events; }

/** Next upcoming graduation event (or null). */
export function getNextGraduation(): AcademicEvent | null {
  const today = todayIso();
  return state.events
    .filter((e) => e.kind === 'graduation' && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
}

/** Days until a date ISO (negative if past). */
export function daysUntil(dateIso: string): number {
  const now = new Date(todayIso() + 'T00:00:00');
  const then = new Date(dateIso + 'T00:00:00');
  return Math.round((then.getTime() - now.getTime()) / (24 * 3600 * 1000));
}

export function createEvent(input: { title: string; date: string; kind: 'graduation' | 'academic' }): AcademicEvent {
  const event: AcademicEvent = { id: uid('evt'), ...input, bellRung: false, createdAt: Date.now() };
  commit((s) => { s.events.push(event); });
  logAudit(getCurrentUser()?.email ?? 'admin', 'event-created', input.title);
  return event;
}

/** Ring the Graduation Bell — notifies every salon owner to create grad specials. */
export function ringTheBell(eventId: string): { ok: boolean; notified: number } {
  const event = state.events.find((e) => e.id === eventId);
  if (!event) return { ok: false, notified: 0 };
  const owners = state.users.filter((u) => u.role === 'owner');
  commit((s) => {
    const ev = s.events.find((e) => e.id === eventId);
    if (ev) ev.bellRung = true;
    for (const o of owners) {
      s.notifications.unshift({
        id: uid('ntf'), userId: o.id, title: 'Graduation Bell rung',
        body: `The Graduation Bell has been rung for "${event.title}" (${event.date}). Create a graduation special from your dashboard to be featured on the graduation page.`,
        kind: 'bell', read: false, createdAt: Date.now(),
      });
    }
  });
  logAudit(getCurrentUser()?.email ?? 'admin', 'bell-rung', `${event.title} — ${owners.length} owners notified.`);
  return { ok: true, notified: owners.length };
}

// ──────────────────────────────────────────────────────── Notifications ────

function notify(userId: string, title: string, body: string, kind: AppNotification['kind']): void {
  commit((s) => {
    s.notifications.unshift({ id: uid('ntf'), userId, title, body, kind, read: false, createdAt: Date.now() });
  });
}

export function getNotificationsFor(userId: string): AppNotification[] {
  return state.notifications.filter((n) => n.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
}
export function markNotificationRead(id: string): void {
  commit((s) => {
    const n = s.notifications.find((x) => x.id === id);
    if (n) n.read = true;
  });
}
export function markAllNotificationsRead(userId: string): void {
  commit((s) => { s.notifications.forEach((n) => { if (n.userId === userId) n.read = true; }); });
}
