import React, { useMemo, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, LogOut, Volume2, Save, Loader2, User, Key, MonitorSpeaker, EyeOff, Sparkles, AlertTriangle } from 'lucide-react';
import { sileo } from 'sileo';
import { useAudio } from '@/lib/audio';
import PlayerIcon from '@/components/game/PlayerIcon';

type TabId = 'profile' | 'inventory' | 'audio' | 'prefs';

const TABS: { id: TabId; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'profile', label: 'Perfil', icon: User, color: 'text-panama-blue' },
    { id: 'inventory', label: 'Items', icon: Sparkles, color: 'text-panama-yellow' },
    { id: 'audio', label: 'Audio', icon: MonitorSpeaker, color: 'text-panama-green' },
    { id: 'prefs', label: 'Prefs', icon: Settings, color: 'text-white' },
];

const ToggleSwitch = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <m.button
        role="switch"
        aria-checked={on}
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggle(); }}
        className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 flex-shrink-0 cursor-pointer ${on ? 'bg-panama-green shadow-[0_0_12px_rgba(34,197,94,0.4)]' : 'bg-white/10'}`}
        whileTap={{ scale: 0.95 }}
    >
        <m.div 
            className="w-4 h-4 bg-white rounded-full shadow-lg"
            initial={false}
            animate={{ x: on ? 24 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
    </m.button>
);

export default function SettingsModal() {
    const { user, tokens, clearAuth, setAuth, authenticatedFetch } = useAuthStore();
    const router = useRouter();
    const audio = useAudio();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('profile');
    const [shopData, setShopData] = useState<any>(null);
    const [fetchingShop, setFetchingShop] = useState(false);

    const [username, setUsername] = useState(user?.username || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [volume, setVolume] = useState(audio.getVolume() * 100);
    const [sfx, setSfx] = useState(true);
    const [animations, setAnimations] = useState(true);
    const [privacy, setPrivacy] = useState(false);

    const inventoryIds = useMemo(() => {
        const ids = shopData?.inventory || user?.inventory || [];
        return new Set<string>(ids);
    }, [shopData?.inventory, user?.inventory]);

    const equippedItems = useMemo(
        () => shopData?.equipped || user?.equipped || { avatar: null, border: null, title: null },
        [shopData?.equipped, user?.equipped]
    );

    const ownedCatalogItems = useMemo(() => {
        const catalog = shopData?.catalog || [];
        return catalog.filter((item: any) => inventoryIds.has(item.id));
    }, [shopData?.catalog, inventoryIds]);

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = parseInt(e.target.value);
        setVolume(v);
        audio.setVolume(v / 100);
    };

    const handleLogout = () => {
        clearAuth();
        router.push('/');
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const hasProfileChanges = username !== user?.username || password.length >= 6;

            if (password) {
                if (password !== confirmPassword) {
                    sileo.error({ title: 'Las contraseñas no coinciden' });
                    setLoading(false);
                    return;
                }
                if (!currentPassword) {
                    sileo.error({ title: 'Debes ingresar tu contraseña actual para confirmar' });
                    setLoading(false);
                    return;
                }
            }

            if (hasProfileChanges) {
                const res = await authenticatedFetch('/api/user/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: username !== user?.username ? username : undefined,
                        currentPassword: currentPassword ? currentPassword : undefined,
                        password: password ? password : undefined,
                    }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                if (username !== user?.username && user && tokens) {
                    setAuth({ ...user, username }, tokens);
                }
            }

            localStorage.setItem('parkeando_sfx', JSON.stringify(sfx));
            localStorage.setItem('parkeando_animations', JSON.stringify(animations));
            localStorage.setItem('parkeando_privacy', JSON.stringify(privacy));

            sileo.success({ title: '¡Configuración guardada!' });
            setCurrentPassword('');
            setPassword('');
            setConfirmPassword('');
            setOpen(false);
        } catch (e: any) {
            sileo.error({ title: e.message || 'Error guardando config' });
        } finally {
            setLoading(false);
        }
    };

    const fetchInventory = async (force = false) => {
        if ((!force && shopData) || fetchingShop) return;
        setFetchingShop(true);
        try {
            const res = await authenticatedFetch('/api/shop');
            const data = await res.json();
            if (res.ok) {
                setShopData(data);
                if (user && tokens) {
                    setAuth({
                        ...user,
                        equipped: data.equipped,
                        inventory: data.inventory,
                        spent_points: data.spent_points,
                    }, tokens);
                }
            }
        } catch (e) {
            console.error('Error fetching inventory:', e);
        } finally {
            setFetchingShop(false);
        }
    };

    const handleEquip = async (itemId: string, action: 'equip' | 'unequip') => {
        setLoading(true);
        try {
            const res = await authenticatedFetch('/api/shop/equip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId, action }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const refreshedRes = await authenticatedFetch('/api/shop');
            const refreshedData = await refreshedRes.json();
            if (refreshedRes.ok) {
                setShopData(refreshedData);
            }
            if (refreshedRes.ok && user && tokens) {
                setAuth({
                    ...user,
                    equipped: refreshedData.equipped,
                    inventory: refreshedData.inventory,
                    spent_points: refreshedData.spent_points,
                }, tokens);
            }
            sileo.success({ title: '¡Perfil actualizado!' });
        } catch (e: any) {
            sileo.error({ title: e.message || 'Error al equipar' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);

        if (nextOpen && activeTab === 'inventory') {
            fetchInventory(true);
        }

        if (!nextOpen) {
            setShopData(null);
        }
    };



    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="glass"
                    size="icon"
                    className="group w-10 h-10 border-panama-yellow/20 hover:border-panama-yellow/50 transition-all duration-300 touch-target"
                    aria-label="Configuración"
                >
                    <Settings className="w-4 h-4 text-panama-yellow group-hover:rotate-45 transition-transform" />
                </Button>
            </DialogTrigger>

            {/* Diálogo correcto: pantalla completa en móvil y modal flotante en escritorio */}
            <DialogContent className="
                w-full sm:max-w-xl
                h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90dvh]
                bg-[#0a0a0f] sm:bg-[#0a0a0f]/95 sm:backdrop-blur-3xl
                border-x-0 border-y-0 sm:border border-white/10 text-white
                sm:shadow-[0_0_80px_rgba(0,0,0,0.9)]
                !rounded-none sm:!rounded-[2rem]
                p-0 overflow-hidden
                flex flex-col gap-0
                [&>button.absolute]:hidden
            ">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
                <DialogTitle className="sr-only">Ajustes</DialogTitle>
                <DialogDescription className="sr-only">
                    Panel de configuración del jugador para perfil, inventario, audio y preferencias.
                </DialogDescription>

                {/* ── ENCABEZADO ── */}
                <div 
                    className="relative z-10 flex items-center justify-between px-5 pb-4 border-b border-white/8 flex-shrink-0"
                    style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
                >
                    <div className="flex items-center gap-2">
                        <Settings className="w-6 h-6 sm:w-5 sm:h-5 text-panama-yellow" />
                        <span className="font-black text-xl sm:text-lg">Ajustes</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleLogout}
                            className="flex items-center justify-center gap-2 px-4 py-2 sm:px-3 sm:py-2 min-h-[44px] sm:min-h-[0] rounded-[1rem] sm:rounded-[0.8rem] text-sm font-bold text-red-500 hover:bg-red-500/10 active:scale-95 transition-all outline-none border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                            aria-label="Cerrar sesión"
                        >
                            <LogOut className="w-5 h-5 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline text-xs sm:text-sm">Salir</span>
                        </button>
                        <button
                            onClick={() => setOpen(false)}
                            className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-[1rem] sm:rounded-[0.8rem] text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-colors outline-none border border-transparent hover:border-white/10"
                            aria-label="Cerrar modal"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="scale-110 sm:scale-100"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                    </div>
                </div>

                {/* ── pestaña barra ── */}
                <div 
                    role="tablist"
                    aria-label="Ajustes del juego"
                    onKeyDown={(e) => {
                        const currentIndex = TABS.findIndex(t => t.id === activeTab);
                        if (e.key === 'ArrowRight') {
                            const next = TABS[(currentIndex + 1) % TABS.length];
                            setActiveTab(next.id);
                            if (next.id === 'inventory') fetchInventory(true);
                        } else if (e.key === 'ArrowLeft') {
                            const prev = TABS[(currentIndex - 1 + TABS.length) % TABS.length];
                            setActiveTab(prev.id);
                            if (prev.id === 'inventory') fetchInventory(true);
                        }
                    }}
                    className="relative z-10 flex border-b border-white/8 flex-shrink-0 overflow-x-auto webkit-scrollbar-hide p-1 gap-1"
                >
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={isActive}
                                aria-controls={`tabpanel-${tab.id}`}
                                tabIndex={isActive ? 0 : -1}
                                onClick={() => { setActiveTab(tab.id); if (tab.id === 'inventory') fetchInventory(true); }}
                                className={`
                                    relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold transition-all duration-300 rounded-xl whitespace-nowrap
                                    ${isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}
                                `}
                            >
                                {isActive && (
                                    <m.div
                                        layoutId="activeSettingsTabPill"
                                        className="absolute inset-0 bg-white/10 border border-white/10 shadow-lg"
                                        style={{ borderRadius: '12px' }}
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}
                                <Icon className={`w-4 h-4 flex-shrink-0 relative z-10 ${isActive ? tab.color : ''}`} />
                                <span className="relative z-10">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* ── SCROLLABLE contenido ── */}
                <div 
                    className="relative z-10 flex-1 overflow-y-auto scroll-smooth-ios p-5 sm:p-6"
                    style={{ 
                        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
                        paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
                        paddingRight: 'max(1.25rem, env(safe-area-inset-right))'
                    }}
                >
                    <AnimatePresence mode="wait">

                            {/* pestaña: Perfil */}
                            {activeTab === 'profile' && (
                                <m.div 
                                    key="profile"
                                    id="tabpanel-profile"
                                    role="tabpanel"
                                    aria-labelledby="tab-profile"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.25, ease: "easeOut" }}
                                    className="space-y-6"
                                >
                                    {/* Tarjeta de info de usuario - Bento 2.0 */}
                                    <div className="grid grid-cols-6 gap-3">
                                        {/* Tarjeta de avatar - grande (span 4 en grande, 6 en móvil) */}
                                        <div className="col-span-6 sm:col-span-4 glass rounded-3xl p-5 flex items-center gap-4 relative overflow-hidden group border border-white/10 hover:border-white/20 transition-all duration-300">
                                            <div className="absolute inset-0 bg-gradient-to-br from-panama-blue/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                            <div
                                                className="relative z-10 w-24 h-24 bg-black/60 rounded-full flex items-center justify-center border-2 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex-shrink-0"
                                                style={{ borderColor: user?.equipped?.border === 'avatar_neon' ? '#00f2fe' : (user?.equipped?.border === 'avatar_gold' ? '#FFD700' : 'rgba(255,255,255,0.1)') }}
                                            >
                                                <PlayerIcon icon={user?.equipped?.avatar || 'car'} color="transparent" size="lg" />
                                            </div>
                                            <div className="relative z-10 space-y-2 overflow-hidden">
                                                <h3 className="text-2xl font-black tracking-tight truncate drop-shadow-md text-white">{user?.username}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] sm:text-xs font-black text-panama-yellow px-3 py-1 bg-panama-yellow/10 rounded-full inline-block uppercase tracking-widest border border-panama-yellow/20">
                                                        {user?.spent_points || 0} XP
                                                    </span>
                                                    {user?.is_admin && (
                                                        <Badge className="text-[10px] font-black uppercase bg-panama-red/20 text-panama-red border-panama-red/30 py-0.5">
                                                            Master
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stats/seguridad carta - Small (Span 2) */}
                                        <div className="col-span-6 sm:col-span-2 glass rounded-3xl p-4 flex flex-col justify-center gap-2 border border-white/10 hover:border-white/20 transition-all">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <EyeOff className="w-3.5 h-3.5" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">Seguridad</p>
                                            </div>
                                            <p className="text-xs font-bold text-gray-200 truncate pr-2">
                                                {(() => {
                                                    const email = user?.email || '';
                                                    if (email.includes(':')) return 'Cuenta Protegida';
                                                    return email;
                                                })()}
                                            </p>
                                            <div className="flex items-center gap-1.5 text-panama-green">
                                                <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                                <span className="text-[10px] font-bold uppercase">Verificada</span>
                                            </div>
                                        </div>

                                        {/* Equip Slots - dinámico fila */}
                                        <div className="col-span-3 glass rounded-2xl p-4 flex flex-col items-center justify-between gap-3 border border-white/10 hover:border-white/20 transition-all">
                                            <div className="flex flex-col items-center gap-1 text-center">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg mb-1 ring-1 ring-white/10">
                                                    {user?.equipped?.title ? '🏷️' : <Sparkles className="w-5 h-5 text-gray-600" />}
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Título</p>
                                                <p className="text-sm font-black text-white truncate max-w-full px-1">
                                                    {user?.equipped?.title ? (user.equipped.title === 'title_rookie' ? 'Novato' : (user.equipped.title === 'title_boss' ? 'Jefe/a' : user.equipped.title)) : 'Sin Título'}
                                                </p>
                                            </div>
                                            {!user?.equipped?.title ? (
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => {
                                                        setActiveTab('inventory');
                                                        fetchInventory(true);
                                                    }}
                                                    className="w-full h-8 text-[10px] font-black text-panama-yellow bg-panama-yellow/5 hover:bg-panama-yellow/10 border border-panama-yellow/20 rounded-xl"
                                                >
                                                    EQUIPAR
                                                </Button>
                                            ) : (
                                                <div className="h-8 flex items-center">
                                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-tighter">Equipado</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-span-3 glass rounded-2xl p-4 flex flex-col items-center justify-between gap-3 border border-white/10 hover:border-white/20 transition-all">
                                            <div className="flex flex-col items-center gap-1 text-center">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg mb-1 ring-1 ring-white/10">
                                                    {user?.equipped?.border ? '🖼️' : <User className="w-5 h-5 text-gray-600" />}
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Borde</p>
                                                <p className="text-sm font-black text-white truncate max-w-full px-1">
                                                    {user?.equipped?.border ? 'Activo' : 'Clásico'}
                                                </p>
                                            </div>
                                            {!user?.equipped?.border ? (
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => {
                                                        setActiveTab('inventory');
                                                        fetchInventory(true);
                                                    }}
                                                    className="w-full h-8 text-[10px] font-black text-panama-blue bg-panama-blue/5 hover:bg-panama-blue/10 border border-panama-blue/20 rounded-xl"
                                                >
                                                    MEJORAR
                                                </Button>
                                            ) : (
                                                <div className="h-8 flex items-center">
                                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-tighter">Efecto ON</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Formulario de ajustes - estilo premium */}
                                    <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 space-y-6">
                                        <div className="space-y-3">
                                            <Label htmlFor="alias" className="text-gray-400 font-black uppercase text-[10px] tracking-[.3em] ml-1">Alias Público</Label>
                                            <div className="relative group">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-panama-blue transition-colors group-focus-within:text-white" />
                                                <Input
                                                    id="alias"
                                                    value={username}
                                                    onChange={e => setUsername(e.target.value)}
                                                    maxLength={15}
                                                    className="bg-black/20 border-white/10 h-14 pl-12 rounded-2xl focus-visible:ring-panama-blue focus-visible:ring-offset-0 focus-visible:border-panama-blue/50 text-white font-bold text-base sm:text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-white/5">
                                            <h4 className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400 flex items-center gap-2 ml-1">
                                                <Key className="w-3.5 h-3.5 text-panama-yellow" /> Seguridad
                                            </h4>
                                            <div className="grid grid-cols-1 gap-4">
                                                <Input
                                                    type="password"
                                                    value={currentPassword}
                                                    onChange={e => setCurrentPassword(e.target.value)}
                                                    placeholder="Contraseña Actual"
                                                    className="bg-black/20 border-white/10 h-14 rounded-2xl text-white font-bold focus-visible:ring-panama-yellow/50 text-base sm:text-sm"
                                                />
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <Input
                                                        type="password"
                                                        value={password}
                                                        onChange={e => setPassword(e.target.value)}
                                                        placeholder="Nueva (Min 6)"
                                                        className="bg-black/20 border-white/10 h-14 rounded-2xl text-white font-bold text-base sm:text-sm"
                                                    />
                                                    <Input
                                                        type="password"
                                                        value={confirmPassword}
                                                        onChange={e => setConfirmPassword(e.target.value)}
                                                        placeholder="Confirmar"
                                                        className="bg-black/20 border-white/10 h-14 rounded-2xl text-white font-bold text-base sm:text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            variant="panama"
                                            onClick={handleSave}
                                            disabled={loading}
                                            className="w-full h-16 rounded-[1.5rem] font-black text-lg tracking-tight shadow-xl active:scale-[0.98] transition-transform"
                                        >
                                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-6 h-6 mr-3" />GUARDAR CAMBIOS</>}
                                        </Button>
                                    </div>
                                </m.div>
                            )}

                            {/* pestaña: Inventario */}
                            {activeTab === 'inventory' && (
                                <m.div 
                                    key="inventory"
                                    id="tabpanel-inventory"
                                    role="tabpanel"
                                    aria-labelledby="tab-inventory"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.25 }}
                                    className="space-y-6"
                                >
                                    <div className="flex items-end justify-between px-1">
                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-black tracking-tight">Inventario</h3>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Personaliza tu Leyenda</p>
                                        </div>
                                    </div>

                                    {fetchingShop ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                            <Loader2 className="w-10 h-10 text-panama-yellow animate-spin" />
                                            <p className="text-xs text-gray-400 font-black uppercase tracking-[.4em] animate-pulse">Consultando el Baúl</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            <AnimatePresence mode="popLayout">
                                                {ownedCatalogItems.length === 0 ? (
                                                    <m.div 
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        className="col-span-2 flex flex-col items-center justify-center p-12 glass rounded-[2.5rem] border border-dashed border-white/10 text-gray-500"
                                                    >
                                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                                            <Sparkles className="w-8 h-8 opacity-20" />
                                                        </div>
                                                        <p className="text-sm font-black uppercase tracking-widest text-center">Baúl Vacío</p>
                                                        <p className="text-[10px] font-bold text-center mt-2 max-w-[180px]">Conquista casillas para ganar puntos y visita la tienda.</p>
                                                    </m.div>
                                                ) : (
                                                    ownedCatalogItems.map((item: any, i: number) => {
                                                        const isEquipped = Object.values(equippedItems).includes(item.id);
                                                        return (
                                                            <m.div
                                                                key={item.id}
                                                                layout
                                                                initial={{ opacity: 0, y: 30 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: i * 0.05, type: "spring", stiffness: 260, damping: 20 }}
                                                                className={`p-4 rounded-[2rem] border transition-all duration-500 flex flex-col group relative overflow-hidden h-full ${isEquipped ? 'bg-panama-yellow/10 border-panama-yellow/40 shadow-[0_0_25px_rgba(255,191,0,0.15)] ring-1 ring-panama-yellow/50' : 'bg-white/[0.03] border-white/10 hover:border-white/30 hover:bg-white/[0.06]'}`}
                                                            >
                                                                {isEquipped && (
                                                                    <div className="absolute top-0 right-0 p-3">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-panama-yellow animate-ping" />
                                                                    </div>
                                                                )}
                                                                <div className="flex flex-col items-center gap-3 mb-4 relative z-10 text-center">
                                                                    <div className="w-14 h-14 rounded-2xl bg-black/40 flex items-center justify-center text-3xl flex-shrink-0 shadow-2xl group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 ring-1 ring-white/10">
                                                                        {typeof item.icon === 'string' && item.icon.startsWith('/') ? (
                                                                            <Image
                                                                                src={item.icon}
                                                                                alt={item.name}
                                                                                width={56}
                                                                                height={56}
                                                                                className="w-10 h-10 object-contain"
                                                                                unoptimized
                                                                            />
                                                                        ) : (
                                                                            item.icon
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0 space-y-0.5">
                                                                        <p className="text-sm font-black tracking-tight truncate leading-tight">{item.name}</p>
                                                                        <div className="flex items-center justify-center gap-1">
                                                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${item.type === 'title' ? 'bg-panama-blue/20 text-panama-blue' : 'bg-panama-green/20 text-panama-green'} uppercase tracking-tighter`}>{item.type}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    variant={isEquipped ? 'outline' : 'panama'}
                                                                    size="sm"
                                                                    className={`relative z-10 w-full h-10 text-[10px] font-black uppercase tracking-wider rounded-xl active:scale-95 mt-auto ${isEquipped ? 'border-panama-yellow/30 text-panama-yellow hover:bg-panama-yellow/20' : ''}`}
                                                                    onClick={() => isEquipped ? handleEquip(item.id, 'unequip') : handleEquip(item.id, 'equip')}
                                                                    disabled={loading}
                                                                >
                                                                    {isEquipped ? 'Retirar' : 'Equipar'}
                                                                </Button>
                                                            </m.div>
                                                        );
                                                    })
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </m.div>
                            )}

                            {/* pestaña: Audio */}
                            {activeTab === 'audio' && (
                                <m.div 
                                    key="audio"
                                    id="tabpanel-audio"
                                    role="tabpanel"
                                    aria-labelledby="tab-audio"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.25 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-black tracking-tight">Audio y Sonido</h3>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Domina el Ambiente</p>
                                    </div>

                                    <div className="glass rounded-3xl p-6 border border-white/10 space-y-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between px-1">
                                                <span className="flex items-center gap-2.5 text-xs font-black uppercase tracking-widest text-gray-300">
                                                    <Volume2 className="w-5 h-5 text-panama-green" /> Volumen General
                                                </span>
                                                <span className="text-sm font-black text-panama-green bg-panama-green/10 px-3 py-1 rounded-xl border border-panama-green/20 drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">{volume}%</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="100" value={volume}
                                                onChange={handleVolumeChange}
                                                aria-label="Volumen maestro"
                                                className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-panama-green ring-1 ring-white/10"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            className="flex w-full items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all cursor-pointer group text-left"
                                            onClick={() => setSfx(!sfx)}
                                            aria-label="Efectos de sonido"
                                        >
                                            <div className="space-y-1">
                                                <p className="font-black text-sm uppercase tracking-tight">Efectos Especiales</p>
                                                <p className="text-[10px] font-medium text-gray-500">Dados, colisiones y eventos</p>
                                            </div>
                                            <ToggleSwitch on={sfx} onToggle={() => setSfx(!sfx)} />
                                        </button>
                                    </div>
                                </m.div>
                            )}

                            {/* pestaña: Preferencias */}
                            {activeTab === 'prefs' && (
                                <m.div 
                                    key="prefs"
                                    id="tabpanel-prefs"
                                    role="tabpanel"
                                    aria-labelledby="tab-prefs"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.25 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-black tracking-tight">Preferencias</h3>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Motor Visual</p>
                                    </div>

                                    <div className="space-y-3">
                                        <button
                                            type="button"
                                            className="flex w-full items-center justify-between p-5 rounded-[2rem] glass border border-white/10 hover:border-white/20 transition-all cursor-pointer group text-left"
                                            onClick={() => setAnimations(!animations)}
                                            aria-label="Activar o desactivar gráficos de partículas"
                                        >
                                            <div className="space-y-1">
                                                <p className="font-black text-sm uppercase flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-panama-yellow" /> Gráficos de Partículas
                                                </p>
                                                <p className="text-[10px] font-medium text-gray-500">Celebraciones en alta definición</p>
                                            </div>
                                            <ToggleSwitch on={animations} onToggle={() => setAnimations(!animations)} />
                                        </button>

                                        <button
                                            type="button"
                                            className="flex w-full items-center justify-between p-5 rounded-[2rem] glass border border-white/10 hover:border-white/20 transition-all cursor-pointer group text-left"
                                            onClick={() => setPrivacy(!privacy)}
                                            aria-label="Activar o desactivar modo oculto"
                                        >
                                            <div className="space-y-1">
                                                <p className="font-black text-sm uppercase flex items-center gap-2">
                                                    <EyeOff className="w-4 h-4 text-gray-400" /> Modo Oculto
                                                </p>
                                                <p className="text-[10px] font-medium text-gray-500">Anónimo en el Leaderboard Global</p>
                                            </div>
                                            <ToggleSwitch on={privacy} onToggle={() => setPrivacy(!privacy)} />
                                        </button>
                                    </div>
                                </m.div>
                            )}

                    </AnimatePresence>
                </div>

                {/* Barra inferior de pestañas eliminada — ahora siempre van arriba por consistencia */}
            </DialogContent>
        </Dialog>
    );
}
