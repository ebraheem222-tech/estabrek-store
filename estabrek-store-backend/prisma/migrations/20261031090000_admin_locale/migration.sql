-- The admin in Arabic, English and Hebrew: each team member's own language
-- (the switch in the admin's top bar). Empty = the store's main language.
ALTER TABLE "AdminUser" ADD COLUMN "locale" "Locale";
