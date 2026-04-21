import { createSocialImage } from './social-image-template';

export const size = {
  width: 1200,
  height: 675,
};

export const contentType = 'image/png';

export default function TwitterImage() {
  return createSocialImage({
    size,
    headline: '¿Listo para el reto?',
    description: 'Aprende sobre Panamá mientras juegas.',
  });
}
