import React from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export const CleverMatchLogo: React.FC<LogoProps> = ({ size = 'medium', showText = true }) => {
  const sizes = {
    small: { width: 56, height: 56 },
    medium: { width: 84, height: 84 },
    large: { width: 168, height: 168 },
  };

  const { width, height } = sizes[size];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
    <img
      src="/clever-match.svg"
      alt="Clever Match"
      width={width}
      height={height}
      style={{
        display: 'block',
        width,
        height,
        objectFit: 'contain',
      }}
      aria-hidden={showText ? undefined : true}
    />
    {showText && <span style={{ fontSize: size === 'small' ? 18 : 24, fontWeight: 700, color: 'var(--color-text)' }}>Clever Match</span>}
    </div>
  );
};

export default CleverMatchLogo;
