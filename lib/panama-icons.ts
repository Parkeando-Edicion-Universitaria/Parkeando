export type PanamaIconCategory = 'Comida' | 'Cultura' | 'Naturaleza' | 'Ciudad';

export type PanamaIconItem = {
    id: string;
    name: string;
    category: PanamaIconCategory;
    imagePath: string;
    fallback: string;
    price: number;
    description: string;
};

export const PANAMA_ICON_COLLECTION: PanamaIconItem[] = [
    {
        id: 'aji-chombo',
        name: 'Manzana Rosa',
        category: 'Comida',
        imagePath: '/panama-icons/orquidea-del-istmo.png',
        fallback: '🍎',
        price: 11,
        description: 'Avatar inspirado en sabores tropicales del istmo.',
    },
    {
        id: 'naranja-panamena',
        name: 'Naranjilla',
        category: 'Comida',
        imagePath: '/panama-icons/cacao-bocas.png',
        fallback: '🍊',
        price: 11,
        description: 'Avatar frutal con identidad panamena.',
    },
    {
        id: 'tucan-istmeno',
        name: 'Tucán',
        category: 'Naturaleza',
        imagePath: '/panama-icons/alpaca-andina.png',
        fallback: '🐦',
        price: 15,
        description: 'Representa la fauna vibrante de Panama.',
    },
    {
        id: 'camisa-tipica',
        name: 'Montuno',
        category: 'Cultura',
        imagePath: '/panama-icons/camisa-tipica.png',
        fallback: '👕',
        price: 13,
        description: 'Avatar con vestimenta tradicional panamena.',
    },
    {
        id: 'pollera',
        name: 'Pollera',
        category: 'Cultura',
        imagePath: '/panama-icons/tucan-istmeno.png',
        fallback: '👗',
        price: 13,
        description: 'Icono de orgullo folclorico panameno.',
    },
    {
        id: 'sancocho',
        name: 'Chicheme',
        category: 'Comida',
        imagePath: '/panama-icons/naranja-panamena.png',
        fallback: '🥛',
        price: 11,
        description: 'Avatar de bebida tradicional para destacar en partida.',
    },
    {
        id: 'raspao',
        name: 'Coco Cielo',
        category: 'Comida',
        imagePath: '/panama-icons/dulce-coco.png',
        fallback: '🥥',
        price: 11,
        description: 'Avatar fresco con sabor caribeno.',
    },
    {
        id: 'ceviche-panama',
        name: 'Tamal De Olla',
        category: 'Comida',
        imagePath: '/panama-icons/yuca-frita.png',
        fallback: '🍲',
        price: 12,
        description: 'Una insignia culinaria para tu perfil.',
    },
    {
        id: 'alpaca-andina',
        name: 'Águila Arpía',
        category: 'Naturaleza',
        imagePath: '/panama-icons/ceviche-panama.png',
        fallback: '🦅',
        price: 17,
        description: 'Avatar premium de la majestuosa ave nacional.',
    },
    {
        id: 'iguana-amarilla',
        name: 'Rana Dorada',
        category: 'Naturaleza',
        imagePath: '/panama-icons/raspao.png',
        fallback: '🐸',
        price: 17,
        description: 'Icono iconico de biodiversidad panamena.',
    },
    {
        id: 'cacao-bocas',
        name: 'Tomate de Árbol',
        category: 'Comida',
        imagePath: '/panama-icons/iguana-amarilla.png',
        fallback: '🍅',
        price: 11,
        description: 'Fruta andina tropical convertida en avatar.',
    },
    {
        id: 'conchas-pacifico',
        name: 'Empanadas',
        category: 'Comida',
        imagePath: '/panama-icons/aji-chombo.png',
        fallback: '🥟',
        price: 12,
        description: 'Sabor callejero panameno para tu personaje.',
    },
    {
        id: 'orquidea-del-istmo',
        name: 'Espíritu Santo',
        category: 'Naturaleza',
        imagePath: '/panama-icons/pollera.png',
        fallback: '🌸',
        price: 15,
        description: 'Flor nacional en formato de avatar coleccionable.',
    },
    {
        id: 'mazorca-criolla',
        name: 'Sancocho',
        category: 'Comida',
        imagePath: '/panama-icons/mazorca-criolla.png',
        fallback: '🍲',
        price: 12,
        description: 'Plato emblematico para marcar tu estilo.',
    },
    {
        id: 'ciudad-panama',
        name: 'Canal De Panamá',
        category: 'Ciudad',
        imagePath: '/panama-icons/conchas-pacifico.png',
        fallback: '🚢',
        price: 18,
        description: 'Avatar historico de la via interoceanica.',
    },
    {
        id: 'colibri-verde',
        name: 'Quetzal Resplandeciente',
        category: 'Naturaleza',
        imagePath: '/panama-icons/sancocho.png',
        fallback: '🕊️',
        price: 17,
        description: 'Ave legendaria para un perfil inolvidable.',
    },
    {
        id: 'empanadas-maiz',
        name: 'Plátano Caramelizado',
        category: 'Comida',
        imagePath: '/panama-icons/chorizo-table.png',
        fallback: '🍌',
        price: 12,
        description: 'Dulce tradicional transformado en avatar.',
    },
    {
        id: 'chorizo-table',
        name: 'Carimañola',
        category: 'Comida',
        imagePath: '/panama-icons/empanadas-maiz.png',
        fallback: '🥨',
        price: 12,
        description: 'Bocado clasico para jugadores con actitud.',
    },
    {
        id: 'yuca-frita',
        name: 'Yuca Frita',
        category: 'Comida',
        imagePath: '/panama-icons/colibri-verde.png',
        fallback: '🍟',
        price: 11,
        description: 'Avatar crujiente para tus victorias.',
    },
    {
        id: 'dulce-coco',
        name: 'Patacones',
        category: 'Comida',
        imagePath: '/panama-icons/ciudad-panama.png',
        fallback: '🍌',
        price: 12,
        description: 'Un clasico panameno para equipar en partida.',
    },
];

export const PANAMA_ICON_IMAGE_BY_ID: Record<string, string> = Object.fromEntries(
    PANAMA_ICON_COLLECTION.map((item) => [item.id, item.imagePath])
);

export const PANAMA_ICON_IDS = PANAMA_ICON_COLLECTION.map((item) => item.id);
