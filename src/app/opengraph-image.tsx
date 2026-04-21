import { createSocialImage } from './social-image-template';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return createSocialImage({
    size,
    headline: 'Descubre Panamá jugando',
    description:
      'Cultura, turismo y biodiversidad en una experiencia educativa e interactiva.',
  });
}
