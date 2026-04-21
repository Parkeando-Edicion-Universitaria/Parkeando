import { memo, useMemo } from 'react';
import Image from 'next/image';
import { m } from 'framer-motion';
import { truncateSingleLineWithPretext } from '@/lib/pretext';
import { PANAMA_ICON_IMAGE_BY_ID } from '@/lib/panama-icons';
import { 
    Car, 
    Zap, 
    Truck, 
    Bus, 
    ShieldAlert, 
    Ghost 
} from 'lucide-react';

interface PlayerIconProps {
    icon: string | React.ReactNode; // revisado para Lucide icons soporte
    color: string;        // BG color hex
    size?: 'xs' | 'sm' | 'md' | 'lg';
    isCurrentTurn?: boolean;
    isMe?: boolean;
    username?: string;
}

const sizeConfig = {
    xs: { wrap: 'w-6 h-6 text-xs', badge: 'text-[7px]', titleBadge: 'text-[5px] px-1 py-0.5', nameMaxClass: 'max-w-[36px]' },
    sm: { wrap: 'w-8 h-8 text-sm', badge: 'text-[8px]', titleBadge: 'text-[6px] px-1 py-0.5', nameMaxClass: 'max-w-[48px]' },
    md: { wrap: 'w-10 h-10 text-xl', badge: 'text-[9px]', titleBadge: 'text-[7px] px-1.5 py-0.5', nameMaxClass: 'max-w-[56px]' },
    lg: { wrap: 'w-14 h-14 text-2xl', badge: 'text-xs', titleBadge: 'text-[9px] px-2 py-1', nameMaxClass: 'max-w-[80px]' },
};

/**
 * Meticulously crafted jugador Icon
 * Extracts equipado datos from the `icon` JSON string (si present) to renderiza borders, avatars, y titles.
 */
function PlayerIcon({
    icon,
    color,
    size = 'md',
    isCurrentTurn = false,
    isMe = false,
    username,
}: PlayerIconProps) {
    const cfg = sizeConfig[size];
    const usernameMaxWidth = size === 'lg' ? 80 : size === 'md' ? 56 : size === 'sm' ? 48 : 36;
    const usernameLineHeight = size === 'lg' ? 14 : 12;

    const truncatedUsername = useMemo(() => {
        if (!username) return '';

        return truncateSingleLineWithPretext(username, {
            font: '700 10px ui-sans-serif, system-ui, sans-serif',
            maxWidth: usernameMaxWidth,
            lineHeight: usernameLineHeight,
        });
    }, [username, usernameLineHeight, usernameMaxWidth]);

    // Decodificar el campo de ícono potencialmente serializado como JSON.
    let equippedData: { avatar: React.ReactNode, border: string | null, title: string | null } = { 
        avatar: icon, 
        border: null, 
        title: null 
    };

    if (typeof icon === 'string') {
        try {
            if (icon.startsWith('{')) {
                const parsed = JSON.parse(icon);
                equippedData = {
                    avatar: parsed.avatar || 'car',
                    border: parsed.border || null,
                    title: parsed.title || null
                };
            }
        } catch {
            // Respaldo al ícono de texto normal.
        }
    }

    const iconId = equippedData.avatar;

    const getDisplayIcon = (id: React.ReactNode) => {
        if (!id) return <Car className="w-full h-full p-1" />;
        
        if (typeof id === 'string') {
            const sizeMap = { xs: 12, sm: 16, md: 24, lg: 32 };
            const iconSize = sizeMap[size];
            const imageSizeClass = {
                xs: 'w-4 h-4',
                sm: 'w-5 h-5',
                md: 'w-7 h-7',
                lg: 'w-9 h-9',
            };
            const imagePixelSize = {
                xs: 16,
                sm: 20,
                md: 28,
                lg: 36,
            };

            const panamaAvatarPath = PANAMA_ICON_IMAGE_BY_ID[id];
            if (panamaAvatarPath) {
                return (
                    <Image
                        src={panamaAvatarPath}
                        alt="Avatar Panamá"
                        width={imagePixelSize[size]}
                        height={imagePixelSize[size]}
                        className={`${imageSizeClass[size]} object-contain drop-shadow-sm`}
                        draggable={false}
                    />
                );
            }

            switch(id) {
                case 'car': return <Car size={iconSize} />;
                case 'sport_car': return <Zap size={iconSize} />;
                case 'suv': return <Truck size={iconSize} />;
                case 'van': return <Bus size={iconSize} />;
                case 'taxi': return <Car size={iconSize} />;
                case 'police_car': return <ShieldAlert size={iconSize} />;
                case 'emoji_ghost': return <Ghost size={iconSize} />;
                case 'emoji_alien': return <Ghost size={iconSize} />;
                case '🚗': return <Car size={iconSize} />;
                default: return id;
            }
        }
        return id; // Ya es un componente.
    };

    // Calcular estilos de borde según el borde equipado.
    let borderClass = 'border-2 border-transparent';
    let ringGlow = isCurrentTurn ? '0 0 15px 2px #FFD100' : 'none';

    if (equippedData.border === 'avatar_gold') {
        borderClass = 'border-[3px] border-[#FFD700] bg-gradient-to-br from-[#FFD700]/20 to-transparent';
        if (!isCurrentTurn) ringGlow = '0 0 10px rgba(255,215,0,0.4)';
    } else if (equippedData.border === 'avatar_neon') {
        borderClass = 'border-[3px] border-[#00f2fe] bg-gradient-to-br from-[#00f2fe]/20 to-transparent';
        if (!isCurrentTurn) ringGlow = '0 0 12px rgba(0,242,254,0.5)';
    } else {
        // Estado normal
        if (isCurrentTurn) borderClass = 'border-2 border-[#FFD100]';
        else if (isMe) borderClass = 'border-2 border-[#0033A0]';
    }

    const titleLabels: Record<string, { label: string, color: string, bg: string }> = {
        'title_boss': { label: '👑 JEFE/A', color: 'text-amber-300', bg: 'bg-amber-900/80 border-amber-500/50' },
        'title_rookie': { label: '🔥 NOVATO', color: 'text-orange-300', bg: 'bg-orange-900/80 border-orange-500/50' }
    };

    const titleInfo = equippedData.title ? titleLabels[equippedData.title] : null;

    return (
        <div className="relative flex flex-col items-center gap-0.5">
            {/* Halo pulsante en el turno activo con colores premiums */}
            {isCurrentTurn && (
                <m.div
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: color, filter: 'blur(8px)' }}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0.3, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                />
            )}

            {/* Círculo interactuable */}
            <m.div
                className={`${cfg.wrap} rounded-full flex items-center justify-center relative z-10 transition-all select-none backdrop-blur-sm shadow-xl ${borderClass}`}
                style={{
                    backgroundColor: color,
                    boxShadow: ringGlow,
                }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
            >
                {getDisplayIcon(iconId)}
            </m.div>

            {/* Badge TÚ - Highest priority */}
            {isMe && (
                <span className={`${cfg.badge} font-bold text-white bg-panama-blue border border-black/20 px-1.5 rounded-full shadow-lg z-20 -mt-2`}>
                    TÚ
                </span>
            )}

            {/* equipado Title Badge */}
            {!isMe && titleInfo && (
                <span className={`${cfg.titleBadge} font-bold rounded-full border shadow-lg z-20 -mt-2 flex items-center justify-center whitespace-nowrap ${titleInfo.color} ${titleInfo.bg} uppercase tracking-wider`}>
                    {titleInfo.label}
                </span>
            )}

            {/* Nombre del jugador */}
            {truncatedUsername && (
                <span className={`text-[10px] font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,1)] ${cfg.nameMaxClass} truncate text-center leading-tight mt-0.5`}>
                    {truncatedUsername}
                </span>
            )}
        </div>
    );
}

export default memo(PlayerIcon);
