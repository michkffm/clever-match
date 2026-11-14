import React from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export const TanzMatchLogo: React.FC<LogoProps> = ({ size = 'medium', showText = true }) => {
  const sizes = {
    small: { width: 56, height: 56 },
    medium: { width: 84, height: 84 },
    large: { width: 168, height: 168 },
  };

  const { width, height } = sizes[size];

  return (
    <img
      src="/tanzmatch.svg"
      alt="TanzMatch"
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
  );
};

export default TanzMatchLogo;
