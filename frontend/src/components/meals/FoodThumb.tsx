import { foodArtForName } from '../../lib/food-art';

type FoodThumbProps = {
  name: string;
  imageUrl?: string | null;
  className?: string;
};

export function FoodThumb({ name, imageUrl, className }: FoodThumbProps) {
  if (imageUrl) {
    return <img className={className ?? 'food-thumb'} src={imageUrl} alt="" />;
  }
  const Art = foodArtForName(name);
  return <Art className={className ?? 'food-thumb'} />;
}
