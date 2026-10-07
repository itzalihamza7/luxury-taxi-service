-- Photos for the starting fleet, for databases created before the photos were
-- added. New databases get them from the seed; a vehicle that already has a
-- photo, or was added by the operator, is left alone.
UPDATE "vehicles"
SET "image_url" = '/images/fleet/' || "slug" || '.jpg'
WHERE "image_url" IS NULL
  AND "slug" IN ('mercedes-e-class', 'mercedes-s-class', 'mercedes-v-class', 'mercedes-maybach', 'v-class-vip', 'mercedes-sprinter', 'toyota-yaris');
