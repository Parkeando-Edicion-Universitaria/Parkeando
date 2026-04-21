'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { m, AnimatePresence } from 'framer-motion';
import { Shield, Check, ArrowLeft, Shirt, Loader2, Coins } from 'lucide-react';
import { sileo } from 'sileo';
import { useAuthStore } from '@/store/authStore';
import { truncateSingleLineWithPretext } from '@/lib/pretext';
import { PANAMA_ICON_COLLECTION, PANAMA_ICON_IDS } from '@/lib/panama-icons';

export default function ShopPage() {
    const router = useRouter();
    const { user, tokens, safeAuthenticatedFetch } = useAuthStore();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [missingPanamaIcons, setMissingPanamaIcons] = useState<Record<string, boolean>>({});
    const shopToastPosition: 'top-center' | 'bottom-center' = isMobile ? 'top-center' : 'bottom-center';
    const SHOP_TOAST_DURATION = 4200;

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const updateMobileState = () => {
            setIsMobile(window.innerWidth < 768);
        };
        updateMobileState();
        window.addEventListener('resize', updateMobileState);
        return () => {
            window.removeEventListener('resize', updateMobileState);
        };
    }, []);

    const clearShopToasts = useCallback(() => {
        sileo.clear(shopToastPosition);
    }, [shopToastPosition]);

    const shopError = useCallback((title: string, description?: string) => {
        clearShopToasts();
        sileo.error({
            title,
            description,
            duration: SHOP_TOAST_DURATION,
            position: shopToastPosition,
        });
    }, [clearShopToasts, shopToastPosition]);

    const shopSuccess = useCallback((title: string, description?: string) => {
        clearShopToasts();
        sileo.success({
            title,
            description,
            duration: SHOP_TOAST_DURATION,
            position: shopToastPosition,
        });
    }, [clearShopToasts, shopToastPosition]);

    const panamaCatalogIdSet = useMemo(() => new Set(PANAMA_ICON_IDS), []);

    const catalogById = useMemo(() => {
        const catalog = data?.catalog;
        if (!Array.isArray(catalog)) {
            return new Map<string, any>();
        }
        return new Map<string, any>(catalog.map((item: any) => [item.id, item]));
    }, [data?.catalog]);

    const standardCatalogItems = useMemo(() => {
        const catalog = data?.catalog;
        if (!Array.isArray(catalog)) {
            return [];
        }

        return catalog.filter((item: any) => !panamaCatalogIdSet.has(item.id));
    }, [data?.catalog, panamaCatalogIdSet]);

    const truncatedCatalogTitleById = useMemo(() => {
        const truncated = new Map<string, string>();
        const catalog = data?.catalog;

        if (!Array.isArray(catalog)) {
            return truncated;
        }

        catalog.forEach((item: any) => {
            truncated.set(
                item.id,
                truncateSingleLineWithPretext(item.name || '', {
                    font: '700 20px ui-sans-serif, system-ui, sans-serif',
                    maxWidth: 220,
                    lineHeight: 28,
                })
            );
        });

        return truncated;
    }, [data?.catalog]);

    const fetchShop = async () => {
        if (!tokens?.accessToken) return;
        setLoading(true);
        const res = await safeAuthenticatedFetch<any>('/api/shop', {
            headers: { Authorization: `Bearer ${tokens.accessToken}` }
        });

        if (res.ok) {
            setData(res.value);
        } else {
            console.error(res.error);
            shopError('No se pudo cargar la tienda en este momento.');
        }
        setLoading(false);
    };

    useEffect(() => {
        clearShopToasts();

        // Solo ejecuta la query si tenemos el token hidratado del estado
        if (tokens?.accessToken) {
            fetchShop();
        }
        return () => {
            clearShopToasts();
        };
    }, [tokens?.accessToken, clearShopToasts]);

    const buyItem = async (itemId: string) => {
        const item = data?.catalog?.find((i: any) => i.id === itemId);
        if (!item) return;

        const stableId = 'shop-buy-confirm';
        clearShopToasts();
        sileo.action({
            title: 'Confirmar compra',
            description: `¿Comprar ${truncateSingleLineWithPretext(item.name, { font: '400 14px ui-sans-serif, system-ui, sans-serif', maxWidth: 180, lineHeight: 20 })} por B/. ${item.price}?`,
            duration: 9000,
            autopilot: { expand: 1, collapse: 6500 },
            position: shopToastPosition,
            ...({ id: stableId } as any),
            button: {
                title: 'Comprar',
                onClick: async () => {
                    const res = await safeAuthenticatedFetch<{ message: string }>('/api/shop', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${tokens?.accessToken}`
                        },
                        body: JSON.stringify({ itemId })
                    });

                    if (res.ok) {
                        shopSuccess(res.value.message);
                        fetchShop();
                    } else {
                        shopError(res.error.message);
                    }

                    sileo.dismiss(stableId);
                }
            }
        });
    };

    const equipItem = async (itemId: string, action: 'equip' | 'unequip' = 'equip') => {
        const res = await safeAuthenticatedFetch<{ message: string }>('/api/shop/equip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokens?.accessToken}`
            },
            body: JSON.stringify({ itemId, action })
        });

        if (res.ok) {
            shopSuccess(res.value.message);
            fetchShop();
        } else {
            shopError(res.error.message);
        }
    };

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-panama-yellow animate-spin" /></div>;

    return (
        <div className="relative min-h-dvh bg-background px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top)+1rem)] sm:pt-20">
            {/* Ambiental */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-125 h-125 bg-panama-yellow/10 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 w-100 h-100 bg-panama-blue/10 rounded-full blur-3xl opacity-50" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[60px_60px]" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto space-y-6">

                {/* Encabezado */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 glass rounded-2xl p-5 sm:p-6 shadow-xl">
                    <div className="flex items-center gap-3 sm:gap-4 overflow-hidden w-full">
                        <button 
                            onClick={() => {
                                clearShopToasts();
                                router.push('/lobby');
                            }} 
                            className="p-3 glass-strong hover:bg-white/20 rounded-xl transition-all active:scale-90 shrink-0 border border-white/10"
                            aria-label="Volver al lobby"
                        >
                            <ArrowLeft className="w-5 h-5 text-foreground" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2 tracking-tight">
                                <Shirt className="w-6 h-6 sm:w-8 sm:h-8 text-panama-yellow" /> Tienda
                            </h1>
                            <p className="text-xs sm:text-sm text-muted-foreground font-medium opacity-80 uppercase tracking-wider">Viste tu pieza con estilo</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 glass-strong rounded-full px-6 sm:px-8 py-2 sm:py-2.5 border border-panama-yellow/40 bg-panama-yellow/10 self-end sm:self-auto shadow-[0_0_20px_rgba(255,206,0,0.15)] ring-1 ring-panama-yellow/20 whitespace-nowrap">
                        <Coins className="w-5 h-5 text-panama-yellow" />
                        <span className="font-bold text-xl sm:text-2xl text-panama-yellow tabular-nums">
                            B/. {data?.balance || 0} <span className="text-xs sm:text-sm opacity-70 ml-1 font-medium tracking-normal">Balboa</span>
                        </span>
                    </div>
                </div>

                {/* Catalog Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {standardCatalogItems.map((item: any, i: number) => {
                            const owned = data.inventory?.includes(item.id);
                            const equipped = Object.values(data.equipped || {}).includes(item.id);

                            return (
                                <m.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ 
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 25,
                                        layout: { duration: 0.3 }
                                    }}
                                    className={`glass rounded-2xl p-5 border-2 transition-all duration-300 relative overflow-hidden group ${equipped ? 'border-panama-green shadow-[0_0_20px_rgba(0,186,113,0.15)] bg-panama-green/5' : 'border-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 sm:w-14 sm:h-14 glass-strong rounded-xl flex items-center justify-center text-3xl sm:text-4xl shadow-lg">
                                            {typeof item.icon === 'string' && item.icon.startsWith('/') ? (
                                                <Image
                                                    src={item.icon}
                                                    alt={item.name}
                                                    width={56}
                                                    height={56}
                                                    className="w-9 h-9 sm:w-11 sm:h-11 object-contain"
                                                    unoptimized
                                                />
                                            ) : (
                                                item.icon
                                            )}
                                        </div>
                                        {owned ? (
                                            equipped ? (
                                                <div className="flex items-center gap-1 text-[10px] sm:text-xs font-black text-panama-green bg-panama-green/20 px-2 py-1 rounded-lg border border-panama-green/30 tracking-wider">
                                                    <Check className="w-3 h-3" /> EQUIPADO
                                                </div>
                                            ) : (
                                                <div className="text-[10px] sm:text-xs font-black text-muted-foreground bg-white/10 px-2 py-1 rounded-lg border border-white/5 tracking-wider">
                                                    INVENTARIO
                                                </div>
                                            )
                                        ) : (
                                            <div className="flex items-center gap-1 font-black text-panama-yellow text-base sm:text-lg">
                                                <Coins className="w-4 h-4 text-panama-yellow" />
                                                B/. {item.price}
                                            </div>
                                        )}
                                    </div>
 
                                    <h3 className="font-bold text-xl mb-1 group-hover:text-panama-yellow transition-colors">{truncatedCatalogTitleById.get(item.id) || item.name}</h3>
                                    <p className="text-sm text-muted-foreground/80 line-clamp-2 min-h-12 mb-6 leading-relaxed">
                                        {item.description}
                                    </p>


                                    <div className="mt-auto">
                                        {owned ? (
                                            <button
                                                onClick={() => equipItem(item.id, equipped ? 'unequip' : 'equip')}
                                    className={`w-full py-3 rounded-xl font-bold transition-all active:scale-95 ${equipped
                                                    ? 'bg-white/10 text-white hover:bg-white/20'
                                                    : 'bg-panama-blue hover:bg-panama-blue/90 text-white'
                                                    }`}
                                            >
                                                {equipped ? 'Quitar' : 'Equipar'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => buyItem(item.id)}
                                                disabled={data.balance < item.price}
                                                className={`w-full py-3 rounded-xl font-bold transition-all active:scale-95 ${data.balance >= item.price
                                                    ? 'bg-panama-yellow text-background hover:bg-yellow-400'
                                                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                                                    }`}
                                            >
                                                Comprar
                                            </button>
                                        )}
                                    </div>
                                </m.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Colección de íconos de Panamá */}
                <m.section
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.4 }}
                    className="glass rounded-2xl p-5 sm:p-6 border border-white/10"
                >
                    <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                        <div>
                            <h2 className="text-lg sm:text-2xl font-black tracking-tight text-panama-yellow">Coleccion Panama</h2>
                            <p className="text-xs sm:text-sm text-muted-foreground/90">Iconografia tematica para celebrar sabores, cultura y naturaleza del pais.</p>
                        </div>
                        <span className="text-[11px] sm:text-xs uppercase tracking-[0.14em] text-panama-blue/90 font-bold">
                            20 iconos
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                        {PANAMA_ICON_COLLECTION.map((iconItem) => {
                            const catalogItem = catalogById.get(iconItem.id);
                            const owned = data?.inventory?.includes(iconItem.id);
                            const equipped = Object.values(data?.equipped || {}).includes(iconItem.id);
                            const price = catalogItem?.price ?? iconItem.price;

                            return (
                                <m.article
                                    key={iconItem.id}
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true, amount: 0.2 }}
                                    transition={{ duration: 0.22 }}
                                    className={`rounded-2xl border p-3 sm:p-4 transition-colors ${equipped ? 'border-panama-green/40 bg-panama-green/8' : 'border-white/10 bg-white/3 hover:bg-white/6'}`}
                                >
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white/10 shadow-inner shadow-black/20">
                                            {missingPanamaIcons[iconItem.id] ? (
                                                <span className="text-2xl sm:text-3xl" aria-label={iconItem.name}>{iconItem.fallback}</span>
                                            ) : (
                                                <Image
                                                    src={iconItem.imagePath}
                                                    alt={iconItem.name}
                                                    width={72}
                                                    height={72}
                                                    className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
                                                    unoptimized
                                                    onError={() => {
                                                        setMissingPanamaIcons((prev) => ({ ...prev, [iconItem.id]: true }));
                                                    }}
                                                />
                                            )}
                                        </div>

                                        {owned ? (
                                            equipped ? (
                                                <span className="text-[10px] font-black text-panama-green bg-panama-green/15 border border-panama-green/30 rounded-md px-2 py-1 tracking-wide">
                                                    USANDO
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black text-white/80 bg-white/10 border border-white/15 rounded-md px-2 py-1 tracking-wide">
                                                    TUYO
                                                </span>
                                            )
                                        ) : (
                                            <span className="text-[10px] font-black text-panama-yellow bg-panama-yellow/10 border border-panama-yellow/30 rounded-md px-2 py-1 tracking-wide whitespace-nowrap">
                                                B/. {price}
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-xs sm:text-sm font-bold leading-tight text-center min-h-9 flex items-center justify-center">
                                        {iconItem.name}
                                    </p>
                                    <p className="mt-1 mb-3 text-[10px] sm:text-[11px] tracking-wide uppercase text-center text-muted-foreground/85 font-semibold">
                                        {iconItem.category}
                                    </p>

                                    <button
                                        onClick={() => {
                                            if (!catalogItem) return;
                                            if (owned) {
                                                equipItem(iconItem.id, equipped ? 'unequip' : 'equip');
                                                return;
                                            }
                                            buyItem(iconItem.id);
                                        }}
                                        disabled={!catalogItem || (!owned && (data?.balance || 0) < price)}
                                        className={`w-full rounded-xl py-2.5 text-[11px] sm:text-xs font-black tracking-wide transition-all active:scale-95 ${
                                            !catalogItem
                                                ? 'bg-white/5 text-white/40 cursor-not-allowed'
                                                : owned
                                                    ? equipped
                                                        ? 'bg-white/10 text-white hover:bg-white/20'
                                                        : 'bg-panama-blue text-white hover:bg-panama-blue/90'
                                                    : (data?.balance || 0) >= price
                                                        ? 'bg-panama-yellow text-background hover:bg-yellow-400'
                                                        : 'bg-white/5 text-white/35 cursor-not-allowed'
                                        }`}
                                    >
                                        {!catalogItem
                                            ? 'No disponible'
                                            : owned
                                                ? equipped
                                                    ? 'Quitar avatar'
                                                    : 'Equipar avatar'
                                                : 'Comprar avatar'}
                                    </button>
                                </m.article>
                            );
                        })}
                    </div>
                </m.section>

            </div>
        </div>
    );
}
