import { GameCard } from '@/types/game';

export const GAME_CARDS: GameCard[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // PANAMÁ (Casillas 1-10)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'pty-r1', cellPosition: 1, province: 'Panamá', type: 'pregunta',
    title: 'Cinta Costera - Carnavales de la city',
    description: 'En los carnavales de la city sonó una canción por la que todo el mundo conocía a Danger Man, ¿cuál es? Canta un pedacito.',
    options: ['Funeral', 'Te Ves Buena', 'Gasolina'],
    correctAnswer: 0,
    onCorrect: { rollDiceAndAdvance: true },
    onIncorrect: { advanceCells: -1 },
  },
  {
    id: 'pty-pr1', cellPosition: 2, province: 'Panamá', type: 'premio',
    title: 'Casco Antiguo',
    description: 'Cuenta algo curioso del Casco Antiguo. Avanza 2 casillas.',
    onComplete: { advanceCells: 2 },
  },
  {
    id: 'pty-p1', cellPosition: 3, province: 'Panamá', type: 'pregunta',
    title: 'Calzada de Amador',
    description: '¿Qué animal anda en manada, sale en las noches a "robar" comida y parece usar un antifaz?',
    options: ['Gato', 'Mapache', 'Perro'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
    onIncorrect: { advanceCells: -1 },
  },
  {
    id: 'pty-r2', cellPosition: 4, province: 'Panamá', type: 'pregunta',
    title: 'Canal de Panamá',
    description: '¿Qué conecta el Canal de Panamá?',
    options: ['Océano Pacífico y Atlántico', 'Pacífico y Índico', 'Atlántico y Mediterráneo'],
    correctAnswer: 0,
    onCorrect: { advanceCells: 2 },
    onIncorrect: { advanceCells: -3 },
  },
  {
    id: 'pty-pr2', cellPosition: 5, province: 'Panamá', type: 'premio',
    title: 'Mercado del Marisco',
    description: 'Haz una subasta rápida de mariscos como si fueras vendedor del mercado. Debes gritar al menos dos mariscos que vendas. Avanza 2 casillas.',
    onComplete: { advanceCells: 2 },
  },
  {
    id: 'pty-p2', cellPosition: 6, province: 'Panamá', type: 'pregunta',
    title: 'Albrook Mall',
    description: '¿Por qué es famoso este lugar?',
    options: ['Es uno de los centros comerciales más grandes de América Latina', 'Es una montaña', 'Es un museo'],
    correctAnswer: 0,
    onCorrect: { advanceCells: 2 },
    onIncorrect: { advanceCells: -3 },
  },
  {
    id: 'pty-r3', cellPosition: 7, province: 'Panamá', type: 'premio',
    title: 'Cerro Ancón',
    description: 'Casilla especial: fiestas patrias. Canta el himno nacional. Avanza 2 casillas.',
    onComplete: { advanceCells: 2 },
  },
  {
    id: 'pty-p3', cellPosition: 8, province: 'Panamá', type: 'pregunta',
    title: 'Avenida B',
    description: '¿Cuál de estas frases representa mejor a un vendedor ambulante con estilo "chacalístico"?',
    options: ['"Buenos días, estimado cliente, ¿desea adquirir este producto?"', '"¡Lleve, lleve, que se acaba! Bueno, bonito y barato, pa\' la casa!"', '"Producto disponible bajo pedido únicamente en línea"'],
    correctAnswer: 1,
    onCorrect: { rollDiceAndAdvance: true },
    onIncorrect: { skipTurns: 1 },
  },
  {
    id: 'pty-r4', cellPosition: 9, province: 'Panamá', type: 'pregunta',
    title: 'Sabores del Chorrillo',
    description: '¿Qué plato es muy popular aquí?',
    options: ['Sushi', 'Pescado frito', 'Tacos'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
    onIncorrect: { advanceCells: -3 },
  },
  {
    id: 'pty-p4', cellPosition: 10, province: 'Panamá', type: 'pregunta',
    title: 'Jardín Botánico Summit',
    description: '¿Cuál de las siguientes opciones incluye una planta y un animal que puedes encontrar en el Jardín Botánico Summit?',
    options: ['Orquídea y perezoso', 'Pino nevado y pingüino', 'Cactus del desierto y camello'],
    correctAnswer: 0,
    onCorrect: { advanceCells: 2 },
    onIncorrect: { advanceCells: -2 },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PANAMÁ OESTE (Casillas 11-20)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'po-pen1', cellPosition: 11, province: 'Panamá Oeste', type: 'penalizacion',
    title: 'Tráfico',
    description: 'Caíste en un tranque. Pierdes tu turno y retrocedes 4 casillas.',
    autoApply: { loseTurn: true, advanceCells: -4 },
  },
  {
    id: 'po-r1', cellPosition: 12, province: 'Panamá Oeste', type: 'reto',
    title: 'Diablos Limpios (La Chorrera)',
    description: 'Realiza el paso básico de los diablicos limpios de La Chorrera (puedes hacerlo con energía y expresión). Tira los dados y avanza.',
    onComplete: { rollDiceAndAdvance: true },
  },
  {
    id: 'po-pr1', cellPosition: 13, province: 'Panamá Oeste', type: 'pregunta',
    title: 'Chicheme - El Chichemito (La Chorrera)',
    description: '¿Qué manjar chorrerano encuentras en El Chichemito?',
    options: ['Bollo preñao', 'Carne en palito', 'Puré de papas'],
    correctAnswer: 0,
    onCorrect: { advanceCells: 3 },
    onIncorrect: { advanceCells: -3 },
  },
  {
    id: 'po-p1', cellPosition: 14, province: 'Panamá Oeste', type: 'reto',
    title: 'Quesos Chela (Capira)',
    description: 'Parada obligatoria. Dime 3 productos que vendan en Quesos Chela. Tira los dados y avanza.',
    onComplete: { rollDiceAndAdvance: true },
  },
  {
    id: 'po-r2', cellPosition: 15, province: 'Panamá Oeste', type: 'pregunta',
    title: 'Cerro Campana',
    description: '¿Qué historia de terror has escuchado de Cerro Campana?',
    options: ['El Manatí Valiente', 'La casa embrujada', 'La cueva del zorro'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 3 },
    onIncorrect: { advanceCells: -3 },
  },
  {
    id: 'po-pr2', cellPosition: 16, province: 'Panamá Oeste', type: 'premio',
    title: 'Restaurante Linu',
    description: '¿Cómo venderías un plato de lechona? Haz el anuncio. Avanza 2 casillas.',
    onComplete: { advanceCells: 2 },
  },
  {
    id: 'po-p2', cellPosition: 17, province: 'Panamá Oeste', type: 'premio',
    title: 'Cerro Picacho',
    description: 'Haz una pose de victoria en la cima del cerro, como si hubieras terminado la caminata. Avanza 2 casillas.',
    onComplete: { advanceCells: 2 },
  },
  {
    id: 'po-r3', cellPosition: 18, province: 'Panamá Oeste', type: 'pregunta',
    title: 'La Ermita',
    description: '¿Qué caracteriza a La Ermita?',
    options: ['Es una iglesia histórica y un lugar cultural en El Valle', 'Es un parque de diversiones', 'Es una playa con arena blanca'],
    correctAnswer: 0,
    onCorrect: { advanceCells: 3 },
    onIncorrect: { advanceCells: -3 },
  },
  {
    id: 'po-pr3', cellPosition: 19, province: 'Panamá Oeste', type: 'premio',
    title: 'Laguna de San Carlos',
    description: 'Simula que estás armando rápidamente tu tienda de campaña, pero de forma exagerada y cómica. Avanza 2 casillas.',
    onComplete: { advanceCells: 2 },
  },
  {
    id: 'po-p3', cellPosition: 20, province: 'Panamá Oeste', type: 'reto',
    title: 'Fiestas Patronales de San Carlos',
    description: 'Haz un ritmo de tambores o palmas durante 10 segundos como si estuvieras en el desfile de las Fiestas Patronales de San Carlos. Debes sonar animado y con energía. Tira los dados y avanza.',
    onComplete: { rollDiceAndAdvance: true },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COCLÉ (Casillas 21-30)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'coc-p2', cellPosition: 21, province: 'Coclé', type: 'pregunta',
    title: 'Reto - Energía Renovable',
    description: '¿Qué lugar es conocido por ser un proyecto importante de energía renovable en Panamá?',
    options: ['Piedra de Jabón', 'Parques Eólicos de Penonomé', 'El Salado', 'Toro Guapo de Antón'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'coc-p3', cellPosition: 22, province: 'Coclé', type: 'pregunta',
    title: 'Silueta Natural',
    description: '¿Cuál sitio es famoso por su silueta natural en forma de una mujer acostada?',
    options: ['Los Picachos de Olá', 'Piedra del Farallón', 'La India Dormida', 'Playa Farallón'],
    correctAnswer: 2,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'coc-p4', cellPosition: 23, province: 'Coclé', type: 'pregunta',
    title: 'Reto - Silueta Natural',
    description: '¿Cuál sitio es famoso por su silueta natural en forma de una mujer acostada?',
    options: ['Los Picachos de Olá', 'Piedra del Farallón', 'La India Dormida', 'Playa Farallón'],
    correctAnswer: 2,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'coc-p5', cellPosition: 24, province: 'Coclé', type: 'pregunta',
    title: 'Aeropuerto',
    description: '¿Cuál de estos lugares fue anteriormente una base militar y hoy impulsa el turismo?',
    options: ['Aeropuerto de Río Hato', 'Piedra del Farallón', 'El Salado', 'Los Picachos'],
    correctAnswer: 0,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'coc-r1', cellPosition: 25, province: 'Coclé', type: 'pregunta',
    title: 'Atractivo Natural',
    description: '¿Qué atractivo es ideal para realizar senderismo y observar paisajes montañosos?',
    options: ['Aeropuerto de Río Hato', 'La India Dormida', 'Piedra del Farallón', 'Toro Guapo'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'coc-r2', cellPosition: 26, province: 'Coclé', type: 'pregunta',
    title: 'Tradiciones',
    description: '¿En qué lugar se conservan tradiciones artesanales heredadas de culturas indígenas?',
    options: ['La Pintada', 'Río Hato', 'El Salado'],
    correctAnswer: 0,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'coc-r3', cellPosition: 27, province: 'Coclé', type: 'pregunta',
    title: 'Reto - Cultura Artesanal',
    description: '¿Qué producto es representativo de la cultura artesanal de Coclé?',
    options: ['Molas', 'Sombrero Pintao', 'Máscaras de diablos', 'Artesanías de concha'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'coc-r4', cellPosition: 28, province: 'Coclé', type: 'pregunta',
    title: 'Gastronomía Típica',
    description: 'La gastronomía típica de las zonas costeras incluye principalmente ______ y pescado fresco.',
    options: ['Mariscos', 'Sal', 'Agua'],
    correctAnswer: 0,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'coc-pr1', cellPosition: 29, province: 'Coclé', type: 'pregunta',
    title: 'Reto - Símbolo Panameño',
    description: 'El Sombrero Pintao es considerado un símbolo del ______ panameño.',
    options: ['Folklore o cultura tradicional', 'Sombrero', 'La Piedra de Jabón'],
    correctAnswer: 0,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'coc-pr2', cellPosition: 30, province: 'Coclé', type: 'pregunta',
    title: 'Premio - Parques Eólicos',
    description: 'Los parques eólicos aprovechan la fuerza del ________ para generar energía.',
    options: ['Mar', 'Pollera', 'Viento'],
    correctAnswer: 2,
    onCorrect: { advanceCells: 2 },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HERRERA (Casillas 41-50)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'her-p2', cellPosition: 43, province: 'Herrera', type: 'pregunta',
    title: 'Punto estratégico en Herrera',
    description: 'Escoger la mejor respuesta: ¿Por qué es un punto estratégico en Herrera?',
    options: ['Porque es un puerto importante del país', 'Porque es donde se encuentra el canal de Panamá', 'Porque conecta varias provincias y es un importante cruce de carreteras', 'Porque allí se encuentra el aeropuerto internacional más grande de la región'],
    correctAnswer: 2,
    onCorrect: { advanceCells: 1 },
  },
  {
    id: 'her-p3', cellPosition: 49, province: 'Herrera', type: 'pregunta',
    title: 'Catedral de San Juan Bautista',
    description: 'Escoger la mejor respuesta: ¿En qué distrito está ubicada? Si responden bien avanzan 1 casilla.',
    options: ['Distrito de Chitré', 'Distrito de Ocú', 'Distrito de Pesé', 'Distrito de Parita'],
    correctAnswer: 0,
    onCorrect: { advanceCells: 1 },
  },
  {
    id: 'her-r1', cellPosition: 41, province: 'Herrera', type: 'reto',
    title: 'Pan de La Arena',
    description: 'En 15 segundos deben hacer un mini anuncio vendiendo el Pan de La Arena como si fuera un comercial. Si lo hacen bien avanzan 1 casilla.',
    onComplete: { advanceCells: 1 },
  },
  {
    id: 'her-r2', cellPosition: 50, province: 'Herrera', type: 'reto',
    title: 'Cerámica de barro',
    description: 'Representen con mímica cómo se hace una pieza de barro (sin hablar). Si adivinan avanzan 1 casilla.',
    onComplete: { advanceCells: 1 },
  },
  {
    id: 'her-r3', cellPosition: 47, province: 'Herrera', type: 'reto',
    title: 'Pueblo de Parita',
    description: 'Debe cantar un tamborito. Letra: "Eeejue ejue jue jue la sortija que me dio era de vidrio y se quebró. Eeejue ejue jue jue la sortija Que me dio era de vidrio y se quebró. Yajee ejue jue ojue la sortija que me dio era de vidrio y se quebró". Si lo canta bien sin equivocarse avanzan 2 casillas.',
    onComplete: { advanceCells: 2 },
  },
  {
    id: 'her-r4', cellPosition: 44, province: 'Herrera', type: 'reto',
    title: 'Jerga de Herrera',
    description: 'DI ESTAS 3 PALABRAS USANDO LA JERGA DE HERRERA:\n- Cad-tucho (cartucho)\n- Posta (carne)\n- Hoja-dda (Hojaldre)\nSi las dice bien sin equivocarse avanzan 2 casillas.',
    onComplete: { advanceCells: 2 },
  },
  {
    id: 'her-pr1', cellPosition: 42, province: 'Herrera', type: 'pregunta',
    title: 'Festival de la Caña de Azúcar en Pesé',
    description: '¿Qué producto se relaciona con el festival? Si responde bien avanzan 2 casillas.',
    options: ['El Maíz', 'La caña de azúcar', 'El Arroz'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'her-pr2', cellPosition: 45, province: 'Herrera', type: 'pregunta',
    title: 'Festival del Manito en Ocú',
    description: '¿Cuál es la pollera regional de Ocú? Si responde bien avanzan 1 casilla.',
    options: ['Pollera de Darién', 'Pollera de Los Santos', 'Pollera Congo de Colón'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 1 },
  },
  {
    id: 'her-p1', cellPosition: 46, province: 'Herrera', type: 'pregunta',
    title: 'Parque Nacional de Sarigua',
    description: 'Escoger la mejor respuesta: ¿Qué tipo de paisaje predomina allí? Si responden bien avanzan 1 casilla.',
    options: ['Bosque tropical húmedo', 'Paisaje árido o semidesértico', 'Selva montañosa', 'Bosque nuboso'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 1 },
  },
  {
    id: 'her-pr3', cellPosition: 48, province: 'Herrera', type: 'pregunta',
    title: 'Hacienda San Isidro',
    description: '¿Cuál es el principal producto de exportación? Si responde bien avanzan 1 casilla.',
    options: ['Azúcar', 'Sal', 'Café'],
    correctAnswer: 0,
    onCorrect: { advanceCells: 1 },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOS SANTOS (Casillas 31-40)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ls-r1', cellPosition: 31, province: 'Los Santos', type: 'reto',
    title: 'Carnavales de Las Tablas',
    description: 'Representar Calle Arriba vs Calle Abajo. Avanzan 2 casillas si lo hacen bien.',
    onComplete: { advanceCells: 2 },
  },
  {
    id: 'ls-pr1', cellPosition: 32, province: 'Los Santos', type: 'pregunta',
    title: 'Festival Nacional de la Mejorana',
    description: '¿En qué distrito se celebra? Avanzan 5 casillas si responden bien.',
    options: ['Guararé', 'Pedasí', 'Tonosí'],
    correctAnswer: 0,
    onCorrect: { advanceCells: 5 },
  },
  {
    id: 'ls-p2', cellPosition: 33, province: 'Los Santos', type: 'pregunta',
    title: 'Feria Internacional de Azuero',
    description: '¿En qué mes se celebra? Avanzan 2 casillas si responden bien.',
    options: ['Enero', 'Abril', 'Agosto'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'ls-r2', cellPosition: 34, province: 'Los Santos', type: 'reto',
    title: 'Playa Venao',
    description: 'Imitar a un surfista por 20 segundos.',
  },
  {
    id: 'ls-p3', cellPosition: 35, province: 'Los Santos', type: 'pregunta',
    title: 'Isla Cañas',
    description: '¿Qué animal llega a desovar? Avanzan 2 casillas si responden bien.',
    options: ['Tortuga lora', 'Delfín', 'Tiburón'],
    correctAnswer: 0,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'ls-r3', cellPosition: 36, province: 'Los Santos', type: 'reto',
    title: 'Cerro Canajagua',
    description: 'Simular que están subiendo una montaña.',
  },
  {
    id: 'ls-p4', cellPosition: 37, province: 'Los Santos', type: 'pregunta',
    title: 'Desfile de las Mil Polleras',
    description: '¿Dónde se realiza? Avanzan 2 casillas si responden bien.',
    options: ['Chitré', 'Las Tablas', 'Santiago'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'ls-r4', cellPosition: 38, province: 'Los Santos', type: 'reto',
    title: 'Playa El Uverito',
    description: 'Crear un slogan turístico en 30 segundos.',
  },
  {
    id: 'ls-p5', cellPosition: 39, province: 'Los Santos', type: 'pregunta',
    title: 'Isla Iguana',
    description: '¿Por qué es área protegida? Avanzan 2 casillas si responden bien.',
    options: ['Por sus hoteles de lujo', 'Por su biodiversidad y arrecifes', 'Por su aeropuerto'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'ls-p1', cellPosition: 40, province: 'Los Santos', type: 'pregunta',
    title: 'Manuel F. Zárate',
    description: '¿Quién fue y por qué es importante? Avanzan 2 casillas si responden bien.',
    options: ['Un político que fundó Los Santos', 'Un folclorista que preservó tradiciones panameñas', 'Un cantante internacional'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VERAGUAS (Casillas 51-60)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ver-r1', cellPosition: 51, province: 'Veraguas', type: 'reto',
    title: 'Tamborito',
    description: '¡Caíste en la casilla del Tamborito! Realiza una saloma. Si lo haces bien, avanzas 2 casillas.',
    onComplete: { advanceCells: 2 },
  },
  {
    id: 'ver-pr1', cellPosition: 52, province: 'Veraguas', type: 'premio',
    title: 'El Mosquero',
    description: 'Comida deliciosa: te llenaste de energía, avanza 2 casillas.',
    onComplete: { advanceCells: 2 },
  },
  {
    id: 'ver-p1', cellPosition: 53, province: 'Veraguas', type: 'pregunta',
    title: 'Playa Santa Catalina',
    description: '¿En qué océano se ubica la playa Santa Catalina?',
    options: ['Océano Atlántico', 'Océano Índico', 'Océano Pacífico'],
    correctAnswer: 2,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'ver-pr3', cellPosition: 54, province: 'Veraguas', type: 'premio',
    title: 'Urraca',
    description: 'Protección de guerreros: lanza el dado nuevamente.',
    onComplete: { extraDiceRoll: true },
  },
  {
    id: 'ver-p2', cellPosition: 55, province: 'Veraguas', type: 'pregunta',
    title: 'Sancocho',
    description: 'Describe la preparación del sancocho.\n¿Verdadero o Falso?: El sancocho se prepara hirviendo el pollo con sal, ajo y cebolla, luego se agrega ñame y culantro hasta que todo esté suave.',
    options: ['Falso', 'Verdadero'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'ver-pr2', cellPosition: 56, province: 'Veraguas', type: 'premio',
    title: 'Puerto Mutis',
    description: 'Sube a la lancha y avanza a la primera casilla de Bocas del Toro.',
    onComplete: { goToPosition: 61 },
  },
  {
    id: 'ver-p3', cellPosition: 57, province: 'Veraguas', type: 'pregunta',
    title: 'Parque Nacional Santa Fe',
    description: '¿Qué actividades turísticas se pueden hacer en el Parque Santa Fe?\n¿Sí o No?: ¿En el Parque Santa Fe se puede hacer senderismo, observar aves y bañarse en ríos?',
    options: ['No', 'Sí'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'ver-p4', cellPosition: 58, province: 'Veraguas', type: 'pregunta',
    title: 'Bollo Colorado',
    description: '¿Por qué se le llama bollo colorado?',
    options: ['Porque se cocina con carne', 'Porque la masa se pinta de rojo', 'Porque lleva salsa picante'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'ver-p5', cellPosition: 59, province: 'Veraguas', type: 'pregunta',
    title: 'Atalaya',
    description: '¿A qué imagen religiosa acuden miles de peregrinos en Atalaya?\n¿Verdadero o Falso?: Miles de peregrinos acuden a la imagen de Jesús Nazareno de Atalaya.',
    options: ['Falso', 'Verdadero'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'ver-pen1', cellPosition: 60, province: 'Veraguas', type: 'penalizacion',
    title: 'Cárcel Coiba',
    description: 'Caíste en la cárcel, espera 2 turnos para poder avanzar.',
    autoApply: { skipTurns: 2 },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BOCAS DEL TORO (Casillas 61-70)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'bdt-p1', cellPosition: 61, province: 'Bocas del Toro', type: 'pregunta',
    title: 'Escudo de Veraguas',
    description: '¿Qué animal único en el mundo vive en esta isla?',
    options: ['El Manatí del Caribe', 'El Perezoso Pigmeo de tres dedos', 'El Jaguar de la selva'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'bdt-r1', cellPosition: 62, province: 'Bocas del Toro', type: 'reto',
    title: 'Bluff Beach',
    description: '¡Viene una ola en Carenero! Ponte en posición de surfista y mantén el equilibrio por 10 segundos.',
  },
  {
    id: 'bdt-p2', cellPosition: 63, province: 'Bocas del Toro', type: 'pregunta',
    title: 'Playa Estrella',
    description: '¿Qué es lo más importante que NO debes hacer al visitar esta playa?',
    options: ['Nadar en el agua cristalina', 'Sacar las estrellas de mar del agua para una foto', 'Caminar por la arena blanca'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 1 },
  },
  {
    id: 'bdt-p3', cellPosition: 64, province: 'Bocas del Toro', type: 'pregunta',
    title: 'Cayo Coral',
    description: '¿Cuál es la actividad principal que se realiza en este lugar rodeado de arrecifes?',
    options: ['Senderismo en la montaña', 'Snorkel para ver peces y corales', 'Compras de ropa de invierno'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 1 },
  },
  {
    id: 'bdt-pr1', cellPosition: 65, province: 'Bocas del Toro', type: 'premio',
    title: 'Red Frog Beach',
    description: 'Te ganaste una tarde de relax total en el hotel de la playa. Avanza 2 casillas.',
    onComplete: { advanceCells: 2 },
  },
  {
    id: 'bdt-pr2', cellPosition: 66, province: 'Bocas del Toro', type: 'premio',
    title: 'Cayo Zapatilla',
    description: 'Llegaste al tour más famoso y el agua está cristalina. ¡Qué paraíso! Avanza 2 casillas.',
    onComplete: { advanceCells: 2 },
  },
  {
    id: 'bdt-p4', cellPosition: 67, province: 'Bocas del Toro', type: 'pregunta',
    title: 'Isla Pájaro',
    description: '¿Por qué es famoso este lugar?',
    options: ['Porque es un santuario de aves donde anida el Rabijunco Piquirrojo', 'Porque es un volcán activo', 'Porque tiene el centro comercial más grande de la provincia'],
    correctAnswer: 0,
    onCorrect: { advanceCells: 1 },
  },
  {
    id: 'bdt-r2', cellPosition: 68, province: 'Bocas del Toro', type: 'reto',
    title: 'Tour de Ballenas y Delfines',
    description: '¡Avistamiento! Haz la mímica de una ballena jorobada saltando en el agua o imita el sonido de un delfín.',
  },
  {
    id: 'bdt-pr3', cellPosition: 69, province: 'Bocas del Toro', type: 'premio',
    title: 'Filthy Friday',
    description: 'Sobreviviste al bar crawl más grande del archipiélago con todo el flow. Avanza 4 casillas.',
    onComplete: { advanceCells: 4 },
  },
  {
    id: 'bdt-r3', cellPosition: 70, province: 'Bocas del Toro', type: 'reto',
    title: 'Isla Colón (Casa Papaya)',
    description: 'Estás frente a la casa más famosa de Bocas Town. Posa como un influencer de viajes para una "foto" de 10 segundos.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMARCAS (Casillas 71-80)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'com-r1', cellPosition: 71, province: 'Comarcas', type: 'reto',
    title: 'Gammu Burwi',
    description: 'Realiza un pequeño paso de baile tradicional indígena. Si no lo haces, retrocede 1 casilla.',
    onFail: { advanceCells: -1 },
  },
  {
    id: 'com-pr1', cellPosition: 72, province: 'Comarcas', type: 'premio',
    title: 'Río Cricamola',
    description: 'Te refrescaste en el río. Avanza 2 casillas.',
    onComplete: { advanceCells: 2 },
  },
  {
    id: 'com-p1', cellPosition: 73, province: 'Comarcas', type: 'pregunta',
    title: 'Niadub',
    description: '¿En qué comarca se encuentra Niadub?',
    options: ['Guna Yala', 'Ngäbe-Buglé', 'Emberá-Wounaan'],
    correctAnswer: 0,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'com-r2', cellPosition: 74, province: 'Comarcas', type: 'reto',
    title: 'Dule Massi',
    description: 'Menciona una comida tradicional de los pueblos indígenas. Si no respondes, pierdes 1 turno.',
    onFail: { skipTurns: 1 },
  },
  {
    id: 'com-pr2', cellPosition: 75, province: 'Comarcas', type: 'premio',
    title: 'Río Tuira',
    description: 'Disfrutaste un paseo en bote por el río. Avanza 2 casillas.',
    onComplete: { advanceCells: 2 },
  },
  {
    id: 'com-p2', cellPosition: 76, province: 'Comarcas', type: 'pregunta',
    title: 'Revolución Guna',
    description: '¿En qué año ocurrió la Revolución Guna?',
    options: ['1923', '1890', '1925'],
    correctAnswer: 2,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'com-r3', cellPosition: 77, province: 'Comarcas', type: 'reto',
    title: 'Chácaras',
    description: 'Nombra una artesanía hecha por pueblos indígenas de Panamá. Si no lo logras, retrocede 1 casilla.',
    onFail: { advanceCells: -1 },
  },
  {
    id: 'com-pr3', cellPosition: 78, province: 'Comarcas', type: 'premio',
    title: 'Guacamaya',
    description: 'La Guacamaya te alegró el camino. Avanza 1 casilla.',
    onComplete: { advanceCells: 1 },
  },
  {
    id: 'com-p3', cellPosition: 79, province: 'Comarcas', type: 'pregunta',
    title: 'Molas',
    description: '¿Qué son las Molas?',
    options: ['Comida', 'Artesanía textil', 'Instrumento'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'com-r4', cellPosition: 80, province: 'Comarcas', type: 'reto',
    title: 'Jaguar',
    description: 'Imita por 5 segundos cómo caminaría o rugiría un Jaguar en la selva. Si no lo haces, retrocede 2 casillas.',
    onFail: { advanceCells: -2 },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHIRIQUÍ (Casillas 81-90; casilla 85 especial en special-cells)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'chi-p2', cellPosition: 81, province: 'Chiriquí', type: 'pregunta',
    title: 'El Gentilicio',
    description: '¿Cómo se le dice cariñosamente a la gente de Dolega? Verdadero o Falso: A las personas de Dolega se les conoce como "Mata de Caña".',
    options: ['Falso', 'Verdadero'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'chi-r1', cellPosition: 82, province: 'Chiriquí', type: 'reto',
    title: '¡Cosecha Relámpago!',
    description: 'Tienes 15 segundos para simular que cosechas café. Debes hacer el movimiento de recoger y echar en una canasta imaginaria lo más rápido posible.',
    onComplete: { advanceCells: 2 },
  },
  {
    id: 'chi-p3', cellPosition: 83, province: 'Chiriquí', type: 'pregunta',
    title: '¡Frentes en Cangilones!',
    description: '¿Cuál es el río que esculpió los Cangilones de Gualaca?',
    options: ['Río Chiriquí Viejo', 'Río Estí', 'Río Caldera'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'chi-r2', cellPosition: 84, province: 'Chiriquí', type: 'reto',
    title: '¡Grito de Guerra!',
    description: 'Debes soltar un grito chiricano ("¡Metooo!") que dure al menos 5 segundos sin que se te corte la voz.',
    onComplete: { advanceCells: 2 },
    onFail: { advanceCells: -1 },
  },
  {
    id: 'chi-p1', cellPosition: 86, province: 'Chiriquí', type: 'pregunta',
    title: 'El Grano de Oro',
    description: '¿Cuál es la variedad de café producida en tierras altas de Chiriquí considerada de las más exclusivas del mundo?',
    options: ['Caturra', 'Geisha', 'Robusta'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'chi-pr3', cellPosition: 87, province: 'Chiriquí', type: 'premio',
    title: 'Bajada de Boquete',
    description: 'Vienes bajando la loma en bicicleta y traes buen impulso. Salta directamente a la casilla final.',
    onComplete: { goToFinish: true },
  },
  {
    id: 'chi-p4', cellPosition: 88, province: 'Chiriquí', type: 'pregunta',
    title: 'Geografía (Límites Provinciales)',
    description: '¿Con qué provincia limita Chiriquí al norte, conocida por su archipiélago y producción bananera?',
    options: ['Veraguas', 'Colón', 'Bocas del Toro'],
    correctAnswer: 2,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'chi-p5', cellPosition: 89, province: 'Chiriquí', type: 'pregunta',
    title: 'El Coloso',
    description: '¿Cuál es el punto más alto de Panamá ubicado en Chiriquí? Verdadero o Falso: El punto más alto de Panamá es el Volcán Barú.',
    options: ['Falso', 'Verdadero'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'chi-pr1', cellPosition: 90, province: 'Chiriquí', type: 'premio',
    title: 'Exportación de ganado',
    description: 'Tu finca en Alange tuvo la mejor producción del año. El Ministerio de Desarrollo Agropecuario te premia. Tiras el dado de nuevo y avanzas lo que salga.',
    onComplete: { extraDiceRoll: true },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COLÓN (Casillas 91-100)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'col-r1', cellPosition: 91, province: 'Colón', type: 'reto',
    title: 'Isla Grande',
    description: 'Haz mímica de alguien nadando y esquivando olas en Isla Grande.',
    onComplete: { advanceCells: 2 },
    onFail: { advanceCells: -1 },
  },
  {
    id: 'col-pr1', cellPosition: 92, province: 'Colón', type: 'premio',
    title: 'Comercio y Turismo',
    description: 'Llegaste a Colón 2000, donde llegan cruceros y turistas de todo el mundo. Avanza 2 casillas.',
    onComplete: { advanceCells: 2 },
  },
  {
    id: 'col-p1', cellPosition: 93, province: 'Colón', type: 'pregunta',
    title: 'Geografía Costera',
    description: '¿En qué costa se encuentran la mayoría de las playas de la provincia de Colón, como Isla Grande y Playa La Angosta?',
    options: ['Pacífico', 'Caribe', 'Atlántico Sur'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 1 },
  },
  {
    id: 'col-r2', cellPosition: 94, province: 'Colón', type: 'reto',
    title: 'Panama Canal Railway',
    description: 'Imita el sonido de un tren en marcha y su bocina por 5 segundos.',
    onComplete: { advanceCells: 2 },
    onFail: { advanceCells: -1 },
  },
  {
    id: 'col-pr2', cellPosition: 95, province: 'Colón', type: 'premio',
    title: 'Viaje en Ferrocarril',
    description: 'Subes al histórico ferrocarril que conecta el Atlántico con el Pacífico. Avanza 3 casillas.',
    onComplete: { advanceCells: 3 },
  },
  {
    id: 'col-p2', cellPosition: 96, province: 'Colón', type: 'pregunta',
    title: 'Fuertes Coloniales',
    description: '¿En qué parte de Colón se encuentran los fuertes históricos que protegían las riquezas de la corona?',
    options: ['Sabanitas', 'Cativa', 'Portobelo'],
    correctAnswer: 2,
    onCorrect: { advanceCells: 1 },
  },
  {
    id: 'col-r3', cellPosition: 97, province: 'Colón', type: 'reto',
    title: 'Jerga y Cultura',
    description: 'Di 3 palabras colonensas o elementos que representen a la provincia en 10 segundos.',
    onComplete: { advanceCells: 2 },
    onFail: { advanceCells: -1 },
  },
  {
    id: 'col-pr3', cellPosition: 98, province: 'Colón', type: 'premio',
    title: 'Sabor Colonense',
    description: 'Pruebas un delicioso plantintá típico de la cultura afrocaribeña. Tira el dado otra vez.',
    onComplete: { extraDiceRoll: true },
  },
  {
    id: 'col-p3', cellPosition: 99, province: 'Colón', type: 'pregunta',
    title: 'Logística Moderna',
    description: '¿Cómo se llama el puerto ubicado en Colón que es líder en el comercio de contenedores?',
    options: ['Manzanillo International Terminal', 'Puerto Caimito', 'Puerto Balboa'],
    correctAnswer: 0,
    onCorrect: { advanceCells: 1 },
  },
  {
    id: 'col-p4', cellPosition: 100, province: 'Colón', type: 'pregunta',
    title: 'Gastronomía',
    description: '¿En qué se destaca principalmente la gastronomía de la provincia de Colón?',
    options: ['Sabores afrocaribeños (uso de coco y curry)', 'Comida puramente picante', 'Solo consumo de pescados fritos'],
    correctAnswer: 0,
    onCorrect: { advanceCells: 1 },
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // DARIÉN (Casillas 101-110)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'dar-r1', cellPosition: 101, province: 'Darién', type: 'reto',
    title: 'Mono Aullador',
    description: 'Imita el sonido de un mono aullador por 5 segundos. Si lo haces sin reírte, avanzas 2 casillas.',
    onComplete: { advanceCells: 2 },
  },
  {
    id: 'dar-pr1', cellPosition: 102, province: 'Darién', type: 'premio',
    title: 'La Palma',
    description: 'Disfrutaste un día tranquilo en la capital de Darién. Lanza el dado otra vez.',
    onComplete: { extraDiceRoll: true },
  },
  {
    id: 'dar-p1', cellPosition: 103, province: 'Darién', type: 'pregunta',
    title: 'Comida Tradicional',
    description: '¿Cuál es un plato típico de Darién?',
    options: ['Arroz con pollo', 'Arroz con coco y pescado'],
    correctAnswer: 1,
  },
  {
    id: 'dar-r2', cellPosition: 104, province: 'Darién', type: 'reto',
    title: 'Mono Aullador',
    description: 'Imita el sonido de un mono aullador por 5 segundos. Si lo haces sin reírte, avanzas 2 casillas.',
    onComplete: { advanceCells: 2 },
  },
  {
    id: 'dar-pr2', cellPosition: 105, province: 'Darién', type: 'premio',
    title: 'Comunidad Emberá',
    description: 'Aprendiste sobre cultura indígena. Protección: si caes en una casilla de castigo, no retrocedes.',
    onComplete: { protectFromPenalty: true },
  },
  {
    id: 'dar-p2', cellPosition: 106, province: 'Darién', type: 'pregunta',
    title: 'Parque Nacional Darién',
    description: '¿Es el Parque Nacional Darién Patrimonio de la Humanidad?',
    options: ['Sí', 'No'],
    correctAnswer: 0,
  },
  {
    id: 'dar-r3', cellPosition: 107, province: 'Darién', type: 'reto',
    title: 'Río Tuira',
    description: 'Imagina que vas en una canoa. Debes decir 3 cosas que podrías ver en el río (ej: peces, selva, aves). Si completas las 3, avanzas 1 casilla.',
    onComplete: { advanceCells: 1 },
  },
  {
    id: 'dar-pr3', cellPosition: 108, province: 'Darién', type: 'premio',
    title: 'Casilla Creativa - Guacamayas',
    description: 'Dato curioso sobre las guacamayas (dos verdad, una mentira):\n• La guacamaya roja tiene plumas de colores rojo, azul y amarillo. (Verdad)\n• Vive en selvas tropicales como las del Darién. (Verdad)\n• La guacamaya puede vivir solo 5 años. (Mentira)',
  },
  {
    id: 'dar-p3', cellPosition: 109, province: 'Darién', type: 'pregunta',
    title: 'Águila Harpía',
    description: '¿Cuál es el ave nacional en Panamá?',
    options: ['Ave nacional', 'Animal doméstico'],
    correctAnswer: 0,
  },
  {
    id: 'dar-p4', cellPosition: 110, province: 'Darién', type: 'pregunta',
    title: 'Cultura Emberá',
    description: '¿Quiénes son los Emberá?',
    options: ['Un equipo de fútbol', 'Un pueblo indígena de Panamá', 'Un tipo de animal de la selva'],
    correctAnswer: 1,
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // PANAMÁ ESTE (Casillas 111-120)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'pe-r1', cellPosition: 111, province: 'Panamá Este', type: 'reto',
    title: 'Cerro Azul',
    description: 'Hacer dramatización de senderismo.',
    onComplete: { advanceCells: 3 },
  },
  {
    id: 'pe-pr1', cellPosition: 112, province: 'Panamá Este', type: 'premio',
    title: 'Aeropuerto Internacional de Tocumen',
    description: 'Pasas directo al final del juego.',
    onComplete: { goToFinish: true },
  },
  {
    id: 'pe-p1', cellPosition: 113, province: 'Panamá Este', type: 'pregunta',
    title: 'Cascada Fertility Waterfall',
    description: '¿Qué tipo de turismo se practica principalmente?',
    options: ['Turismo ecológico / naturaleza / senderismo', 'Turismo de lujo', 'Turismo industrial'],
    correctAnswer: 0,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'pe-r2', cellPosition: 114, province: 'Panamá Este', type: 'reto',
    title: 'Represa Bayano',
    description: 'Dibujar energía hidroeléctrica en 30 segundos.',
  },
  {
    id: 'pe-p2', cellPosition: 115, province: 'Panamá Este', type: 'pregunta',
    title: 'Feria de san martín',
    description: '¿Qué destaca en esta feria?',
    options: ['Tecnología avanzada', 'Actividades agrícolas y ganaderas', 'Moda internacional'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'pe-pen1', cellPosition: 116, province: 'Panamá Este', type: 'penalizacion',
    title: 'Cárcel la joya',
    description: 'Caíste en la cárcel, espera 2 turnos para poder avanzar.',
    autoApply: { skipTurns: 2 },
  },
  {
    id: 'pe-r3', cellPosition: 117, province: 'Panamá Este', type: 'reto',
    title: 'Cuevas de bayano',
    description: 'Simular exploración en equipo.',
  },
  {
    id: 'pe-p3', cellPosition: 118, province: 'Panamá Este', type: 'pregunta',
    title: 'Parque Nacional Chagres',
    description: '¿Por qué es importante?',
    options: ['Porque tiene centros comerciales', 'Porque abastece de agua al Canal y la ciudad', 'Porque es una zona industrial'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
  {
    id: 'pe-r4', cellPosition: 119, province: 'Panamá Este', type: 'reto',
    title: 'Salto del Chimán',
    description: 'Representar turismo ecológico.',
  },
  {
    id: 'pe-p4', cellPosition: 120, province: 'Panamá Este', type: 'pregunta',
    title: 'Feria Agrícola de Tortí',
    description: '¿Qué productos se cultivan?',
    options: ['Café y cacao', 'Maíz, arroz, plátano', 'Uvas y manzanas'],
    correctAnswer: 1,
    onCorrect: { advanceCells: 2 },
  },
];

// Auxiliar: obtener cartas para una posición de casilla específica.
export function getCardsForCell(position: number): GameCard[] {
  return GAME_CARDS.filter(c => c.cellPosition === position);
}

// Auxiliar: obtener una carta aleatoria para una posición de casilla.
export function getRandomCardForCell(position: number): GameCard | null {
  const cards = getCardsForCell(position);
  if (cards.length === 0) return null;
  return cards[Math.floor(Math.random() * cards.length)];
}

// Auxiliar: obtener todas las provincias en orden.
export function getProvinceOrder(): string[] {
  return [
    'Panamá', 'Panamá Oeste', 'Coclé', 'Los Santos',
    'Herrera', 'Veraguas', 'Bocas del Toro', 'Comarcas',
    'Chiriquí', 'Colón', 'Darién', 'Panamá Este',
  ];
}
