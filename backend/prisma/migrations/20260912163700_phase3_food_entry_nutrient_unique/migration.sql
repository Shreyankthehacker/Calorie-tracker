-- CreateIndex
CREATE UNIQUE INDEX "food_entry_nutrients_food_entry_id_nutrient_key_key" ON "food_entry_nutrients"("food_entry_id", "nutrient_key");
