import React from 'react';

type ImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

export const Image: React.FC<ImageProps> = ({ src, alt, width, height }) => {
  return <img src={src} alt={alt} width={width} height={height} />;
};