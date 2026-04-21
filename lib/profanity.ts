// src/lib/profanity.ts
import leoProfanity from 'leo-profanity';

// Lista base (ES + EN) para complementar el diccionario por defecto.
const BAD_WORDS = [
    'puto', 'puta', 'mierda', 'pendejo', 'pendeja', 'cabron', 'cabrona',
    'maricon', 'zorra', 'verga', 'coño', 'joder', 'pinga', 'culo', 'bitch',
    'fuck', 'shit', 'asshole', 'dick', 'cunt', 'whore', 'slut', 'bastardo',
    'perra', 'marica', 'huevon', 'mame', 'mamar'
];

let profanityReady = false;

const ensureProfanityDictionary = (): void => {
    if (profanityReady) return;

    leoProfanity.reset();
    leoProfanity.add(BAD_WORDS);
    profanityReady = true;
};

/**
 * Normaliza un texto removiendo acentos y caracteres especiales para
 * evitar que se salten el filtro usando "pútä" en vez de "puta"
 */
const normalizeText = (text: string): string => {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/[0-9]/g, (digit) => {   // Convertir leetspeak básico (1->i, 3->e, 4->a, 0->o)
            const leetMap: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't' };
            return leetMap[digit] || digit;
        })
        .toLowerCase();
};

/**
 * Verifica si un texto contiene lenguaje inapropiado (booleano)
 */
export const containsProfanity = (text: string): boolean => {
    if (!text) return false;

    ensureProfanityDictionary();
    const normalized = normalizeText(text);
    return leoProfanity.check(normalized);
};

/**
 * Censa el texto reemplazando palabras prohibidas con asteriscos (***)
 */
export const censorProfanity = (text: string): string => {
    if (!text) return text;

    ensureProfanityDictionary();

    const wordsInText = text.split(/([\s,.;?!]+)/); // Partir manteniendo separadores

    for (let i = 0; i < wordsInText.length; i++) {
        const word = wordsInText[i];
        if (word.trim().length === 0) continue; // Es un espacio o puntuación

        // Si la palabra normalizada es una palabra prohibida
        const normalized = normalizeText(word);

        if (leoProfanity.check(normalized)) {
            // Reemplazar la palabra original con asteriscos de la misma longitud
            // Usamos Math.max para evitar RangeError: -2 en casos extremos
            wordsInText[i] = '*'.repeat(Math.max(0, word.length));
        }
    }

    return wordsInText.join('');
};

// Compatibilidad con scripts antiguos.
export const filterProfanity = censorProfanity;
