/**
 * Where common delivery cities sit (latitude, longitude), to place them on the store's world map
 * (RoseWorld). The owner types city names in the delivery settings; they are matched loosely here (hamza,
 * taa marbuta, the article and spaces don't matter). A city that isn't here is still listed with its price.
 */
const CITIES: Array<[string[], number, number]> = [
  [["القدس", "jerusalem", "al-quds"], 31.778, 35.235],
  [["بيت حنينا"], 31.83, 35.22],
  [["شعفاط"], 31.81, 35.23],
  [["العيزرية"], 31.77, 35.26],
  [["رام الله", "ramallah"], 31.9, 35.2],
  [["البيرة"], 31.91, 35.216],
  [["بيت لحم", "bethlehem"], 31.705, 35.2],
  [["الخليل", "hebron"], 31.53, 35.1],
  [["أريحا", "jericho"], 31.857, 35.444],
  [["نابلس", "nablus"], 32.22, 35.26],
  [["جنين", "jenin"], 32.46, 35.3],
  [["طولكرم", "tulkarm"], 32.31, 35.03],
  [["قلقيلية", "qalqilya"], 32.19, 34.97],
  [["سلفيت", "salfit"], 32.085, 35.18],
  [["طوباس", "tubas"], 32.32, 35.37],
  [["حيفا", "haifa"], 32.794, 34.989],
  [["عكا", "acre", "akko"], 32.928, 35.082],
  [["الناصرة", "nazareth"], 32.7, 35.3],
  [["يافا", "jaffa"], 32.05, 34.75],
  [["تل أبيب", "tel aviv"], 32.085, 34.781],
  [["اللد", "lod"], 31.95, 34.89],
  [["الرملة", "ramla"], 31.93, 34.87],
  [["أم الفحم", "umm al-fahm"], 32.52, 35.15],
  [["الطيبة", "tayibe"], 32.27, 35.01],
  [["الطيرة", "tira"], 32.23, 34.95],
  [["كفر قاسم", "kafr qasim"], 32.115, 34.975],
  [["جلجولية"], 32.155, 34.95],
  [["قلنسوة"], 32.28, 34.98],
  [["باقة الغربية", "baqa"], 32.42, 35.04],
  [["كفر قرع"], 32.5, 35.05],
  [["عرعرة"], 32.5, 35.1],
  [["شفاعمرو", "shefa-amr"], 32.805, 35.17],
  [["طمرة", "tamra"], 32.85, 35.2],
  [["سخنين", "sakhnin"], 32.86, 35.3],
  [["عرابة"], 32.85, 35.33],
  [["كفر كنا"], 32.75, 35.34],
  [["كفر مندا"], 32.81, 35.26],
  [["مجد الكروم"], 32.92, 35.25],
  [["دالية الكرمل"], 32.69, 35.05],
  [["المغار"], 32.89, 35.4],
  [["طبريا", "tiberias"], 32.79, 35.53],
  [["صفد", "safed"], 32.96, 35.5],
  [["بئر السبع", "beersheba"], 31.25, 34.79],
  [["رهط", "rahat"], 31.39, 34.75],
  [["غزة", "gaza"], 31.5, 34.47],
  [["خان يونس", "khan yunis"], 31.34, 34.3],
  [["رفح", "rafah"], 31.29, 34.25],
];

const norm = (s: string) =>
  s.toLowerCase()
    .replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
    .replace(/^ال/, "").replace(/\s+/g, "");

const INDEX = new Map<string, [number, number]>();
for (const [names, lat, lng] of CITIES) for (const name of names) INDEX.set(norm(name), [lat, lng]);

/** A city's place by its name, or null. */
export function cityPoint(name: string): [number, number] | null {
  const key = norm(name);
  return INDEX.get(key) ?? INDEX.get(key.replace(/^ال/, "")) ?? null;
}

/** The box all known cities fit in (with a margin), for placing them on a map. */
export const CITY_BOUNDS = { south: 31.1, north: 33.05, west: 34.15, east: 35.65 };
