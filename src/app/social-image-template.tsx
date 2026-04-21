import { ImageResponse } from 'next/og';

const socialGradient = 'linear-gradient(135deg, #030B1F 0%, #0A1E4E 45%, #DA291C 100%)';
const socialForeground = '#FFFFFF';

type SocialImageOptions = {
  size: {
    width: number;
    height: number;
  };
  headline: string;
  description: string;
};

export function createSocialImage({ size, headline, description }: SocialImageOptions) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: socialGradient,
          color: socialForeground,
          padding: '58px 66px',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Parkeando · Edición Universitaria
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 920 }}>
          <div style={{ display: 'flex', fontSize: 74, fontWeight: 800, lineHeight: 1.05 }}>
            {headline}
          </div>
          <div style={{ display: 'flex', fontSize: 35, opacity: 0.92, lineHeight: 1.2 }}>
            {description}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignSelf: 'flex-start',
            fontSize: 27,
            fontWeight: 700,
            background: 'rgba(255,255,255,0.14)',
            border: '2px solid rgba(255,255,255,0.24)',
            borderRadius: 999,
            padding: '10px 22px',
          }}
        >
          parkeando.xyz
        </div>
      </div>
    ),
    size,
  );
}
