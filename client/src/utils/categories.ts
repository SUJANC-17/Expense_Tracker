import type { Category } from '../appTypes';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, name: 'Food' },
  { id: 2, name: 'Travel' },
  { id: 3, name: 'Rent' },
  { id: 4, name: 'Utilities' },
  { id: 5, name: 'Entertainment' },
  { id: 6, name: 'Healthcare' },
  { id: 7, name: 'Shopping' },
  { id: 8, name: 'Other' },
];

export const getCategoryName = (categoryId: number, categories: Category[] = DEFAULT_CATEGORIES): string => {
  const category = categories.find((c) => c.id === categoryId);
  return category ? category.name : 'Unknown';
};
