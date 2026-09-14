-- CreateEnum
CREATE TYPE "FoodItemSource" AS ENUM ('SYSTEM', 'USDA', 'USER', 'PDF', 'AI');

-- CreateTable
CREATE TABLE "food_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "serving_size" DOUBLE PRECISION NOT NULL,
    "serving_unit" TEXT NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "image_url" TEXT,
    "source_type" "FoodItemSource" NOT NULL DEFAULT 'SYSTEM',
    "source_reference" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_item_meal_types" (
    "food_item_id" TEXT NOT NULL,
    "meal_type" "MealType" NOT NULL,

    CONSTRAINT "food_item_meal_types_pkey" PRIMARY KEY ("food_item_id","meal_type")
);

-- CreateTable
CREATE TABLE "food_item_nutrients" (
    "id" TEXT NOT NULL,
    "food_item_id" TEXT NOT NULL,
    "nutrient_key" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "food_item_nutrients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "food_items_name_idx" ON "food_items"("name");

-- CreateIndex
CREATE UNIQUE INDEX "food_items_source_type_name_key" ON "food_items"("source_type", "name");

-- CreateIndex
CREATE INDEX "food_item_nutrients_food_item_id_idx" ON "food_item_nutrients"("food_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "food_item_nutrients_food_item_id_nutrient_key_key" ON "food_item_nutrients"("food_item_id", "nutrient_key");

-- AddForeignKey
ALTER TABLE "food_item_meal_types" ADD CONSTRAINT "food_item_meal_types_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "food_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_item_nutrients" ADD CONSTRAINT "food_item_nutrients_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "food_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
