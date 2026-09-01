const ICONS: Record<string, string> = {
  accessories: 'solar:bag-4-bold-duotone',
  beauty: 'solar:cosmetic-bold-duotone',
  books: 'solar:book-2-bold-duotone',
  clothing: 'solar:t-shirt-bold-duotone',
  electronics: 'solar:smartphone-2-bold-duotone',
  'food & beverage': 'solar:cup-hot-bold-duotone',
  footwear: 'solar:running-2-bold-duotone',
  games: 'solar:gamepad-bold-duotone',
  gifts: 'solar:gift-bold-duotone',
  health: 'solar:health-bold-duotone',
  'home & office': 'solar:home-2-bold-duotone',
  kitchen: 'solar:chef-hat-bold-duotone',
  outdoors: 'solar:tree-bold-duotone',
  pets: 'solar:paw-bold-duotone',
  sports: 'solar:basketball-bold-duotone',
  stationery: 'solar:pen-new-square-bold-duotone',
  tools: 'solar:screwdriver-bold-duotone',
};

export const FALLBACK_CATEGORY_ICON = 'solar:box-bold-duotone';

export function categoryIcon(category: string | null | undefined): string {
  if (!category) return FALLBACK_CATEGORY_ICON;

  return ICONS[category.trim().toLowerCase()] ?? FALLBACK_CATEGORY_ICON;
}
