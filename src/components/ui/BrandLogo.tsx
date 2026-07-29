import { useState } from 'react';
import bundledLogo from '../../assets/logo.svg';

interface BrandLogoProps {
  size: number;
  className?: string;
  alt?: string;
}

/**
 * Logo de la marca. Busca en orden `public/logo.png`, `public/logo.svg` y por
 * último el logo incluido en el código, así que para cambiarlo basta con dejar
 * el archivo en `public/` — sin tocar nada más. Se muestra tal cual, sin
 * filtros de color, para respetar los colores originales.
 */
export function BrandLogo({ size, className, alt = 'ServiExpress' }: BrandLogoProps) {
  const sources = ['/logo.png', '/logo.jpg', '/logo.svg', bundledLogo];
  const [index, setIndex] = useState(0);

  return (
    <img
      src={sources[index]}
      alt={alt}
      width={size}
      height={size}
      className={className}
      onError={() => setIndex((current) => Math.min(current + 1, sources.length - 1))}
    />
  );
}