'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Button } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { KeluargaTabBar } from '@/components/keluarga/KeluargaTabBar';
import { Anak, MpasiMenu } from '@/types/database';
import { getLinkedChildren } from '@/lib/tautanEngine';
import { calculateAgeInMonths } from '@/lib/utils';
import { verifyAndEnforceCacheSafety } from '@/lib/cacheSafety';
import {
  getMpasiMenu,
  getTodayMpasiLog,
  saveMpasiLog,
  cancelTodayMpasiLog,
} from '@/lib/mpasiEngine';
import {
  Utensils,
  CircleDot,
  Sparkles,
  Wheat,
  Egg,
  Drumstick,
  Fish,
  Heart,
  Square,
  Layers,
  Carrot,
  Leaf,
  Sun,
  Smile,
  Apple,
  Droplets,
  Box,
  CircleCheck,
  RotateCcw,
  AlertCircle,
  Calendar,
  User,
  ChevronLeft,
} from 'lucide-react';

export default function CatatMpasiPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeChild, setActiveChild] = useState<Anak | null>(null);
  const [loading, setLoading] = useState(true);
  const [menus, setMenus] = useState<MpasiMenu[]>([]);
  const [selectedMenuIds, setSelectedMenuIds] = useState<Set<string | number>>(new Set());
  const [initialLoggedIds, setInitialLoggedIds] = useState<Set<string | number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        let userPayload: any = null;

        // 1. Check real Supabase user
        try {
          const { data } = await supabase.auth.getUser();
          if (data.user) {
            userPayload = {
              id: data.user.id,
              role: data.user.user_metadata?.role || 'pengasuh',
              nama: data.user.user_metadata?.nama || 'Pengasuh',
            };
          }
        } catch {
          // ignore
        }

        // 2. Dev session cookie fallback
        if (!userPayload && typeof document !== 'undefined') {
          const match = document.cookie.match(/sg_dev_session=([^;]+)/);
          if (match) {
            try {
              userPayload = JSON.parse(decodeURIComponent(match[1]));
            } catch {
              userPayload = null;
            }
          }
        }

        if (!userPayload) {
          router.push('/login');
          return;
        }

        setCurrentUser(userPayload);

        // Enforce cache safety before displaying any child data
        await verifyAndEnforceCacheSafety(userPayload.id);

        // 3. Load linked children
        const linked = await getLinkedChildren(userPayload.id, supabase);
        if (linked.length === 0) {
          router.push('/keluarga/tautkan');
          return;
        }

        // Selected child
        let chosen = linked[0].child;
        if (typeof window !== 'undefined') {
          const savedId = localStorage.getItem('sg_selected_child_id');
          if (savedId) {
            const matchChild = linked.find((l) => l.child.id === savedId);
            if (matchChild) chosen = matchChild.child;
          }
        }
        setActiveChild(chosen);

        // 4. Load MPASI menu filtered by child's age
        const ageMonths = calculateAgeInMonths(chosen.tgl_lahir);
        const menuList = await getMpasiMenu(ageMonths, supabase);
        setMenus(menuList);

        // 5. Load today's already logged items
        const todayLogs = await getTodayMpasiLog(chosen.id, userPayload.id, supabase);
        const loggedSet = new Set(todayLogs.map((l) => l.menu_id));
        setSelectedMenuIds(new Set(loggedSet));
        setInitialLoggedIds(new Set(loggedSet));
      } catch (err) {
        console.error('Error initializing catat page:', err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  // Group menus by kelompok
  const groupedMenus = useMemo(() => {
    const groups: Record<string, MpasiMenu[]> = {};
    for (const item of menus) {
      if (!groups[item.kelompok]) {
        groups[item.kelompok] = [];
      }
      groups[item.kelompok].push(item);
    }
    return groups;
  }, [menus]);

  // Toggle item selection on tap
  const handleToggleSelect = (menuId: string | number) => {
    setStatusMessage(null);
    setSelectedMenuIds((prev) => {
      const next = new Set(prev);
      if (next.has(menuId)) {
        next.delete(menuId);
      } else {
        next.add(menuId);
      }
      return next;
    });
  };

  // Save today's log
  const handleSave = async () => {
    if (!activeChild || !currentUser) return;
    if (selectedMenuIds.size === 0) {
      setStatusMessage({
        type: 'info',
        text: 'Pilih minimal satu menu makanan yang dikonsumsi anak Anda hari ini.',
      });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const result = await saveMpasiLog(
        activeChild.id,
        currentUser.id,
        Array.from(selectedMenuIds),
        supabase
      );

      setInitialLoggedIds(new Set(selectedMenuIds));
      setShowCelebration(true);

      if (result.isOffline) {
        setStatusMessage({
          type: 'info',
          text: 'Tersimpan di HP, akan dikirim saat ada sinyal.',
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: 'Catatan makanan berhasil disimpan!',
        });
      }

      // Hide celebration modal after 2.5 seconds
      setTimeout(() => {
        setShowCelebration(false);
      }, 2500);
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Terjadi kendala saat menyimpan. Data tetap dicoba disimpan secara offline.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Cancel today's logs
  const handleCancelToday = async () => {
    if (!activeChild || !currentUser) return;
    if (!window.confirm('Batalkan catatan makanan untuk hari ini?')) return;

    setSaving(true);
    try {
      await cancelTodayMpasiLog(activeChild.id, currentUser.id, supabase);
      setSelectedMenuIds(new Set());
      setInitialLoggedIds(new Set());
      setStatusMessage({
        type: 'info',
        text: 'Catatan makanan hari ini telah dibatalkan.',
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Gagal membatalkan catatan hari ini.',
      });
    } finally {
      setSaving(false);
    }
  };

  const renderIcon = (ikon: string) => {
    switch (ikon) {
      case 'Utensils':
        return <Utensils size={28} className="text-primary" />;
      case 'CircleDot':
        return <CircleDot size={28} className="text-amber-600" />;
      case 'Sparkles':
        return <Sparkles size={28} className="text-amber-500" />;
      case 'Wheat':
        return <Wheat size={28} className="text-yellow-600" />;
      case 'Egg':
        return <Egg size={28} className="text-amber-600" />;
      case 'Drumstick':
        return <Drumstick size={28} className="text-orange-600" />;
      case 'Fish':
        return <Fish size={28} className="text-teal" />;
      case 'Heart':
        return <Heart size={28} className="text-red" />;
      case 'Beef':
        return <Drumstick size={28} className="text-rose-700" />;
      case 'Square':
        return <Square size={28} className="text-amber-400" />;
      case 'Layers':
        return <Layers size={28} className="text-amber-700" />;
      case 'Carrot':
        return <Carrot size={28} className="text-orange-500" />;
      case 'Leaf':
        return <Leaf size={28} className="text-green" />;
      case 'Sun':
        return <Sun size={28} className="text-amber-500" />;
      case 'Smile':
        return <Smile size={28} className="text-yellow-500" />;
      case 'Apple':
        return <Apple size={28} className="text-rose-500" />;
      case 'Droplets':
        return <Droplets size={28} className="text-cyan-600" />;
      case 'Box':
        return <Box size={28} className="text-yellow-600" />;
      default:
        return <Utensils size={28} className="text-primary" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-8 flex flex-col justify-center items-center max-w-[480px] mx-auto w-full">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
        <p className="text-[16px] font-semibold text-text-muted">Memuat menu MP-ASI...</p>
      </div>
    );
  }

  const childAgeMonths = activeChild ? calculateAgeInMonths(activeChild.tgl_lahir) : 0;
  const hasLoggedToday = initialLoggedIds.size > 0;

  return (
    <main className="min-h-screen px-4 py-6 flex flex-col justify-between max-w-[480px] mx-auto w-full pb-36">
      <div className="space-y-6">
        {/* Top Header with Back, Title & SyncStatusBadge */}
        <header className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/keluarga')}
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-white border border-border flex items-center justify-center text-text hover:border-primary transition-colors cursor-pointer"
              aria-label="Kembali"
            >
              <ChevronLeft size={24} strokeWidth={2} />
            </button>
            <div>
              <span className="text-[13px] font-bold text-teal uppercase tracking-wider block">
                Catatan Harian
              </span>
              <h1 className="text-[22px] font-extrabold text-text leading-tight">
                Catat MP-ASI
              </h1>
            </div>
          </div>

          <SyncStatusBadge />
        </header>

        {/* Child Info Banner */}
        {activeChild && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[14px]">
                {activeChild.nama.charAt(0)}
              </div>
              <div>
                <span className="text-[15px] font-bold text-text block leading-tight">
                  {activeChild.nama}
                </span>
                <span className="text-[13px] text-text-muted">
                  Usia: {childAgeMonths} Bulan (Tampil menu usia ≤ {childAgeMonths} bln)
                </span>
              </div>
            </div>

            {hasLoggedToday && (
              <button
                type="button"
                onClick={handleCancelToday}
                disabled={saving}
                className="text-[13px] font-bold text-red hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Batalkan</span>
              </button>
            )}
          </div>
        )}

        {/* Status Toast / Alert Banner */}
        {statusMessage && (
          <div
            role="alert"
            className={`p-4 rounded-2xl border flex items-start gap-3 animate-fadeIn ${
              statusMessage.type === 'success'
                ? 'bg-green-light border-green/40 text-green'
                : statusMessage.type === 'error'
                ? 'bg-red-light border-red/40 text-red'
                : 'bg-teal-light border-teal/40 text-teal'
            }`}
          >
            <AlertCircle size={22} className="flex-shrink-0 mt-0.5" />
            <p className="text-[15px] font-semibold leading-snug">{statusMessage.text}</p>
          </div>
        )}

        {/* Menu Cards Grouped by Kelompok */}
        <div className="space-y-6">
          {Object.entries(groupedMenus).map(([groupTitle, items]) => (
            <section key={groupTitle} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-bold text-text flex items-center gap-2">
                  <span className="w-2 h-4 rounded-full bg-primary" />
                  {groupTitle}
                </h2>
                <span className="text-[13px] font-semibold text-text-muted">
                  {items.filter((it) => selectedMenuIds.has(it.id)).length} dipilih
                </span>
              </div>

              {/* Grid of Picture Cards */}
              <div className="grid grid-cols-2 gap-3">
                {items.map((menu) => {
                  const isSelected = selectedMenuIds.has(menu.id);

                  return (
                    <button
                      key={menu.id}
                      type="button"
                      id={`menu-card-${menu.id}`}
                      onClick={() => handleToggleSelect(menu.id)}
                      className={`min-h-[96px] p-3 rounded-2xl border-2 flex flex-col items-center text-center justify-between transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-[#F9E9ED] border-[#A72449] shadow-soft scale-[1.02]'
                          : 'bg-white border-border hover:border-slate-300'
                      }`}
                    >
                      {/* Check Icon Badge for Selected State */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                          <CircleCheck size={16} strokeWidth={2.5} />
                        </div>
                      )}

                      <div className="p-2.5 rounded-2xl bg-white border border-border/60 shadow-xs mb-1.5">
                        {renderIcon(menu.ikon)}
                      </div>

                      <span
                        className={`text-[14px] font-bold leading-snug ${
                          isSelected ? 'text-primary' : 'text-text'
                        }`}
                      >
                        {menu.nama}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Bottom Save Action Button (Min Height 54px) */}
        <div className="pt-2">
          <Button
            id="btn-simpan-catatan-mpasi"
            variant="primary"
            size="kader"
            loading={saving}
            onClick={handleSave}
            className="min-h-[54px] text-[17px] font-bold shadow-soft"
          >
            {hasLoggedToday ? 'Perbarui Catatan Hari Ini' : 'Simpan Catatan Hari Ini'}
          </Button>
        </div>
      </div>

      {/* Cheerful Avatar Confirmation Modal */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="p-6 rounded-3xl bg-white border-2 border-primary/20 shadow-2xl max-w-xs w-full text-center flex flex-col items-center">
            {/* Celebration Sparkles & Graphic */}
            <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3 animate-bounce-subtle">
              <Sparkles size={40} strokeWidth={2.2} />
            </div>

            <h3 className="text-[20px] font-extrabold text-text leading-tight mb-1">
              Terima kasih sudah mencatat!
            </h3>

            <p className="text-[14px] text-text-muted leading-relaxed mb-4">
              Kebiasaan mencatat makanan Anda sangat berharga untuk tumbuh kembang anak Anda.
            </p>

            <span className="inline-block px-3 py-1 rounded-full bg-green-light text-green text-[13px] font-bold">
              +50 Poin Kebiasaan Hari Ini
            </span>
          </div>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <KeluargaTabBar />
    </main>
  );
}
