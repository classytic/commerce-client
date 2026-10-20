import { expect, it } from 'vitest';
import { categoryChoices, categoryNavigation } from '../src/category-tree.js';
it('preserves nested navigation and excludes a complete subtree from parent choices', () => {
  const rows = [
    { name: 'Clothing', slug: 'clothing', parent: null },
    { name: 'Shirts', slug: 'shirts', parent: 'clothing' },
    { name: 'Baby shirts', slug: 'baby-shirts', parent: 'shirts' },
    { name: 'Toys', slug: 'toys', parent: null },
    { name: 'Hidden branch child', slug: 'hidden-child', parent: 'hidden-root' },
  ];
  const tree = categoryNavigation(rows);
  expect(categoryChoices(tree).map(row => row.label)).toEqual(['Clothing', 'Clothing / Shirts', 'Clothing / Shirts / Baby shirts', 'Toys']);
  expect(categoryChoices(tree, 'shirts').map(row => row.value)).toEqual(['clothing', 'toys']);
  expect(categoryChoices(tree, 'clothing').map(row => row.value)).toEqual(['toys']);
});
