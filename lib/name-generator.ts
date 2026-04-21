// Generador de nombres aleatorios para jugadores
// Adaptado del names.json del proyecto original

const names = [
  'Aaren', 'Aarika', 'Abagael', 'Abby', 'Ada', 'Adela', 'Adeline', 'Adriana',
  'Agatha', 'Agnes', 'Aileen', 'Aimee', 'Alana', 'Alberta', 'Alexa', 'Alexandra',
  'Alice', 'Alicia', 'Alison', 'Alma', 'Amanda', 'Amber', 'Amelia', 'Amy',
  'Ana', 'Andrea', 'Angela', 'Angelica', 'Anita', 'Anna', 'Anne', 'Annie',
  'April', 'Ariana', 'Ariel', 'Ashley', 'Audrey', 'Aurora', 'Ava', 'Barbara',
  'Beatrice', 'Bella', 'Bertha', 'Beth', 'Betty', 'Beverly', 'Bianca', 'Bonnie',
  'Brenda', 'Brianna', 'Bridget', 'Brittany', 'Brooke', 'Camila', 'Candace',
  'Cara', 'Carla', 'Carmen', 'Carol', 'Caroline', 'Carolyn', 'Cassandra', 'Catherine',
  'Cecilia', 'Celeste', 'Celia', 'Charlotte', 'Chelsea', 'Cheryl', 'Chloe', 'Christina',
  'Christine', 'Cindy', 'Claire', 'Clara', 'Claudia', 'Colleen', 'Constance', 'Cora',
  'Courtney', 'Crystal', 'Cynthia', 'Daisy', 'Dana', 'Daniela', 'Danielle', 'Daphne',
  'Darlene', 'Dawn', 'Deborah', 'Debra', 'Delia', 'Denise', 'Diana', 'Diane',
  'Dolores', 'Donna', 'Dora', 'Doris', 'Dorothy', 'Edith', 'Edna', 'Eileen',
  'Elaine', 'Eleanor', 'Elena', 'Elisa', 'Elizabeth', 'Ella', 'Ellen', 'Eloise',
  'Elsa', 'Emily', 'Emma', 'Erica', 'Erin', 'Esther', 'Ethel', 'Eva',
  'Evelyn', 'Faith', 'Faye', 'Felicia', 'Fiona', 'Florence', 'Frances', 'Gabriela',
  'Gabrielle', 'Gail', 'Georgia', 'Geraldine', 'Gina', 'Giselle', 'Gladys', 'Gloria',
  'Grace', 'Greta', 'Gwendolyn', 'Hannah', 'Hazel', 'Heather', 'Helen', 'Helena',
  'Hilda', 'Hillary', 'Holly', 'Hope', 'Ida', 'Irene', 'Iris', 'Isabel',
  'Isabella', 'Isabelle', 'Ivy', 'Jackie', 'Jacqueline', 'Jamie', 'Jane', 'Janet',
  'Janice', 'Jasmine', 'Jean', 'Jeanette', 'Jeanne', 'Jennifer', 'Jessica', 'Jill',
  'Joan', 'Joanna', 'Jocelyn', 'Josephine', 'Joy', 'Joyce', 'Judith', 'Judy',
  'Julia', 'Julie', 'June', 'Karen', 'Katherine', 'Kathleen', 'Kathryn', 'Katie',
  'Kayla', 'Kelly', 'Kimberly', 'Kristen', 'Kristina', 'Laura', 'Lauren', 'Laurie',
  'Leah', 'Leslie', 'Lillian', 'Lily', 'Linda', 'Lisa', 'Lois', 'Loretta',
  'Lori', 'Lorraine', 'Louise', 'Lucia', 'Lucille', 'Lucy', 'Lydia', 'Lynn',
  'Mabel', 'Madeline', 'Madison', 'Mae', 'Maggie', 'Marcia', 'Margaret', 'Maria',
  'Marian', 'Marie', 'Marilyn', 'Marina', 'Marion', 'Marjorie', 'Martha', 'Mary',
  'Matilda', 'Maureen', 'Maxine', 'Maya', 'Megan', 'Melanie', 'Melinda', 'Melissa',
  'Mercedes', 'Meredith', 'Michelle', 'Mildred', 'Miriam', 'Molly', 'Monica', 'Myrtle',
  'Nancy', 'Naomi', 'Natalie', 'Natasha', 'Nicole', 'Nina', 'Nora', 'Norma',
  'Olivia', 'Pamela', 'Patricia', 'Paula', 'Pauline', 'Pearl', 'Peggy', 'Penelope',
  'Phyllis', 'Priscilla', 'Rachel', 'Rebecca', 'Regina', 'Renee', 'Rita', 'Roberta',
  'Rosa', 'Rose', 'Rosemary', 'Ruby', 'Ruth', 'Sabrina', 'Sally', 'Samantha',
  'Sandra', 'Sara', 'Sarah', 'Shannon', 'Sharon', 'Sheila', 'Shirley', 'Sophia',
  'Sophie', 'Stacy', 'Stella', 'Stephanie', 'Susan', 'Suzanne', 'Sylvia', 'Tamara',
  'Tanya', 'Teresa', 'Theresa', 'Tiffany', 'Tracy', 'Valerie', 'Vanessa', 'Vera',
  'Veronica', 'Victoria', 'Violet', 'Virginia', 'Vivian', 'Wanda', 'Wendy', 'Whitney',
  'Wilma', 'Yolanda', 'Yvonne', 'Zoe',
];

const adjectives = [
  'Rápido', 'Veloz', 'Astuto', 'Sabio', 'Valiente', 'Audaz', 'Brillante', 'Genial',
  'Mágico', 'Épico', 'Legendario', 'Supremo', 'Divino', 'Místico', 'Cósmico', 'Estelar',
  'Radiante', 'Glorioso', 'Majestuoso', 'Noble', 'Real', 'Imperial', 'Soberano', 'Poderoso',
  'Fuerte', 'Invencible', 'Imparable', 'Increíble', 'Asombroso', 'Fantástico', 'Maravilloso',
  'Espectacular', 'Fenomenal', 'Extraordinario', 'Excepcional', 'Único', 'Especial', 'Raro',
];

/**
 * Genera un nombre aleatorio de jugador.
 * Formato: "Adjetivo nombre" (ej.: "Rápido Carlos", "Astuta María").
 */
export function generateRandomName(): string {
  const name = names[Math.floor(Math.random() * names.length)];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  return `${adjective} ${name}`;
}

/**
 * Genera un nombre aleatorio simple sin adjetivo.
 */
export function generateSimpleName(): string {
  return names[Math.floor(Math.random() * names.length)];
}

/**
 * Genera múltiples nombres aleatorios únicos.
 */
export function generateUniqueNames(count: number): string[] {
  const generated = new Set<string>();
  let attempts = 0;
  const maxAttempts = count * 10;

  while (generated.size < count && attempts < maxAttempts) {
    generated.add(generateRandomName());
    attempts++;
  }

  return Array.from(generated);
}

/**
 * Obtiene un adjetivo aleatorio.
 */
export function getRandomAdjective(): string {
  return adjectives[Math.floor(Math.random() * adjectives.length)];
}

/**
 * Obtiene un nombre aleatorio de la lista.
 */
export function getRandomName(): string {
  return names[Math.floor(Math.random() * names.length)];
}
