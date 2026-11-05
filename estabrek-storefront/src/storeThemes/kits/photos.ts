/**
 * Each kit's pictures by the name its pages use them under, with who took them and where
 * from (Unsplash and Pexels, both free for shop use; none shows a real brand's logo). A set
 * goes in only after the store's owner says yes to it; until then a category's pages show
 * the shop's ready placeholders. Unsplash serves each at the width its place needs.
 */
export type KitPhoto = { url: string; by: string; from: string };
export const KIT_PHOTOS: Record<string, Record<string, KitPhoto>> = {
  // Shoes (wave 1), approved 2026-11-02.
  shoes: {
    "hero-street": { url: "https://images.unsplash.com/photo-1765828593571-feae25d705b8?auto=format&fit=crop&w=2000&q=75", by: "Michael Kyule", from: "Unsplash" },
    "hero-run": { url: "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?auto=format&fit=crop&w=2000&q=75", by: "sporlab", from: "Unsplash" },
    "hero-atelier": { url: "https://images.unsplash.com/photo-1563434649554-58f91d22ec2c?auto=format&fit=crop&w=2000&q=75", by: "rupixen", from: "Unsplash" },
    "hero-kids": { url: "https://images.unsplash.com/photo-1540479859555-17af45c78602?auto=format&fit=crop&w=2000&q=75", by: "Ben Wicks", from: "Unsplash" },
    "hero-quiet": { url: "https://images.unsplash.com/photo-1625860191460-10a66c7384fb?auto=format&fit=crop&w=2000&q=75", by: "Mukesh Naik", from: "Unsplash" },
    "hero-retro": { url: "https://images.unsplash.com/photo-1620989928625-08536e746255?auto=format&fit=crop&w=2000&q=75", by: "Ervan M Wirawan", from: "Unsplash" },
    "hero-night": { url: "https://images.unsplash.com/photo-1644957020661-aabac8641791?auto=format&fit=crop&w=2000&q=75", by: "Vadim Koza", from: "Unsplash" },
    "hero-edit": { url: "https://images.unsplash.com/photo-1530735038726-a73fd6e6a349?auto=format&fit=crop&w=2000&q=75", by: "Jade Aucamp", from: "Unsplash" },
    "hero-trail": { url: "https://images.unsplash.com/photo-1774454773999-0e29ce7eb28b?auto=format&fit=crop&w=2000&q=75", by: "Ashutosh Rana", from: "Unsplash" },
    "hero-lab": { url: "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=2000&q=75", by: "Mojtaba Fahiminia", from: "Unsplash" },
    "shoe-1": { url: "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=900&q=75", by: "Mojtaba Fahiminia", from: "Unsplash" },
    "shoe-2": { url: "https://images.unsplash.com/photo-1632497775901-50ba4637399f?auto=format&fit=crop&w=900&q=75", by: "Adrian Regeci", from: "Unsplash" },
    "shoe-3": { url: "https://images.unsplash.com/photo-1612905468542-585ca599afbc?auto=format&fit=crop&w=900&q=75", by: "Bear Bear", from: "Unsplash" },
    "shoe-4": { url: "https://images.unsplash.com/photo-1605812860427-4024433a70fd?auto=format&fit=crop&w=900&q=75", by: "Maxim Hopman", from: "Unsplash" },
    "shoe-5": { url: "https://images.unsplash.com/photo-1603808033176-9d134e6f2c74?auto=format&fit=crop&w=900&q=75", by: "Mojtaba Fahiminia", from: "Unsplash" },
    "shoe-6": { url: "https://images.unsplash.com/photo-1603191659812-ee978eeeef76?auto=format&fit=crop&w=900&q=75", by: "Monaal Garg", from: "Unsplash" },
    "shoe-7": { url: "https://images.unsplash.com/photo-1627388484741-74dcc56ec343?auto=format&fit=crop&w=900&q=75", by: "Karim Elmissiry", from: "Unsplash" },
    "shoe-8": { url: "https://images.unsplash.com/photo-1760817074821-329c6a9e78d9?auto=format&fit=crop&w=900&q=75", by: "T", from: "Unsplash" },
    "kid-1": { url: "https://images.unsplash.com/photo-1780850337330-855f790f35bb?auto=format&fit=crop&w=900&q=75", by: "Sou Jest", from: "Unsplash" },
    "kid-2": { url: "https://images.unsplash.com/photo-1678192568478-9488ee55def6?auto=format&fit=crop&w=900&q=75", by: "Kawê Rodrigues", from: "Unsplash" },
    "kid-3": { url: "https://images.unsplash.com/photo-1584564515943-b54cbb61836b?auto=format&fit=crop&w=900&q=75", by: "Luis Soto", from: "Unsplash" },
    "kid-4": { url: "https://images.unsplash.com/photo-1540479859555-17af45c78602?auto=format&fit=crop&w=900&q=75", by: "Ben Wicks", from: "Unsplash" },
    "cat-men": { url: "https://images.unsplash.com/photo-1647218947427-d783309440d2?auto=format&fit=crop&w=1200&q=75", by: "Navid Sohrabi", from: "Unsplash" },
    "cat-women": { url: "https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?auto=format&fit=crop&w=1200&q=75", by: "Emily Pottiger", from: "Unsplash" },
    "cat-kids": { url: "https://images.unsplash.com/photo-1742390671647-bc9c5399fdf3?auto=format&fit=crop&w=1200&q=75", by: "STONES and BONES", from: "Unsplash" },
    "cat-run": { url: "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?auto=format&fit=crop&w=1200&q=75", by: "sporlab", from: "Unsplash" },
    "cat-sneakers": { url: "https://images.unsplash.com/photo-1600054904350-1d493ae5f922?auto=format&fit=crop&w=1200&q=75", by: "Riyan Ong", from: "Unsplash" },
    "cat-trail": { url: "https://images.unsplash.com/photo-1629775689143-96259e05415f?auto=format&fit=crop&w=1200&q=75", by: "Chris Turgeon", from: "Unsplash" },
    "cat-boots": { url: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=1200&q=75", by: "Zac Wolff", from: "Unsplash" },
    "cat-sandals": { url: "https://images.unsplash.com/photo-1628375385879-1af64230c2e1?auto=format&fit=crop&w=1200&q=75", by: "DCL 650", from: "Unsplash" },
    "cat-formal": { url: "https://images.unsplash.com/photo-1625357165350-bdbcb6d7d524?auto=format&fit=crop&w=1200&q=75", by: "Ty Feague", from: "Unsplash" },
    "life-1": { url: "https://images.unsplash.com/photo-1779153862886-1349bfd8b5cd?auto=format&fit=crop&w=1200&q=75", by: "ola szkolda", from: "Unsplash" },
    "life-2": { url: "https://images.unsplash.com/photo-1788200454183-967acb26cae7?auto=format&fit=crop&w=1200&q=75", by: "Dung Anh", from: "Unsplash" },
    "life-3": { url: "https://images.unsplash.com/photo-1762343290221-d2374e1e2e2c?auto=format&fit=crop&w=1200&q=75", by: "Zulfugar Karimov", from: "Unsplash" },
    "life-4": { url: "https://images.unsplash.com/photo-1765828593571-feae25d705b8?auto=format&fit=crop&w=1200&q=75", by: "Michael Kyule", from: "Unsplash" },
    "life-5": { url: "https://images.unsplash.com/photo-1584216338898-f34d78201414?auto=format&fit=crop&w=1200&q=75", by: "Amy Geier", from: "Unsplash" },
    "life-6": { url: "https://images.unsplash.com/photo-1622760808027-095ea611f657?auto=format&fit=crop&w=1200&q=75", by: "mojtaba mosayebzadeh", from: "Unsplash" },
    "life-7": { url: "https://images.unsplash.com/photo-1727061180303-d91cdeca6f9c?auto=format&fit=crop&w=1200&q=75", by: "SJ", from: "Unsplash" },
    "life-8": { url: "https://images.unsplash.com/photo-1773170698501-6b223873d368?auto=format&fit=crop&w=2000&q=75", by: "lhon karwan", from: "Unsplash" },
    "ugc-1": { url: "https://images.unsplash.com/photo-1661336509673-910e946daf56?auto=format&fit=crop&w=900&q=75", by: "DDP", from: "Unsplash" },
    "ugc-2": { url: "https://images.unsplash.com/photo-1643935272030-0dbc34b8fd29?auto=format&fit=crop&w=900&q=75", by: "Adiel Gavish", from: "Unsplash" },
    "ugc-3": { url: "https://images.unsplash.com/photo-1616963299323-8123461ee86c?auto=format&fit=crop&w=900&q=75", by: "Chris", from: "Unsplash" },
    "ugc-4": { url: "https://images.unsplash.com/photo-1777293876694-37d479bc1de2?auto=format&fit=crop&w=900&q=75", by: "Maks Styazhkin", from: "Unsplash" },
    "ugc-5": { url: "https://images.unsplash.com/photo-1719068648598-468f3f812511?auto=format&fit=crop&w=900&q=75", by: "Niklas König", from: "Unsplash" },
    "ugc-6": { url: "https://images.unsplash.com/photo-1658702041515-18275b138fda?auto=format&fit=crop&w=900&q=75", by: "Drew Darby", from: "Unsplash" },
    "craft-1": { url: "https://images.unsplash.com/photo-1644258676710-ffb99d7d7a1b?auto=format&fit=crop&w=1200&q=75", by: "Alexander Kirov", from: "Unsplash" },
    "craft-2": { url: "https://images.unsplash.com/photo-1647502191516-68a4f8c74ed4?auto=format&fit=crop&w=1200&q=75", by: "Joel Lee", from: "Unsplash" },
    "craft-3": { url: "https://images.unsplash.com/photo-1557673862-a2a470406a30?auto=format&fit=crop&w=1200&q=75", by: "matthew Feeney", from: "Unsplash" },
    "craft-4": { url: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=1200&q=75", by: "Ayrus Hill", from: "Unsplash" },
    "detail-1": { url: "https://images.unsplash.com/photo-1780824947018-3711bb44b613?auto=format&fit=crop&w=900&q=75", by: "Jordan Hou", from: "Unsplash" },
    "detail-2": { url: "https://images.unsplash.com/photo-1680214181393-ad6e1d41b62a?auto=format&fit=crop&w=900&q=75", by: "mokhalad musavi", from: "Unsplash" },
    "detail-3": { url: "https://images.unsplash.com/photo-1785711638854-aa9047d0175c?auto=format&fit=crop&w=900&q=75", by: "maks_d", from: "Unsplash" },
    "detail-4": { url: "https://images.unsplash.com/photo-1759674861540-afed9f86f94a?auto=format&fit=crop&w=900&q=75", by: "Pierre-Antoine FRANCK", from: "Unsplash" },
    "trail-1": { url: "https://images.unsplash.com/photo-1656602997412-546e584fa83c?auto=format&fit=crop&w=900&q=75", by: "Kristian Ranstrom", from: "Unsplash" },
    "trail-2": { url: "https://images.unsplash.com/photo-1684929954083-f10c179ed96d?auto=format&fit=crop&w=900&q=75", by: "Sergei Gussev", from: "Unsplash" },
    "trail-3": { url: "https://images.unsplash.com/photo-1580662124358-a27775604219?auto=format&fit=crop&w=900&q=75", by: "Clay Banks", from: "Unsplash" },
  },
};

const ILLUSTRATED = new Set(["fashion", "beauty", "perfume", "jewelry", "electronics", "gaming", "home", "coffee", "food", "kids", "books", "art", "sports", "pets", "flowers", "music", "stationery", "kitchen", "outdoor"]);
export const photosOf = (kind: string): Record<string, string> => {
  if (ILLUSTRATED.has(kind)) return Object.fromEntries(["hero", "story", ...Array.from({ length: 6 }, (_, i) => `product-${i + 1}`)].map((name) => [name, `/templates/${kind}/${name}.svg`]));
  if (kind === "shoes") return { ...Object.fromEntries(Object.entries(KIT_PHOTOS.shoes).map(([name, ph]) => [name, ph.url])), ...Object.fromEntries(["hero", "story", ...Array.from({ length: 6 }, (_, i) => `product-${i + 1}`)].map((name) => [name, `/templates/shoes/${name}.svg`])) };
  return Object.fromEntries(Object.entries(KIT_PHOTOS[kind] ?? {}).map(([name, ph]) => [name, ph.url]));
};
