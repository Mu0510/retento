'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { ImageWithFallback } from '@/components/ImageWithFallback';

export type LandingImageShowcaseProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  cardContent?: ReactNode;
  className?: string;
  imageClassName?: string;
  cardClassName?: string;
  overlayClassName?: string;
};

export function LandingImageShowcase({
  src,
  alt,
  width = 1080,
  height = 400,
  cardContent,
  className,
  imageClassName,
  cardClassName,
  overlayClassName,
}: LandingImageShowcaseProps) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <ImageWithFallback
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`w-full h-[360px] object-cover rounded-2xl shadow-xl ${imageClassName ?? ''}`}
      />
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-t from-gray-900/40 to-transparent ${
          overlayClassName ?? ''
        }`}
      />
      {cardContent && (
        <Card
          className={`absolute bottom-6 left-6 right-6 p-4 bg-white/85 backdrop-blur-sm border-0 shadow-lg ${cardClassName ?? ''}`}
        >
          {cardContent}
        </Card>
      )}
    </div>
  );
}
