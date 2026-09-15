import { useEffect, useState } from 'react';
import { FALLBACK_FOOD_PHOTO, foodPhoto } from '../../lib/food-photos';

type FoodThumbProps = {
  name: string;
  imageUrl?: string | null;
  className?: string;
};

export function FoodThumb({ name, imageUrl, className }: FoodThumbProps) {
  const preferred = imageUrl?.trim() || foodPhoto(name);
  const [src, setSrc] = useState(preferred);

  useEffect(() => {
    setSrc(preferred);
  }, [preferred]);

  return (
    <img
      className={className ?? 'food-thumb'}
      src={src}
      alt=""
      onError={() => {
        if (src !== FALLBACK_FOOD_PHOTO) setSrc(FALLBACK_FOOD_PHOTO);
      }}
    />
  );
}
