import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/merchant-bookings.ts', 'src/content.ts', 'src/types.ts', 'src/management.ts', 'src/management-types.ts', 'src/delivery-types.ts', 'src/booking-types.ts', 'src/category-tree.ts', 'src/platform.ts'],
  format: 'esm', dts: true, clean: true, publint: true,
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
  deps: { neverBundle: true, onlyBundle: [] },
});
