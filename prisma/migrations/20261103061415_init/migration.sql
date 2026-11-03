-- CreateEnum
CREATE TYPE "proposed_action" AS ENUM ('NONE', 'UNDER_REVIEW', 'PRICE_REDUCTION_PLANNED', 'PROMOTION_PLANNED', 'TRANSFER_PLANNED', 'WHOLESALE_PLANNED');

-- CreateTable
CREATE TABLE "dealerships" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dealerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "vin" VARCHAR(17) NOT NULL,
    "make" VARCHAR(50) NOT NULL,
    "model" VARCHAR(50) NOT NULL,
    "year" SMALLINT NOT NULL,
    "colour" VARCHAR(30) NOT NULL,
    "inventory_date" DATE NOT NULL,
    "proposed_action" "proposed_action" NOT NULL DEFAULT 'NONE',
    "action_note" VARCHAR(500),
    "action_updated_at" TIMESTAMPTZ(3),
    "dealership_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_year_check" CHECK ("year" BETWEEN 1980 AND 2100);
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_vin_length_check" CHECK (char_length("vin") = 17);

-- CreateIndex
CREATE UNIQUE INDEX "dealerships_name_key" ON "dealerships"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vin_key" ON "vehicles"("vin");

-- CreateIndex
CREATE INDEX "vehicles_inventory_date_idx" ON "vehicles"("inventory_date");

-- CreateIndex
CREATE INDEX "vehicles_dealership_id_idx" ON "vehicles"("dealership_id");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_dealership_id_fkey" FOREIGN KEY ("dealership_id") REFERENCES "dealerships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
