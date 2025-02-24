
import { Module } from "@nestjs/common";
import { ProductCategoryModule } from './category/product-category.module';
import { ProductModule } from "./product/product.module";
import { ProductSubategoryModule } from './subcategory/subcategory.module';

@Module({
  imports: [
    ProductModule,
    ProductCategoryModule,
    ProductSubategoryModule
  ]
})
export class InventoryModule { }
