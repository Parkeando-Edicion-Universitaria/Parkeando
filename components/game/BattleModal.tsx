'use client';

import dynamic from 'next/dynamic';
import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties, type ComponentType } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { type WheelDataType } from 'react-custom-roulette';
import { RippleButton } from '@/components/ui/RippleButton';
import { Flame, Medal, Skull, Swords } from 'lucide-react';
import { truncateSingleLineWithPretext } from '@/lib/pretext';
import { computeBattleLayoutPlan, type BattleLayoutPlan } from '@/lib/battle-layout';

export interface BattleResult {
    winnerId: string;
    loserId: string;
    winnerUsername: string;
    loserUsername: string;
    message: string;
    participantUsernames?: string[];
    totalPlayers?: number;
}

interface BattleModalProps {
    battle: BattleResult;
    isWinner: boolean;
    onClose: () => void;
}

type RouletteWheelProps = {
    mustStartSpinning: boolean;
    prizeNumber: number;
    data: WheelDataType[];
    backgroundColors?: string[];
    textColors?: string[];
    outerBorderColor?: string;
    outerBorderWidth?: number;
    innerRadius?: number;
    innerBorderColor?: string;
    innerBorderWidth?: number;
    radiusLineColor?: string;
    radiusLineWidth?: number;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number | string;
    fontStyle?: string;
    perpendicularText?: boolean;
    textDistance?: number;
    spinDuration?: number;
    pointerProps?: { src?: string; style?: CSSProperties };
    disableInitialAnimation?: boolean;
};

const RouletteWheel = dynamic(
    () =>
        import('react-custom-roulette').then(
            (mod) => mod.Wheel as ComponentType<RouletteWheelProps>
        ),
    {
        ssr: false,
        loading: () => (
            <div className="h-56 w-56 rounded-full border-8 border-slate-100/80 bg-slate-900/70" />
        ),
    }
);

const DEFAULT_LAYOUT_PLAN: BattleLayoutPlan = {
    sizePreset: 'md',
    compact: false,
    titleMaxWidth: 260,
    messageMaxWidth: 290,
};

const wheelSizeClassByPreset: Record<BattleLayoutPlan['sizePreset'], string> = {
    sm: 'scale-[0.56]',
    md: 'scale-[0.62]',
    lg: 'scale-[0.68]',
};

const wheelFrameClassByPreset: Record<BattleLayoutPlan['sizePreset'], string> = {
    sm: 'h-[188px] w-[188px] sm:h-[210px] sm:w-[210px]',
    md: 'h-[210px] w-[210px] sm:h-[234px] sm:w-[234px]',
    lg: 'h-[226px] w-[226px] sm:h-[252px] sm:w-[252px]',
};

const ROULETTE_COLORS = ['#D81B48', '#C2410C', '#138A4A', '#334155', '#0369A1', '#6D28D9'] as const;
const ROULETTE_BACKGROUND_COLORS: string[] = [...ROULETTE_COLORS];
const ROULETTE_TEXT_COLORS = ['#F8FAFC'];
const ROULETTE_POINTER_PROPS: { style: CSSProperties } = { style: { display: 'none' } };

const ROULETTE_BG_SURFACES = [
    'bg-[linear-gradient(155deg,rgba(210,39,55,0.32)_0%,rgba(15,23,42,0.95)_54%,rgba(2,6,23,0.98)_100%)]',
    'bg-[linear-gradient(155deg,rgba(246,143,42,0.32)_0%,rgba(15,23,42,0.95)_54%,rgba(2,6,23,0.98)_100%)]',
    'bg-[linear-gradient(155deg,rgba(251,181,33,0.32)_0%,rgba(15,23,42,0.95)_54%,rgba(2,6,23,0.98)_100%)]',
    'bg-[linear-gradient(155deg,rgba(1,123,188,0.34)_0%,rgba(15,23,42,0.95)_54%,rgba(2,6,23,0.98)_100%)]',
    'bg-[linear-gradient(155deg,rgba(5,165,225,0.34)_0%,rgba(15,23,42,0.95)_54%,rgba(2,6,23,0.98)_100%)]',
    'bg-[linear-gradient(155deg,rgba(58,173,72,0.32)_0%,rgba(15,23,42,0.95)_54%,rgba(2,6,23,0.98)_100%)]',
] as const;

const ROULETTE_BG_ORBS = [
    'bg-[#d22737]/46',
    'bg-[#f68f2a]/46',
    'bg-[#fbb521]/46',
    'bg-[#017bbc]/48',
    'bg-[#05a5e1]/48',
    'bg-[#3aad48]/46',
] as const;

const ROULETTE_ACCENT_BORDERS = [
    'border-[#d22737]/42',
    'border-[#f68f2a]/42',
    'border-[#fbb521]/42',
    'border-[#017bbc]/42',
    'border-[#05a5e1]/42',
    'border-[#3aad48]/42',
] as const;

const ROULETTE_ACCENT_SHADOWS = [
    'shadow-[0_24px_72px_-24px_rgba(210,39,55,0.58)]',
    'shadow-[0_24px_72px_-24px_rgba(246,143,42,0.58)]',
    'shadow-[0_24px_72px_-24px_rgba(251,181,33,0.58)]',
    'shadow-[0_24px_72px_-24px_rgba(1,123,188,0.58)]',
    'shadow-[0_24px_72px_-24px_rgba(5,165,225,0.58)]',
    'shadow-[0_24px_72px_-24px_rgba(58,173,72,0.58)]',
] as const;

const titleWidthSteps = [
    [190, 'max-w-[190px]'],
    [210, 'max-w-[210px]'],
    [236, 'max-w-[236px]'],
    [260, 'max-w-[260px]'],
    [280, 'max-w-[280px]'],
    [320, 'max-w-[320px]'],
] as const;

const messageWidthSteps = [
    [220, 'max-w-[220px]'],
    [240, 'max-w-[240px]'],
    [250, 'max-w-[250px]'],
    [270, 'max-w-[270px]'],
    [290, 'max-w-[290px]'],
    [310, 'max-w-[310px]'],
    [340, 'max-w-[340px]'],
] as const;

function maxWidthClassFromPlan(value: number, steps: readonly (readonly [number, string])[]): string {
    for (const [maxValue, className] of steps) {
        if (value <= maxValue) {
            return className;
        }
    }

    return steps[steps.length - 1][1];
}

function stableHash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
        hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    }
    return hash;
}

function normalizeName(value: string): string {
    return value.trim().toLowerCase();
}

function compactWheelLabel(name: string): string {
    const cleaned = name.trim();
    if (!cleaned) return 'JUG';

    const tokens = cleaned.split(/\s+/).filter(Boolean);
    const firstToken = tokens[0] ?? cleaned;
    const lastToken = tokens[tokens.length - 1] ?? firstToken;

    if (tokens.length >= 2 && /^(jugador|player)$/i.test(firstToken)) {
        return lastToken.slice(0, 3).toUpperCase();
    }

    if (tokens.length >= 2) {
        return `${firstToken.slice(0, 2)}-${lastToken.slice(0, 2)}`.toUpperCase();
    }

    if (firstToken.length <= 4) return firstToken.toUpperCase();
    return `${firstToken.slice(0, 4).toUpperCase()}.`;
}

function buildWheelData(participantNames: string[]): { data: WheelDataType[]; owners: string[] } {
    const safeNames = participantNames.length > 0 ? participantNames : ['Jugador A', 'Jugador B'];
    const repeatsPerPlayer = safeNames.length <= 2 ? 4 : safeNames.length <= 4 ? 3 : 2;
    const segmentCount = safeNames.length * repeatsPerPlayer;

    const owners = Array.from({ length: segmentCount }, (_, index) => safeNames[index % safeNames.length]);

    const data = owners.map((owner, index) => ({
        option: compactWheelLabel(owner),
        style: {
            backgroundColor: ROULETTE_COLORS[index % ROULETTE_COLORS.length],
            textColor: '#F8FAFC',
            fontWeight: 900,
            fontSize: 16,
        },
    }));

    return { data, owners };
}

function pickPrizeIndex(slotOwners: string[], winnerUsername: string, seed: string): number {
    const winnerKey = normalizeName(winnerUsername);
    const candidateIndexes = slotOwners
        .map((owner, index) => ({ index, owner: normalizeName(owner) }))
        .filter((slot) => slot.owner === winnerKey)
        .map((slot) => slot.index);

    if (candidateIndexes.length === 0) return 0;

    const hash = stableHash(`${seed}:${winnerUsername}:${candidateIndexes.length}`);
    return candidateIndexes[hash % candidateIndexes.length];
}

function computeNextRotation(prevRotation: number, prizeIndex: number, totalSegments: number): number {
    const safeSegments = Math.max(1, totalSegments);
    const degreesPerSegment = 360 / safeSegments;
    const segmentCenter = (prizeIndex + 0.5) * degreesPerSegment;

    // Queremos que el centro del segmento ganador termine en las 12 en punto.
    const desiredRotationMod = ((-90 - segmentCenter) % 360 + 360) % 360;
    const currentRotationMod = ((prevRotation % 360) + 360) % 360;

    let delta = desiredRotationMod - currentRotationMod;
    if (delta < 0) delta += 360;
    if (delta < 120) delta += 360;

    return prevRotation + 5 * 360 + delta;
}

function pickRoulettePaletteIndex(seed: string): number {
    return stableHash(seed) % ROULETTE_BG_SURFACES.length;
}

function BattleModal({ battle, isWinner, onClose }: BattleModalProps) {
    const prefersReducedMotion = useReducedMotion();

    const participantNames = useMemo(() => {
        const fromBattle = (battle.participantUsernames ?? []).filter(Boolean);
        if (fromBattle.length >= 2) {
            return Array.from(new Set(fromBattle));
        }
        return Array.from(new Set([battle.winnerUsername, battle.loserUsername].filter(Boolean)));
    }, [battle.loserUsername, battle.participantUsernames, battle.winnerUsername]);

    const battleHeadline = useMemo(() => {
        const cleaned = battle.message
            .replace('⚔️ ¡Juega Vivo! ', '')
            .replace(/\s*en la casilla\s+\d+\.?/gi, '')
            .trim();

        return cleaned || 'Resultado del duelo';
    }, [battle.message]);

    const wheelDefinition = useMemo(
        () => buildWheelData(participantNames),
        [participantNames]
    );

    const wheelData = wheelDefinition.data;

    const winningPrizeIndex = useMemo(
        () => pickPrizeIndex(wheelDefinition.owners, battle.winnerUsername, battle.message),
        [battle.message, battle.winnerUsername, wheelDefinition.owners]
    );

    const outcomeText = isWinner
        ? '¡Ganaste la batalla! Avanzas 1 casilla extra.'
        : '¡Perdiste la batalla! Pierdes tu próximo turno.';

    const [layoutPlan, setLayoutPlan] = useState<BattleLayoutPlan>(DEFAULT_LAYOUT_PLAN);

    const [wheelRotation, setWheelRotation] = useState(0);
    const [isWheelSpinning, setIsWheelSpinning] = useState(false);

    const roulettePaletteIndex = useMemo(
        () => pickRoulettePaletteIndex(`${battle.winnerId}:${battle.loserId}:${battle.message}`),
        [battle.loserId, battle.message, battle.winnerId]
    );

    const rouletteSurfaceClass = ROULETTE_BG_SURFACES[roulettePaletteIndex];
    const rouletteOrbClass = ROULETTE_BG_ORBS[roulettePaletteIndex];
    const rouletteBorderClass = ROULETTE_ACCENT_BORDERS[roulettePaletteIndex];
    const rouletteShadowClass = ROULETTE_ACCENT_SHADOWS[roulettePaletteIndex];

    const [isRouletteDone, setIsRouletteDone] = useState(Boolean(prefersReducedMotion));

    useEffect(() => {
        if (typeof document === 'undefined') return;

        const previousBodyOverflow = document.body.style.overflow;
        const previousBodyPaddingRight = document.body.style.paddingRight;
        const scrollbarCompensation = window.innerWidth - document.documentElement.clientWidth;

        document.body.style.overflow = 'hidden';
        if (scrollbarCompensation > 0) {
            document.body.style.paddingRight = `${scrollbarCompensation}px`;
        }

        return () => {
            document.body.style.overflow = previousBodyOverflow;
            document.body.style.paddingRight = previousBodyPaddingRight;
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let cancelled = false;

        const syncPlan = async () => {
            const plan = await computeBattleLayoutPlan({
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
                headline: battleHeadline,
                message: outcomeText,
            });

            if (!cancelled) {
                setLayoutPlan(plan);
            }
        };

        void syncPlan();

        let resizeTimer: ReturnType<typeof setTimeout> | undefined;

        const onResize = () => {
            if (resizeTimer) {
                clearTimeout(resizeTimer);
            }

            resizeTimer = setTimeout(() => {
                void syncPlan();
            }, 120);
        };

        window.addEventListener('resize', onResize, { passive: true });

        return () => {
            cancelled = true;
            if (resizeTimer) {
                clearTimeout(resizeTimer);
            }
            window.removeEventListener('resize', onResize);
        };
    }, [battleHeadline, outcomeText]);

    const wheelSizePreset = layoutPlan.compact && layoutPlan.sizePreset === 'lg' ? 'md' : layoutPlan.sizePreset;

    const winnerLabel = useMemo(
        () =>
            truncateSingleLineWithPretext(`Ganador: ${battle.winnerUsername}`, {
                font: '800 16px ui-sans-serif, system-ui, sans-serif',
                maxWidth: layoutPlan.titleMaxWidth,
                lineHeight: 20,
                whiteSpace: 'normal',
            }),
        [battle.winnerUsername, layoutPlan.titleMaxWidth]
    );

    const participantChipLabels = useMemo(() => {
        const chipMaxWidth = layoutPlan.compact ? 92 : 112;
        return participantNames.map((name) =>
            truncateSingleLineWithPretext(name, {
                font: '800 16px ui-sans-serif, system-ui, sans-serif',
                maxWidth: chipMaxWidth,
                lineHeight: 20,
                whiteSpace: 'normal',
            })
        );
    }, [layoutPlan.compact, participantNames]);

    const titleMaxWidthClass = useMemo(
        () => maxWidthClassFromPlan(layoutPlan.titleMaxWidth, titleWidthSteps),
        [layoutPlan.titleMaxWidth]
    );

    const messageMaxWidthClass = useMemo(
        () => maxWidthClassFromPlan(layoutPlan.messageMaxWidth, messageWidthSteps),
        [layoutPlan.messageMaxWidth]
    );

    const spinningName = participantNames[0] ?? battle.winnerUsername;

    const spinningNameLabel = useMemo(
        () =>
            truncateSingleLineWithPretext(spinningName, {
                font: '800 14px ui-sans-serif, system-ui, sans-serif',
                maxWidth: layoutPlan.compact ? 236 : layoutPlan.titleMaxWidth,
                lineHeight: 18,
                whiteSpace: 'normal',
            }),
        [layoutPlan.compact, layoutPlan.titleMaxWidth, spinningName]
    );

    const outcomeClasses = useMemo(
        () =>
            isWinner
                ? {
                    frame: 'border-emerald-300/35 bg-emerald-400/10',
                    title: 'text-emerald-200',
                    subtitle: 'text-emerald-100',
                    button: 'bg-emerald-500 hover:bg-emerald-400 focus:ring-emerald-400/60 text-white',
                    chip: 'border-emerald-300/50 bg-emerald-400/25 text-emerald-50',
                }
                : {
                    frame: 'border-rose-300/35 bg-rose-400/10',
                    title: 'text-rose-200',
                    subtitle: 'text-rose-100',
                    button: 'bg-rose-500 hover:bg-rose-400 focus:ring-rose-400/60 text-white',
                    chip: 'border-rose-300/50 bg-rose-400/25 text-rose-50',
                },
        [isWinner]
    );

    useEffect(() => {
        if (participantNames.length === 0) {
            setIsWheelSpinning(false);
            setIsRouletteDone(true);
            return;
        }

        setIsRouletteDone(false);
        setIsWheelSpinning(true);
        setWheelRotation((prev) => computeNextRotation(prev, winningPrizeIndex, wheelData.length));

        if (prefersReducedMotion) {
            setIsWheelSpinning(false);
            setIsRouletteDone(true);
        }
    }, [participantNames, prefersReducedMotion, winningPrizeIndex, wheelData.length]);

    const handleWheelAnimationComplete = useCallback(() => {
        if (!isWheelSpinning) return;
        setIsWheelSpinning(false);
        setIsRouletteDone(true);
    }, [isWheelSpinning]);

    return (
        <AnimatePresence>
            <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-160 flex items-start justify-center overflow-y-auto bg-[#020b23]/90 p-3 backdrop-blur-md sm:items-center sm:p-4 lg:p-6"
                onClick={onClose}
            >
                <m.div
                    initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.92, opacity: 0, rotate: 1 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className={`relative my-auto w-full max-w-[min(96vw,1040px)] max-h-[calc(100dvh-1rem)] overflow-y-auto overflow-x-hidden overscroll-y-contain rounded-[2rem] border border-white/15 bg-slate-950/92 text-center shadow-[0_32px_120px_rgba(2,6,23,0.8)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${layoutPlan.compact ? 'p-4 sm:p-5' : 'p-6 sm:p-8 lg:p-6 xl:p-7'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-panama-yellow/20 blur-3xl" />
                        <div className="absolute -right-14 top-0 h-56 w-56 rounded-full bg-panama-red/24 blur-3xl" />
                        <div className="absolute bottom-12 -left-14 h-60 w-60 rounded-full bg-panama-blue/26 blur-3xl" />
                        <div className="absolute -bottom-20 right-8 h-64 w-64 rounded-full bg-panama-green/20 blur-3xl" />
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[46px_46px]" />
                    </div>

                    <div className="relative z-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.78fr)] lg:items-start lg:gap-4 xl:gap-5">
                        <div className="lg:col-span-2">
                        <m.div
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white/85"
                        >
                            <Flame className="h-3.5 w-3.5 text-[#fbb521]" />
                            Batalla en casilla
                        </m.div>

                        <m.div
                            initial={{ y: -16 }}
                            animate={{ y: 0 }}
                            className="mb-2 flex justify-center"
                        >
                            <div className="relative grid h-20 w-20 place-items-center rounded-[1.4rem] border border-amber-300/30 bg-slate-950/55 shadow-[0_20px_44px_-24px_rgba(251,181,33,0.55)]">
                                <div className="absolute inset-0 rounded-[1.4rem] bg-[radial-gradient(circle_at_22%_18%,rgba(251,181,33,0.34),transparent_56%)]" />
                                <Swords className="relative z-10 h-10 w-10 text-[#f68f2a]" strokeWidth={2.25} />
                            </div>
                        </m.div>

                        <h2 className={`font-black uppercase tracking-[0.08em] text-white ${layoutPlan.compact ? 'text-[1.65rem] sm:text-[1.95rem]' : 'text-[2.05rem] sm:text-[2.35rem]'}`}>
                            Juega Vivo
                        </h2>
                        </div>

                    <div className={`relative overflow-hidden rounded-[1.65rem] border bg-white/10 ${rouletteBorderClass} ${rouletteShadowClass} ${layoutPlan.compact ? 'my-3.5 px-3 pt-3.5 pb-4.5' : 'my-6 px-4 pt-4.5 pb-6'} lg:my-0`}>
                        <div className="pointer-events-none absolute inset-0 overflow-hidden">
                            <div className="absolute inset-0 bg-[#020617]" />
                            <div className={`absolute inset-0 ${rouletteSurfaceClass}`} />
                            <span className={`absolute -top-18 right-4 h-52 w-52 rounded-full blur-3xl ${rouletteOrbClass}`} />
                            <span className={`absolute -bottom-18 -left-6 h-56 w-56 rounded-full blur-3xl ${rouletteOrbClass} opacity-85`} />
                            <div className="absolute inset-0 bg-[linear-gradient(172deg,rgba(2,6,23,0.2)_0%,rgba(2,6,23,0.62)_100%)]" />
                            <div className="absolute inset-0 bg-white/38 dark:bg-slate-950/35" />
                        </div>

                        <div className="relative z-10">
                            <div className="relative z-30 mb-3.5 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-100">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#fbb521]" />
                                Ruleta del duelo
                            </div>

                            <div className={`relative z-10 mx-auto mt-2.5 mb-1.5 sm:mt-3 sm:mb-2 lg:mt-4 lg:mb-2.5 ${wheelFrameClassByPreset[wheelSizePreset]}`}>
                                <m.div
                                    className="pointer-events-none absolute left-1/2 top-0 z-30 h-0 w-0 -translate-x-1/2 border-x-14 border-b-22 border-x-transparent border-b-[#f34a2b] drop-shadow-[0_0_12px_rgba(243,74,43,0.55)] will-change-transform"
                                    animate={isRouletteDone ? { y: 0, scale: 1 } : { y: [0, -3, 0], scale: [1, 1.04, 1] }}
                                    transition={isRouletteDone ? { duration: 0.25 } : { duration: 0.3, repeat: Infinity, ease: 'easeInOut' }}
                                />
                                <div className="pointer-events-none absolute left-1/2 top-4.5 z-20 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-[#ff8a55] shadow-[0_0_10px_rgba(255,138,85,0.7)]" />

                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <div className={wheelSizeClassByPreset[wheelSizePreset]}>
                                        <m.div
                                            animate={{ rotate: wheelRotation }}
                                            initial={false}
                                            transition={isWheelSpinning
                                                ? { duration: 3.2, ease: [0.12, 0.92, 0.16, 1] }
                                                : { duration: 0.2, ease: 'linear' }}
                                            onAnimationComplete={handleWheelAnimationComplete}
                                            className="origin-center will-change-transform"
                                        >
                                            <RouletteWheel
                                                mustStartSpinning={false}
                                                prizeNumber={winningPrizeIndex}
                                                data={wheelData}
                                                outerBorderColor="#E2E8F0"
                                                outerBorderWidth={16}
                                                innerBorderColor="#CBD5E1"
                                                innerBorderWidth={5}
                                                innerRadius={18}
                                                radiusLineColor="rgba(15,23,42,0.45)"
                                                radiusLineWidth={2}
                                                fontFamily="Helvetica"
                                                fontSize={20}
                                                fontWeight={900}
                                                perpendicularText
                                                textDistance={68}
                                                spinDuration={1}
                                                backgroundColors={ROULETTE_BACKGROUND_COLORS}
                                                textColors={ROULETTE_TEXT_COLORS}
                                                pointerProps={ROULETTE_POINTER_PROPS}
                                                disableInitialAnimation={Boolean(prefersReducedMotion)}
                                            />
                                        </m.div>
                                    </div>
                                </div>

                                <div className="pointer-events-none absolute inset-0 rounded-full border border-white/18" />
                                <div className="pointer-events-none absolute inset-0.75 rounded-full ring-1 ring-panama-blue/40" />
                            </div>

                            <div className="mx-auto mt-3.5 rounded-2xl border border-slate-200/35 bg-slate-950/50 px-3.5 py-2.5 text-left backdrop-blur-sm lg:hidden">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300/90">
                                    Resultado de la ruleta
                                </p>
                                <p className={`mt-1.5 text-base font-black leading-[1.28] ${titleMaxWidthClass} ${isRouletteDone ? 'text-slate-50 drop-shadow-[0_1px_0_rgba(2,6,23,0.72)]' : 'animate-pulse text-slate-300'}`}>
                                    {isRouletteDone
                                        ? winnerLabel
                                        : `Girando ruleta... ${spinningNameLabel}`}
                                </p>
                            </div>

                            <div className="mt-3 flex flex-wrap justify-center gap-2 lg:hidden">
                                {participantNames.map((name, index) => (
                                    <span
                                        key={`${battle.winnerId}:${name}`}
                                        className={`rounded-full border px-2.5 py-1 text-xs font-bold ${isRouletteDone && name === battle.winnerUsername
                                            ? outcomeClasses.chip
                                            : 'border-slate-200/35 bg-slate-950/45 text-slate-100'
                                            }`}
                                    >
                                        {participantChipLabels[index] ?? name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:flex lg:w-full lg:max-w-97.5 lg:flex-col lg:gap-4 lg:pt-1">

                    <div className={`relative z-10 rounded-2xl border backdrop-blur-sm ${layoutPlan.compact ? 'my-4 p-3.5' : 'my-6 p-4'} lg:my-0 ${outcomeClasses.frame}`}>
                        <p className={`mx-auto mb-3 text-balance font-bold leading-[1.34] text-white ${layoutPlan.compact ? 'text-lg' : 'text-xl'} ${messageMaxWidthClass}`}>
                            {isRouletteDone ? battleHeadline : 'La ruleta esta decidiendo...'}
                        </p>

                        {isRouletteDone ? (
                            isWinner ? (
                                <p className={`mx-auto inline-flex items-start gap-2 font-bold ${layoutPlan.compact ? 'text-xl' : 'text-2xl'} ${outcomeClasses.title} ${messageMaxWidthClass}`}>
                                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-200/45 bg-emerald-400/20 text-emerald-100">
                                        <Medal className="h-4 w-4" />
                                    </span>
                                    <span className="text-left text-balance leading-[1.34]">
                                        {outcomeText}
                                    </span>
                                </p>
                            ) : (
                                <p className={`mx-auto inline-flex items-start gap-2 font-bold ${layoutPlan.compact ? 'text-xl' : 'text-2xl'} ${outcomeClasses.subtitle} ${messageMaxWidthClass}`}>
                                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rose-200/45 bg-rose-400/20 text-rose-100">
                                        <Skull className="h-4 w-4" />
                                    </span>
                                    <span className="text-left text-balance leading-[1.34]">
                                        {outcomeText}
                                    </span>
                                </p>
                            )
                        ) : (
                            <p className={`mx-auto text-left text-balance font-bold leading-[1.34] text-slate-100 ${layoutPlan.compact ? 'text-lg' : 'text-xl'} ${messageMaxWidthClass}`}>
                                Espera el resultado para confirmar quien gana.
                            </p>
                        )}
                    </div>

                    <div className="hidden rounded-2xl border border-slate-200/35 bg-slate-950/50 px-4 py-3 text-left backdrop-blur-sm lg:block">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-300/90">
                            Resultado de la ruleta
                        </p>
                        <p className={`mt-1.5 text-base font-black leading-[1.28] ${isRouletteDone ? 'text-slate-50 drop-shadow-[0_1px_0_rgba(2,6,23,0.72)]' : 'animate-pulse text-slate-300'}`}>
                            {isRouletteDone
                                ? winnerLabel
                                : `Girando ruleta... ${spinningNameLabel}`}
                        </p>
                    </div>

                    <div className="hidden flex-wrap justify-start gap-2 lg:flex">
                        {participantNames.map((name, index) => (
                            <span
                                key={`${battle.winnerId}:${name}:desktop`}
                                className={`rounded-full border px-2.5 py-1 text-xs font-bold ${isRouletteDone && name === battle.winnerUsername
                                    ? outcomeClasses.chip
                                    : 'border-slate-200/35 bg-slate-950/45 text-slate-100'
                                    }`}
                            >
                                {participantChipLabels[index] ?? name}
                            </span>
                        ))}
                    </div>

                    <RippleButton
                        onClick={onClose}
                        className={`relative z-10 w-full rounded-xl ${layoutPlan.compact ? 'py-3.5 text-base' : 'py-4 text-lg'} font-bold lg:mt-2 ${outcomeClasses.button}`}
                    >
                        Entendido
                    </RippleButton>
                    </div>
                    </div>
                </m.div>
            </m.div>
        </AnimatePresence>
    );
}

export default memo(BattleModal);
